import * as yaml from "https://deno.land/std@0.147.0/encoding/yaml.ts";

export const wrap = (wrapper: string, str: string) =>
  `${wrapper}${str}${wrapper}`;
export const spaces = (...text: string[]) => text.join(" ");
export const times = <T>(callback: (index: number) => T, length: number) =>
  [...new Array(length)].map((_, index) => callback(index));
export const joinWith = (separator: string, stringArray: Array<string>) =>
  stringArray.join(separator);
export const lines = (stringArray: Array<string>) => stringArray.join("\n");
export const postfix = (str1: string, str2: string) => `${str2}${str1}`;
export const prefix = (str1: string, str2: string) => `${str1}${str2}`;
export const always = <T>(value: T) => () => value;
export const join = (stringArray: Array<string>) => stringArray.join("");

export const untypedFrontMatterYAML = (fm: Record<string, unknown>) =>
  wrap("---\n", yaml.stringify(fm));

export function frontMatterYAML<FM extends Record<string, unknown>>(fm: FM) {
  return wrap("---\n", yaml.stringify(fm));
}

export const untypedFrontMatterYAMLInHtml = (fm: Record<string, unknown>) =>
  `<!---\n${yaml.stringify(fm)}\n--->`;

export function frontMatterYAMLInHtml<FM extends Record<string, unknown>>(
  fm: FM,
) {
  return `<!---\n${yaml.stringify(fm)}\n--->`;
}

export const italic = (str: string) => wrap("***", str);

export const code = (language: string, str: string) =>
  `\`\`\`${language}\n${str}\n\`\`\``;

export const inlineCode = (str: string) => wrap("`", str);
// reference
// | parameter | type   | description |
// | --------- | ------ | ----------- |
// | `x`       | number |             |
// | `y`       | number |             |
// | `alpha`   | number |             |

const columnSeparator = "|";
const headerSeparator = "-";

export const table = (rows: Array<Array<string>>) => {
  //   TODO: format output
  //   const columnLengths = rows.reduce((lengths, column) => {
  //     return lengths.map(co)
  //   }, )

  const [header, ...content] = rows;
  const rowsWithHeader: Array<Array<string>> = [
    header,
    header.map((heading) =>
      heading
        .split("")
        .map(() => headerSeparator)
        .join("")
    ),
    ...content,
  ];

  return lineBreak().concat(
    rowsWithHeader
      .map((columns) => {
        return ["", ...columns, ""].join(columnSeparator);
      })
      .join("\n"),
  );
};

export const strike = (str: string) => wrap("~~", str);

export const unordered = (stringArray: Array<string>) =>
  prefix(lineBreak(), lines(stringArray.map((str) => prefix("* ", str))));
export const lineBreak = () => "  \n";

export const bold = (str: string) => wrap("**", str);

// TODO: clamp 1 - 6
export const heading = (level: number, str: string) =>
  spaces(join(times(always("#"), level)), str);
export const image = (alt: string) => (url: string) => `![${alt}](${url})`;

export const quote = (str: string) => prefix("> ", str);
export const link = (label: string, url: string) => `[${label}](${url})`;

export const ordered = (stringArray: Array<string>) =>
  lineBreak().concat(
    lines(stringArray.map((str, index) => prefix(`${index + 1}. `, str))),
  );
