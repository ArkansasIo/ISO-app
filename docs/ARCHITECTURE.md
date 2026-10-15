# Architecture

```text
iPhone SwiftUI frontend client -> HTTPS backend API -> server-side clients
                                                  -> MySQL metadata
                                                  -> isolated build/run workers
                                                  -> GitHub / registries / artifact storage
```

The frontend owns screens, editing state, API requests and progress presentation. The backend validates requests, authorizes users, rate-limits, audits and orchestrates jobs. Server-side clients adapt GitHub, Git transport, registries, workers and object storage. Never execute imported source inside the API process.

Production workers must be disposable, non-root, resource-limited, network-restricted and isolated per job. Apple-target builds require a secure macOS/Xcode worker. OAuth, durable queues, worker sandboxing and real Git transport must be configured before production use.
