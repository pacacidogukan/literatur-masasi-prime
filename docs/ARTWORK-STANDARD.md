# Prime kampanya kartı standardı

Tek ölçü kaynağı `ios/ui/artwork-contract.js` dosyasıdır. Görsellerin boyutları, uygulama çerçeveleri, üretilen CSS ve yayın kontrolü bu sözleşmeyi kullanır. Ölçü değişikliği yeni bir sözleşme sürümü, altı formatın kaynak kontrolü ve gerçek cihaz testleri gerektirir.

| Alan | Dosya ölçüsü | İç oran | Kullanım |
|---|---|---|---|
| large | 720 × 1080 | 2:3 | Marka Kampanyaları büyük dikey |
| compact | 600 × 820 | 30:41 | En Yeni Kampanyalar ve küçük akış |
| square | 768 × 768 | 1:1 | Kategori ve marka kampanya listesi |
| detail | 1200 × 800 | 3:2 | Prime Ayrıcalıkları üst görseli |
| code | 1200 × 400 | 3:1 | Kampanya Kodu |
| lastDay | 1200 × 400 | 3:1 | Son Gün |

## Yerleşim

- Kartın her kenarında **6 CSS px** iç boşluk bulunur. Yüzdeyle verilen yatay/dikey boşluk kullanılmaz. Kartlar ve bölümler arasında mevcut 12 px korunur. Büyük kart genişliği tablette 320 px, küçük dikey kart 220 px ile sınırlıdır; telefonlardaki mevcut %62,4 / %43 genişlik korunur. Detay görseli kullanılabilir ekran yüksekliğine göre küçülür; panel tutamacı ve koşullar alt işlem alanının arkasına itilmez.
- Görselin tamamı kendi oranındaki iç çerçevede görünür. Kartın dış yüksekliği bu iç oran ve sabit boşluktan hesaplanır. Sabit yükseklik, `object-fit:fill`, `cover`, otomatik kırpma, esnetme veya yanlış formatı yedek olarak kullanma yasaktır.
- Görselin içindeki logo, teklif ve gerekli koşullar dört kenardan en az %6 güvenli alanda kalır. Tasarımın arka planı tuvali doldurur; görüntünün içine beyaz/palet renkli sahte kenarlık eklenmez. Uygulamanın boşluğu görsel dosyasına ikinci kez işlenmez.
- Büyük kartta ürün yüksekliği %25–30; küçük dikeyde %60–70. Gerekli koşul, logo veya ürün kimliği bu oran için feda edilmez. Diğer formatlar kendi kompozisyonuyla üretilir.
- Gerçek logo ve ambalaj referansla yan yana karşılaştırılır. Değişmiş etiket, logo, uydurma koşul/fiyat, okunamayan küçük metin veya kesilmiş teklif onaylanmaz. Altı görseli yalnızca yeniden boyutlandırarak üretmek bağımsız kompozisyon sayılmaz.
- Metin okunurluğu en az 320/390/440 px telefon ve 768/1024 px tablet genişliklerinde gerçek yerleşimde incelenir. Küçük ön izlemede okunmayan gereksiz metin sadeleştirilir; ticari koşullar detayda eksiksiz korunur.

## Yayın koruması

1. Resmî referanslar, kampanya koşulları ve kaynak revizyonu doğrulanır.
2. Her format için bağımsız kompozisyon, piksel ölçüsü, hash ve gerçek kart ölçüsünde görsel kontrol kaydı tutulur. Mevcut üretim sisteminin altı-format onayı korunur; yalnızca URL bulunması görsel onayı sayılmaz.
3. Uygulama yalnızca altı onaylı alanı tamamlanmış seti kartlara taşır. Eski `photo`, `verticalPhoto`, `latestPhoto` alanları farklı oranlı yedek olarak kullanılmaz. Eksik setlerde kampanya marka logosuyla listede ve metinle detayda erişilebilir kalır.
4. Tarayıcı her yüklenen dosyanın **gerçek doğal ölçüsünü** sözleşmeyle karşılaştırır. Yanlış dosya veya ağ hatası yalnızca o çerçeveyi etkiler. Metinli alternatif aynı yerde görünür; butona dokunma, diğer kampanyalar, favori ve kod işlemleri çalışmaya devam eder. Hata katmanı başka kontrollerin üstüne taşamaz.
5. Her TestFlight değişikliğinde CI gerçek DOM dokunmalarını, tüm ekran genişliklerini ve aktif kampanyalardaki tüm tamamlanmış setlerin gerçek dosya boyutlarını denetler. Başarısız kontrol TestFlight yüklemesini engeller. Görsel kompozisyon incelemesi ölçü kontrolünden ayrı tutulur; otomatik boyut kontrolü tasarım onayı olarak sunulmaz.
6. `node scripts/sync-artwork-contract.cjs` CSS ve iOS paketini eşitler; `--check` fark varsa hata verir. Yeni ölçü veya kaynak eklenince tek kaynak güncellenir, CSS elle yamalanmaz.

Hatalı görsel tüm seti tekrar ürettirmez. Geçen dosyalar korunur, yalnızca hatalı format yeniden hazırlanır. Bir düzeltme sonrası aynı üretim hatası sürerse neden kaydedilir ve aynı deneme kontrolsüz biçimde tekrarlanmaz.
