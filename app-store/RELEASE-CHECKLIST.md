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
- Bireysel yayıncı: yayınlanacak ad soyad ve destek e-posta adresi.
- Kamuya açık, çalışan gizlilik ve destek sayfaları; uygulama içindeki deneme metninin bunlarla uyumlanması.
- Gizlilik beyanı: kodla erişim için rastgele oturum kimliği ve erişim hakkı sunucuda; kurulum/ağ kaynaklı giriş denemesi sınırlandırma özetleri; kimliğe bağlanmayan kampanya kodu açılma olayları. Fotoğraf ve favoriler yalnızca cihazda. Bildirim özelliği kapalı.
- Gizlilik manifesti ve App Store Connect veri beyanı: son veri akışına göre ayrı ayrı doğrulanacak. Henüz yayımlanmış beyan yok.
- Yaş derecelendirme anketi, kategori, içerik hakları, fiyat/bölge seçimi.
- App Review için kesintisiz çalışan özel erişim kodu; inceleme iletişim bilgileri Apple'a özel girilecek, herkese açık depoya konmayacak.
- Örnek kampanyaların gerçek indirim/iş birliği iddiası taşımaması. Gerçek kampanyalar için hak ve anlaşmaların doğrulanması.
- Son görseller incelenip onaylandıktan sonra Apple taslağına yükleme.
- Son aday build, güncel sözleşme/gizlilik içeriyorsa yeni TestFlight doğrulaması.
- İncelemeye gönderim öncesi hazır taslak kullanıcıya gösterilecek.

## Ekran görüntüleri
Gerçek WKWebView/native iPhone uygulaması, Debug'a özel izole örnek verilerle çekilir.
Görseller taslaktır; gerçek indirim veya marka iş birliğini kanıtlamaz.
Kaynak ölçü 1206×2622 (iPhone 16 Pro). Büyük ekran için Apple'ın kabul ettiği ek ölçü de hazırlanmalıdır.
