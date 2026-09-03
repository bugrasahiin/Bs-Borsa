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

const PORTFOY_ANAHTARI = 'borsaPortfoy';
let portfoy = [];
try {
  portfoy = JSON.parse(localStorage.getItem(PORTFOY_ANAHTARI) || '[]');
} catch {
  portfoy = [];
}

function portfoyKaydet() {
  localStorage.setItem(PORTFOY_ANAHTARI, JSON.stringify(portfoy));
}

let aktifSekme = 'genel';
let detayGrafik = null;
let detaySembol = null;
let detayAd = null;

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

function adetBirimi(symbol) {
  return symbol === 'GRAM-ALTIN' ? 'gram' : 'adet';
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

function sparkCiz(closes) {
  if (!Array.isArray(closes) || closes.length < 2) return '';
  const w = 120;
  const h = 36;
  const min = Math.min(...closes);
  const max = Math.max(...closes);
  const span = max - min || 1;
  const pts = closes
    .map(
      (v, i) =>
        `${((i / (closes.length - 1)) * w).toFixed(1)},${(h - 3 - ((v - min) / span) * (h - 6)).toFixed(1)}`
    )
    .join(' ');
  const renk = closes[closes.length - 1] >= closes[0] ? '#16a34a' : '#dc2626';
  return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none"><polyline points="${pts}" fill="none" stroke="${renk}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" /></svg>`;
}

function zamanEtiketi(z) {
  if (!z) return '';
  const fark = Date.now() - z;
  const saat = 3600000;
  if (fark < saat) return `${Math.max(1, Math.round(fark / 60000))} dk önce`;
  if (fark < 24 * saat) return `${Math.round(fark / saat)} saat önce`;
  if (fark < 60 * 24 * saat) return `${Math.round(fark / (24 * saat))} gün önce`;
  return new Date(z).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' });
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
    <div class="spark" aria-hidden="true"></div>
    <div class="yz-rozet rozet-bekliyor">🤖 YZ: hesaplanıyor…</div>
    <div class="neden"></div>
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
  if (aktifSekme === 'portfoy') return portfoyYukle();
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
        const fiyat = t.livePrice ?? t.indicators.price;
        const yuzde = t.changePercent;
        fiyatEl.textContent = `${sayiFormatla(fiyat)} ${paraBirimi(item)}`;
        degisimEl.textContent = degisimMetni(yuzde);
        degisimEl.className = `degisim ${degisimSinifi(yuzde)}`;
        rozet.textContent = `🤖 YZ: ${t.verdict}`;
        rozet.className = `yz-rozet rozet-${t.verdictKey}`;
        kart.querySelector('.neden').textContent = t.neden || '';
        const sparkEl = kart.querySelector('.spark');
        if (sparkEl) sparkEl.innerHTML = sparkCiz(t.spark);
      });
    } catch {
      parca.forEach((item) => {
        const kart = kapsayici.querySelector(`.kart[data-symbol="${CSS.escape(item.symbol)}"]`);
        if (kart) kart.querySelector('.fiyat').textContent = 'veri alınamadı';
      });
    }
  }

  // Genel bakista kart fiyatlari ust seritle birebir ayni kaynaktan gelsin.
  if (aktifSekme === 'genel') {
    try {
      const quotes = await apiGet(
        `/api/quote?symbols=${encodeURIComponent(liste.map((l) => l.symbol).join(','))}`
      );
      const qmap = {};
      quotes.forEach((q) => (qmap[q.symbol] = q));
      liste.forEach((item) => {
        const kart = kapsayici.querySelector(`.kart[data-symbol="${CSS.escape(item.symbol)}"]`);
        const q = qmap[item.symbol];
        if (!kart || !q) return;
        kart.querySelector('.fiyat').textContent = `${sayiFormatla(q.regularMarketPrice)} ${paraBirimi(item)}`;
        const degisimEl = kart.querySelector('.degisim');
        degisimEl.textContent = degisimMetni(q.regularMarketChangePercent);
        degisimEl.className = `degisim ${degisimSinifi(q.regularMarketChangePercent)}`;
      });
    } catch {
      // serit ayni veriyi gosteriyor; kartlar tahmin fiyatiyla kalir
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
  detaySembol = symbol;
  detayAd = ad;
  document.getElementById('detay-baslik').textContent = ad;
  document.getElementById('detay-fiyat').textContent = 'Yükleniyor…';
  yzEl.innerHTML = '<p class="yukleniyor">Yapay zeka analizi yapılıyor…</p>';
  arkaplan.classList.remove('gizli');

  let t;
  try {
    t = await apiGet(`/api/prediction?symbol=${encodeURIComponent(symbol)}&ad=${encodeURIComponent(ad)}`);
  } catch {
    yzEl.innerHTML = '<p>Veri alınamadı. İnternet bağlantınızı kontrol edin.</p>';
    return;
  }
  if (t.error) {
    yzEl.innerHTML = `<p>${escapeHtml(t.error)}</p>`;
    return;
  }

  const fiyat = t.livePrice ?? t.indicators.price;
  const birim = paraBirimi({ symbol });
  const fiyatEl = document.getElementById('detay-fiyat');
  fiyatEl.dataset.fiyat = fiyat;
  fiyatEl.innerHTML =
    `Son fiyat: <strong>${sayiFormatla(fiyat)} ${birim}</strong>`;
  portfoyKutuRender(fiyat, birim);

  const sinyaller = t.signals
    .map((s) => `<li class="${s.positive === true ? 'yukari' : s.positive === false ? 'asagi' : ''}">${escapeHtml(s.text)}</li>`)
    .join('');

  const ind = t.indicators || {};
  const gostergeler = [
    ['RSI (14)', ind.rsi != null ? ind.rsi.toFixed(0) : '—'],
    ['Bollinger %B', ind.bollinger != null ? `%${(ind.bollinger * 100).toFixed(0)}` : '—'],
    ['Stokastik', ind.stochastic != null ? ind.stochastic.toFixed(0) : '—'],
    ['Momentum (20g)', ind.momentum20 != null ? `%${ind.momentum20.toFixed(1)}` : '—'],
    ['Destek (2 ay)', ind.destek != null ? sayiFormatla(ind.destek) : '—'],
    ['Direnç (2 ay)', ind.direnc != null ? sayiFormatla(ind.direnc) : '—'],
  ];
  const gostergeBolumu = `
    <div class="gosterge-izgara">
      ${gostergeler
        .map(([gAd, gVal]) => `<div class="gosterge"><span>${gAd}</span><strong>${gVal}</strong></div>`)
        .join('')}
    </div>`;

  let aralikBolumu = '';
  if (ind.donemDusuk != null && ind.donemYuksek != null && ind.donemYuksek > ind.donemDusuk) {
    const konum = Math.max(
      0,
      Math.min(100, Math.round(((fiyat - ind.donemDusuk) / (ind.donemYuksek - ind.donemDusuk)) * 100))
    );
    aralikBolumu = `
      <div class="aralik-kutu">
        <h3>📏 6 Aylık Aralık</h3>
        <div class="aralik-cubuk"><span class="aralik-isaret" style="left:${konum}%"></span></div>
        <div class="aralik-etiket">
          <span>Dip: ${sayiFormatla(ind.donemDusuk)}</span>
          <span>Konum: %${konum}</span>
          <span>Zirve: ${sayiFormatla(ind.donemYuksek)}</span>
        </div>
      </div>`;
  }

  let haberBolumu = '';
  if (t.haber && t.haber.haberler && t.haber.haberler.length) {
    const liste = t.haber.haberler
      .slice(0, 6)
      .map(
        (h) =>
          `<li><span class="haber-kaynak">${escapeHtml(h.kaynak || 'Haber')}</span><span class="haber-tarih">${escapeHtml(zamanEtiketi(h.zaman))}</span>${escapeHtml(h.baslik)}</li>`
      )
      .join('');
    haberBolumu = `
      <div class="haber-kutusu">
        <h3>📰 Dünya Haberleri Yorumu</h3>
        <p class="haber-ozet">${escapeHtml(t.haber.yorum)}</p>
        <ul class="haber-liste">${liste}</ul>
      </div>`;
  }

  let planBolumu = '';
  if (t.plan) {
    planBolumu = `
      <div class="plan-kutusu">
        <h3>🎯 Eylem Planı</h3>
        <p>${escapeHtml(t.plan.kisa)}</p>
        <p>${escapeHtml(t.plan.uzun)}</p>
      </div>`;
  }

  yzEl.innerHTML = `
    <div class="yz-karar ${t.verdictKey === 'buy' ? 'yukari' : t.verdictKey === 'sell' ? 'asagi' : ''}">${escapeHtml(t.verdict)} (Puan: ${t.score}/100)</div>
    <p class="yz-ozet">${escapeHtml(t.summary)}</p>
    <ul class="yz-sinyaller">${sinyaller}</ul>
    <div class="yz-guven">Güven düzeyi: %${t.confidence}</div>
    ${gostergeBolumu}
    ${aralikBolumu}
    ${planBolumu}
    ${haberBolumu}`;

  grafikCiz(t);
}

function grafikCiz(t) {
  const canvas = document.getElementById('detay-grafik');
  if (detayGrafik) detayGrafik.destroy();

  const etiketler = [...t.dates];
  const gercek = [...t.closes];
  const tahmin = new Array(t.closes.length - 1).fill(null);
  tahmin.push(t.closes[t.closes.length - 1]);
  const ustBant = new Array(t.closes.length).fill(null);
  const altBant = new Array(t.closes.length).fill(null);
  const fv = (t.forecast && t.forecast.values) || [];
  fv.forEach((v, i) => {
    etiketler.push(`Tahmin ${i + 1}. gün`);
    tahmin.push(v);
    ustBant.push(t.forecast.upper[i]);
    altBant.push(t.forecast.lower[i]);
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
        {
          label: 'Güven bandı',
          data: ustBant,
          borderColor: 'transparent',
          backgroundColor: 'rgba(224,138,0,0.13)',
          fill: '+1',
          pointRadius: 0,
          tension: 0.2,
        },
        {
          label: 'Güven bandı alt',
          data: altBant,
          borderColor: 'transparent',
          backgroundColor: 'rgba(224,138,0,0.13)',
          fill: false,
          pointRadius: 0,
          tension: 0.2,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            font: { size: 16 },
            filter: (item) => !String(item.text).includes('band'),
          },
        },
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

/* ---------- Arama ---------- */
const ARAMA_INDEKSI = (() => {
  const map = new Map();
  [...SERIT, ...BIST_HISSELERI, ...BIST_TUMU, ...ABD_HISSELERI, ...KRIPTO_PARALAR].forEach((s) => {
    if (!map.has(s.symbol)) map.set(s.symbol, s);
  });
  return [...map.values()];
})();

const aramaInput = document.getElementById('arama');
const aramaSonuclar = document.getElementById('arama-sonuclar');

function aramaYap(sorgu) {
  const q = sorgu.trim().toLocaleLowerCase('tr-TR');
  if (!q) {
    aramaSonuclar.classList.add('gizli');
    aramaSonuclar.innerHTML = '';
    return;
  }
  const qKod = q.replace(/\.is$/, '');
  const eslesen = [];
  for (const s of ARAMA_INDEKSI) {
    const ad = s.ad.toLocaleLowerCase('tr-TR');
    const kod = s.symbol.toLocaleLowerCase('tr-TR').replace(/\.is$/, '');
    let oncelik = -1;
    if (kod.startsWith(qKod)) oncelik = 0;
    else if (ad.startsWith(q)) oncelik = 1;
    else if (ad.includes(q) || kod.includes(q)) oncelik = 2;
    if (oncelik >= 0) eslesen.push({ s, oncelik });
  }
  eslesen.sort((a, b) => a.oncelik - b.oncelik);
  const liste = eslesen.slice(0, 12);
  aramaSonuclar.innerHTML = liste.length
    ? liste
        .map(
          ({ s }) =>
            `<button class="arama-satir" data-symbol="${escapeHtml(s.symbol)}" data-ad="${escapeHtml(s.ad)}">
              <span class="arama-ad">${escapeHtml(s.ad)}</span>
              <span class="arama-kod">${escapeHtml(s.symbol.replace('.IS', ''))}</span>
            </button>`
        )
        .join('')
    : '<p class="arama-bos">Sonuç bulunamadı. Farklı bir isim deneyin (örn: THY, altın, Apple).</p>';
  aramaSonuclar.classList.remove('gizli');
}

aramaInput.addEventListener('input', (e) => aramaYap(e.target.value));
aramaInput.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    aramaInput.value = '';
    aramaYap('');
    aramaInput.blur();
  }
});
aramaSonuclar.addEventListener('click', (e) => {
  const satir = e.target.closest('.arama-satir');
  if (!satir) return;
  aramaInput.value = '';
  aramaYap('');
  detayAc(satir.dataset.symbol, satir.dataset.ad);
});

/* ---------- Cihazlar arası liste eşitleme ---------- */
const takipDurum = document.getElementById('takip-durum');

function adBul(symbol) {
  const b = ARAMA_INDEKSI.find((s) => s.symbol === symbol);
  return b ? b.ad : symbol.replace('.IS', '');
}

function listeBaglantisi() {
  const kodlar = takipListesi.map((t) => t.symbol).join(',');
  const p = portfoy.length ? `&p=${encodeURIComponent(JSON.stringify(portfoy))}` : '';
  return `${location.origin}${location.pathname}#l=${encodeURIComponent(kodlar)}${p}`;
}

function listeIceAktar(metin) {
  const m = String(metin).match(/#l=([^&\s]+)/);
  const kodlar = m ? decodeURIComponent(m[1]) : String(metin);
  const semboller = kodlar.split(',').map((s) => s.trim()).filter(Boolean);
  let eklenen = 0;
  for (const symbol of semboller) {
    if (!takipListesi.some((t) => t.symbol === symbol)) {
      takipListesi.push({ symbol, ad: adBul(symbol) });
      eklenen++;
    }
  }
  let pEklenen = 0;
  const pm = String(metin).match(/[?&]p=([^&\s]+)/);
  if (pm) {
    try {
      const arr = JSON.parse(decodeURIComponent(pm[1]));
      for (const poz of arr) {
        if (!poz || !poz.symbol || !poz.adet || !poz.alis) continue;
        if (!portfoy.some((p) => p.symbol === poz.symbol)) {
          portfoy.push(poz);
          pEklenen++;
        }
      }
    } catch {
      // bozuk portföy verisi yok sayilir
    }
  }
  takibiKaydet();
  portfoyKaydet();
  return { hisse: eklenen, portfoy: pEklenen };
}

document.getElementById('liste-paylas').addEventListener('click', async () => {
  if (!takipListesi.length) {
    takipDurum.textContent = 'Liste boş — önce ☆ yıldızla hisse ekleyin.';
    return;
  }
  const baglanti = listeBaglantisi();
  try {
    await navigator.clipboard.writeText(baglanti);
    takipDurum.textContent =
      '✅ Bağlantı kopyalandı. WhatsApp veya e-posta ile kendinize gönderin; diğer cihazda açınca liste otomatik yüklenir.';
  } catch {
    prompt('Bu bağlantıyı kopyalayın:', baglanti);
  }
});

document.getElementById('liste-aktar').addEventListener('click', () => {
  const metin = prompt('Diğer cihazdan kopyaladığınız bağlantıyı buraya yapıştırın:');
  if (!metin) return;
  const sonuc = listeIceAktar(metin);
  takipDurum.textContent =
    sonuc.hisse + sonuc.portfoy > 0
      ? `✅ ${sonuc.hisse} hisse, ${sonuc.portfoy} portföy pozisyonu içe aktarıldı.`
      : 'Liste zaten güncel.';
  aktifPaneliYukle();
});

/* ---------- Piyasa durum çipleri ---------- */
function bolgeSaati(tz) {
  const parcalar = new Intl.DateTimeFormat('tr-TR', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    weekday: 'short',
  }).formatToParts(new Date());
  const al = (t) => (parcalar.find((p) => p.type === t) || {}).value || '';
  return {
    gun: al('weekday'),
    dakika: parseInt(al('hour'), 10) * 60 + parseInt(al('minute'), 10),
  };
}

function piyasaAcik(tz, ac, kapa) {
  const { gun, dakika } = bolgeSaati(tz);
  return gun !== 'Cmt' && gun !== 'Paz' && dakika >= ac && dakika < kapa;
}

function durumGuncelle() {
  const el = document.getElementById('piyasa-durum');
  if (!el) return;
  const bist = piyasaAcik('Europe/Istanbul', 600, 1080); // 10:00-18:00
  const abd = piyasaAcik('America/New_York', 570, 960); // 09:30-16:00
  el.innerHTML =
    `<span class="durum-cip ${bist ? 'acik' : 'kapali'}">🇹🇷 BIST: ${bist ? 'Açık' : 'Kapalı'}</span>` +
    `<span class="durum-cip ${abd ? 'acik' : 'kapali'}">🇺🇸 ABD: ${abd ? 'Açık' : 'Kapalı'}</span>`;
}

/* ---------- Piyasa ruh hali panosu ---------- */
async function panoGuncelle() {
  const el = document.getElementById('piyasa-pano');
  if (!el || aktifSekme !== 'genel') return;
  let m;
  try {
    m = await apiGet('/api/mood');
  } catch {
    return;
  }
  const etiket =
    m.puan < 25 ? 'Aşırı Korku' : m.puan < 45 ? 'Korku' : m.puan < 55 ? 'Nötr' : m.puan < 75 ? 'İştah' : 'Aşırı İştah';
  const rad = Math.PI * (1 - m.puan / 100);
  const nx = 100 + 68 * Math.cos(rad);
  const ny = 110 - 68 * Math.sin(rad);
  const satirListe = (rows, ok) =>
    rows
      .map(
        (r) =>
          `<button class="pano-satir" data-symbol="${escapeHtml(r.symbol)}" data-ad="${escapeHtml(r.ad)}">
            <span class="pano-ad">${escapeHtml(r.ad)}</span>
            <span class="${ok ? 'yukari' : 'asagi'}">${degisimMetni(r.changePercent)}</span>
          </button>`
      )
      .join('');
  el.innerHTML = `
    <div class="pano-kutu">
      <h3>🌡️ Piyasa Ruh Hali <small>(BIST 100)</small></h3>
      <svg class="gauge" viewBox="0 0 200 128" aria-label="Piyasa ruh hali ${m.puan}/100">
        <path d="M 20 110 A 80 80 0 0 1 60 40.7" stroke="#dc2626" stroke-width="16" fill="none" stroke-linecap="round" />
        <path d="M 60 40.7 A 80 80 0 0 1 140 40.7" stroke="#f59e0b" stroke-width="16" fill="none" />
        <path d="M 140 40.7 A 80 80 0 0 1 180 110" stroke="#16a34a" stroke-width="16" fill="none" stroke-linecap="round" />
        <line x1="100" y1="110" x2="${nx.toFixed(1)}" y2="${ny.toFixed(1)}" stroke="#101d35" stroke-width="5" stroke-linecap="round" />
        <circle cx="100" cy="110" r="7" fill="#101d35" />
      </svg>
      <div class="gauge-etiket">${etiket} — ${m.puan}/100</div>
      <div class="gauge-alt">✅ ${m.al} AL • ⏸ ${m.tut} TUT • ⛔ ${m.sat} SAT</div>
    </div>
    <div class="pano-kutu">
      <h3>🚀 Günün Yükselenleri</h3>
      ${satirListe(m.yukselenler, true)}
    </div>
    <div class="pano-kutu">
      <h3>📉 Günün Düşenleri</h3>
      ${satirListe(m.dusenler, false)}
    </div>`;
}

/* ---------- Portföy ---------- */
async function portfoyYukle() {
  const kapsayici = document.getElementById('portfoy-kartlar');
  const ozet = document.getElementById('portfoy-ozet');
  if (!portfoy.length) {
    ozet.innerHTML = '';
    kapsayici.innerHTML =
      '<p class="yukleniyor">Portföyünüz boş. Bir hissenin detayına girip "Aldım, Portföyüme Ekle" deyin.</p>';
    return;
  }
  const semboller = [...portfoy.map((p) => p.symbol), 'USDTRY=X'].join(',');
  let tahminler = {};
  try {
    tahminler = await apiGet(`/api/predictions?symbols=${encodeURIComponent(semboller)}`);
  } catch {
    tahminler = {};
  }
  const kurVeri = tahminler['USDTRY=X'];
  const kur = kurVeri && kurVeri.livePrice != null ? kurVeri.livePrice : 1;
  let topMaliyet = 0;
  let topDeger = 0;
  kapsayici.innerHTML = portfoy
    .map((p) => {
      const t = tahminler[p.symbol];
      const fiyat = t && t.livePrice != null ? t.livePrice : t && t.indicators ? t.indicators.price : p.alis;
      const carpan = paraBirimi(p) === '$' ? kur : 1;
      const deger = p.adet * (fiyat || p.alis) * carpan;
      const maliyet = p.maliyet * carpan;
      const kar = deger - maliyet;
      const karY = maliyet ? (kar / maliyet) * 100 : 0;
      topMaliyet += maliyet;
      topDeger += deger;
      return `<div class="kart poz-kart" data-symbol="${escapeHtml(p.symbol)}" data-ad="${escapeHtml(p.ad)}">
        <div class="ad">${escapeHtml(p.ad)}</div>
        <div class="sembol">${sayiFormatla(p.adet, 4)} ${adetBirimi(p.symbol)} • Alış: ${sayiFormatla(p.alis)} ${paraBirimi(p)}</div>
        <div class="fiyat">${sayiFormatla(deger)} ₺</div>
        <div class="degisim ${kar >= 0 ? 'yukari' : 'asagi'}">${kar >= 0 ? '+' : ''}${sayiFormatla(kar, 2)} ₺ (%${karY >= 0 ? '+' : ''}${sayiFormatla(karY, 2)})</div>
        <div class="yz-rozet ${t && t.verdictKey ? `rozet-${t.verdictKey}` : 'rozet-bekliyor'}">🤖 YZ: ${t && t.verdict ? t.verdict : '…'}</div>
        <button class="poz-sil-kart" data-symbol="${escapeHtml(p.symbol)}">🗑 Çıkar</button>
      </div>`;
    })
    .join('');
  const tKar = topDeger - topMaliyet;
  const tY = topMaliyet ? (tKar / topMaliyet) * 100 : 0;
  ozet.innerHTML = `
    <div class="gosterge"><span>Yatırılan</span><strong>${sayiFormatla(topMaliyet)} ₺</strong></div>
    <div class="gosterge"><span>Şu anki değer</span><strong>${sayiFormatla(topDeger)} ₺</strong></div>
    <div class="gosterge ${tKar >= 0 ? 'poz-kar' : 'poz-zarar'}"><span>Toplam kâr/zarar</span><strong>${tKar >= 0 ? '+' : ''}${sayiFormatla(tKar, 2)} ₺ (%${tY >= 0 ? '+' : ''}${sayiFormatla(tY, 2)})</strong></div>`;
}

async function portfoyKutuRender(fiyat, birim) {
  const el = document.getElementById('detay-portfoy');
  if (!el || !detaySembol) return;
  let kur = 1;
  if (birim === '$') {
    try {
      const q = await apiGet('/api/quote?symbols=USDTRY=X');
      if (q[0] && q[0].regularMarketPrice) kur = q[0].regularMarketPrice;
    } catch {
      kur = 1;
    }
  }
  const poz = portfoy.find((p) => p.symbol === detaySembol);
  if (poz) {
    const degerTL = poz.adet * fiyat * kur;
    const maliyetTL = poz.maliyet * kur;
    const kar = degerTL - maliyetTL;
    const karY = maliyetTL ? (kar / maliyetTL) * 100 : 0;
    el.innerHTML = `
      <h3>💼 Portföyünüzde</h3>
      <p>${sayiFormatla(poz.adet, 4)} ${adetBirimi(poz.symbol)} • Alış: ${sayiFormatla(poz.alis)} ${birim || paraBirimi(poz)}</p>
      <p class="${kar >= 0 ? 'yukari' : 'asagi'}"><strong>${kar >= 0 ? '+' : ''}${sayiFormatla(kar, 2)} ₺ (%${karY >= 0 ? '+' : ''}${sayiFormatla(karY, 2)})</strong></p>
      <button id="poz-sil" type="button">🗑 Portföyden Çıkar</button>`;
  } else {
    el.innerHTML = `
      <h3>💼 Portföyüme Ekle</h3>
      <div class="portfoy-form">
        <label>Kaç ${adetBirimi(detaySembol)} aldınız?<input id="poz-adet" type="number" inputmode="decimal" min="0" step="any" value="10" /></label>
        <label>Alış fiyatı (${birim || '₺'})<input id="poz-alis" type="number" inputmode="decimal" min="0" step="any" value="${fiyat}" /></label>
      </div>
      <p id="poz-onizleme" class="poz-onizleme"></p>
      <button id="poz-ekle" type="button">➕ Aldım, Portföyüme Ekle</button>`;
  }
}

document.getElementById('detay-portfoy').addEventListener('click', (e) => {
  const birim = paraBirimi({ symbol: detaySembol });
  if (e.target.id === 'poz-ekle') {
    const adet = parseFloat(document.getElementById('poz-adet').value);
    const alis = parseFloat(document.getElementById('poz-alis').value);
    if (!adet || !alis || alis <= 0) return;
    portfoy.push({ symbol: detaySembol, ad: detayAd, adet, alis, maliyet: adet * alis, tarih: Date.now() });
    portfoyKaydet();
    portfoyKutuRender(alis, birim);
  }
  if (e.target.id === 'poz-sil') {
    portfoy = portfoy.filter((p) => p.symbol !== detaySembol);
    portfoyKaydet();
    portfoyKutuRender(
      parseFloat(document.getElementById('detay-fiyat').dataset.fiyat) || 0,
      birim
    );
  }
});

document.getElementById('detay-portfoy').addEventListener('input', () => {
  const adetEl = document.getElementById('poz-adet');
  const alisEl = document.getElementById('poz-alis');
  const on = document.getElementById('poz-onizleme');
  if (!adetEl || !alisEl || !on) return;
  const a = parseFloat(adetEl.value);
  const f = parseFloat(alisEl.value);
  const birim = paraBirimi({ symbol: detaySembol });
  on.textContent = a && f ? `≈ ${sayiFormatla(a * f)} ${birim} yatırım.` : '';
});

document.getElementById('portfoy-kartlar').addEventListener('click', (e) => {
  const btn = e.target.closest('.poz-sil-kart');
  if (btn) {
    portfoy = portfoy.filter((p) => p.symbol !== btn.dataset.symbol);
    portfoyKaydet();
    portfoyYukle();
    return;
  }
  const kart = e.target.closest('.kart');
  if (kart) detayAc(kart.dataset.symbol, kart.dataset.ad);
});

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
  const panoSatir = e.target.closest('.pano-satir');
  if (panoSatir) {
    detayAc(panoSatir.dataset.symbol, panoSatir.dataset.ad);
    return;
  }
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
if (location.hash.startsWith('#l=')) {
  const sonuc = listeIceAktar(location.hash);
  history.replaceState(null, '', location.pathname + location.search);
  if (sonuc.hisse + sonuc.portfoy > 0) {
    document.querySelector('[data-sekme="takip"]').click();
    takipDurum.textContent = `✅ Bağlantıdan ${sonuc.hisse} hisse, ${sonuc.portfoy} portföy pozisyonu yüklendi.`;
  }
}
seritGuncelle();
aktifPaneliYukle();
durumGuncelle();
panoGuncelle();
setInterval(() => {
  seritGuncelle();
  aktifPaneliYukle();
  durumGuncelle();
  panoGuncelle();
}, 60_000);
