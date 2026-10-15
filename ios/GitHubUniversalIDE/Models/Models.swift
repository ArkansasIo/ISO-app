import Foundation
enum LibraryCategory: String, CaseIterable, Identifiable, Codable { case repositories, languages, frameworks, templates, packages, examples, buildTools, projects; var id: String { rawValue } }
struct LibraryItem: Identifiable, Codable { let id: String; let name: String; let summary: String; let category: String; let tags: [String]; let sourceURL: String?; let compatibility: String }
struct APIHealth: Decodable { let status: String; let service: String; let version: String; let database: DatabaseHealth }
struct DatabaseHealth: Decodable { let configured: Bool; let connected: Bool; let message: String }
