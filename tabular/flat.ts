// deno-lint-ignore no-explicit-any
type Any = any;

export const flattenObject = (obj: Any, parent?: Any, res: Any = {}) => {
  if (obj == undefined || obj == null) return undefined;

  for (const key of Object.keys(obj)) {
    const propName = parent ? parent + "." + key : key;
    if (typeof obj[key] === "object") {
      flattenObject(obj[key], propName, res);
    } else {
      res[propName] = obj[key];
    }
  }
  return res;
};
