export function wordWrap(
  str: string,
  newLineStr = "\n",
  maxWidth = 100,
) {
  const whitespRegEx = new RegExp(/^\s$/);
  let result = "";
  while (str.length > maxWidth) {
    let found = false;
    // Inserts new line at first whitespace of the line
    for (let i = maxWidth - 1; i >= 0; i--) {
      if (whitespRegEx.test(str.charAt(i))) {
        result = result + [str.slice(0, i), newLineStr].join("");
        str = str.slice(i + 1);
        found = true;
        break;
      }
    }
    // Inserts new line at maxWidth position, the word is too long to wrap
    if (!found) {
      result += [str.slice(0, maxWidth), newLineStr].join("");
      str = str.slice(maxWidth);
    }
  }
  return result + str;
}
