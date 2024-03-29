interface Stop {
  symbol: string;
  divisor: number;
}

const VALUE_STOPS: Stop[] = [
  { symbol: "", divisor: 1 },
  { symbol: "k", divisor: 1e3 },
  { symbol: "m", divisor: 1e6 },
  { symbol: "b", divisor: 1e9 },
  { symbol: "t", divisor: 1e12 },
];

export function formatNumber(
  value: number,
  options: {
    decimalPlaces: number | string | null;
    formatter: null | ((value: string, unit: string) => string);
  } = {
    decimalPlaces: "auto",
    formatter: null,
  },
) {
  const formatter =
    options.formatter ?? ((valueStr, unitStr) => `${valueStr}${unitStr}`);

  let st: Stop = VALUE_STOPS[0];
  for (const stop of VALUE_STOPS) {
    st = stop;
    if (value / st.divisor < 1000) {
      break;
    }
  }

  const displayValue = value / st.divisor;
  let decimalPlaces = 0;
  if (displayValue == 0) {
    decimalPlaces = 0;
  } else if (
    options.decimalPlaces == undefined ||
    options.decimalPlaces == "auto"
  ) {
    // Always show three significant digits
    const primaryDigits = Math.floor(Math.log10(displayValue) + 1);
    decimalPlaces = Math.max(0, 3 - primaryDigits);
  } else {
    decimalPlaces = options.decimalPlaces as number;
  }

  return formatter(displayValue.toFixed(decimalPlaces), st.symbol);
}
