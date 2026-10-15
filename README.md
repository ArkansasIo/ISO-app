# GitHub Universal IDE

A personal iPhone-first IDE scaffold for managing GitHub repositories, editing Swift/SwiftUI projects, browsing language and framework catalogs, and dispatching build/run requests to isolated workers.

## Components
- `ios/GitHubUniversalIDE`: native SwiftUI app scaffold.
- `api`: TypeScript/Express API, MySQL schema, configuration, cron jobs, and server-client contracts.
- `docs`: architecture, iOS capability limits, library design, and database/cron notes.
- `docker-compose.yml`: local API + MySQL development environment.

## Important limits
An iPhone app cannot act as a full Xcode installation or safely execute every downloaded program locally. Native iOS builds require a compatible macOS/Xcode build environment. This scaffold edits source and submits job requests, but it does not execute untrusted code in the API. Worker execution, OAuth, and live GitHub transport still need configured integrations.

See `docs/ARCHITECTURE.md` and `docs/IOS_LIMITS.md` for details.