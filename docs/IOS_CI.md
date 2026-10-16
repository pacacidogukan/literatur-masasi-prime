# Otomatik iOS kontrolleri

`main` dalına gönderilen değişikliklerde ve pull request açıldığında GitHub Actions çalışır.

- İstemci ve native köprü davranış testleri; bildirim okuma, yenileme yarışı ve hata mesajları dahil.
- SQLite ile backend kalıcılık ve yetkilendirme testleri.
- macOS üzerinde imzasız iOS Simulator derlemesi, yükleme ve başlatma.
- Giriş ekranının PNG görüntüsü, çalışmanın `prime-ios-simulator` çıktısında saklanır.

Bu süreç App Store/TestFlight dağıtımı yapmaz ve canlı sisteme bildirim göndermez.
Simülatör başlatma kontrolü tam kullanıcı arayüzü testi değildir; giriş ve kampanya
akışları istemci testlerinde taklit servisle kontrol edilir. Canlı API ve fiziksel
cihaz doğrulaması ayrıca gerekir. Apple hesabı veya erişim kodu CI içine eklenmez.

Özel depodaki macOS işleri GitHub Actions kotasını tüketir. Kota veya hesap
doğrulaması nedeniyle iş çalışmazsa Actions sayfasında gösterilen nedeni inceleyin.
