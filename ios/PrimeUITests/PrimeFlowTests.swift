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
        if label == "Profili aç" || label == "Geri" {
            // WKWebView accessibility activation can miss header controls on iPad.
            // Touch the element itself so window positioning is respected.
            element.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
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
        XCTAssertTrue(app.webViews.staticTexts["Marka Kampanyaları"].waitForExistence(timeout: 15))
        XCTAssertEqual(app.webViews.switches.matching(NSPredicate(format: "label CONTAINS %@", "favorilere")).count, 0)
        tap("Solgar: Test ayrıcalığı")
    }
    func testBottomNavigationDoubleTapsDoNotZoom() {
        home()
        let labels = ["Ana Sayfa", "Markalar", "Kampanyalar", "Favoriler"]
        let web = app.webViews.firstMatch
        func point(_ x: CGFloat, _ y: CGFloat) -> XCUICoordinate {
            app.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: x, dy: y))
        }
        func settle() {
            // Wait through WebKit's double-tap recognition and zoom animation.
            let pause = expectation(description: "Smart zoom settled")
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.7) { pause.fulfill() }
            wait(for: [pause], timeout: 2)
        }
        for label in labels {
            tap(label)
            let before = labels.map { button($0).frame }
            let frame = web.frame
            var points = [CGPoint(x: frame.minX + 2, y: before[0].midY),
                          CGPoint(x: frame.maxX - 2, y: before[0].midY),
                          CGPoint(x: frame.midX, y: frame.maxY - 2)]
            for i in 0..<3 {
                points.append(CGPoint(x: (before[i].maxX + before[i+1].minX)/2, y: before[i].midY))
            }
            for p in points {
                point(p.x, p.y).doubleTap(); settle()
                for (i, name) in labels.enumerated() {
                    let after = button(name).frame
                    XCTAssertEqual(after.width, before[i].width, accuracy: 1, "Zoom after blank-area tap: \(label)")
                    XCTAssertEqual(after.minX, before[i].minX, accuracy: 1)
                    XCTAssertEqual(after.minY, before[i].minY, accuracy: 1)
                }
            }
            button(label).coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).doubleTap()
            settle()
            XCTAssertEqual(button(label).frame.width, before[labels.firstIndex(of: label)!].width, accuracy: 1)
        }
        tap("Markalar")
        XCTAssertTrue(button("Solgar kampanyalarını aç").waitForExistence(timeout: 15))
        tap("Favoriler")
        XCTAssertTrue(app.webViews.staticTexts["Henüz favorin yok"].waitForExistence(timeout: 15))
        tap("Ana Sayfa"); home()
    }
    func testAppScreensKeepTheirScaleDuringPinchAndLongPress() {
        home()
        let web = app.webViews.firstMatch
        let nav = button("Ana Sayfa")
        for label in ["Ana Sayfa", "Markalar", "Kampanyalar", "Favoriler"] {
            tap(label)
            let before = nav.frame
            XCTAssertFalse(before.isEmpty, label)
            func assertScaleIsUnchanged() {
                let after = nav.frame
                XCTAssertEqual(after.width, before.width, accuracy: 1, label)
                XCTAssertEqual(after.minX, before.minX, accuracy: 1, label)
                XCTAssertEqual(after.minY, before.minY, accuracy: 1, label)
            }

            web.pinch(withScale: 1.6, velocity: 1)
            assertScaleIsUnchanged()
            web.pinch(withScale: 0.65, velocity: -1)
            assertScaleIsUnchanged()
            web.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.34))
                .press(forDuration: 1.0)
            assertScaleIsUnchanged()
        }
        tap("Markalar")
        XCTAssertTrue(button("Solgar kampanyalarını aç").waitForExistence(timeout: 15))
    }

    func testProfileNamePersists() {
        login(); tap("Profili aç"); tap("Profili düzenle")
        let expectedName = "Test Kullanıcısı"
        let name = app.webViews.textFields["Profil adı"].firstMatch
        XCTAssertTrue(name.waitForExistence(timeout: 15))
        name.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        name.typeText(expectedName)
        XCTAssertEqual(name.value as? String, expectedName, app.debugDescription)
        tap("İsmi kaydet")
        XCTAssertTrue(app.webViews.descendants(matching: .any).matching(NSPredicate(format: "label CONTAINS %@", "İsmin kaydedildi.")).firstMatch.waitForExistence(timeout: 15), app.debugDescription)
        tap("Geri"); tap("Profili düzenle")
        XCTAssertEqual(name.value as? String, expectedName, app.debugDescription)
        relaunch(); home(); tap("Profili aç"); tap("Profili düzenle")
        XCTAssertTrue(name.waitForExistence(timeout: 15))
        XCTAssertEqual(name.value as? String, expectedName, app.debugDescription)
    }
    func testAutomaticOpeningAndPersistence() { login(); relaunch(); home(); tap("Profili aç"); XCTAssertFalse(button("Çıkış Yap").exists) }
    func testDeleteAccessAndLocalData() { login(); tap("Profili aç");tap("Verilerimi sil");tap("Verileri sil");home();relaunch();home();tap("Favoriler");XCTAssertTrue(app.webViews.staticTexts["Henüz favorin yok"].waitForExistence(timeout:15)) }
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
        tap("Profili aç")
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
        search.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
        search.typeText("Test ayrıcalığı")
        XCTAssertTrue(button("Solgar: Test ayrıcalığı").waitForExistence(timeout: 15))
        tap("Solgar: Test ayrıcalığı")
        XCTAssertTrue(app.webViews.staticTexts["Prime Ayrıcalıkları"].waitForExistence(timeout: 15))
        tap("Geri")
        tap("Markalar")
        let brandSearch = app.webViews.textFields["Marka veya kampanya ara"].firstMatch
        brandSearch.coordinate(withNormalizedOffset: CGVector(dx: 0.5, dy: 0.5)).tap()
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
        tap("Profili aç")
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
        try capture("01-home")
        // A clickable collapsed poster is still a layout failure (WKWebView flex/ratio regression).
        XCTAssertGreaterThan(firstOffer.frame.height, firstOffer.frame.width,
                             "The first portrait campaign card collapsed or lost its format.")
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
        let trackTaps: [CGFloat] = [0.45, 0.94]
        for position in trackTaps {
            thumb.coordinate(withNormalizedOffset: CGVector(dx: position, dy: 0.5)).tap()
            XCTAssertFalse(app.webViews.staticTexts["SPRING26"].exists)
        }
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

