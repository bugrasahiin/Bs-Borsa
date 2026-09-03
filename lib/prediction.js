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

function linearForecast(values, steps) {
  const window = values.slice(-30);
  const n = window.length;
  if (n < 5) return [];
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
  const out = [];
  for (let s = 1; s <= steps; s++) {
    out.push(Math.max(0, intercept + slope * (n - 1 + s)));
  }
  return out;
}

function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

// closes: sondan eskiye değil, eski -> yeni sirali günlük kapanış fiyatları
function analyze(closes) {
  if (!Array.isArray(closes) || closes.length < 40) {
    return { error: 'Yetersiz veri: tahmin için en az 40 günlük geçmiş gerekiyor.' };
  }

  const price = closes[closes.length - 1];
  const sma20 = sma(closes, 20);
  const sma50 = sma(closes, 50);
  const rsi14 = rsi(closes, 14);
  const macdData = macd(closes);
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

  score = Math.round(clamp(score, 0, 100));

  const { verdict, verdictKey } = kararHesapla(score);

  const confidence = Math.round(clamp(50 + Math.abs(score - 50) * 1.2, 50, 95));
  const forecast = linearForecast(closes, 7);
  const forecastChange = forecast.length
    ? (forecast[forecast.length - 1] / price - 1) * 100
    : 0;

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
  const gunlukEgim = forecast.length === 7 ? (forecast[6] - price) / 7 : 0;
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
    },
    forecast,
  };
}

function kararHesapla(score) {
  if (score >= 65) return { verdict: 'AL eğilimi', verdictKey: 'buy' };
  if (score >= 45) return { verdict: 'TUT', verdictKey: 'hold' };
  return { verdict: 'SAT eğilimi', verdictKey: 'sell' };
}

module.exports = { analyze, kararHesapla };
