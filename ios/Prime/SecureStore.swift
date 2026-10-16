import Foundation
import Security

struct SecureStore {
    static let service = "LiteraturMasasiPrime.Session"
    static func read(_ account: String) -> String? {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service, kSecAttrAccount as String: account,
            kSecReturnData as String: true, kSecMatchLimit as String: kSecMatchLimitOne]
        var result: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &result) == errSecSuccess,
              let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }
    static func write(_ value: String, account: String) throws {
        let query: [String: Any] = [kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service, kSecAttrAccount as String: account]
        let values: [String: Any] = [kSecValueData as String: Data(value.utf8),
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
        let updated = SecItemUpdate(query as CFDictionary, values as CFDictionary)
        if updated == errSecItemNotFound {
            let status = SecItemAdd(query.merging(values) { _, new in new } as CFDictionary, nil)
            guard status == errSecSuccess else { throw StoreError.unavailable }
        } else if updated != errSecSuccess { throw StoreError.unavailable }
    }
    static func clear(_ account: String) {
        SecItemDelete([kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service, kSecAttrAccount as String: account] as CFDictionary)
    }
    static func installationID() throws -> String {
        if let value = read("installation") { return value }
        let value = UUID().uuidString
        try write(value, account: "installation")
        return value
    }
    enum StoreError: LocalizedError {
        case unavailable
        var errorDescription: String? { "Güvenli oturum saklanamadı. Lütfen tekrar dene." }
    }
}
