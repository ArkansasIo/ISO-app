import express from "express";
import {z} from "zod";
import {randomUUID} from "node:crypto";

const app=express();app.use(express.json({limit:"256kb"}));
const port=Number(process.env.PORT??8090);const secret=process.env.WORKER_SHARED_SECRET??"";
const jobs=new Map<string,{id:string;status:string;kind:string;language:string;projectId:string;entrypoint:string;createdAt:string;stdout:string;stderr:string}>();
function authorized(req:express.Request){return !secret||req.header("x-worker-secret")===secret;}
const requestSchema=z.object({projectId:z.string().min(1).max(128),kind:z.enum(["build","run","test"]),language:z.string().min(1).max(40),entrypoint:z.string().min(1).max(512),timeoutSeconds:z.number().int().min(1).max(900)});
app.get("/health",(_req,res)=>res.json({status:"ok",service:"iso-worker",execution:"adapter-only"}));
app.post("/v1/jobs",(req,res)=>{if(!authorized(req))return res.status(401).json({error:"unauthorized"});const parsed=requestSchema.safeParse(req.body);if(!parsed.success)return res.status(400).json({error:"invalid_job",details:parsed.error.flatten()});const id=randomUUID();const job={id,status:"blocked",...parsed.data,createdAt:new Date().toISOString(),stdout:"",stderr:"No code executor is enabled. Install a reviewed sandbox adapter before enabling execution."};jobs.set(id,job);return res.status(202).json({jobId:id,status:job.status});});
app.get("/v1/jobs/:id",(req,res)=>{if(!authorized(req))return res.status(401).json({error:"unauthorized"});const job=jobs.get(req.params.id);if(!job)return res.status(404).json({error:"not_found"});return res.json({status:job.status,stdout:job.stdout,stderr:job.stderr});});
app.listen(port,()=>console.log(`Worker listening on :${port}`));
