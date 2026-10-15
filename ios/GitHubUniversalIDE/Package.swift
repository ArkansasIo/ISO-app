// swift-tools-version: 5.9
import PackageDescription

let package = Package(
 name: "GitHubUniversalIDE",
 platforms: [.iOS(.v17)],
 products: [.executable(name: "GitHubUniversalIDE", targets: ["GitHubUniversalIDE"])],
 targets: [
  .executableTarget(name: "GitHubUniversalIDE", path: ".", exclude: ["Package.swift"])
 ]
)
