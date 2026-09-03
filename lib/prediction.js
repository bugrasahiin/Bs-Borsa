'use strict';

function sma(values, period) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function emaSeries(values, period) {
  if (values.length < period) return [];
  const k = 2 / (period + 1);
  const out = [];
  let prev = values.slice(0, period).reduce((a, b) => a + b, 0) / period;
  out.push(prev);
  for (let i = period; i < values.length; i++) {
    prev = values[i] * k + prev * (1 - k);
    out.push(prev);
  }
  return out;
}

function rsi(values, period = 14) {
  if (values.length < period + 1) return null;
  let gains = 0;
  let losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = values[i] - values[i - 1];
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;
  for (let i = period + 1; i < values.length; i++) {
    const diff = values[i] - values[i - 1];
    avgGain = (avgGain * (period - 1) + Math.max(diff, 0)) / period;
    avgLoss = (avgLoss * (period - 1) + Math.max(-diff, 0)) / period;
  }
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return 100 - 100 / (1 + rs);
}

function macd(values) {
  const ema12 = emaSeries(values, 12);
  const ema26 = emaSeries(values, 26);
  if (ema12.length === 0 || ema26.length === 0) return null;
  const offset = ema12.length - ema26.length;
  const macdLine = ema26.map((v, i) => ema12[i + offset] - v);
  const signal = emaSeries(macdLine, 9);
  if (signal.length === 0) return null;
  const macdLast = macdLine[macdLine.length - 1];
  const signalLast = signal[signal.length - 1];
  const histPrev =
    macdLine.length >= 2 && signal.length >= 2
      ? macdLine[macdLine.length - 2] - signal[signal.length - 2]
      : null;
  return {
    macd: macdLast,
    signal: signalLast,
    histogram: macdLast - signalLast,
    histogramPrev: histPrev,
  };
}

function bollinger(values, period = 20, mult = 2) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period;
  const sd = Math.sqrt(variance);
  if (sd === 0) return null;
  const upper = mean + mult * sd;
  const lower = mean - mult * sd;
  const last = values[values.length - 1];
  return { upper, lower, pctB: (last - lower) / (upper - lower) };
}

function stochastic(values, period = 14) {
  if (values.length < period) return null;
  const slice = values.slice(-period);
  const hi = Math.max(...slice);
  const lo = Math.min(...slice);
  if (hi === lo) return null;
  return ((values[values.length - 1] - lo) / (hi - lo)) * 100;
}

function destekDirenc(values, period = 60) {
  const slice = values.slice(-period);
  if (slice.length < 10) return null;
  return { destek: Math.min(...slice), direnc: Math.max(...slice) };
}

function linearForecast(values, steps) {
  const bos = { values: [], upper: [], lower: [] };
  const window = values.slice(-30);
  const n = window.length;
  if (n < 5) return bos;
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += window[i];
    sumXY += i * window[i];
    sumXX += i * i;
  }
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  let sse = 0;
  for (let i = 0; i < n; i++) {
    const pred = intercept + slope * i;
    sse += (window[i] - pred) ** 2;
  }
  const sd = Math.sqrt(sse / Math.max(1, n - 2));
  const out = { values: [], upper: [], lower: [] };
  for (let s = 1; s <= steps; s++) {
    const base = Math.max(0, intercept + slope * (n - 1 + s));
    const genislik = sd * (1 + s * 0.35);
    out.values.push(base);
    out.upper.push(base + genislik);
    out.lower.push(Math.max(0, base - genislik));
  }
  return out;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

// closes: sondan eskiye değil, eski -> yeni sirali günlük kapanış fiyatları
function analyze(closes, extras = {}) {
  if (!Array.isArray(closes) || closes.length < 40) {
    return { error: 'Yetersiz veri: tahmin için en az 40 günlük geçmiş gerekiyor.' };
  }

  const { volumes, highs, lows } = extras;
  const price = closes[closes.length - 1];
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const rsi14 = rsi(closes, 14);
  const macdData = macd(closes);
  const boll = bollinger(closes, 20);
  const stoch = stochastic(closes, 14);
  const dd = destekDirenc(closes, 60);
  const momentum20 =
    closes.length >= 21 ? (price / closes[closes.length - 21] - 1) * 100 : 0;

  let score = 50;
  const signals = [];

  // Trend: kısa vadeli ortalama uzun vadelinin üzerinde mi?
  if (sma20 && sma50) {
    if (sma20 > sma50 && price > sma20) {
      score += 18;
      signals.push({ text: 'Fiyat yükselen eğilimde (20 günlük ortalama, 50 günlüğün üzerinde).', positive: true });
    } else if (sma20 < sma50 && price < sma20) {
      score -= 18;
      signals.push({ text: 'Fiyat düşen eğilimde (20 günlük ortalama, 50 günlüğün altında).', positive: false });
    } else {
      signals.push({ text: 'Orta vadeli eğilim karışık.', positive: null });
    }
  }

  // RSI: asiri alim / asiri satim
  if (rsi14 !== null) {
    if (rsi14 < 30) {
      score += 14;
      signals.push({ text: `RSI ${rsi14.toFixed(0)}: aşırı satım bölgesi, toparlanma ihtimali yüksek.`, positive: true });
    } else if (rsi14 > 70) {
      score -= 14;
      signals.push({ text: `RSI ${rsi14.toFixed(0)}: aşırı alım bölgesi, düşme ihtimali artıyor.`, positive: false });
    } else if (rsi14 >= 50) {
      score += 6;
      signals.push({ text: `RSI ${rsi14.toFixed(0)}: güçlü bölgede ama aşırı değil.`, positive: true });
    } else {
      score -= 6;
      signals.push({ text: `RSI ${rsi14.toFixed(0)}: zayıf bölgede ama aşırı satım değil.`, positive: false });
    }
  }

  // MACD
  if (macdData) {
    const rising =
      macdData.histogramPrev !== null && macdData.histogram > macdData.histogramPrev;
    if (macdData.histogram > 0 && rising) {
      score += 12;
      signals.push({ text: 'MACD göstergesi yukarı yönde güçleniyor.', positive: true });
    } else if (macdData.histogram < 0 && !rising) {
      score -= 12;
      signals.push({ text: 'MACD göstergesi aşağı yönde zayıflıyor.', positive: false });
    } else if (macdData.histogram > 0) {
      score += 4;
    } else {
      score -= 4;
    }
  }

  // Momentum (son 20 gun)
  if (momentum20 > 5) {
    score += 8;
    signals.push({ text: `Son 20 günde %${momentum20.toFixed(1)} yükseldi.`, positive: true });
  } else if (momentum20 < -5) {
    score -= 8;
    signals.push({ text: `Son 20 günde %${Math.abs(momentum20).toFixed(1)} düştü.`, positive: false });
  }

  // Bollinger bantlari: asiri alim / asiri satim teyidi
  if (boll) {
    if (boll.pctB <= 0) {
      score += 8;
      signals.push({ text: 'Fiyat Bollinger alt bandının altında: aşırı satım bölgesi.', positive: true });
    } else if (boll.pctB >= 1) {
      score -= 8;
      signals.push({ text: 'Fiyat Bollinger üst bandının üzerinde: aşırı alım bölgesi.', positive: false });
    }
  }

  // Stokastik: asiri bolgeler
  if (stoch !== null) {
    if (stoch < 20) {
      score += 6;
      signals.push({ text: `Stokastik ${stoch.toFixed(0)}: aşırı satım, tepki yükselişi olası.`, positive: true });
    } else if (stoch > 80) {
      score -= 6;
      signals.push({ text: `Stokastik ${stoch.toFixed(0)}: aşırı alım, soluklanma olası.`, positive: false });
    }
  }

  // Destek / direnc konumu
  if (dd) {
    const mesafe = (hedef) => Math.abs(price - hedef) / price;
    if (mesafe(dd.destek) < 0.015 && price <= dd.destek * 1.03) {
      score += 4;
      signals.push({ text: 'Fiyat 2 aylık desteğe çok yakın; buradan dönüş olası.', positive: true });
    } else if (mesafe(dd.direnc) < 0.015 && price >= dd.direnc * 0.97) {
      score -= 4;
      signals.push({ text: 'Fiyat 2 aylık dirence çok yakın; aşmakta zorlanabilir.', positive: false });
    }
  }

  // Hacim teyidi: islem hacmi artisi yonu destekler mi?
  let hacimOran = null;
  if (Array.isArray(volumes) && volumes.length >= 20) {
    const ort = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const vol5 = ort(volumes.slice(-5));
    const vol20 = ort(volumes.slice(-20));
    if (vol20 > 0) {
      hacimOran = vol5 / vol20;
      if (hacimOran > 1.5 && momentum20 > 0) {
        score += 4;
        signals.push({ text: `Hacim normale göre ${hacimOran.toFixed(1)} kat: yükselişi destekliyor.`, positive: true });
      } else if (hacimOran > 1.5 && momentum20 < 0) {
        score -= 4;
        signals.push({ text: `Hacim normale göre ${hacimOran.toFixed(1)} kat: düşüşü destekliyor.`, positive: false });
      }
    }
  }

  // Klasik pivot noktalar (onceki gunun H/L/C degerlerinden)
  let pivot = null;
  let r1 = null;
  let s1 = null;
  if (
    Array.isArray(highs) && Array.isArray(lows) &&
    highs.length >= 2 && lows.length >= 2 && closes.length >= 2
  ) {
    const pH = highs[highs.length - 2];
    const pL = lows[lows.length - 2];
    const pC = closes[closes.length - 2];
    if (pH != null && pL != null && pC != null) {
      pivot = (pH + pL + pC) / 3;
      r1 = 2 * pivot - pL;
      s1 = 2 * pivot - pH;
    }
  }

  // Fibonacci donus seviyeleri (60 gunluk dip-zirve)
  let fib = null;
  if (dd) {
    const aralik = dd.direnc - dd.destek;
    if (aralik > 0) {
      fib = {
        f38: dd.direnc - aralik * 0.382,
        f50: dd.direnc - aralik * 0.5,
        f61: dd.direnc - aralik * 0.618,
      };
    }
  }

  score = Math.round(clamp(score, 0, 100));

  const { verdict, verdictKey } = kararHesapla(score);

  const confidence = Math.round(clamp(50 + Math.abs(score - 50) * 1.2, 50, 95));
  const forecast = linearForecast(closes, 7);
  const fv = forecast.values;
  const forecastChange = fv.length ? (fv[fv.length - 1] / price - 1) * 100 : 0;

  let summary;
  if (verdictKey === 'buy') {
    summary = `Göstergelerin çoğu olumlu. Yapay zeka analizine göre kısa vadede yükselis beklenebilir (7 günlük tahmini değişim: %${forecastChange.toFixed(1)}).`;
  } else if (verdictKey === 'sell') {
    summary = `Göstergelerin çoğu olumsuz. Yapay zeka analizine göre kısa vadede dikkatli olunmalı (7 günlük tahmini değişim: %${forecastChange.toFixed(1)}).`;
  } else {
    summary = `Göstergeler karışık. Net bir yön yok, beklemede kalmak daha güvenli olabilir (7 günlük tahmini değişim: %${forecastChange.toFixed(1)}).`;
  }

  // Kisa "neden" aciklamasi: en etkili iki gosterge sinyali.
  const neden = signals
    .slice(0, 2)
    .map((s) => s.text.replace(/\.$/, ''))
    .join(' • ')
    .slice(0, 140);

  // Vade bazli eylem plani: kisa vade (gun) + uzun vade (tarih onerili).
  const gunlukEgim = fv.length === 7 ? (fv[6] - price) / 7 : 0;
  const trendYukari = sma20 && sma50 && sma20 > sma50 && price > sma20;
  const trendAsagi = sma20 && sma50 && sma20 < sma50 && price < sma20;
  const tahminiYuzde = (gun, cap = 40) => {
    const y = (gunlukEgim * gun) / price * 100;
    const c = Math.max(-cap, Math.min(cap, y));
    return `%${c >= 0 ? '+' : ''}${c.toFixed(1)}`;
  };
  const tarihSonra = (gun) =>
    new Date(Date.now() + gun * 86400000).toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
    });

  let plan;
  if (verdictKey === 'buy') {
    plan = {
      kisa: `Kısa vade: almak için uygun görünüyor; yaklaşık 2 hafta tut, ${tarihSonra(14)} civarı satmayı düşün (tahmini ${tahminiYuzde(14)}).`,
      uzun: trendYukari
        ? `Uzun vade: yükseliş eğilimi sağlam; alıp ${tarihSonra(90)} tarihine kadar bekleyebilirsin (tahmini ${tahminiYuzde(90, 25)}).`
        : `Uzun vade: eğilim henüz net değil; uzun vadeli alım için ${tarihSonra(14)} sonrasını görmek daha güvenli.`,
    };
  } else if (verdictKey === 'hold') {
    plan = {
      kisa: `Kısa vade: yeni alım için acele etme, bekle; ${tarihSonra(7)} civarında durumu yeniden değerlendir.`,
      uzun: `Uzun vade: elindekileri tutabilirsin; eğilim ${tarihSonra(90)} civarında netleşir.`,
    };
  } else {
    plan = {
      kisa: `Kısa vade: satış bölgesi; elinde varsa ${tarihSonra(7)} tarihine kadar toparlanmaları satış fırsatı olarak gör.`,
      uzun: trendAsagi
        ? `Uzun vade: eğilim aşağı, yeni alım yapma; ${tarihSonra(90)} tarihinde yeniden değerlendir.`
        : `Uzun vade: kalıcı düşüş sinyali yok ama güvenmek için ${tarihSonra(90)} civarını bekle.`,
    };
  }

  return {
    score,
    verdict,
    verdictKey,
    confidence,
    summary,
    neden,
    plan,
    signals,
    indicators: {
      price,
      sma20,
      sma50,
      rsi: rsi14,
      macd: macdData ? macdData.histogram : null,
      momentum20,
      bollinger: boll ? boll.pctB : null,
      stochastic: stoch,
      destek: dd ? dd.destek : null,
      direnc: dd ? dd.direnc : null,
      hacimOran,
      pivot,
      r1,
      s1,
      fib,
      donemDusuk: Math.min(...closes),
      donemYuksek: Math.max(...closes),
    },
    forecast,
  };
}

function kararHesapla(score) {
  if (score >= 78) return { verdict: 'Güçlü AL eğilimi', verdictKey: 'buy' };
  if (score >= 65) return { verdict: 'AL eğilimi', verdictKey: 'buy' };
  if (score >= 45) return { verdict: 'TUT', verdictKey: 'hold' };
  if (score >= 32) return { verdict: 'SAT eğilimi', verdictKey: 'sell' };
  return { verdict: 'Güçlü SAT eğilimi', verdictKey: 'sell' };
}

module.exports = { analyze, kararHesapla };
