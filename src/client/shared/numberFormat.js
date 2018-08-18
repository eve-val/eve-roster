
const VALUE_STOPS = [
  { symbol: '', divisor: 1 },
  { symbol: 'k', divisor: 1e3 },
  { symbol: 'm', divisor: 1e6 },
  { symbol: 'b', divisor: 1e9 },
  { symbol: 't', divisor: 1e12 },
];

export function formatNumber(
    value,
    /**
     * {
     *    decimalPlaces: number,
     *    formatter: (value: string, unit: string) => string,
     * }
     */
    options = {},
) {
  const formatter = options.formatter
      || ((valueStr, unitStr) => `${valueStr}${unitStr}`);

  for (let i = 0; i < VALUE_STOPS.length; i++) {
    stop = VALUE_STOPS[i];
    if (value / stop.divisor < 1000) {
      break;
    }
  }

  const displayValue = value / stop.divisor;
  let decimalPlaces;
  if (displayValue == 0) {
    decimalPlaces = 0;
  } else if (options.decimalPlaces == undefined
      || options.decimalPlaces == 'auto') {
    // Always show three significant digits
    const primaryDigits = Math.floor(Math.log10(displayValue) + 1);
    decimalPlaces = Math.max(0, 3 - primaryDigits);
  } else {
    decimalPlaces = options.decimalPlaces;
  }

  return formatter(displayValue.toFixed(decimalPlaces), stop.symbol);
}
