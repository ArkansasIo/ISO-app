import {readdir,readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import path from "node:path";
import {getPool,closeDatabase} from "./pool.js";

const pool=getPool();
if(!pool){console.error("DATABASE_URL is required");process.exitCode=1;}
else{
 try{
  const here=path.dirname(fileURLToPath(import.meta.url));
  const dir=path.resolve(here,"../../migrations");
  const files=(await readdir(dir)).filter(f=>/^\d+_.*\.sql$/.test(f)).sort();
  await pool.query("CREATE TABLE IF NOT EXISTS schema_migrations(version VARCHAR(100) PRIMARY KEY,applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP)");
  const [applied]=await pool.query<any[]>("SELECT version FROM schema_migrations");
  const done=new Set(applied.map(x=>x.version));
  for(const file of files){
   const version=file.replace(/\.sql$/i,"");
   if(done.has(version))continue;
   const sql=await readFile(path.join(dir,file),"utf8");
   const connection=await pool.getConnection();
   try{await connection.beginTransaction();for(const statement of sql.split(";").map(s=>s.trim()).filter(Boolean))await connection.query(statement);await connection.execute("INSERT INTO schema_migrations(version) VALUES (?)",[version]);await connection.commit();console.log(`Applied ${version}`);}
   catch(error){await connection.rollback();throw error;}
   finally{connection.release();}
  }
  console.log("Migrations complete");
 }catch(e){console.error("Migration failed",e);process.exitCode=1;}
 finally{await closeDatabase();}
}
