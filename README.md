# 📈 Borsa Takip

Basit, büyük yazılı, kolay kullanımlı canlı borsa takip sitesi.
BIST 100, BIST hisseleri, ABD borsaları, dolar/euro/altın ve her hisse için yapay zeka tahmini.

## Kurulum ve Çalıştırma

1. `npm install`
2. `npm start`
3. Tarayıcıda http://localhost:4000 adresini açın.

## Özellikler

- Canlı piyasa verileri (Yahoo Finance üzerinden, 60 saniyede bir otomatik yenilenir)
- Her hisse için yapay zeka tahmini: AL/TUT/SAT eğilimi, puan ve sade Türkçe açıklama
- 6 aylık fiyat grafiği + 7 günlük tahmin çizgisi
- ⭐ ile kendi takip listenizi oluşturun (tarayıcıda saklanır)
- Büyük yazılar ve basit arayüz

## Önemli Uyarı

Bu site yalnızca bilgi amaçlıdır. Yapay zeka tahminleri geçmiş fiyat verilerine
dayalı basit teknik analizlerdir ve **yatırım tavsiyesi değildir**.

## Ücretsiz Yayınlama (İnternete Açma)

Site bir Node.js (Express) sunucusu kullandığı için **statik** ücretsiz barındırma
servisleri (GitHub Pages, Netlify statik vb.) yetmez; Node kodunu çalıştıran bir
servis gerekir. En kolayı **Render.com**'un ücretsiz Web Service planıdır.

### Render.com ile (önerilen)

1. Kodu bir GitHub deposuna yükleyin:
   - github.com → New repository → dosyaları `git init`, `git add .`, `git commit`, `git push` ile gönderin.
   - (`node_modules` klasörünü yüklemeyin; `.gitignore` dosyasına `node_modules` yazın.)
2. render.com → ücretsiz hesap açın → **New → Web Service** seçin.
3. GitHub deponuzu bağlayın. Render ayarları otomatik algılar; şunları doğrulayın:
   - Build Command: `npm install`
   - Start Command: `node server.js`
   - Instance Type: **Free**
4. Deploy'e basın. 1-2 dakika sonra `https://proje-adi.onrender.com`
   adresinde site yayında olur. Bu adresi annenize göndermeniz yeterli.

Notlar:
- Ücretsiz plan 15 dakika istek gelmezse uyur; ilk açılış ~30 saniye sürebilir, sonra hızlanır.
- Veri kaynağı (Yahoo Finance) herkese açık olduğu için API anahtarı gerekmez.

### Alternatifler

- **Vercel**: `api/` klasörüne serverless sarmalayıcı ister; küçük kod değişikliği gerekir.
- **Railway / Koyeb**: ücretsiz deneme kredileriyle benzer şekilde çalışır.
- **Glitch.com**: kodu yapıştırıp anında ücretsiz çalıştırabilirsiniz (küçük projeler için).
