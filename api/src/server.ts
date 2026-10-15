import express from "express";
import cors from "cors";
import {z} from "zod";
import {config} from "./config.js";
import {checkDatabase,closeDatabase,getPool} from "./db/pool.js";
import {startCronJobs,stopCronJobs} from "./jobs/cron.js";
import {GitHubRESTClient} from "./clients/github.js";
import {HTTPWorkerClient} from "./clients/worker.js";
import {authenticate,createSession,revokeSession} from "./auth/service.js";

const app=express();
app.disable("x-powered-by");
app.use(cors({origin:config.CORS_ORIGIN.split(",").map(s=>s.trim()),credentials:true}));
app.use(express.json({limit:"2mb"}));

const library=[
 {id:"swift",name:"Swift",summary:"Apple programming language",category:"languages",tags:["iOS","SwiftUI"],sourceURL:"https://www.swift.org",compatibility:"Apple builds require macOS/Xcode"},
 {id:"csharp",name:"C#",summary:".NET and game scripting language",category:"languages",tags:[".NET","Unity"],sourceURL:"https://learn.microsoft.com/dotnet/csharp/",compatibility:"Worker adapter required"},
 {id:"lua",name:"Lua",summary:"Embeddable scripting language",category:"languages",tags:["Scripting"],sourceURL:"https://www.lua.org",compatibility:"Interpreter adapter required"},
 {id:"typescript",name:"TypeScript",summary:"Typed JavaScript",category:"languages",tags:["Web","Node.js"],sourceURL:"https://www.typescriptlang.org",compatibility:"Worker required to execute"},
 {id:"python",name:"Python",summary:"General purpose programming language",category:"languages",tags:["Backend","Automation"],sourceURL:"https://www.python.org",compatibility:"Worker required to execute"},
 {id:"swiftui",name:"SwiftUI",summary:"Declarative Apple UI framework",category:"frameworks",tags:["Apple","UI"],sourceURL:"https://developer.apple.com/xcode/swiftui/",compatibility:"macOS/Xcode build required"},
 {id:"web-template",name:"Web App Template",summary:"HTML/CSS/TypeScript starter",category:"templates",tags:["Web"],compatibility:"Preview adapter required"}
];
const jobs=new Map<string,any>();

function bearer(req:express.Request){const value=req.header("authorization");return value?.startsWith("Bearer ")?value.slice(7):null;}
async function requireAuth(req:express.Request,res:express.Response,next:express.NextFunction){const token=bearer(req);const session=token?await authenticate(token):null;if(!session)return res.status(401).json({error:{code:"UNAUTHORIZED"}});(req as any).session=session;(req as any).sessionToken=token;next();}

app.get("/api/v1/health",async(_req,res)=>{const database=await checkDatabase();res.status(database.configured&&!database.connected?503:200).json({status:database.configured&&!database.connected?"degraded":"ok",service:"github-universal-ide-api",version:"0.2.0",database,worker:{configured:Boolean(config.WORKER_URL)}});});
app.get("/api/v1/library",(req,res)=>{const q=String(req.query.q??"").toLowerCase(),category=String(req.query.category??"");res.json({source:"bundled",items:library.filter(x=>(!category||x.category===category)&&(!q||`${x.name} ${x.summary} ${x.tags.join(" ")}`.toLowerCase().includes(q)))});});

app.post("/api/v1/auth/device/start",async(_req,res)=>{
 if(!config.GITHUB_CLIENT_ID)return res.status(503).json({error:{code:"GITHUB_OAUTH_NOT_CONFIGURED"}});
 const body=new URLSearchParams({client_id:config.GITHUB_CLIENT_ID,scope:"read:user repo"});
 const response=await fetch("https://github.com/login/device/code",{method:"POST",headers:{Accept:"application/json","content-type":"application/x-www-form-urlencoded"},body});
 const data=await response.json();res.status(response.ok?200:502).json(data);
});
app.post("/api/v1/auth/device/poll",async(req,res)=>{
 const p=z.object({deviceCode:z.string().min(10),interval:z.number().int().min(1).max(60).optional()}).safeParse(req.body);
 if(!p.success)return res.status(400).json({error:{code:"INVALID_DEVICE_CODE"}});
 if(!config.GITHUB_CLIENT_ID)return res.status(503).json({error:{code:"GITHUB_OAUTH_NOT_CONFIGURED"}});
 const body=new URLSearchParams({client_id:config.GITHUB_CLIENT_ID,device_code:p.data.deviceCode,grant_type:"urn:ietf:params:oauth:grant-type:device_code"});
 const response=await fetch("https://github.com/login/oauth/access_token",{method:"POST",headers:{Accept:"application/json","content-type":"application/x-www-form-urlencoded"},body});
 const data=await response.json() as any;
 if(!data.access_token)return res.status(200).json({status:data.error||"authorization_pending",interval:data.interval||p.data.interval||5});
 try{return res.json({status:"complete",...(await createSession(data.access_token))});}catch(error){return res.status(502).json({error:{code:"GITHUB_PROFILE_FAILED",message:error instanceof Error?error.message:"Unable to create session"}});}
});
app.post("/api/v1/auth/logout",requireAuth,async(req,res)=>{await revokeSession((req as any).sessionToken);res.status(204).end();});
app.get("/api/v1/auth/me",requireAuth,(req,res)=>res.json({user:{id:(req as any).session.userId,username:(req as any).session.username,githubUserId:(req as any).session.githubUserId}}));

app.get("/api/v1/github/repos",requireAuth,async(req,res)=>{try{const token=(req as any).session.githubTokenEncrypted;if(!token)return res.status(403).json({error:{code:"GITHUB_TOKEN_UNAVAILABLE"}});const {decryptSecret}=await import("./auth/crypto.js");const github=new GitHubRESTClient(decryptSecret(token));const q=String(req.query.q??"");res.json(await github.searchRepositories(q||`user:${(req as any).session.username}`,Number(req.query.page??1)));}catch(error){res.status(502).json({error:{code:"GITHUB_REQUEST_FAILED",message:error instanceof Error?error.message:"GitHub request failed"}});}});
app.get("/api/v1/github/repos/:owner/:repo",requireAuth,async(req,res)=>{try{const token=(req as any).session.githubTokenEncrypted;if(!token)return res.status(403).json({error:{code:"GITHUB_TOKEN_UNAVAILABLE"}});const {decryptSecret}=await import("./auth/crypto.js");res.json(await new GitHubRESTClient(decryptSecret(token)).getRepository(req.params.owner,req.params.repo));}catch(error){res.status(502).json({error:{code:"GITHUB_REQUEST_FAILED",message:error instanceof Error?error.message:"GitHub request failed"}});}});

app.post("/api/v1/swift/inspect",(req,res)=>{const parsed=z.object({files:z.array(z.object({path:z.string().max(1024),content:z.string().max(1000000).optional()})).max(5000)}).safeParse(req.body);if(!parsed.success)return res.status(400).json({error:{code:"INVALID_PROJECT_MANIFEST",details:parsed.error.flatten()}});const paths=parsed.data.files.map(f=>f.path);res.json({rootPath:".",hasPackageSwift:paths.includes("Package.swift"),hasXcodeProject:paths.some(p=>p.endsWith(".xcodeproj/project.pbxproj")),hasXcodeWorkspace:paths.some(p=>p.endsWith(".xcworkspace/contents.xcworkspacedata")),swiftFileCount:paths.filter(p=>p.endsWith(".swift")).length,capability:"buildRequiresMacOS",notes:["Metadata inspection only; no compilation was performed.","Apple builds need compatible SDK/signing workflow."]});});

app.post("/api/v1/jobs",requireAuth,async(req,res)=>{const p=z.object({projectId:z.string().min(1).max(128),kind:z.enum(["build","run","test"]),language:z.string().min(1).max(40),entrypoint:z.string().min(1).max(512),timeoutSeconds:z.number().int().min(1).max(900).default(300)}).safeParse(req.body);if(!p.success)return res.status(400).json({error:{code:"INVALID_JOB_REQUEST",details:p.error.flatten()}});const id=crypto.randomUUID();const base={id,status:"blocked",projectId:p.data.projectId,kind:p.data.kind,language:p.data.language,createdAt:new Date().toISOString()};try{if(config.WORKER_URL){const worker=new HTTPWorkerClient();const remote=await worker.submit(p.data);const job={...base,status:remote.status,workerJobId:remote.jobId};jobs.set(id,job);return res.status(202).json(job);}const job={...base,message:"No isolated worker configured; source code was not executed."};jobs.set(id,job);return res.status(202).json(job);}catch(error){return res.status(502).json({error:{code:"WORKER_SUBMISSION_FAILED",message:error instanceof Error?error.message:"Worker submission failed"}});}});
app.get("/api/v1/jobs/:id",requireAuth,async(req,res)=>{const j=jobs.get(req.params.id);if(!j)return res.status(404).json({error:{code:"JOB_NOT_FOUND"}});if(j.workerJobId&&config.WORKER_URL){try{const remote=await new HTTPWorkerClient().getStatus(j.workerJobId);return res.json({...j,...remote});}catch{/* retain local snapshot */}}res.json(j);});

app.get("/api/v1/projects",requireAuth,async(req,res)=>{const pool=getPool();if(!pool)return res.json({items:[]});const [rows]=await pool.execute<any[]>("SELECT id,name,language,repository_owner,repository_name,repository_url,default_branch,sync_status,created_at,updated_at FROM projects WHERE user_id=? ORDER BY updated_at DESC",[(req as any).session.userId]);res.json({items:rows});});
app.post("/api/v1/projects",requireAuth,async(req,res)=>{const p=z.object({name:z.string().min(1).max(150),language:z.string().min(1).max(50),repositoryOwner:z.string().max(100).optional(),repositoryName:z.string().max(100).optional(),repositoryUrl:z.string().url().max(2048).optional(),defaultBranch:z.string().max(255).default("main")}).safeParse(req.body);if(!p.success)return res.status(400).json({error:{code:"INVALID_PROJECT",details:p.error.flatten()}});const pool=getPool();if(!pool)return res.status(503).json({error:{code:"DATABASE_NOT_CONFIGURED"}});const id=crypto.randomUUID();await pool.execute("INSERT INTO projects(id,user_id,name,language,repository_owner,repository_name,repository_url,default_branch) VALUES(?,?,?,?,?,?,?,?)",[id,(req as any).session.userId,p.data.name,p.data.language,p.data.repositoryOwner??null,p.data.repositoryName??null,p.data.repositoryUrl??null,p.data.defaultBranch]);res.status(201).json({id,...p.data});});
app.get("/api/v1/projects/:id/files",requireAuth,async(req,res)=>{const pool=getPool();if(!pool)return res.status(503).json({error:{code:"DATABASE_NOT_CONFIGURED"}});const [rows]=await pool.execute<any[]>("SELECT f.path,f.content,f.content_sha AS contentSha,f.updated_at AS updatedAt FROM project_files f JOIN projects p ON p.id=f.project_id WHERE f.project_id=? AND p.user_id=? ORDER BY f.path",[req.params.id,(req as any).session.userId]);res.json({items:rows});});
app.put("/api/v1/projects/:id/files",requireAuth,async(req,res)=>{const p=z.object({path:z.string().min(1).max(1024),content:z.string().max(5000000),contentSha:z.string().max(64).optional()}).safeParse(req.body);if(!p.success)return res.status(400).json({error:{code:"INVALID_FILE",details:p.error.flatten()}});const pool=getPool();if(!pool)return res.status(503).json({error:{code:"DATABASE_NOT_CONFIGURED"}});const [owner]=await pool.execute<any[]>("SELECT id FROM projects WHERE id=? AND user_id=?",[req.params.id,(req as any).session.userId]);if(!owner[0])return res.status(404).json({error:{code:"PROJECT_NOT_FOUND"}});await pool.execute("INSERT INTO project_files(project_id,path,content,content_sha) VALUES(?,?,?,?) ON DUPLICATE KEY UPDATE content=VALUES(content),content_sha=VALUES(content_sha),updated_at=CURRENT_TIMESTAMP",[req.params.id,p.data.path,p.data.content,p.data.contentSha??null]);res.status(200).json({path:p.data.path,saved:true});});

const server=app.listen(config.PORT,()=>{console.log(`API listening on :${config.PORT}`);startCronJobs();});
async function shutdown(){stopCronJobs();server.close(()=>{void closeDatabase().finally(()=>process.exit(0));});}
process.on("SIGTERM",()=>void shutdown());process.on("SIGINT",()=>void shutdown());
