const isProduction = process.env.NODE_ENV == "production";

const TAG = `[witness]`;

export function log(...args: any[]) {
  if (isProduction) {
    console.log(TAG, ...args);
  }
}

export function error(...args: any[]) {
  console.error(TAG, ...args);
}
