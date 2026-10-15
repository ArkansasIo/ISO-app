# GitHub Universal IDE

An iPhone-first IDE scaffold for GitHub repositories, Swift/SwiftUI projects, multi-language source editing, project persistence, and remote build/run/test orchestration.

## Implemented

- Native SwiftUI iOS source tree with a Swift Package manifest.
- Secure iOS session-token storage using Keychain.
- GitHub OAuth Device Flow through the API server.
- GitHub repository search and repository inspection through a server-side REST adapter.
- TypeScript/Express API with MySQL persistence.
- Ordered database migrations, including authentication sessions.
- Workspace projects and project-file CRUD APIs.
- Build/run/test job submission contracts.
- Isolated worker service boundary with shared-secret authentication.
- Docker Compose API + MySQL + worker development environment.
- OpenAPI documentation for the expanded API.
- Cron infrastructure for health sampling and job cleanup.

## Architecture

```text
iPhone SwiftUI IDE
       |
       | HTTPS + Bearer session
       v
TypeScript API ---- GitHub REST API
       |
       +---- MySQL
       |
       +---- Isolated Worker API
                    |
                    +---- reviewed language/build adapters
```

## Security boundary

The worker included in this repository is deliberately **adapter-only**. It accepts and tracks jobs but does not execute arbitrary downloaded source code. Real execution should be implemented behind a sandboxed worker adapter with filesystem, network, CPU, memory, timeout, and process isolation controls.

GitHub access tokens are encrypted at rest by the API when an encryption key is configured. Replace all development secrets before deployment.

## Local development

```bash
docker compose up --build
```

The API is exposed on port `8080`. The worker is internal to the Compose network on port `8090` and the database is exposed on `3306`.

For the iOS client, point `APIClient.baseURL` or the `ISO_API_URL` process environment value at a reachable API host. A physical iPhone cannot use `localhost` to reach the development machine; use a LAN address, tunnel, or deployed HTTPS endpoint.

## GitHub OAuth

Create a GitHub OAuth application with Device Flow enabled and provide `GITHUB_CLIENT_ID` to the API. The API requests `read:user repo` for repository management. For production, review the minimum required scopes and rotate the application encryption/session secrets.

## Important Apple build limitation

The iPhone application can edit Swift/SwiftUI source and dispatch build jobs, but an iPhone is not an Xcode/macOS build environment. Native Apple compilation, signing, archiving, and App Store packaging must occur on a compatible macOS/Xcode worker.
