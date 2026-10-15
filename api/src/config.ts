import { z } from "zod";
const schema=z.object({
 NODE_ENV:z.enum(["development","test","production"]).default("development"),
 PORT:z.coerce.number().int().min(1).max(65535).default(8080),
 DATABASE_URL:z.string().optional().refine(v=>!v||/^mysql:\/\//.test(v),"DATABASE_URL must use mysql://"),
 CORS_ORIGIN:z.string().default("http://localhost:8080"),
 CRON_ENABLED:z.enum(["true","false"]).default("true"),
 CRON_TIMEZONE:z.string().default("America/Toronto"),
 CRON_CATALOG_REFRESH:z.string().default("*/30 * * * *"),
 CRON_EXPIRED_JOB_CLEANUP:z.string().default("15 * * * *"),
 CRON_HEALTH_SAMPLE:z.string().default("*/5 * * * *"),
 CRON_REPOSITORY_SYNC:z.string().default("0 */6 * * *"),
 JOB_RETENTION_DAYS:z.coerce.number().int().min(1).max(3650).default(30),
 SESSION_TTL_HOURS:z.coerce.number().int().min(1).max(720).default(168),
 APP_ENCRYPTION_KEY:z.string().min(16).default("development-only-key-change-me"),
 GITHUB_CLIENT_ID:z.string().optional(),
 GITHUB_TOKEN:z.string().optional(),
 WORKER_URL:z.string().url().optional(),
 WORKER_SHARED_SECRET:z.string().optional()
});
const parsed=schema.safeParse(process.env); if(!parsed.success) throw new Error(`Invalid environment configuration: ${parsed.error.message}`); export const config=parsed.data;
