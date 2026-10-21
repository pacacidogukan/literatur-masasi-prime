#if DEBUG
import Foundation

// Only enabled explicitly by UI tests. All requests are intercepted; no live API is used.
final class PrimeUITestProtocol: URLProtocol {
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func stopLoading() {}
    override func startLoading() {
        let defaults = UserDefaults(suiteName: "PrimeUITests")!
        var bytes = request.httpBody ?? Data()
        if let stream = request.httpBodyStream {
            stream.open(); defer { stream.close() }
            var buffer = [UInt8](repeating: 0, count: 4096)
            while stream.hasBytesAvailable {
                let count = stream.read(&buffer, maxLength: buffer.count)
                if count <= 0 { break }; bytes.append(contentsOf: buffer.prefix(count))
            }
        }
        let body = (try? JSONSerialization.jsonObject(with: bytes)) as? [String: Any] ?? [:]
        let route = request.url!.path.components(separatedBy: "/api/mobile/").last!
        let authorized = request.value(forHTTPHeaderField: "X-Prime-Mobile-Session") == "ui-test-session"
        var status = 200
        var result: [String: Any] = ["ok": true]
        if route == "me" { result = ["authorized": authorized, "owner": false] }
        else if route == "access" {
            if body["installationId"] as? String != nil { result = ["sessionToken": "ui-test-session"] }
            else { status = 403; result = ["error": "Kod geçersiz."] }
        } else if !authorized { status = 401; result = ["error": "Oturum gerekli."] }
        else if route == "campaigns" {
            result = ["campaigns": [["id": "solgar", "name": "Solgar", "asset": "solgar.png",
                "offer": "Test ayrıcalığı", "tag": "Test markası", "type": "Vitamin",
                "photo": "solgar-detail.jpg", "channel": "https://example.com/prime-test", "description": "Test kampanyası açıklaması",
                "conditions": "Yalnızca otomatik test verisi.", "expires": 2000000000, "demo": 1]]]
        } else if route == "reveal" { result = ["code": "SPRING26", "demo": 1] }
        else if route == "notifications" {
            result = ["enabled": true, "notifications": [["id": "test-notice", "title": "Test bildirimi",
                "body": "Okundu durumunu kontrol et.", "created": 1792150000,
                "is_read": defaults.bool(forKey: "read") ? 1 : 0]]]
        } else if route == "notifications/read" {
            if ProcessInfo.processInfo.arguments.contains("--fail-notification-read") {
                status = 503; result = ["error": "Test: bildirim kaydedilemedi."]
            } else { defaults.set(true, forKey: "read"); result = ["ok": true, "is_read": 1] }
        } else if route == "delete-account" {
            result = ["ok": true, "deleted": true]
        } else if route != "logout" && route != "notifications/preference" {
            status = 404; result = ["error": "Bilinmeyen test isteği."]
        }
        let data = try! JSONSerialization.data(withJSONObject: result)
        let response = HTTPURLResponse(url: request.url!, statusCode: status, httpVersion: "HTTP/1.1",
            headerFields: ["Content-Type": "application/json"])!
        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: data)
        client?.urlProtocolDidFinishLoading(self)
    }
}
#endif
