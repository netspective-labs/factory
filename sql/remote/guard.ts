import * as safety from "../../safety/mod.ts";
import * as govn from "./governance.ts";

export const isForeignSqlStmtIdentitySupplier = safety.typeGuard<
  govn.ForeignSqlStmtIdentitySupplier
>("qualifiedName");

export const isForeignSqlStmtSupplier = safety.typeGuard<
  govn.ForeignSqlStmtSupplier
>("SQL");

export const isForeigSqlStmtBindParamsSupplier = safety.typeGuard<
  govn.ForeigSqlStmtBindParamsSupplier
>("sqlBindParams");

export const firstWordRegEx = /^\s*([a-zA-Z0-9]+)/;

export const firstWord = (text: string) => {
  const firstWordMatch = text.match(firstWordRegEx);
  if (firstWordMatch && firstWordMatch.length > 1) {
    return firstWordMatch[1].toUpperCase();
  }
  return false;
};

export const isSelectStatement = (candidateSQL: string) => {
  const command = firstWord(candidateSQL);
  return (command && command == "SELECT") ? true : false;
};

export function isForeignSqlSelectStmtSupplier(
  o: unknown,
): o is govn.ForeignSqlStmtSupplier {
  return isForeignSqlStmtSupplier(o) && isSelectStatement(o.SQL);
}
