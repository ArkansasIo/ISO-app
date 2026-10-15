import Foundation

struct DeviceStartRequest:Encodable { let unused:String="" }
struct DeviceStartResponse:Decodable { let device_code:String; let user_code:String; let verification_uri:String; let verification_uri_complete:String?; let expires_in:Int; let interval:Int? }
struct DevicePollRequest:Encodable { let deviceCode:String; let interval:Int? }
struct DevicePollResponse:Decodable { let status:String; let token:String?; let user:AuthenticatedUser?; let expiresAt:String?; let interval:Int? }
struct AuthenticatedUser:Decodable,Identifiable { let id:String; let username:String; let githubUserId:Int?; let name:String?; let avatarUrl:String? }
