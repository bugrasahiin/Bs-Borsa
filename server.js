'use strict';

const express = require('express');
const path = require('path');
const { analyze, kararHesapla } = require('./lib/prediction');
const { haberGetir } = require('./lib/news');

const app = express();
const PORT = process.env.PORT || 4000;

const HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept: 'application/json',
};

const cache = new Map();
const CACHE_TTL_MS = 60_000;

function getCached(key) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < CACHE_TTL_MS) return hit.data;
  return null;
}

function setCached(key, data) {
  cache.set(key, { data, time: Date.now() });
}

// Ayni anda en fazla `limit` istek; Yahoo'nun hiz limitine takilmamak icin.
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let i = 0;
  const workers = new Array(Math.min(limit, items.length)).fill().map(async () => {
    while (i < items.length) {
      const idx = i++;
      out[idx] = await fn(items[idx], idx);
    }
  });
  await Promise.all(workers);
  return out;
}

async function fetchJson(url, key) {
  const cached = getCached(key);
  if (cached) return cached;
  let sonHata;
  for (let deneme = 0; deneme < 3; deneme++) {
    const res = await fetch(url, { headers: HEADERS });
    if (res.ok) {
      const data = await res.json();
      setCached(key, data);
      return data;
    }
    sonHata = new Error(`Yahoo Finance hata: ${res.status}`);
    if (res.status === 404) throw sonHata; // sembol gercekten yok, tekrar deneme
    await new Promise((r) => setTimeout(r, 700 * (deneme + 1)));
  }
  throw sonHata;
}

// Yahoo'nun v7/quote ucu artik kimlik dogrulamasi istiyor (401).
// Onun yerine v8/chart ucunun meta alanini kullaniyoruz; fiyati ve
// yuzdelik degisimi ayni sekilde iceriyor.
async function getQuotes(symbols) {
  const results = await mapLimit(symbols, 10, async (symbol) => {
    try {
      if (symbol === GRAM_ALTIN) {
        const seri = await getGramAltinSeries();
        const son = seri.closes[seri.closes.length - 1];
        const onceki = seri.closes[seri.closes.length - 2] || son;
        return {
          symbol,
          regularMarketPrice: son,
          regularMarketChangePercent: ((son - onceki) / onceki) * 100,
          currency: 'TRY',
        };
      }
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
        symbol
      )}?range=1d&interval=1d`;
      const data = await fetchJson(url, `quote:${symbol}`);
      const meta = data.chart && data.chart.result && data.chart.result[0] && data.chart.result[0].meta;
      if (!meta) return null;
      return {
        symbol,
        regularMarketPrice: meta.regularMarketPrice,
        regularMarketChangePercent: meta.regularMarketChangePercent,
        currency: meta.currency,
      };
    } catch {
      return null;
    }
  });
  return results.filter(Boolean);
}

// Gram altin TL = ons altin ($) x USDTRY / 31,1035 (troy ons -> gram)
const GRAM_ALTIN = 'GRAM-ALTIN';
const TROY_ONS_GRAM = 31.1035;

async function getGramAltinSeries() {
  const cacheKey = 'gram-altin-serisi';
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.time < CACHE_TTL_MS) return hit.data;
  const [ons, usd] = await Promise.all([getChart('GC=F', '6mo'), getChart('USDTRY=X', '6mo')]);
  const usdByDate = new Map(usd.dates.map((d, i) => [d, usd.closes[i]]));
  const dates = [];
  const closes = [];
  ons.dates.forEach((d, i) => {
    const u = usdByDate.get(d);
    if (u == null) return;
    dates.push(d);
    closes.push((ons.closes[i] * u) / TROY_ONS_GRAM);
  });
  const data = { dates, closes };
  setCached(cacheKey, data);
  return data;
}

async function getChart(symbol, range = '6mo') {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
    symbol
  )}?range=${range}&interval=1d`;
  const data = await fetchJson(url, `chart:${symbol}:${range}`);
  const result = data.chart && data.chart.result && data.chart.result[0];
  if (!result) throw new Error(`${symbol} için grafik verisi bulunamadi`);
  const timestamps = result.timestamp || [];
  const quote = result.indicators.quote[0] || {};
  const closes = [];
  const dates = [];
  for (let i = 0; i < timestamps.length; i++) {
    const c = quote.close && quote.close[i];
    if (c == null) continue;
    closes.push(c);
    dates.push(new Date(timestamps[i] * 1000).toISOString().slice(0, 10));
  }
  return { symbol, closes, dates, meta: result.meta };
}

app.use(
  express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html')) res.setHeader('Cache-Control', 'no-store');
    },
  })
);

app.get('/api/quote', async (req, res) => {
  const symbols = (req.query.symbols || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 600);
  if (!symbols.length) return res.json([]);
  try {
    const quotes = await getQuotes(symbols);
    res.json(quotes);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get('/api/chart', async (req, res) => {
  const symbol = (req.query.symbol || '').trim();
  const range = req.query.range === '1y' ? '1y' : '6mo';
  if (!symbol) return res.status(400).json({ error: 'symbol parametresi gerekli' });
  try {
    const chart = await getChart(symbol, range);
    res.json(chart);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.get('/api/prediction', async (req, res) => {
  const symbol = (req.query.symbol || '').trim();
  const ad = (req.query.ad || '').trim();
  if (!symbol) return res.status(400).json({ error: 'symbol parametresi gerekli' });
  try {
    const payload = await computePrediction(symbol, ad, true);
    res.json(payload);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

const PREDICTION_TTL_MS = 300_000;
const HABER_TTL_MS = 300_000;

async function haberCached(symbol, ad) {
  const key = `haber:${symbol}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.time < HABER_TTL_MS) return hit.data;
  const haber = await haberGetir(symbol, ad);
  cache.set(key, { data: haber, time: Date.now() });
  return haber;
}

async function computePrediction(symbol, ad, haberli = false) {
  const cacheKey = `prediction:${haberli ? 'haberli:' : ''}${symbol}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.time < PREDICTION_TTL_MS) return hit.data;
  let dates;
  let closes;
  let changePercent = null;
  let livePrice = null;
  if (symbol === GRAM_ALTIN) {
    const seri = await getGramAltinSeries();
    dates = seri.dates;
    closes = seri.closes;
    const son = closes[closes.length - 1];
    const onceki = closes[closes.length - 2] || son;
    changePercent = ((son - onceki) / onceki) * 100;
    livePrice = son;
  } else {
    const chart = await getChart(symbol, '6mo');
    dates = chart.dates;
    closes = chart.closes;
    changePercent = chart.meta ? chart.meta.regularMarketChangePercent : null;
    livePrice = chart.meta ? chart.meta.regularMarketPrice : null;
  }
  const result = analyze(closes);
  const payload = { symbol, dates, closes, changePercent, livePrice, ...result };

  // Dunya haberlerinin tonu karara hafifce yansir (teknik analiz esas kalir).
  if (haberli && !payload.error) {
    try {
      const haber = await haberCached(symbol, ad);
      if (haber) {
        payload.haber = haber;
        const etki = Math.round(haber.puan * 0.15);
        if (etki) {
          payload.score = Math.max(0, Math.min(100, payload.score + etki));
          const k = kararHesapla(payload.score);
          payload.verdict = k.verdict;
          payload.verdictKey = k.verdictKey;
          payload.signals = [
            ...payload.signals,
            {
              text: `Dünya haberlerinin tonu ${haber.ton} (${haber.yorum}) Karara etkisi: ${etki > 0 ? '+' : ''}${etki} puan.`,
              positive: etki > 0 ? true : etki < 0 ? false : null,
            },
          ];
        }
      }
    } catch {
      // haber alinamazsa teknik analiz tek basina yeterli
    }
  }

  if (!payload.error) setCached(cacheKey, payload);
  return payload;
}

app.get('/api/predictions', async (req, res) => {
  const symbols = (req.query.symbols || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 600);
  if (!symbols.length) return res.json({});
  const results = await mapLimit(symbols, 10, async (symbol) => {
    try {
      return await computePrediction(symbol);
    } catch (err) {
      return { symbol, error: err.message };
    }
  });
  const out = {};
  for (const p of results) {
    if (!p) continue;
    // Toplu yanitta grafik verisini kisit tut; detay ekrani ayri cagri yapar.
    const { dates, closes, ...lean } = p;
    out[p.symbol] = lean;
  }
  res.json(out);
});

app.listen(PORT, () => {
  console.log(`Borsa takip sitesi hazır: http://localhost:${PORT}`);
});
