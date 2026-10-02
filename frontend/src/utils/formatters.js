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
