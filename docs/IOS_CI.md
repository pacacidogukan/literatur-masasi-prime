# Otomatik iOS kontrolleri

`main` dalına gönderilen değişikliklerde ve pull request açıldığında GitHub Actions çalışır.

- İstemci ve native köprü davranış testleri; bildirim okuma, yenileme yarışı ve hata mesajları dahil.
- SQLite ile backend kalıcılık ve yetkilendirme testleri.
- macOS üzerinde yerel imzalı iOS Simulator derlemesi ve altı XCTest UI senaryosu.
- Ekran görüntüleri ve XCTest sonuçları `prime-ios-simulator` çıktısındaki `PrimeUI.xcresult` içinde saklanır.

Bu süreç App Store/TestFlight dağıtımı yapmaz ve canlı sisteme bildirim göndermez.
UI testleri giriş/çıkış ve oturum kalıcılığı, geçersiz kod, favorilerin kalıcılığı ve
kaldırılması, kaydırarak kod açma ve native pano içeriği, bildirim okuma kalıcılığı,
bildirim kaydetme hatası senaryolarını kapsar. Debug derlemesinde açık bir başlatma
argümanıyla URLSession taşıması örnek yanıtlarla değiştirilir; gerçek WKWebView,
mesaj köprüsü, Keychain ve yerel depolama kullanılır. Test Keychain alanı ayrıdır.
Örnek API tüm ağ isteklerini yakalar; canlı sisteme bağlanmaz. Release derlemesinde
bu kod derlenmez. Canlı API entegrasyonu ve fiziksel cihaz doğrulaması ayrıca gerekir.
Apple hesabı veya erişim kodu CI içine eklenmez.

Özel depodaki macOS işleri GitHub Actions kotasını tüketir. Kota veya hesap
doğrulaması nedeniyle iş çalışmazsa Actions sayfasında gösterilen nedeni inceleyin.

Kopyalama sonucu uygulamanın kendi sürecinde gerçek `UIPasteboard.general.string` değeri okunarak doğrulanır. Bu değer yalnızca açık test modu ve Debug derlemesinde native bir erişilebilirlik etiketiyle XCTest tarafından kontrol edilir. Release sürümünde bu etiket ve test kodu derlenmez.
