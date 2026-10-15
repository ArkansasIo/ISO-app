import {createHash,createCipheriv,createDecipheriv,randomBytes} from "node:crypto";
import {config} from "../config.js";

function key():Buffer{return createHash("sha256").update(config.APP_ENCRYPTION_KEY||"development-only-key-change-me").digest();}
export function hashToken(value:string):string{return createHash("sha256").update(value).digest("hex");}
export function randomToken(bytes=32):string{return randomBytes(bytes).toString("base64url");}
export function encryptSecret(value:string):string{
  const iv=randomBytes(12);const cipher=createCipheriv("aes-256-gcm",key(),iv);const ciphertext=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
  return Buffer.concat([iv,cipher.getAuthTag(),ciphertext]).toString("base64url");
}
export function decryptSecret(value:string):string{
  const raw=Buffer.from(value,"base64url");const iv=raw.subarray(0,12);const tag=raw.subarray(12,28);const ciphertext=raw.subarray(28);
  const decipher=createDecipheriv("aes-256-gcm",key(),iv);decipher.setAuthTag(tag);return Buffer.concat([decipher.update(ciphertext),decipher.final()]).toString("utf8");
}
