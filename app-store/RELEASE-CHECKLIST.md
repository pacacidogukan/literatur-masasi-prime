# App Store 1.0 yayın hazırlığı
18 Ekim 2026

## Doğrulanan sürüm
- TestFlight 111.1; Apple VALID; altı iPhone testi başarılı.
- Kullanıcı üç değişikliği fiziksel cihazda doğruladı: ana ekran adı Prime, bildirimler yok, kampanya web adresi yalnızca metin.
- App Store adı Literatür Masası Prime olarak korunur.
- App Store 1.0 PREPARE_FOR_SUBMISSION durumunda. İncelemeye gönderilmedi.

## Hazırlanan mağaza metni
metadata.tr.json Türkçe açıklama, tanıtım metni, alt başlık ve anahtar kelimeleri içerir.
Eksik URL alanları uydurulmamıştır; yalnızca doğrulanmış içerik Apple taslağına kaydedilir.

## Tamamlanması gerekenler
- Zoho EU üzerinde marka@literaturmasasi.com oluşturuldu; alan adı, MX, SPF ve DKIM Zoho tarafından doğrulandı.
- Destek sayfası https://literaturmasasi.com/destek yayımlandı; App Store supportUrl ve marketingUrl kaydedilip API ile geri okunarak doğrulandı.
- Bireysel yayıncının yasal kimliği, hukuki veri işleme/aktarım düzeni ve Apple inceleme telefonu tamamlanacak.
- Kamuya açık, çalışan gizlilik ve destek sayfaları; uygulama içindeki deneme metninin bunlarla uyumlanması.
- Gizlilik beyanı: kodla erişim için rastgele oturum kimliği ve erişim hakkı sunucuda; kurulum/ağ kaynaklı giriş denemesi sınırlandırma özetleri; kimliğe bağlanmayan kampanya kodu açılma olayları. Fotoğraf ve favoriler yalnızca cihazda. Bildirim özelliği kapalı.
- Gizlilik manifesti ve App Store Connect veri beyanı: son veri akışına göre ayrı ayrı doğrulanacak. Henüz yayımlanmış beyan yok.
- Yaş derecelendirme anketi, kategori, içerik hakları, fiyat/bölge seçimi.
- App Review için kesintisiz çalışan özel erişim kodu; inceleme iletişim bilgileri Apple'a özel girilecek, herkese açık depoya konmayacak.
- Örnek kampanyaların gerçek indirim/iş birliği iddiası taşımaması. Gerçek kampanyalar için hak ve anlaşmaların doğrulanması.
- Kullanıcının seçtiği üç görsel 1–2–3 sırasıyla Apple taslağına yüklendi; tümü COMPLETE. Üçüncü görseldeki web yönlendirme düğmesi kullanıcı talebiyle kaldırıldı.
- Son aday build, güncel sözleşme/gizlilik içeriyorsa yeni TestFlight doğrulaması.
- İncelemeye gönderim öncesi hazır taslak kullanıcıya gösterilecek.

## Ekran görüntüleri
Kullanıcının sağladığı üç pazarlama görseli kullanılır; 1320×2868 JPEG, APP_IPHONE_67 seti.
Oranlar korunur. Apple işleme kontrolü üç dosyada da COMPLETE olarak doğrulandı.

## 18 Ekim güncel denetim
App Store 1.0 hâlâ PREPARE_FOR_SUBMISSION. Derleme seçimi, inceleme iletişimi/kodu, gizlilik, yaş anketi, kategori, içerik hakları ve fiyat/bölgeler tamamlanmadan gönderilmez.
Apple 5.1.1(v), otomatik oluşturulan misafir hesaplarını da silme akışı kapsamına alır. Mevcut mobil oturum modeline uygulanabilirliği ve çıkış/veri silme davranışı, önceki yerel veri silme menüsünü kaldırma tercihiyle birlikte netleştirilecek.
Kullanıcı kullanım kotası %5 olduğunda durulmasını istedi. Kota yüzdesi araçlarla görünür değil; kullanıcıya bu sınır bildirildi.
