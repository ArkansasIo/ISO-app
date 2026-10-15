import Foundation
import Security

final class KeychainStore {
 static let shared=KeychainStore(); private init(){}
 private let service="ArkansasIo.ISO-app"
 func set(_ value:String,for key:String)throws{let data=Data(value.utf8);let base:[String:Any]=[kSecClass as String:kSecClassGenericPassword,kSecAttrService as String:service,kSecAttrAccount as String:key];SecItemDelete(base as CFDictionary);var item=base;item[kSecValueData as String]=data;let status=SecItemAdd(item as CFDictionary,nil);guard status==errSecSuccess else{throw NSError(domain:"Keychain",code:Int(status))}}
 func get(_ key:String)->String?{let query:[String:Any]=[kSecClass as String:kSecClassGenericPassword,kSecAttrService as String:service,kSecAttrAccount as String:key,kSecReturnData as String:true,kSecMatchLimit as String:kSecMatchLimitOne];var result:CFTypeRef?;guard SecItemCopyMatching(query as CFDictionary,&result)==errSecSuccess,let data=result as? Data else{return nil};return String(data:data,encoding:.utf8)}
 func remove(_ key:String){let query:[String:Any]=[kSecClass as String:kSecClassGenericPassword,kSecAttrService as String:service,kSecAttrAccount as String:key];SecItemDelete(query as CFDictionary)}
}
