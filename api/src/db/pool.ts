import mysql,{type Pool} from "mysql2/promise"; import {config} from "../config.js";
let pool:Pool|null=null;
export function getPool():Pool|null { if(!config.DATABASE_URL)return null; if(!pool)pool=mysql.createPool({uri:config.DATABASE_URL,waitForConnections:true,connectionLimit:10,queueLimit:100,decimalNumbers:true}); return pool; }
export async function checkDatabase(){const p=getPool();if(!p)return{configured:false,connected:false,message:"DATABASE_URL is not configured"};try{await p.query("SELECT 1");return{configured:true,connected:true,message:"MySQL connection is healthy"};}catch{return{configured:true,connected:false,message:"MySQL is configured but unreachable"};}}
export async function closeDatabase(){if(pool){await pool.end();pool=null;}}
