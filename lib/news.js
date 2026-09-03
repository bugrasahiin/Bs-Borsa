'use strict';

// Dunya borsalarindan haber toplayip ton (sentiment) analizi yapar.
// Kaynaklar: Google News RSS (TR/EN) + Yahoo Finance news — anahtar gerektirmez.

const POZ = [
  'yükseliş', 'yükseldi', 'ralli', 'rekor', 'kâr', 'karlı', 'artış', 'arttı',
  'destek', 'güçlü', 'büyüme', 'prim', 'temettü', 'ihale', 'yukarı', 'alım',
  'olumlu', 'beklenti üzeri', 'kazandı', 'yatırım',
  'rally', 'surge', 'record', 'growth', 'profit', 'gains', 'upgrade', 'beat',
  'strong', 'rise', 'jumps', 'climbs', 'bullish', 'soars', 'boost', 'highs',
];

const NEG = [
  'düşüş', 'düştü', 'geriledi', 'kayıp', 'zarar', 'kriz', 'ceza', 'soruşturma',
  'satış', 'sattı', 'aşağı', 'olumsuz', 'zayıf', 'küçülme', 'istifa', 'iflas',
  'haciz', 'erteleme', 'endişe',
  'drop', 'fall', 'decline', 'crash', 'loss', 'losses', 'sell-off', 'selloff',
  'downgrade', 'fears', 'weak', 'slide', 'plunges', 'lawsuit', 'recession',
  'bearish', 'tumbles', 'warns', 'cuts',
];

function htmlCoz(s) {
  return String(s)
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, '&');
}

function rssOgeleri(xml) {
  const out = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml))) {
    const blok = m[1];
    const baslik = (blok.match(/<title>([\s\S]*?)<\/title>/) || [])[1] || '';
    const kaynak = (blok.match(/<source[^>]*>([\s\S]*?)<\/source>/) || [])[1] || '';
    const pub = (blok.match(/<pubDate>([\s\S]*?)<\/pubDate>/) || [])[1] || '';
    out.push({
      baslik: htmlCoz(baslik).trim(),
      kaynak: htmlCoz(kaynak).trim(),
      zaman: pub ? Date.parse(pub) || 0 : 0,
    });
  }
  return out;
}

async function rssGetir(url) {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) return [];
  return rssOgeleri(await res.text());
}

async function yahooHaber(kod) {
  try {
    const url = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(kod)}&newsCount=6&quotesCount=0`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return [];
    const j = await res.json();
    return (j.news || []).map((n) => ({
      baslik: String(n.title || '').trim(),
      kaynak: String(n.publisher || '').trim(),
      zaman: (n.providerPublishTime || 0) * 1000,
    }));
  } catch {
    return [];
  }
}

function tonHesapla(haberler) {
  let poz = 0;
  let neg = 0;
  for (const h of haberler) {
    const t = h.baslik.toLocaleLowerCase('tr');
    if (POZ.some((w) => t.includes(w))) poz++;
    if (NEG.some((w) => t.includes(w))) neg++;
  }
  const toplam = haberler.length;
  const puan = Math.max(-100, Math.min(100, Math.round(((poz - neg) / Math.max(1, toplam)) * 100)));
  const notr = toplam - poz - neg + Math.min(poz, neg) * 0; // hem poz hem neg sayilanlar notr degil; basit tut
  const ton = puan > 15 ? 'olumlu' : puan < -15 ? 'olumsuz' : 'nötr';
  return {
    puan,
    pozitif: poz,
    negatif: neg,
    notr: Math.max(0, toplam - poz - neg),
    toplam,
    ton,
    yorum: `${toplam} haber incelendi: ${poz} olumlu, ${neg} olumsuz. Genel haber tonu ${ton}.`,
  };
}

// symbol + ad'e gore dunya haberlerini topla, ton analiziyle dondur.
async function haberGetir(symbol, ad) {
  const tr = symbol.endsWith('.IS');
  const kripto = symbol.endsWith('-USD');
  const kod = symbol.replace('.IS', '').replace('-USD', '');
  const sorgu = kripto ? (ad || kod) : tr ? kod : kod;

  const isler = [];
  if (tr || kripto) {
    isler.push(
      rssGetir(
        `https://news.google.com/rss/search?q=${encodeURIComponent(sorgu + (kripto ? ' coin' : ' borsa'))}&hl=tr&gl=TR&ceid=TR:tr`
      )
    );
  }
  if (!tr) {
    isler.push(
      rssGetir(
        `https://news.google.com/rss/search?q=${encodeURIComponent(sorgu + ' stock OR crypto OR market')}&hl=en-US&gl=US&ceid=US:en`
      )
    );
    isler.push(yahooHaber(kod));
  }

  const sonuclar = await Promise.all(isler);
  const enEski = Date.now() - 60 * 86400000; // son 2 ay
  const gorulen = new Set();
  const haberler = [];
  for (const liste of sonuclar) {
    for (const h of liste) {
      const anahtar = h.baslik.toLocaleLowerCase('tr').slice(0, 60);
      if (!h.baslik || !h.zaman || h.zaman < enEski || gorulen.has(anahtar)) continue;
      gorulen.add(anahtar);
      haberler.push(h);
    }
  }
  haberler.sort((a, b) => b.zaman - a.zaman);
  const ilk12 = haberler.slice(0, 12);
  if (!ilk12.length) return null;
  return { ...tonHesapla(ilk12), haberler: ilk12, kaynak: 'Google Haberler + Yahoo Finance' };
}

module.exports = { haberGetir };
