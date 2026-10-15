import {randomUUID} from "node:crypto";
import {getPool} from "../db/pool.js";
import {config} from "../config.js";
import {GitHubRESTClient} from "../clients/github.js";
import {encryptSecret,hashToken,randomToken} from "./crypto.js";

export async function createSession(githubToken:string){
  const pool=getPool();if(!pool)throw new Error("DATABASE_URL is required");
  const github=new GitHubRESTClient(githubToken);const profile=await github.getAuthenticatedUser();
  const userId=randomUUID();
  await pool.execute("INSERT INTO users(id,github_user_id,username) VALUES(?,?,?) ON DUPLICATE KEY UPDATE username=VALUES(username),updated_at=CURRENT_TIMESTAMP",[userId,profile.id,profile.login]);
  const [rows]=await pool.execute<any[]>("SELECT id FROM users WHERE github_user_id=? LIMIT 1",[profile.id]);
  const actualUserId=rows[0].id as string;const token=randomToken();const expires=new Date(Date.now()+config.SESSION_TTL_HOURS*3600_000);
  await pool.execute("INSERT INTO auth_sessions(id,user_id,token_hash,github_access_token_enc,expires_at) VALUES(?,?,?,?,?)",[randomUUID(),actualUserId,hashToken(token),encryptSecret(githubToken),expires]);
  return {token,user:{id:actualUserId,githubUserId:profile.id,username:profile.login,name:profile.name,avatarUrl:profile.avatarUrl},expiresAt:expires.toISOString()};
}

export async function authenticate(requestToken:string){
  const pool=getPool();if(!pool||!requestToken)return null;
  const [rows]=await pool.execute<any[]>("SELECT s.user_id,s.github_access_token_enc,u.username,u.github_user_id FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>NOW() LIMIT 1",[hashToken(requestToken)]);
  if(!rows[0])return null;await pool.execute("UPDATE auth_sessions SET last_used_at=NOW() WHERE token_hash=?",[hashToken(requestToken)]);
  return {userId:rows[0].user_id as string,username:rows[0].username as string,githubUserId:rows[0].github_user_id as number,githubTokenEncrypted:rows[0].github_access_token_enc as string|null};
}

export async function revokeSession(requestToken:string){const pool=getPool();if(pool)await pool.execute("DELETE FROM auth_sessions WHERE token_hash=?",[hashToken(requestToken)]);}
