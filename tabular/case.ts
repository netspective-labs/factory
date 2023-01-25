export const snakeToCamelCase = (str: string) =>
  str.replace(/([-_]\w)/g, (g) => g[1].toUpperCase());

export const camelToSnakeCase = (str: string) =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
