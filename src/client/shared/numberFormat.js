
const VALUE_STOPS = [
  { symbol: 't', min: 1e12 },
  { symbol: 'b', min: 1e9 },
  { symbol: 'm', min: 1e6 },
  { symbol: 'k', min: 1e3 },
  { symbol: '', min: 0 }
];

function formatNumber(
    value,
    {
      decimalPlaces = 1,
      formatter = (valueStr, unitStr) => valueStr + unitStr
    } = {}) {

  for (let stop of VALUE_STOPS) {
    // VALUE_STOPS is in descending order so stop after first minimum is reached
    if (value > stop.min) {
      return formatter((value / stop.min).toFixed(decimalPlaces), stop.symbol);
    }
  }

  return formatter(value.toFixed(decimalPlaces), '');
}

export default formatNumber;
