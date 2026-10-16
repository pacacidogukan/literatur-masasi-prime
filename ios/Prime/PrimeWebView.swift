import SwiftUI
import WebKit
import UIKit

struct PrimeWebView: UIViewRepresentable {
    func makeCoordinator() -> Coordinator { Coordinator() }
    func makeUIView(context: Context) -> WKWebView {
        let configuration = WKWebViewConfiguration()
        #if DEBUG
        if ProcessInfo.processInfo.arguments.contains("--prime-ui-tests") {
            if ProcessInfo.processInfo.arguments.contains("--reset-test-state") {
                SecureStore.clear("session")
                UserDefaults(suiteName: "PrimeUITests")?.removePersistentDomain(forName: "PrimeUITests")
                configuration.userContentController.addUserScript(WKUserScript(source: "localStorage.clear();", injectionTime: .atDocumentStart, forMainFrameOnly: true))
            }
        }
        #endif
        configuration.userContentController.addScriptMessageHandler(context.coordinator, contentWorld: .page, name: "primeAPI")
        let view = WKWebView(frame: .zero, configuration: configuration)
        view.navigationDelegate = context.coordinator
        view.uiDelegate = context.coordinator
        view.isOpaque = false
        view.backgroundColor = .white
        view.scrollView.contentInsetAdjustmentBehavior = .never
        view.allowsBackForwardNavigationGestures = false
        if let root = Bundle.main.url(forResource: "Web", withExtension: nil),
           FileManager.default.fileExists(atPath: root.appendingPathComponent("index.html").path) {
            context.coordinator.webRoot = root.standardizedFileURL
            view.loadFileURL(root.appendingPathComponent("index.html"), allowingReadAccessTo: root)
        }
        return view
    }
    func updateUIView(_ view: WKWebView, context: Context) {}
    static func dismantleUIView(_ view: WKWebView, coordinator: Coordinator) {
        view.configuration.userContentController.removeScriptMessageHandler(forName: "primeAPI", contentWorld: .page)
        view.navigationDelegate = nil
        view.uiDelegate = nil
        view.stopLoading()
    }

    final class Coordinator: NSObject, WKScriptMessageHandlerWithReply, WKNavigationDelegate, WKUIDelegate {
        var webRoot: URL?
        private let apiRoot = URL(string: "https://prime-campaign-editor.sunlitcreek513.chatgpt.site/api/mobile/")!
        private let redirectGuard = NoRedirect()
        private lazy var session: URLSession = {
            let config = URLSessionConfiguration.ephemeral
            #if DEBUG
            if ProcessInfo.processInfo.arguments.contains("--prime-ui-tests") {
                config.protocolClasses = [PrimeUITestProtocol.self]
            }
            #endif
            config.timeoutIntervalForRequest = 20
            config.httpShouldSetCookies = false
            config.urlCache = nil
            return URLSession(configuration: config, delegate: redirectGuard, delegateQueue: nil)
        }()
        private let methods = ["me":"GET", "access":"POST", "campaigns":"GET", "reveal":"POST",
            "notifications":"GET", "notifications/read":"POST", "notifications/preference":"POST", "logout":"POST"]

        func userContentController(_ userContentController: WKUserContentController, didReceive message: WKScriptMessage,
                                   replyHandler: @escaping (Any?, String?) -> Void) {
            guard message.frameInfo.isMainFrame,
                  let source = message.frameInfo.request.url, isLocal(source),
                  let payload = message.body as? [String: Any], let path = payload["path"] as? String else {
                replyHandler(nil, "Bu sayfaya erişim izni verilmedi."); return
            }
            if path == "copy" {
                guard let body = payload["body"] as? [String: Any], let text = body["text"] as? String, text.count <= 1000 else {
                    replyHandler(nil, "Kopyalanacak metin geçersiz."); return
                }
                UIPasteboard.general.string = text
                replyHandler(["status":200, "data":["ok":true]], nil); return
            }
            guard let method = methods[path] else { replyHandler(nil, "İşlem desteklenmiyor."); return }
            let requestBody = payload["body"] as? [String: Any] ?? [:]
            Task { @MainActor in
                var body = requestBody
                do {
                    if path == "access" { body["installationId"] = try SecureStore.installationID() }
                    var request = URLRequest(url: apiRoot.appendingPathComponent(path))
                    request.httpMethod = method
                    request.setValue("application/json", forHTTPHeaderField: "Accept")
                    if method == "POST" {
                        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
                        request.httpBody = try JSONSerialization.data(withJSONObject: body)
                    }
                    if let token = SecureStore.read("session") { request.setValue(token, forHTTPHeaderField: "X-Prime-Mobile-Session") }
                    let (data, response) = try await session.data(for: request)
                    guard let http = response as? HTTPURLResponse,
                          http.value(forHTTPHeaderField: "Content-Type")?.contains("application/json") == true,
                          var result = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                        throw BridgeError.invalidResponse
                    }
                    if (200..<300).contains(http.statusCode), path == "access" {
                        guard let token = result.removeValue(forKey: "sessionToken") as? String else { throw BridgeError.invalidResponse }
                        try SecureStore.write(token, account: "session")
                    }
                    if http.statusCode == 401 || path == "logout" || (path == "me" && result["authorized"] as? Bool == false) {
                        SecureStore.clear("session")
                    }
                    if path == "reveal", (200..<300).contains(http.statusCode) {
                        UINotificationFeedbackGenerator().notificationOccurred(.success)
                    }
                    replyHandler(["status":http.statusCode, "data":result], nil)
                } catch {
                    if path == "logout" { SecureStore.clear("session") }
                    replyHandler(nil, "Bağlantı kurulamadı. İnternet bağlantını kontrol edip tekrar dene.")
                }
            }
        }
        private func isLocal(_ url: URL) -> Bool {
            guard url.isFileURL, let root = webRoot else { return false }
            return url.standardizedFileURL.path.hasPrefix(root.path + "/")
        }
        func webView(_ webView: WKWebView, decidePolicyFor navigationAction: WKNavigationAction,
                     decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
            guard let url = navigationAction.request.url else { decisionHandler(.cancel); return }
            if isLocal(url) { decisionHandler(.allow); return }
            if navigationAction.navigationType == .linkActivated, url.scheme == "https" { UIApplication.shared.open(url) }
            decisionHandler(.cancel)
        }
        func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                     for navigationAction: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
            if navigationAction.navigationType == .linkActivated,
               let url = navigationAction.request.url, url.scheme == "https" { UIApplication.shared.open(url) }
            return nil
        }
        enum BridgeError: Error { case invalidResponse }
    }
}

private final class NoRedirect: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask, willPerformHTTPRedirection response: HTTPURLResponse,
                    newRequest request: URLRequest, completionHandler: @escaping (URLRequest?) -> Void) {
        completionHandler(nil)
    }
}
