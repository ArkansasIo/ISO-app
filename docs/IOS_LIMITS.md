# iOS IDE capability boundaries

- Text-based source such as Swift, SwiftUI, C#, Lua/Luau, TypeScript and Python can be edited on iPhone.
- Web projects may be previewed in a constrained preview after validation.
- General builds and execution require compatible remote workers.
- Native iOS app builds require macOS, Apple's SDK/Xcode toolchain and signing. This cannot be replaced by an ordinary iPhone app.
- Install personal builds using Apple's supported developer signing workflow; the IDE cannot bypass iOS security.
- Downloaded source and dependencies are untrusted until reviewed.
