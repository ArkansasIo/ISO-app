import SwiftUI

struct GitHubSyncView:View{
 @State private var repo=""
 @State private var status="Signed out"
 @State private var userCode=""
 @State private var verificationURL=""
 @State private var authenticatedUser:AuthenticatedUser?
 @State private var pollingTask:Task<Void,Never>?

 var body:some View{NavigationStack{Form{
  Section("Account"){
   if let authenticatedUser {Label(authenticatedUser.username,systemImage:"person.crop.circle.fill");Button("Sign out",role:.destructive){Task{try? await APIClient.shared.delete("/api/v1/auth/logout");KeychainStore.shared.remove("sessionToken");self.authenticatedUser=nil;status="Signed out"}}}
   else {Button("Sign in with GitHub"){Task{await startDeviceFlow()}}}
   Text(status).font(.footnote).foregroundStyle(.secondary)
  }
  if !userCode.isEmpty {Section("GitHub authorization"){Text("Enter code: \(userCode)").font(.title3.bold());if let url=URL(string:verificationURL){Link("Open GitHub authorization",destination:url)};Button("Cancel"){pollingTask?.cancel();userCode=""}}}
  Section("Repository") {TextField("owner/repository",text:$repo).textInputAutocapitalization(.never).autocorrectionDisabled();Button("Inspect repository"){Task{await inspect()}}}
 }.navigationTitle("GitHub Sync").task{await loadSession()}.onDisappear{pollingTask?.cancel()}}}

 private func loadSession()async{guard KeychainStore.shared.get("sessionToken") != nil else{return};do{let me=try await APIClient.shared.get("/api/v1/auth/me",as:MeResponse.self);authenticatedUser=me.user;status="Connected"}catch{KeychainStore.shared.remove("sessionToken")}}
 private func startDeviceFlow()async{do{let start=try await APIClient.shared.post("/api/v1/auth/device/start",body:DeviceStartRequest(),as:DeviceStartResponse.self);userCode=start.user_code;verificationURL=start.verification_uri_complete ?? start.verification_uri;status="Waiting for GitHub authorization…";pollingTask?.cancel();pollingTask=Task{for _ in 0..<120{try? await Task.sleep(for:.seconds(start.interval ?? 5));if Task.isCancelled{return};do{let result=try await APIClient.shared.post("/api/v1/auth/device/poll",body:DevicePollRequest(deviceCode:start.device_code,interval:start.interval),as:DevicePollResponse.self);if result.status=="complete",let token=result.token{try? KeychainStore.shared.set(token,for:"sessionToken");authenticatedUser=result.user;status="Connected";userCode="";return}}catch{status="Authorization failed";return}};status="Authorization timed out"}}catch{status="Unable to start GitHub authorization"}}
 private func inspect()async{guard let parts=repo.split(separator:"/",omittingEmptySubsequences:true).map(String.init) as [String]?,parts.count==2 else{status="Use owner/repository";return};do{let _:LibraryItem=try await APIClient.shared.get("/api/v1/github/repos/\(parts[0])/\(parts[1])",as:LibraryItem.self);status="Repository reachable"}catch{status="Repository request failed"}}
}
struct MeResponse:Decodable{let user:AuthenticatedUser}
