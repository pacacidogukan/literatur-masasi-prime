# App Store 1.0 yayın hazırlığı
18 Ekim 2026

## Kaydedilen mağaza bilgileri
- App Store adı Literatür Masası Prime; telefon ana ekran adı Prime.
- Türkçe açıklama, tanıtım metni, anahtar kelimeler ve Sana özel marka ayrıcalıkları alt başlığı Apple taslağında doğrulandı.
- Kullanıcının seçtiği 3 görsel 1–2–3 sırasıyla APP_IPHONE_67 setinde COMPLETE; 1320×2868 JPEG. Üçüncü görseldeki web düğmesi kullanıcı talebiyle kaldırıldı.
- Kategori Shopping / Alışveriş; yaş anketi kullanıcının açık onayıyla kaydedildi. Apple 172 bölgede 9+ hesapladı; bölgesel istisnalar var.
- İçerik hakları: kullanıcının açık talimatıyla USES_THIRD_PARTY_CONTENT beyanı kaydedildi.
- İnceleme iletişim bilgileri Apple'a özel kaydedildi; telefon bu depoda tutulmaz.
- Ücretsiz fiyat ve kullanıcının seçtiği yalnızca Türkiye bölgesi kaydedildi.
- Destek: https://literaturmasasi.com/destek
- Gizlilik politikası: https://literaturmasasi.com/gizlilik
- Zoho EU marka@literaturmasasi.com; alan adı, MX, SPF, DKIM Zoho tarafından doğrulandı.

## Yeni aday
- Silme özelliği kaynak commit c4f5038e83abfb5b252fd21e06d272148a01c7ce; iOS kontrolü 39137433254 başarılı. Yedi simülatör testi sıfır hata ile tamamlandı.
- 113.1 TestFlight yüklemesi başarılı, ancak marketing version 0.1.0 olduğu fark edildi. App Store 1.0 ile eşleşmesi için 032406f14c4e1190663c7437e926ba0754660d58 commit'inde Debug ve Release marketing version 1.0 yapıldı; yeni kontrol/yükleme beklenecek.
- Ayarlar → Erişimimi ve verilerimi sil, geri alınamaz işlem için ayrı onay ekranı sunar.
- Başarılı sunucu onayı olmadan yerel veri temizlenmez ve başarı gösterilmez.
- Sunucu yalnızca ilgili oturumun random user_id kaydına ait mobile_sessions, grants, notification_reads ve notification_preferences kayıtlarını siler. Ortak erişim kodu, başka kullanıcılar, genel kampanya istatistikleri ve süreli güvenlik sayaçları korunur.
- Native köprü yalnızca başarılı silme onayında session ve installation Keychain kayıtlarını kaldırır.
- Cihazdaki fotoğraf, favoriler, açılmış kodlar, tercihler ve bellek durumu temizlenir.
- Gizlilik metni, bildirimlerin kapalı oluşu, işletmeci iletişimi ve manifest güncellendi.
- İstemci/native adapter/backend izolasyon/relay yerel testleri başarılı. CI behavior, Release derlemesi ve yedi simülatör testi başarılı. Sürüm etiketi düzeltmesi sonrası yeni adayın TestFlight yüklemesi ayrıca doğrulanacak.

## Yayımlanan sunucu sürümleri
- Backend commit 9e372d8281573a7424890d8da52e6d20833d6f4a; deploy appgdep_6ad4d8518e608191bb7a6a63feae39b6 başarılı, erişim owner-private korundu.
- Relay commit ce308d6d2c421ef336f425579534ce8c4aec0a6f; deploy appgdep_6ad4d86e28c48191bf32e74fc13d0ee9 başarılı, mevcut public erişim korundu.
- Canlı API'ye terminal kontrolü bu istemcide Cloudflare 1010 ile engellendi; başarılı gerçek kullanıcı silmesi yapılmadı. İzole veritabanı testlerinde silme ve kullanıcılar arası izolasyon doğrulandı.

## Apple gizlilik taslağı
- User ID: App Functionality, linked, tracking yok.
- Device ID: App Functionality, linked, tracking yok.
- Product Interaction: App Functionality + Analytics, linked değil, tracking yok.
- Other Data Types (ağ/güvenlik): App Functionality, linked, tracking yok.
- Fotoğraf ve favoriler yerel; sunucuya yüklenmez. Sağlık/konum/ödeme verisi istenmez.
- App Privacy Publish işlemi henüz yapılmadı.

## Gönderim öncesi kalanlar
- Yedi simülatör testi ve yeni TestFlight adayının Apple VALID durumunu doğrula; doğru build'i 1.0'a bağla.
- İnceleme erişimi: yönetim panelinde geçerli bir Deneme-kodu görüldü. Kodun Apple ekibiyle paylaşılması için kullanıcının belirli onayı alınacak; kod bu depoya yazılmayacak.
- İnceleme notları taslak olarak kaydedildi: erişim altı haneli kodla, kullanıcı adı/telefon/e-posta yok; mevcut kampanyalar örnek; favori, kod kopyalama ve erişim/veri silme adımları açıklandı. Gerçek inceleme kodu henüz Apple'a aktarılmadı.
- App Privacy taslağını son adayla karşılaştır ve yayımla.
- Apple'ın eksik alan doğrulamasını tamamla. İnceleme gönderimi öncesi kullanıcıya somut son taslağı göster.
- İncelemeye gönderilmedi; sürüm PREPARE_FOR_SUBMISSION.
