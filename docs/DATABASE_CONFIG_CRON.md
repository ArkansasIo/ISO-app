# Database, configuration and cron

MySQL schema is in `api/migrations/001_initial.sql`. Runtime settings are validated in `api/src/config.ts`. Cron jobs include database health sampling, a catalog refresh hook, expired terminal-job cleanup, and a repository-sync hook. Catalog refresh and repository sync skip until their adapters and explicit per-project consent are configured.

The API-process scheduler is for single-instance development only. Production replicas need a dedicated scheduler or distributed lock. Use a secret manager, TLS, tested backups and restore procedures in production. Compose passwords are development-only.
