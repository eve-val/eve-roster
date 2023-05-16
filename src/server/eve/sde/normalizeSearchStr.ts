export function normalizeSearchStr(str: string) {
  // Trim and collapse whitespace
  str = str.trim();
  str = str.replace(/\s+/g, ` `);

  // Perform unicode normalization and set to lower case
  str = str.normalize();
  str = str.toLocaleLowerCase();

  // Replace curly quotes with straight quotes
  str = str.replace(/[“”]/g, `"`);
  str = str.replace(/[‘’]/g, `'`);

  return str;
}
