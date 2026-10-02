/**
 * CryptoTrace v2 Currency & Text Formatters
 */

export function formatINR(amountUSD, rate = 86.5) {
  if (amountUSD === null || amountUSD === undefined || amountUSD === '' || amountUSD === 0 || amountUSD === '0') {
    return 'Not provided';
  }
  const valUSD = parseFloat(amountUSD);
  if (isNaN(valUSD) || valUSD <= 0) {
    return 'Not provided';
  }
  const valINR = valUSD * rate;
  return `₹${valINR.toLocaleString('en-IN', { maximumFractionDigits: 0 })} INR`;
}

export function formatRateNotice(rate = 86.5, rateAt = null) {
  const r = parseFloat(rate) || 86.5;
  const dateFormatted = rateAt 
    ? new Date(rateAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
    : 'live rate';
  return `Rate: 1 USD = ${r.toFixed(2)} INR (as of ${dateFormatted})`;
}

export function formatFiatUSD(valUSD) {
  if (valUSD === null || valUSD === undefined || valUSD === '' || valUSD === 0 || valUSD === '0') {
    return '$0';
  }
  const num = parseFloat(valUSD);
  if (isNaN(num) || num <= 0) return '$0';

  if (num >= 1_000_000_000) {
    return `$${(num / 1_000_000_000).toFixed(1)}B`;
  }
  if (num >= 1_000_000) {
    return `$${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `$${(num / 1_000).toFixed(1)}K`;
  }
  return `$${num.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}


