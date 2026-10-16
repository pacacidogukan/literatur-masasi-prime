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
    func home() { XCTAssertTrue(button("Ana Sayfa").waitForExistence(timeout: 15)) }
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
    func testInvalidCodeIsRejected() {
        login("000000")
        XCTAssertTrue(app.webViews.staticTexts["Kod geçersiz."].waitForExistence(timeout: 15))
        XCTAssertFalse(button("Ana Sayfa").exists)
    }
    func testFavoritesPersistAndCanBeRemoved() {
        login(); home(); tap("Markalar"); tap("Solgar kampanyasını aç")
        tap("Solgar favorilere ekle"); relaunch(); home(); tap("Favoriler")
        tap("Solgar kampanyasını aç"); tap("Solgar favorilerden çıkar")
        relaunch(); home(); tap("Favoriler")
        XCTAssertFalse(button("Solgar kampanyasını aç").exists)
    }
    func testSwipeRevealsAndCopiesCampaignCode() {
        login(); home(); tap("Markalar"); tap("Solgar kampanyasını aç")
        let thumb = button("Kodu açmak için sağa kaydır veya Enter tuşuna bas")
        XCTAssertTrue(thumb.waitForExistence(timeout: 15))
        let start = thumb.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5))
        start.press(forDuration: 0.1, thenDragTo: start.withOffset(CGVector(dx: app.frame.width * 0.72, dy: 0)))
        XCTAssertTrue(app.webViews.staticTexts["SPRING26"].waitForExistence(timeout: 15))
        tap("Kopyala")
        XCTAssertTrue(app.webViews.staticTexts["Kod kopyalandı"].waitForExistence(timeout: 10))
        XCTAssertEqual(UIPasteboard.general.string, "SPRING26")
    }
    func testNotificationReadPersistsAfterRefreshAndRelaunch() {
        login(); home(); openInbox(); tap("Test bildirimi, okunmamış")
        XCTAssertTrue(button("Test bildirimi").waitForExistence(timeout: 15))
        tap("Yenile")
        XCTAssertFalse(button("Test bildirimi, okunmamış").exists)
        relaunch(); home(); openInbox()
        XCTAssertTrue(button("Test bildirimi").waitForExistence(timeout: 15))
        XCTAssertFalse(button("Test bildirimi, okunmamış").exists)
    }
    func testFailedNotificationReadShowsErrorAndStaysUnread() {
        app.terminate(); app.launchArguments.append("--fail-notification-read"); app.launch()
        login(); home(); openInbox(); tap("Test bildirimi, okunmamış")
        XCTAssertTrue(app.webViews.staticTexts["Test: bildirim kaydedilemedi."].waitForExistence(timeout: 15))
        tap("Yenile")
        XCTAssertTrue(button("Test bildirimi, okunmamış").waitForExistence(timeout: 15))
    }
}
