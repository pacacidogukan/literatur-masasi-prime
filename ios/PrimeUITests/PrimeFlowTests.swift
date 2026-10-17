import XCTest
import UIKit

final class PrimeFlowTests: XCTestCase {
    let app = XCUIApplication()
    override func setUpWithError() throws {
        continueAfterFailure = false
        app.launchArguments = ["--prime-ui-tests", "--reset-test-state"]
        app.launch()
    }
    func button(_ label: String) -> XCUIElement { app.webViews.buttons[label].firstMatch }
    func tap(_ label: String) {
        let element = button(label)
        XCTAssertTrue(element.waitForExistence(timeout: 15), "Missing button: \(label)")
        element.tap()
    }
    func toggleFavorite(_ label: String) {
        let element = app.webViews.switches[label].firstMatch
        XCTAssertTrue(element.waitForExistence(timeout: 15), app.debugDescription)
        app.coordinate(withNormalizedOffset: .zero)
            .withOffset(CGVector(dx: element.frame.midX, dy: element.frame.midY)).tap()
        let nextLabel = label.contains("favorilerden çıkar")
            ? label.replacingOccurrences(of: "favorilerden çıkar", with: "favorilere ekle")
            : label.replacingOccurrences(of: "favorilere ekle", with: "favorilerden çıkar")
        XCTAssertTrue(app.webViews.switches[nextLabel].firstMatch.waitForExistence(timeout: 15),
                      "Favorite state did not change after the tap.")
    }
    func login(_ code: String = "654321") {
        for (index, digit) in code.enumerated() {
            let field = app.webViews.textFields["Kodun \(index + 1). hanesi"]
            XCTAssertTrue(field.waitForExistence(timeout: 15))
            field.tap(); field.typeText(String(digit))
        }
        tap("Giriş yap")
    }
    func relaunch() {
        app.terminate()
        app.launchArguments.removeAll { $0 == "--reset-test-state" }
        app.launch()
    }
    func home() { XCTAssertTrue(button("Ana Sayfa").waitForExistence(timeout: 15), app.debugDescription) }
    func openInbox() {
        let bell = app.webViews.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Bildirimlerim")).firstMatch
        XCTAssertTrue(bell.waitForExistence(timeout: 15)); bell.tap()
    }
    func testLoginPersistenceAndLogout() {
        login(); home(); relaunch(); home()
        tap("Ayarları aç"); tap("Çıkış Yap")
        XCTAssertTrue(button("Giriş yap").waitForExistence(timeout: 15))
        relaunch()
        XCTAssertTrue(button("Giriş yap").waitForExistence(timeout: 15))
        XCTAssertFalse(button("Ana Sayfa").exists)
    }
    func testCampaignWebsiteOpensSafariAndPreservesSession() {
        login(); home(); tap("Markalar"); tap("Solgar kampanyasını aç")
        let link = app.webViews.links["Solgar web sitesini aç"].firstMatch
        XCTAssertTrue(link.waitForExistence(timeout: 15))
        link.tap()
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        let foreground = NSPredicate(format: "state == %d", XCUIApplication.State.runningForeground.rawValue)
        let safariOpened = expectation(for: foreground, evaluatedWith: safari)
        let result = XCTWaiter.wait(for: [safariOpened], timeout: 20)
        if result != .completed { print("EXTERNAL_APP_STATE: \(app.debugDescription)"); print("SAFARI_STATE: \(safari.debugDescription)") }
        XCTAssertEqual(result, .completed)
        app.activate()
        XCTAssertTrue(button("Kodu açmak için sağa kaydır veya Enter tuşuna bas").waitForExistence(timeout: 15))
        let opened = app.staticTexts["prime-test-external-url"]
        XCTAssertTrue(opened.waitForExistence(timeout: 15))
        XCTAssertEqual(opened.label, "https://example.com/prime-test")
        tap("Geri"); home()
    }
    func testNotificationsAreHidden() {
        login(); home()
        XCTAssertEqual(app.webViews.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Bildirimlerim")).count, 0)
        tap("Ayarları aç")
        XCTAssertEqual(app.webViews.switches.matching(NSPredicate(format: "label CONTAINS %@", "Bildirim")).count, 0)
        XCTAssertFalse(button("Bildirimlerim").exists)
        relaunch(); home()
        XCTAssertEqual(app.webViews.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Bildirimlerim")).count, 0)
    }
    func testInvalidCodeIsRejected() {
        login("000000")
        XCTAssertTrue(app.webViews.staticTexts["Kod geçersiz."].waitForExistence(timeout: 15))
        XCTAssertFalse(button("Ana Sayfa").exists)
    }
    func testFavoritesPersistAndCanBeRemoved() {
        login(); home(); tap("Markalar"); tap("Solgar kampanyasını aç")
        toggleFavorite("Solgar favorilere ekle"); relaunch(); home(); tap("Favoriler")
        tap("Solgar kampanyasını aç"); toggleFavorite("Solgar favorilerden çıkar")
        relaunch(); home(); tap("Favoriler")
        XCTAssertTrue(app.webViews.staticTexts["Henüz favorin yok"].waitForExistence(timeout: 15))
        XCTAssertFalse(button("Solgar kampanyasını aç").exists)
    }
    func testSwipeRevealsAndCopiesCampaignCode() {
        login(); home(); tap("Markalar"); tap("Solgar kampanyasını aç")
        let thumb = button("Kodu açmak için sağa kaydır veya Enter tuşuna bas")
        XCTAssertTrue(thumb.waitForExistence(timeout: 15))
        let start = thumb.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        start.press(forDuration: 0.1, thenDragTo: start.withOffset(CGVector(dx: app.frame.width * 0.72, dy: 0)))
        XCTAssertTrue(app.webViews.staticTexts["SPRING26"].waitForExistence(timeout: 15))
        let copy = button("Kopyala")
        XCTAssertTrue(copy.waitForExistence(timeout: 15))
        // Use window coordinates for the fixed WKWebView footer's physical tap.
        app.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: copy.frame.midX, dy: copy.frame.midY)).tap()
        let clipboard = app.staticTexts["prime-test-clipboard"]
        XCTAssertTrue(clipboard.waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertEqual(clipboard.label, "SPRING26")
    }
}
