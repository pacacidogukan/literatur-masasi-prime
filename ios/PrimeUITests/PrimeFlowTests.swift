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
        if label == "Ayarları aç" {
            // Use a physical touch for the freshly rendered WKWebView header control.
            app.coordinate(withNormalizedOffset: .zero)
                .withOffset(CGVector(dx: element.frame.midX, dy: element.frame.midY)).tap()
        } else {
            element.tap()
        }
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
    func login() { home(); XCTAssertFalse(button("Giriş yap").exists); XCTAssertEqual(app.webViews.textFields.matching(NSPredicate(format: "label BEGINSWITH %@", "Kodun ")).count, 0) }
    func relaunch() {
        app.terminate()
        app.launchArguments.removeAll { $0 == "--reset-test-state" }
        app.launch()
    }
    func home() { XCTAssertTrue(button("Ana Sayfa").waitForExistence(timeout: 45), app.debugDescription) }
    func openInbox() {
        let bell = app.webViews.buttons.matching(NSPredicate(format: "label BEGINSWITH %@", "Bildirimlerim")).firstMatch
        XCTAssertTrue(bell.waitForExistence(timeout: 15)); bell.tap()
    }
    func openSolgarCampaign() {
        tap("Markalar")
        tap("Solgar kampanyalarını aç")
        XCTAssertTrue(app.webViews.staticTexts["Markanın kampanyaları"].waitForExistence(timeout: 15))
        XCTAssertEqual(app.webViews.switches.matching(NSPredicate(format: "label CONTAINS %@", "favorilere")).count, 0)
        tap("Solgar: Test ayrıcalığı")
    }
    func testAutomaticOpeningAndPersistence() { login(); relaunch(); home(); tap("Ayarları aç"); XCTAssertFalse(button("Çıkış Yap").exists) }
    func testDeleteAccessAndLocalData() { login(); tap("Ayarları aç");tap("Verilerimi sil");tap("Verileri sil");home();relaunch();home();tap("Favoriler");XCTAssertTrue(app.webViews.staticTexts["Henüz favorin yok"].waitForExistence(timeout:15)) }
    func testCampaignWebsiteIsDisplayedWithoutNavigation() {
        login(); home(); openSolgarCampaign()
        let address = app.webViews.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "example.com")).firstMatch
        XCTAssertTrue(address.waitForExistence(timeout: 15), app.debugDescription)
        XCTAssertEqual(app.webViews.links.matching(NSPredicate(format: "label CONTAINS %@", "web sitesini aç")).count, 0)
        address.tap()
        XCTAssertEqual(app.state, .runningForeground)
        XCTAssertTrue(app.webViews.sliders["Kodu açmak için sağa kaydır veya sağ ok tuşunu kullan"].exists)
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
    func testNoCredentialInputOnOpening() { login(); XCTAssertFalse(button("Giriş yap").exists) }
    func testFavoritesPersistAndCanBeRemoved() {
        login(); home(); openSolgarCampaign()
        toggleFavorite("Solgar favorilere ekle"); relaunch(); home(); tap("Favoriler")
        tap("Solgar kampanyasını aç"); toggleFavorite("Solgar favorilerden çıkar")
        relaunch(); home(); tap("Favoriler")
        XCTAssertTrue(app.webViews.staticTexts["Henüz favorin yok"].waitForExistence(timeout: 15))
        XCTAssertFalse(button("Solgar kampanyasını aç").exists)
    }
    func testCodelessCampaignHasWebsiteActionOnly() {
        login(); tap("Markalar"); tap("Test Markası kampanyalarını aç")
        tap("Test Markası: Kod gerektirmeyen ayrıcalık")
        XCTAssertTrue(app.webViews.links["Kampanya sayfasına git"].firstMatch.waitForExistence(timeout: 15))
        XCTAssertEqual(app.webViews.sliders.count, 0)
        XCTAssertFalse(button("Kopyala").exists)
    }
    func testSearchFindsBrandsAndCampaignTitles() {
        login()
        let search = app.webViews.textFields["Marka veya kampanya ara"].firstMatch
        XCTAssertTrue(search.waitForExistence(timeout: 15))
        search.tap()
        search.typeText("Test ayrıcalığı")
        XCTAssertTrue(button("Solgar: Test ayrıcalığı").waitForExistence(timeout: 15))
        tap("Solgar: Test ayrıcalığı")
        XCTAssertTrue(app.webViews.staticTexts["Prime Ayrıcalıkları"].waitForExistence(timeout: 15))
        tap("Geri")
        tap("Markalar")
        let brandSearch = app.webViews.textFields["Marka veya kampanya ara"].firstMatch
        brandSearch.tap()
        brandSearch.typeText("Test ayrıcalığı")
        XCTAssertTrue(button("Solgar: Test ayrıcalığı").waitForExistence(timeout: 15))
        tap("Solgar: Test ayrıcalığı")
        XCTAssertTrue(app.webViews.staticTexts["Prime Ayrıcalıkları"].waitForExistence(timeout: 15))
    }
    func testFavoriteAppearsImmediatelyAndSettingsOpen() {
        login()
        openSolgarCampaign()
        toggleFavorite("Solgar favorilere ekle")
        tap("Geri")
        tap("Favoriler")
        let favoriteCard = button("Solgar kampanyasını aç")
        XCTAssertTrue(favoriteCard.waitForExistence(timeout: 15))
        let favoriteSize = favoriteCard.frame.size
        XCTAssertGreaterThan(favoriteSize.width, favoriteSize.height, "Favorite card must be landscape.")
        XCTAssertEqual(favoriteSize.height, 108, accuracy: 2)
        let bookmark = app.webViews.switches["Solgar favorilerden çıkar"].firstMatch
        XCTAssertTrue(bookmark.exists)
        XCTAssertGreaterThanOrEqual(bookmark.frame.width, 43)
        let screenshot = XCUIScreen.main.screenshot()
        let directory = FileManager.default.temporaryDirectory.appendingPathComponent("prime-review-screenshots")
        try? FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        try? screenshot.pngRepresentation.write(to: directory.appendingPathComponent("04-favorites.png"))
        tap("Markalar")
        let brandCard = button("Solgar kampanyalarını aç")
        XCTAssertTrue(brandCard.waitForExistence(timeout: 15))
        XCTAssertEqual(brandCard.frame.height, favoriteSize.height, accuracy: 2)
        XCTAssertEqual(brandCard.frame.width, favoriteSize.width, accuracy: 2)
        tap("Ana Sayfa")
        tap("Ayarları aç")
        tap("Gizlilik")
        XCTAssertTrue(app.webViews.staticTexts["Literatür Masası Prime Gizlilik Bilgilendirmesi"].waitForExistence(timeout: 15))
        tap("Geri")
        tap("Kullanıcı Sözleşmesi")
        XCTAssertTrue(app.webViews.staticTexts["Literatür Masası Prime Kullanıcı Sözleşmesi"].waitForExistence(timeout: 15))
    }
    func testLiveStoreScreenshots() throws {
        app.terminate()
        app.launchArguments = ["--prime-ui-tests", "--reset-test-state", "--prime-live-check"]
        app.launch()
        home()
        let firstOffer = app.webViews.buttons.matching(NSPredicate(format: "label CONTAINS %@", ": ")).firstMatch
        XCTAssertTrue(firstOffer.waitForExistence(timeout: 30), app.debugDescription)
        func capture(_ name: String) throws {
            // Allow the visible remote campaign artwork to finish decoding.
            Thread.sleep(forTimeInterval: 4)
            let screenshot = XCUIScreen.main.screenshot()
            let directory = FileManager.default.temporaryDirectory.appendingPathComponent("prime-review-screenshots")
            try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
            try screenshot.pngRepresentation.write(to: directory.appendingPathComponent(name + ".png"))
            let attachment = XCTAttachment(screenshot: screenshot)
            attachment.name = name
            attachment.lifetime = .keepAlways
            add(attachment)
        }
        // A clickable collapsed poster is still a layout failure (WKWebView flex/ratio regression).
        XCTAssertGreaterThan(firstOffer.frame.height, firstOffer.frame.width,
                             "The first portrait campaign card collapsed or lost its format.")
        try capture("01-home")
        // WKWebView virtual activation can miss freshly loaded image buttons.
        // Send the same physical touch used for the native header and copy footer.
        app.coordinate(withNormalizedOffset: .zero)
            .withOffset(CGVector(dx: firstOffer.frame.midX, dy: firstOffer.frame.midY)).tap()
        XCTAssertTrue(app.webViews.staticTexts["Prime Ayrıcalıkları"].waitForExistence(timeout: 15), app.debugDescription)
        try capture("02-campaign")
        tap("Geri")
        tap("Markalar")
        XCTAssertTrue(app.webViews.buttons.matching(NSPredicate(format: "label ENDSWITH %@", "kampanyalarını aç")).firstMatch.waitForExistence(timeout: 15))
        try capture("03-brands")
    }
    func testSwipeRevealsAndCopiesCampaignCode() {
        login(); home(); openSolgarCampaign()
        let thumb = app.webViews.sliders["Kodu açmak için sağa kaydır veya sağ ok tuşunu kullan"].firstMatch
        XCTAssertTrue(thumb.waitForExistence(timeout: 15))
        let start = thumb.coordinate(withNormalizedOffset: CGVector(dx: 0.08, dy: 0.5))
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

