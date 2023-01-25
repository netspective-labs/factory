import * as SQLa from "../sql/render/mod.ts";
import * as dvdfs from "../sql/models/dv-device-fs.ts";
import * as sqlite from "./sqlite.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

// this is often used by task consumers to make it convenient
export { walkGlobbedFilesExcludeGit } from "../sql/models/dv-device-fs.ts";

type DeepPartial<T> = {
  // deno-lint-ignore ban-types
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};
export function walkedFsDataVaultTask(
  globs?: dvdfs.WalkGlob[],
  options?: DeepPartial<sqlite.SqliteDbDeployShellOptions> & {
    erDiagram?: { plantUML?: { pumlFilePath?: string } };
  },
) {
  return async () => {
    const rootPath = Deno.cwd();
    const ctx = SQLa.typicalSqlEmitContext();
    type Context = typeof ctx;

    const fsc = dvdfs.deviceFileSysContent<Context>();
    const SQL = [fsc.models.seedDDL.SQL(ctx)];

    if (!globs) globs = [dvdfs.walkGlobbedFilesExcludeGit(rootPath)];

    const sddso: sqlite.SqliteDbDeployShellOptions = {
      sqliteSrc: {
        sqlFilePath: Deno.makeTempFileSync({
          prefix: `walked-fs-dv`,
          suffix: `.auto.sql`,
        }),
        SQL,
        removeAfter: true,
        ...options?.sqliteSrc,
      },
      sqliteDest: {
        dbFilePath: `walked-fs-dv.auto.sqlite.db`,
        removeExistingDb: true,
        ...options?.sqliteDest,
      },
      memoryFirst: options?.memoryFirst,
      verbose: options?.verbose,
    };

    const validity = fsc.models.isValid();
    if (typeof validity === "number") {
      await Deno.writeTextFile(sddso.sqliteSrc.sqlFilePath, SQL.join("\n"));
      console.error("FATAL errors in SQL (see lint messages in emitted SQL)");
      Deno.exit(validity);
    }

    const sts = SQLa.uniqueSqlTextState(ctx);
    await fsc.prepareEntriesDML(sts, ...globs);
    sts.populate((sql) => sql + ";", SQL);
    sqlite.sqliteDbDeployShell(sddso);

    if (options?.erDiagram?.plantUML?.pumlFilePath) {
      await Deno.writeTextFile(
        options.erDiagram.plantUML.pumlFilePath,
        fsc.models.dvg.plantUmlIE(
          ctx,
          "main",
          Object.values(fsc.models).filter((m) =>
            SQLa.isTableDefinition(m) && SQLa.isSqlDomainsSupplier(m)
          ) as Any,
        ),
      );
    }
  };
}
