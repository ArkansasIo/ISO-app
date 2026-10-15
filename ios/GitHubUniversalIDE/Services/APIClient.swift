import Foundation

struct APIError: Error, LocalizedError, Decodable { let error: APIErrorBody; var errorDescription:String?{error.message ?? error.code} }
struct APIErrorBody: Decodable { let code:String; let message:String? }

final class APIClient {
 static let shared=APIClient()
 var baseURL=URL(string:ProcessInfo.processInfo.environment["ISO_API_URL"] ?? "http://localhost:8080")!
 private init(){}
 private func request<T:Decodable>(_ path:String,method:String="GET",body:Data?=nil,as type:T.Type) async throws -> T {
  let url=URL(string:path,relativeTo:baseURL)!;var req=URLRequest(url:url);req.httpMethod=method;req.timeoutInterval=30;req.setValue("application/json",forHTTPHeaderField:"Accept");
  if let body {req.httpBody=body;req.setValue("application/json",forHTTPHeaderField:"Content-Type")}
  if let token=KeychainStore.shared.get("sessionToken"){req.setValue("Bearer \(token)",forHTTPHeaderField:"Authorization")}
  let(data,response)=try await URLSession.shared.data(for:req);guard let http=response as? HTTPURLResponse else{throw URLError(.badServerResponse)}
  guard (200..<300).contains(http.statusCode) else {if let decoded=try? JSONDecoder().decode(APIError.self,from:data){throw decoded};throw URLError(.badServerResponse)}
  if T.self==EmptyResponse.self {return EmptyResponse() as! T};return try JSONDecoder().decode(T.self,from:data)
 }
 func get<T:Decodable>(_ path:String,as type:T.Type) async throws -> T{return try await request(path,as:type)}
 func post<T:Decodable,B:Encodable>(_ path:String,body:B,as type:T.Type) async throws -> T{return try await request(path,method:"POST",body:JSONEncoder().encode(body),as:type)}
 func put<T:Decodable,B:Encodable>(_ path:String,body:B,as type:T.Type) async throws -> T{return try await request(path,method:"PUT",body:JSONEncoder().encode(body),as:type)}
 func delete(_ path:String) async throws{let _:EmptyResponse=try await request(path,method:"DELETE",as:EmptyResponse.self)}
}
struct EmptyResponse:Decodable{}
