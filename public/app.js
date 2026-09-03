'use strict';

const SERIT = [
  { symbol: 'GRAM-ALTIN', ad: 'Gram Altın', birim: 'TL' },
  { symbol: 'XU100.IS', ad: 'BIST 100', birim: 'puan' },
  { symbol: 'USDTRY=X', ad: 'Dolar / TL', birim: 'TL' },
  { symbol: 'EURTRY=X', ad: 'Euro / TL', birim: 'TL' },
  { symbol: 'GC=F', ad: 'Altın (ons)', birim: '$' },
  { symbol: '^GSPC', ad: 'S&P 500', birim: 'puan' },
  { symbol: '^DJI', ad: 'Dow Jones', birim: 'puan' },
  { symbol: '^IXIC', ad: 'Nasdaq', birim: 'puan' },
];

// BIST_HISSELERI ve KRIPTO_PARALAR listeleri data.js dosyasindan gelir.

const ABD_HISSELERI = [
  { symbol: 'AAPL', ad: 'Apple' },
  { symbol: 'MSFT', ad: 'Microsoft' },
  { symbol: 'GOOGL', ad: 'Google' },
  { symbol: 'AMZN', ad: 'Amazon' },
  { symbol: 'NVDA', ad: 'Nvidia' },
  { symbol: 'TSLA', ad: 'Tesla' },
  { symbol: 'META', ad: 'Meta (Facebook)' },
  { symbol: 'JPM', ad: 'JPMorgan' },
  { symbol: 'KO', ad: 'Coca-Cola' },
  { symbol: 'DIS', ad: 'Disney' },
  { symbol: 'V', ad: 'Visa' },
  { symbol: 'MA', ad: 'Mastercard' },
  { symbol: 'JNJ', ad: 'Johnson & Johnson' },
  { symbol: 'WMT', ad: 'Walmart' },
  { symbol: 'PG', ad: 'Procter & Gamble' },
  { symbol: 'HD', ad: 'Home Depot' },
  { symbol: 'XOM', ad: 'ExxonMobil' },
  { symbol: 'CVX', ad: 'Chevron' },
  { symbol: 'BAC', ad: 'Bank of America' },
  { symbol: 'PFE', ad: 'Pfizer' },
  { symbol: 'CSCO', ad: 'Cisco' },
  { symbol: 'ADBE', ad: 'Adobe' },
  { symbol: 'NFLX', ad: 'Netflix' },
  { symbol: 'CRM', ad: 'Salesforce' },
  { symbol: 'ORCL', ad: 'Oracle' },
  { symbol: 'INTC', ad: 'Intel' },
  { symbol: 'AMD', ad: 'AMD' },
  { symbol: 'AVGO', ad: 'Broadcom' },
  { symbol: 'QCOM', ad: 'Qualcomm' },
  { symbol: 'TXN', ad: 'Texas Instruments' },
  { symbol: 'UBER', ad: 'Uber' },
  { symbol: 'ABNB', ad: 'Airbnb' },
  { symbol: 'MCD', ad: "McDonald's" },
  { symbol: 'NKE', ad: 'Nike' },
  { symbol: 'SBUX', ad: 'Starbucks' },
  { symbol: 'BA', ad: 'Boeing' },
  { symbol: 'GE', ad: 'General Electric' },
  { symbol: 'VZ', ad: 'Verizon' },
  { symbol: 'T', ad: 'AT&T' },
  { symbol: 'MRK', ad: 'Merck' },
  { symbol: 'ABBV', ad: 'AbbVie' },
  { symbol: 'LLY', ad: 'Eli Lilly' },
  { symbol: 'ARM', ad: 'Arm Holdings' },
  { symbol: 'PLTR', ad: 'Palantir' },
  { symbol: 'COIN', ad: 'Coinbase' },
  { symbol: 'SHOP', ad: 'Shopify' },
  { symbol: 'TSM', ad: 'TSMC (Taiwan)' },
  { symbol: 'BABA', ad: 'Alibaba' },
  { symbol: 'JD', ad: 'JD.com' },
  { symbol: 'PDD', ad: 'PDD Holdings' },
  { symbol: 'NIO', ad: 'Nio' },
  { symbol: 'SONY', ad: 'Sony' },
  { symbol: 'TM', ad: 'Toyota' },
];

const TAKIP_ANAHTARI = 'borsaTakipListesi';
let takipListesi = [];
try {
  takipListesi = JSON.parse(localStorage.getItem(TAKIP_ANAHTARI) || '[]');
} catch {
  takipListesi = [];
}

let aktifSekme = 'genel';
let detayGrafik = null;

function escapeHtml(deger) {
  return String(deger).replace(/[&<>"']/g, (k) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[k]));
}

function sayiFormatla(deger, ondalik) {
  if (deger == null || isNaN(deger)) return '—';
  if (ondalik == null) {
    const a = Math.abs(deger);
    ondalik = a >= 1 ? 2 : a >= 0.01 ? 4 : 8;
  }
  return deger.toLocaleString('tr-TR', {
    minimumFractionDigits: ondalik,
    maximumFractionDigits: ondalik,
  });
}

function paraBirimi(secili) {
  if (secili.symbol === 'GRAM-ALTIN') return '₺';
  if (secili.symbol.endsWith('.IS')) return '₺';
  if (secili.symbol.endsWith('-USD')) return '$';
  if (secili.symbol.includes('=X') || secili.symbol.endsWith('=F')) {
    return secili.symbol.startsWith('GC') ? '$' : '₺';
  }
  return '$';
}

function degisimSinifi(yuzde) {
  if (yuzde == null) return '';
  return yuzde >= 0 ? 'yukari' : 'asagi';
}

function degisimMetni(yuzde) {
  if (yuzde == null) return '';
  const ok = yuzde >= 0 ? '▲' : '▼';
  return `${ok} %${sayiFormatla(Math.abs(yuzde), 2)}`;
}

async function apiGet(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('Sunucudan veri alınamadı');
  return res.json();
}

/* ---------- Üst şerit ---------- */
async function seritGuncelle() {
  const seritEl = document.getElementById('ust-serit');
  const semboller = SERIT.map((s) => s.symbol).join(',');
  let quotes;
  try {
    quotes = await apiGet(`/api/quote?symbols=${encodeURIComponent(semboller)}`);
  } catch {
    seritEl.innerHTML =
      '<div class="serit-oge"><div class="ad">Veriler alınamadı — internet bağlantısını kontrol edin</div></div>';
    return;
  }
  const map = {};
  quotes.forEach((q) => (map[q.symbol] = q));
  seritEl.innerHTML = SERIT.map((s) => {
    const q = map[s.symbol];
    const fiyat = q ? q.regularMarketPrice : null;
    const yuzde = q ? q.regularMarketChangePercent : null;
    return `<div class="serit-oge">
      <div class="ad">${escapeHtml(s.ad)}</div>
      <div class="deger">${sayiFormatla(fiyat)}</div>
      <div class="degisim ${degisimSinifi(yuzde)}">${degisimMetni(yuzde)}</div>
    </div>`;
  }).join('');
  document.getElementById('son-guncelleme').textContent = new Date().toLocaleTimeString('tr-TR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

/* ---------- Kartlar ---------- */
function kartOlustur(item, takipGosterilsin) {
  const takip = takipListesi.some((t) => t.symbol === item.symbol);
  return `<div class="kart" data-symbol="${escapeHtml(item.symbol)}" data-ad="${escapeHtml(item.ad)}">
    ${takipGosterilsin ? `<button class="yildiz ${takip ? 'secili' : ''}" title="Takip listeme ekle/çıkar">${takip ? '★' : '☆'}</button>` : ''}
    <div class="ad">${escapeHtml(item.ad)}</div>
    <div class="sembol">${escapeHtml(item.symbol.replace('.IS', ''))}</div>
    <div class="fiyat">yükleniyor…</div>
    <div class="degisim"></div>
    <div class="yz-rozet rozet-bekliyor">🤖 YZ: hesaplanıyor…</div>
  </div>`;
}

function aktifListe() {
  if (aktifSekme === 'bist') return BIST_HISSELERI;
  if (aktifSekme === 'tumu') return BIST_TUMU;
  if (aktifSekme === 'abd') return ABD_HISSELERI;
  if (aktifSekme === 'kripto') return KRIPTO_PARALAR;
  if (aktifSekme === 'takip') return takipListesi;
  return SERIT;
}

function aktifKartKapsayici() {
  return document.querySelector(`[data-panel="${aktifSekme}"] .kartlar`);
}

async function aktifPaneliYukle() {
  const liste = aktifListe();
  const kapsayici = aktifKartKapsayici();
  if (!liste.length) {
    kapsayici.innerHTML =
      '<p class="yukleniyor">Takip listeniz boş. Hisselerdeki ☆ yıldıza dokunarak ekleyin.</p>';
    return;
  }
  kapsayici.innerHTML = liste
    .map((item) => kartOlustur(item, aktifSekme !== 'genel'))
    .join('');

  // Buyuk listeleri kademeli yukle ki ilk sonuclar cabuk gorunsun.
  const PARCA = 150;
  for (let i = 0; i < liste.length; i += PARCA) {
    const parca = liste.slice(i, i + PARCA);
    const semboller = parca.map((l) => l.symbol).join(',');
    try {
      const tahminler = await apiGet(`/api/predictions?symbols=${encodeURIComponent(semboller)}`);
      parca.forEach((item) => {
        const kart = kapsayici.querySelector(`.kart[data-symbol="${CSS.escape(item.symbol)}"]`);
        if (!kart) return;
        const t = tahminler[item.symbol];
        const fiyatEl = kart.querySelector('.fiyat');
        const degisimEl = kart.querySelector('.degisim');
        const rozet = kart.querySelector('.yz-rozet');
        if (!t || t.error || t.indicators == null) {
          const kapali = t && String(t.error).includes('404');
          fiyatEl.textContent = kapali ? 'işlem sırası kapalı' : 'veri alınamadı';
          rozet.textContent = kapali ? '⏸ BIST: sıra kapalı' : '🤖 YZ: veri yetersiz';
          rozet.className = 'yz-rozet rozet-bekliyor';
          return;
        }
        const fiyat = t.indicators.price;
        const yuzde = t.changePercent;
        fiyatEl.textContent = `${sayiFormatla(fiyat)} ${paraBirimi(item)}`;
        degisimEl.textContent = degisimMetni(yuzde);
        degisimEl.className = `degisim ${degisimSinifi(yuzde)}`;
        rozet.textContent = `🤖 YZ: ${t.verdict}`;
        rozet.className = `yz-rozet rozet-${t.verdictKey}`;
      });
    } catch {
      parca.forEach((item) => {
        const kart = kapsayici.querySelector(`.kart[data-symbol="${CSS.escape(item.symbol)}"]`);
        if (kart) kart.querySelector('.fiyat').textContent = 'veri alınamadı';
      });
    }
  }
}

/* ---------- Takip listesi ---------- */
function takibiKaydet() {
  localStorage.setItem(TAKIP_ANAHTARI, JSON.stringify(takipListesi));
}

function takipDegistir(symbol, ad) {
  const varMi = takipListesi.findIndex((t) => t.symbol === symbol);
  if (varMi >= 0) takipListesi.splice(varMi, 1);
  else takipListesi.push({ symbol, ad });
  takibiKaydet();
}

/* ---------- Detay penceresi ---------- */
async function detayAc(symbol, ad) {
  const arkaplan = document.getElementById('detay-arkaplan');
  const yzEl = document.getElementById('detay-yz');
  document.getElementById('detay-baslik').textContent = ad;
  document.getElementById('detay-fiyat').textContent = 'Yükleniyor…';
  yzEl.innerHTML = '<p class="yukleniyor">Yapay zeka analizi yapılıyor…</p>';
  arkaplan.classList.remove('gizli');

  let t;
  try {
    t = await apiGet(`/api/prediction?symbol=${encodeURIComponent(symbol)}`);
  } catch {
    yzEl.innerHTML = '<p>Veri alınamadı. İnternet bağlantınızı kontrol edin.</p>';
    return;
  }
  if (t.error) {
    yzEl.innerHTML = `<p>${escapeHtml(t.error)}</p>`;
    return;
  }

  const fiyat = t.indicators.price;
  const birim = paraBirimi({ symbol });
  document.getElementById('detay-fiyat').innerHTML =
    `Son fiyat: <strong>${sayiFormatla(fiyat)} ${birim}</strong>`;

  const sinyaller = t.signals
    .map((s) => `<li class="${s.positive === true ? 'yukari' : s.positive === false ? 'asagi' : ''}">${escapeHtml(s.text)}</li>`)
    .join('');

  yzEl.innerHTML = `
    <div class="yz-karar ${t.verdictKey === 'buy' ? 'yukari' : t.verdictKey === 'sell' ? 'asagi' : ''}">${escapeHtml(t.verdict)} (Puan: ${t.score}/100)</div>
    <p class="yz-ozet">${escapeHtml(t.summary)}</p>
    <ul class="yz-sinyaller">${sinyaller}</ul>
    <div class="yz-guven">Güven düzeyi: %${t.confidence}</div>`;

  grafikCiz(t);
}

function grafikCiz(t) {
  const canvas = document.getElementById('detay-grafik');
  if (detayGrafik) detayGrafik.destroy();

  const etiketler = [...t.dates];
  const gercek = [...t.closes];
  const tahmin = new Array(t.closes.length - 1).fill(null);
  tahmin.push(t.closes[t.closes.length - 1]);
  t.forecast.forEach((v, i) => {
    etiketler.push(`Tahmin ${i + 1}. gün`);
    tahmin.push(v);
  });

  detayGrafik = new Chart(canvas, {
    type: 'line',
    data: {
      labels: etiketler,
      datasets: [
        {
          label: 'Gerçek fiyat',
          data: gercek,
          borderColor: '#0d47a1',
          backgroundColor: 'rgba(13,71,161,0.08)',
          fill: true,
          pointRadius: 0,
          tension: 0.2,
        },
        {
          label: 'YZ tahmini (7 gün)',
          data: tahmin,
          borderColor: '#e08a00',
          borderDash: [8, 6],
          pointRadius: 0,
          tension: 0.2,
          fill: false,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { font: { size: 16 } } },
      },
      scales: {
        x: { ticks: { font: { size: 12 }, maxTicksLimit: 10 } },
        y: { ticks: { font: { size: 14 } } },
      },
    },
  });
}

/* ---------- Yatay şeritleri sürükleyerek kaydırma ---------- */
// Bazi telefonlarda yatay dokunma kaydirma guvenilir calismiyor;
// pan-y ile dikey kaydirma tarayicida kalir, yatayi biz yonetiriz.
function suruklemeKaydir(el) {
  let basX = 0;
  let basLeft = 0;
  let surukluyor = false;
  let kaydirildi = false;

  el.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') return; // dokunmatikte dogal kaydirma calissin
    surukluyor = true;
    kaydirildi = false;
    basX = e.clientX;
    basLeft = el.scrollLeft;
  });
  window.addEventListener('pointermove', (e) => {
    if (!surukluyor) return;
    const dx = e.clientX - basX;
    if (!kaydirildi && Math.abs(dx) > 6) kaydirildi = true;
    if (kaydirildi) el.scrollLeft = basLeft - dx;
  });
  window.addEventListener('pointerup', () => (surukluyor = false));
  window.addEventListener('pointercancel', () => (surukluyor = false));
  el.addEventListener(
    'click',
    (e) => {
      if (kaydirildi) {
        e.preventDefault();
        e.stopPropagation();
        kaydirildi = false;
      }
    },
    true
  );
}

suruklemeKaydir(document.getElementById('ust-serit'));
suruklemeKaydir(document.querySelector('.sekmeler'));

/* ---------- Olaylar ---------- */
document.querySelectorAll('.sekme').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.sekme').forEach((b) => b.classList.remove('aktif'));
    btn.classList.add('aktif');
    aktifSekme = btn.dataset.sekme;
    document.querySelectorAll('.panel').forEach((p) => p.classList.add('gizli'));
    document.querySelector(`[data-panel="${aktifSekme}"]`).classList.remove('gizli');
    aktifPaneliYukle();
  });
});

document.getElementById('icerik').addEventListener('click', (e) => {
  const yildiz = e.target.closest('.yildiz');
  if (yildiz) {
    const kart = yildiz.closest('.kart');
    takipDegistir(kart.dataset.symbol, kart.dataset.ad);
    if (aktifSekme === 'takip') aktifPaneliYukle();
    else {
      const takip = takipListesi.some((t) => t.symbol === kart.dataset.symbol);
      yildiz.textContent = takip ? '★' : '☆';
      yildiz.classList.toggle('secili', takip);
    }
    return;
  }
  const kart = e.target.closest('.kart');
  if (kart) detayAc(kart.dataset.symbol, kart.dataset.ad);
});

document.getElementById('detay-kapat').addEventListener('click', () => {
  document.getElementById('detay-arkaplan').classList.add('gizli');
});
document.getElementById('detay-arkaplan').addEventListener('click', (e) => {
  if (e.target.id === 'detay-arkaplan') document.getElementById('detay-arkaplan').classList.add('gizli');
});

/* ---------- Başlat ---------- */
seritGuncelle();
aktifPaneliYukle();
setInterval(() => {
  seritGuncelle();
  aktifPaneliYukle();
}, 60_000);
