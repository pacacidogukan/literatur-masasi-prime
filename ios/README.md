# Literatür Masası Prime — iOS cihaz test projesi

Mevcut ekranları koruyan SwiftUI + WKWebView projesidir. HTML/CSS/JS ve marka varlıkları uygulama paketinde bulunur; ana ekran bir uzak web sayfası olarak yüklenmez. Kampanya ve bildirim verileri ortak backend'den alınır. GitHub Actions macOS ortamında Xcode simülatör derlemesi ve altı XCTest ekran senaryosu doğrulandı. Fiziksel iPhone ve Release dağıtım doğrulaması henüz tamamlanmadı.

## Hazır olanlar

- Altı haneli kodla, ChatGPT hesabı gerektirmeyen mobil giriş.
- Native URLSession üzerinden yalnızca izin verilen mobil API işlemleri.
- Oturum anahtarı Keychain'de, bu cihaza bağlı ve yalnızca cihaz kilidi açıkken erişilebilir tutulur. JavaScript'e veya web depolamasına gönderilmez.
- Kod süresi/iptali ve mobil oturumun 30 günlük üst sınırı sunucuda kontrol edilir.
- Çıkış oturumu sunucuda iptal eder; Keychain'deki anahtarı kaldırır.
- Native panoya kod kopyalama ve kod açılışında hafif dokunsal geri bildirim.
- Harici HTTPS bağlantıları Safari'de açılır. Harici sayfalar native API köprüsünü kullanamaz. Oturum isteklerinde yönlendirmeler takip edilmez.
- Fotoğraf seçme mevcut Misafir tercihleri akışını kullanır. Kamera/fotoğraf izinleri yalnızca kullanıcı ilgili işlemi seçtiğinde istenir.
- Admin işlevleri iOS uygulamasına açılmaz. Mevcut Sites korumalı admin paneli aynen korunur.
- iPhone hedefi, dikey görünüm; minimum iOS 15.

## Mac'te açma / ilk derleme

1. Depo kökünde `node ios/scripts/sync-web.mjs` çalıştır. Ekranları yeniden tasarlamadan güncel ortak UI'ı pakete kopyalar.
2. `ios/Prime.xcodeproj` dosyasını Xcode'da aç; **Prime** scheme'ini seç.
3. Signing & Capabilities altında kendi Apple Developer Team'ini seç. `com.literaturmasasi.prime` bundle kimliğini hesabında kullanılabilir ve sana ait bir kimlikle doğrula.
4. İlk olarak iPhone simülatöründe çalıştır. Sonra kendi iPhone'unu seçip cihaz testi yap.
5. Geçerli, kullanım hakkı olan bir 6 haneli admin erişim koduyla giriş yap. Admin oturumu mobil uygulamaya aktarılmaz.

İmzasız simülatör derlemesi (Mac/Xcode gerekir):

```sh
xcodebuild -project ios/Prime.xcodeproj -scheme Prime -configuration Debug -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' CODE_SIGNING_ALLOWED=NO build
```

## Veri akışı

Native uygulama -> public relay `/api/mobile/{işlem}` -> server-side servis yetkisi -> private backend -> D1.

Mobil oturumlar ayrı `mobile_sessions` tablosundadır; anahtarlar yalnızca SHA-256 özetiyle saklanır. Mobil istemciye backend servis anahtarı verilmez. Relay istemciden gelen Sites kullanıcı/e-posta kimliklerini iletmez. Giriş denemeleri kurulum ve ağ başına sınırlanır. Ağ adresi edge tarafından sağlanamıyorsa ortak, daha geniş bir sınır uygulanır. Kurulum kimliği kişisel telefon/e-posta veya donanım seri numarası değildir; uygulamanın ürettiği rastgele UUID'dir.

İzinli işlemler: `me`, `access`, `campaigns`, `reveal`, `notifications`, `notifications/read`, `notifications/preference`, `logout`. Hesap, admin, satış entegrasyonu ve özel editör işlemleri bu yola eklenmemiştir.

## Cihazda doğrulanacaklar

- İlk açılış, yanlış/doğru kod, kodun süresi/iptali, oturum kapatma ve yeniden açma.
- iPhone 11 ve daha yeni ekranlarda güvenli alanlar, klavye ve kaydırma.
- Kampanya detay paneli, kısa/tam sağa kaydırma, kod kopyalama ve native dokunsal geri bildirim.
- Favoriler, uygulamayı kapatıp açtıktan sonra kalıcılık, profil fotoğrafı seç/değiştir/kaldır.
- Bildirim kutusu, okundu durumu ve bildirim tercihi. Bu sürüm cihaz push bildirimi göndermez.
- İnternet kesilmesi, tekrar deneme, arka plana alma, Keychain erişimi.
- Instagram/Safari bağlantıları ve geri dönüş.

## TestFlight öncesinde tamamlanacaklar

- Release arşiv derlemesi, gerçek cihaz testi, Apple dağıtım imzalama ve provisioning.
- 1024 px opak uygulama simgesi ve son açılış varlıkları. Bu proje henüz dağıtım simgesi içermez.
- İşletmeci bilgileri, resmî iletişim ve son gizlilik/kullanıcı sözleşmesi. Bundled sözleşme mobil girişe göre uyarlanmıştır ama işletmeci bilgileri hâlâ taslaktır.
- PrivacyInfo.xcprivacy teknik başlangıç beyanıdır; App Store Connect veri beyanı gerçek son veri akışıyla birlikte doğrulanmalıdır. Push/analitik/mağaza entegrasyonları eklendiğinde yeniden değerlendirilmelidir.
- App Store ekranları ve inceleme için çalışan erişim kodu. Bu proje App Store kabul garantisi değildir; cihaz sürümü üzerinde kullanım ve içerik incelemesi tamamlanmalıdır.

## Kontroller

`node tests/client.cjs`, `node tests/ios.cjs`, `node tests/server.cjs`, `npx tsc --noEmit`.

`tests/ios.cjs` native pakete uyarlanan UI akışlarını JavaScript ortamında sınar; Swift derlemesi veya WebKit/iPhone testi yerine geçmez.


## Otomatik iPhone ekran testleri

`.github/workflows/ios.yml`, her main push ve pull request için istemci, native köprü, backend ve iPhone simülatör kontrollerini çalıştırır.

Doğrulanan son çalışma: [38933705368](https://github.com/pacacidogukan/literatur-masasi-prime/actions/runs/38933705368), commit `41a28da725341a35ee162a725e19ebe4227b2c86`. Altı senaryo, sıfır hata:

- Geçersiz giriş kodunun reddedilmesi.
- Oturumun yeniden açılışta korunması ve çıkış sonrası kapalı kalması.
- Favori ekleme, yeniden açılışta kalıcılık ve kaldırma.
- Bildirimin okundu durumunun yenileme ve yeniden açılışta korunması.
- Bildirim kaydetme hatasının gösterilmesi ve bildirimin okunmamış kalması.
- Sağa kaydırarak kampanya kodunu açma ve gerçek native panoya `SPRING26` kopyalama.

Ekran testleri Debug sürümüne özel örnek API yanıtları kullanır; canlı backend ile uçtan uca cihaz testi değildir. Kopyalama testi uygulama sürecindeki gerçek `UIPasteboard` değerini doğrular. Ayrı backend testleri kalıcılık ve yetkilendirmeyi sınar. Test araçları Release sürümünde bulunmamalıdır.

Bu sonuçlar fiziksel cihaz, fotoğraf izinleri, gerçek ağ kesintisi, Release imzalama veya TestFlight doğrulaması anlamına gelmez.
