import * as govn from "./governance.ts";

export interface UseDatabaseIdDetector {
  readonly detectedUseDbIdInSQL: (SQL: string) => string | undefined;
  readonly rewriteSqlRemoveUseDbId: (SQL: string) => string;
  readonly detectedUseDB: (
    SQL: string,
  ) => govn.DetectedUseDBinSQL | undefined;
}

/**
 * typicalUseDatabaseIdDetector creates a detector which looks for this pattern:
 *
 *     USE DATABASE something;\n
 *
 * If the first line of the SQL starts with any whitespace and then USE DATABASE
 * (case insensitive) then "something" would be extracted as the databaseID.
 *
 * @returns
 */
export function useDatabaseIdInFirstLineOfSqlDetector(
  { removeUseDbIdStmt }: { removeUseDbIdStmt: boolean } = {
    removeUseDbIdStmt: true,
  },
) {
  const result: UseDatabaseIdDetector = {
    detectedUseDbIdInSQL: (SQL: string) => {
      const useDatabaseRegEx = /^\s*USE\s*DATABASE\s*(\w+).*$/gmi;
      const useDatabaseMatch = useDatabaseRegEx.exec(SQL);
      return useDatabaseMatch ? useDatabaseMatch[1] : undefined;
    },
    rewriteSqlRemoveUseDbId: (SQL) =>
      removeUseDbIdStmt
        ? SQL.replace(/^\s*USE\s*DATABASE.*$/mi, "").trim()
        : SQL,
    detectedUseDB: (SQL) => {
      const databaseID = result.detectedUseDbIdInSQL(SQL);
      if (databaseID) {
        return {
          isRewrittenSQL: true,
          originalSQL: SQL,
          SQL: result.rewriteSqlRemoveUseDbId(SQL),
          databaseID,
        };
      }
      return undefined;
    },
  };
  return result;
}

export const typicalUseDatabaseIdDetector =
  useDatabaseIdInFirstLineOfSqlDetector();
