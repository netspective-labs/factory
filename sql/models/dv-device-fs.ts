import { fs, path } from "../render/deps.ts";
import * as mt from "https://deno.land/std@0.173.0/media_types/mod.ts";
import * as SQLa from "../render/mod.ts";
import * as dv from "./data-vault.ts";
import * as fm from "../../text/frontmatter.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export type PathParts = path.ParsedPath & {
  modifiersList: string[];
  modifiersText: string;
};

/**
 * pathParts splits a file system path into components; it's only novel job
 * is to find multiple extensions like `name.ext1.ext2.tailext` and consider
 * the `.tailext` as the primary extension and `.ext1.ext2` as "modifiers".
 * @param parseablePath
 * @returns path.ParsedPath plus modifiers
 */
export function pathParts(
  parseablePath: string,
) {
  const pp: PathParts = {
    modifiersList: [],
    modifiersText: "" as string,
    ...path.parse(parseablePath),
  };
  if (pp.name.indexOf(".") > 0) {
    let ppn = pp.name;
    let modifier = path.extname(ppn);
    while (modifier && modifier.length > 0) {
      pp.modifiersList.push(modifier);
      pp.modifiersText += modifier;
      ppn = ppn.substring(0, ppn.length - modifier.length);
      modifier = path.extname(ppn);
    }
    pp.name = ppn;
  }
  return pp;
}

export function deviceFileSysModels<Context extends SQLa.SqlEmitContext>() {
  const stso = SQLa.typicalSqlTextSupplierOptions<Context>();
  const dvg = dv.dataVaultGovn<Context>(stso);
  const {
    text,
    textNullable,
    integer,
    integerNullable,
    dateNullable,
    jsonTextNullable,
  } = dvg.domains;
  const { digestPkMember: pkDigest } = dvg;

  const deviceHub = dvg.hubTable("device", {
    hub_device_id: dvg.digestPrimaryKey(),
    host: { ...pkDigest(text()), isUnique: true },
    host_ipv4_address: { ...pkDigest(text()), isUnique: true },
  });

  const fileHub = dvg.hubTable("file", {
    hub_file_id: dvg.digestPrimaryKey(),
    abs_path: { ...pkDigest(text()), isUnique: true },
  });

  const filePathPartsSat = fileHub.satTable("path_parts", {
    hub_file_id: fileHub.foreignKeyRef.hub_file_id(),
    sat_file_path_parts_id: dvg.ulidPrimaryKey(),
    file_abs_path_and_file_name_extn: text(),
    file_grandparent_path: text(),
    file_root: textNullable(), // TODO: add example/doc/remark that e.g. `C:\` on Windows, `/` on Linux/MacOS
    file_parent_path: text(),
    file_name_without_extn: text(),
    file_name_with_extn: text(),
    file_extn_tail: textNullable(),
    file_extn_modifiers: textNullable(),
    file_extn_full: textNullable(),
  });

  const fileStatSat = fileHub.satTable("stat", {
    hub_file_id: fileHub.foreignKeyRef.hub_file_id(),
    sat_file_stat_id: dvg.ulidPrimaryKey(),
    file_abs_path_and_file_name_extn: text(),
    is_symlink: integer(),
    size: integer(),
    birthtime: dateNullable(),
    mtime: dateNullable(),
    atime: dateNullable(),
  });

  const fileFrontmatterSat = fileHub.satTable("frontmatter", {
    hub_file_id: fileHub.foreignKeyRef.hub_file_id(),
    sat_file_frontmatter_id: dvg.ulidPrimaryKey(),
    file_abs_path_and_file_name_extn: text(),
    nature: text(),
    frontmatter: jsonTextNullable(),
    content: textNullable(),
    content_length: integerNullable(),
    error: textNullable(),
    reg_exp: textNullable(),
  });

  // TODO: add # and <h1>, <h2> parsers to grab headings and put them into
  // content analysis tables; we might want to "read" and parse all MD and HTML
  // content and perform keyword analysis using full text search;
  // we also need to parse HTML and store links into tables, parse tweets and
  // store links into tables; parse tables in HTML and store as tables, etc.

  const fileMetaSat = fileHub.satTable("meta", {
    hub_file_id: fileHub.foreignKeyRef.hub_file_id(),
    sat_file_meta_id: dvg.ulidPrimaryKey(),
    key: text(),
    value: text(),
  });

  const fsWalkHub = dvg.hubTable("fs_walk", {
    hub_fs_walk_id: dvg.digestPrimaryKey(),
    root_path: pkDigest(text()),
    glob: pkDigest(text()),
  });

  const fsWalkMediaTypeSat = fsWalkHub.satTable("media_type", {
    hub_fs_walk_id: fsWalkHub.foreignKeyRef.hub_fs_walk_id(),
    sat_fs_walk_media_type_id: dvg.digestPrimaryKey(),
    file_suffix_unit: pkDigest(text()),
    file_suffix_full: pkDigest(text()),
    file_suffix_unit_index: pkDigest(integerNullable()),
    mime_type: pkDigest(text()),
    content_type: pkDigest(text()),
  });

  const deviceFileLink = dvg.linkTable("device_file", {
    link_device_file_id: dvg.digestPrimaryKey(),
    hub_device_id: pkDigest(deviceHub.foreignKeyRef.hub_device_id()),
    hub_file_id: pkDigest(fileHub.foreignKeyRef.hub_file_id()),
  });

  const deviceFsWalkFileLink = dvg.linkTable("device_fs_walk_file", {
    link_device_fs_walk_file_id: dvg.digestPrimaryKey(),
    hub_device_id: pkDigest(deviceHub.foreignKeyRef.hub_device_id()),
    hub_fs_walk_id: pkDigest(fsWalkHub.foreignKeyRef.hub_fs_walk_id()),
    hub_file_id: pkDigest(fileHub.foreignKeyRef.hub_file_id()),
  });

  const deviceFsWalkFileLinkRelPathPartsSat = deviceFsWalkFileLink.satTable(
    "path_parts",
    {
      link_device_fs_walk_file_id: deviceFsWalkFileLink.foreignKeyRef
        .link_device_fs_walk_file_id(),
      sat_device_fs_walk_file_path_parts_id: dvg.ulidPrimaryKey(),
      file_abs_path_and_file_name_extn: text(),
      file_rel_path_and_file_name_extn: text(), // rel is relative to fs_walk.root_path
      file_grandparent_rel_path: text(), // rel is relative to fs_walk.root_path
      file_parent_rel_path: text(), // rel is relative to fs_walk.root_path
      file_name_without_extn: text(),
      file_name_with_extn: text(),
      file_extn_tail: textNullable(),
      file_extn_modifiers: textNullable(),
      file_extn_full: textNullable(),
      file_mime_type: textNullable(),
      file_content_type: textNullable(),
    },
  ); // TODO: add unique constraints from fs.ts

  const deviceFsWalkFileLinkSuffixMediaTypesSat = deviceFsWalkFileLink.satTable(
    "suffix_media_type",
    {
      link_device_fs_walk_file_id: deviceFsWalkFileLink.foreignKeyRef
        .link_device_fs_walk_file_id(),
      sat_device_fs_walk_file_suffix_media_type_id: dvg.ulidPrimaryKey(),
      file_suffix_unit: text(),
      file_suffix_unit_index: integer(),
      file_suffix_units_count: integer(),
      file_suffix_unit_is_initial: integer(),
      file_suffix_unit_is_final: integer(),
      file_suffix_full: text(),
      mime_type: textNullable(),
      content_type: textNullable(),
    },
  );

  // deno-fmt-ignore
  const seedDDL = SQLa.SQL<Context>(stso)`
    -- Generated by ${path.basename(import.meta.url)}. DO NOT EDIT.

    ${dvg.sqlTextLintSummary}

    ${deviceHub}

    ${fileHub}

    ${filePathPartsSat}

    ${fileStatSat}

    ${fileFrontmatterSat}

    ${fileMetaSat}

    ${fsWalkHub}

    ${fsWalkMediaTypeSat}

    ${deviceFileLink}

    ${deviceFsWalkFileLink}

    ${deviceFsWalkFileLinkRelPathPartsSat}

    ${deviceFsWalkFileLinkSuffixMediaTypesSat}

    ${dvg.sqlTmplEngineLintSummary}
    ${dvg.sqlTextLintSummary}`;

  return {
    stso,
    dvg,
    deviceHub,
    fileHub,
    filePathPartsSat,
    fileStatSat,
    fileFrontmatterSat,
    fileMetaSat,
    fsWalkHub,
    fsWalkMediaTypeSat,
    deviceFileLink,
    deviceFsWalkFileLink,
    deviceFsWalkFileLinkRelPathPartsSat,
    deviceFsWalkFileLinkSuffixMediaTypesSat,
    seedDDL,
    isValid: () => {
      const stls = seedDDL.stsOptions.sqlTextLintState;
      if (stls?.lintedSqlText.lintIssues.find((li) => stls.isFatalIssue(li))) {
        return 100;
      }
      if (
        stls?.lintedSqlTmplEngine.lintIssues.find((li) => stls.isFatalIssue(li))
      ) {
        return 101;
      }
      return true;
    },
  };
}

export type MediaType = { contentType: string; mimeType: string };

export type TextMediaTypeDetector = (text: string) => MediaType | undefined;

export type FileSuffixMediaTypeDetector = TextMediaTypeDetector;

export const stdFileSuffixMediaType: FileSuffixMediaTypeDetector = (
  suffixUnit,
) => {
  const contentType = mt.contentType(suffixUnit);
  const mimeType = mt.typeByExtension(suffixUnit);
  if (contentType && mimeType) {
    return { contentType, mimeType };
  }
  return undefined;
};

export const tsStdFileSuffixMediaType: FileSuffixMediaTypeDetector = (
  suffixUnit,
) => {
  if (suffixUnit == ".ts") {
    return {
      contentType: "application/typescript",
      mimeType: "application/typescript",
    };
  }
  return stdFileSuffixMediaType(suffixUnit);
};

export interface WalkGlob {
  readonly rootPath: string;
  readonly label: string;
  readonly glob: string;
  readonly include?: (we: fs.WalkEntry) => boolean;
  readonly globOptions?: (rootPath: string) => fs.ExpandGlobOptions;
  readonly suffixMediaType?: (we: fs.WalkEntry) => FileSuffixMediaTypeDetector;
  readonly frontmatter?: (
    pathParts: PathParts,
    we: fs.WalkEntry,
    weMT?: MediaType,
  ) => Promise<fm.FrontmatterParseResult<fm.UntypedFrontmatter> | undefined>;
}

export function walkGlobbedFilesExcludeGit(
  rootPath: string,
  glob = "**/*",
  inherit?: Partial<Omit<WalkGlob, "rootPath" | "glob">>,
): WalkGlob {
  return {
    rootPath,
    glob,
    label: inherit?.label ?? rootPath,
    include: inherit?.include ?? ((we) => we.isFile),
    globOptions: inherit?.globOptions ?? ((root) => ({
      root,
      includeDirs: false,
      globstar: true,
      extended: true,
      exclude: [".git"],
    })),
    suffixMediaType: inherit?.suffixMediaType ??
      (() => tsStdFileSuffixMediaType),
    frontmatter: async (pp, we, suffixMT) => {
      if (suffixMT?.mimeType == "text/markdown" || pp.ext == ".md") {
        return await fm.parseFileYamlTomlFrontmatter(we.path);
      }
      if (pp.ext == ".html") {
        return await fm.parseFileYamlHtmlFrontmatter(we.path);
      }
      return undefined;
    },
  };
}

export function deviceFileSysContent<Context extends SQLa.SqlEmitContext>() {
  const fsm = deviceFileSysModels<Context>();
  const {
    deviceHub,
    fileHub,
    filePathPartsSat,
    fileStatSat,
    fileFrontmatterSat,
    //fileMetaSat, TODO: add HTML parsing and meta data
    fsWalkHub,
    fsWalkMediaTypeSat,
    deviceFileLink,
    deviceFsWalkFileLink,
    deviceFsWalkFileLinkRelPathPartsSat: dfswflrPathPartsSat,
    deviceFsWalkFileLinkSuffixMediaTypesSat: dfswflSuffixMediaTypeSat,
  } = fsm;

  const walkedEntries = async function* (
    state: SQLa.SqlTextMemoizer<Context> & {
      readonly mediaType?: FileSuffixMediaTypeDetector;
    },
    ...globs: WalkGlob[]
  ) {
    const { memoizeSQL } = state;

    const memoizeSuffixDML = async (
      mediaType: FileSuffixMediaTypeDetector,
      walkFsId: string | SQLa.SqlTextSupplier<Context>,
      suffixUnit: string,
      unitIndex: number | undefined,
      suffixFull: string,
    ) => {
      const suMT = mediaType(suffixUnit);
      if (!suMT) return undefined;
      memoizeSQL(
        await fsWalkMediaTypeSat.insertDML({
          hub_fs_walk_id: walkFsId,
          file_suffix_unit: suffixUnit,
          file_suffix_full: suffixFull,
          file_suffix_unit_index: unitIndex,
          content_type: suMT.contentType,
          mime_type: suMT.mimeType,
        }),
      );
      return suMT;
    };

    const activeHost = memoizeSQL(
      await deviceHub.insertDML({
        host: Deno.hostname(),
        host_ipv4_address: Deno.hostname(), // TODO: add IPv4 address
      }),
    );
    const { hub_device_id } = activeHost.returnable(activeHost.insertable);

    for (const srcGlob of globs) {
      const globOptions = srcGlob.globOptions?.(srcGlob.rootPath);
      for await (const we of fs.expandGlob(srcGlob.glob, globOptions)) {
        const suffixMediaType = srcGlob.suffixMediaType?.(we) ??
          tsStdFileSuffixMediaType;
        const activeWalkerRootPath = path.resolve(srcGlob.rootPath);
        const fsWalkHubRec = memoizeSQL(
          await fsWalkHub.insertDML({
            root_path: activeWalkerRootPath,
            glob: srcGlob.glob,
          }),
        );
        const { hub_fs_walk_id } = fsWalkHubRec.returnable(
          fsWalkHubRec.insertable,
        );

        const fileHubRec = memoizeSQL(
          await fileHub.insertDML({ abs_path: we.path }),
        );
        const { hub_file_id } = fileHubRec.returnable(fileHubRec.insertable);

        const absPP = pathParts(we.path);
        const file_extn_tail = absPP.ext.length > 0 ? absPP.ext : undefined;
        const file_extn_full = absPP.ext.length > 0
          ? absPP.modifiersText + absPP.ext
          : undefined;
        memoizeSQL(
          await filePathPartsSat.insertDML({
            hub_file_id,
            file_abs_path_and_file_name_extn: we.path,
            file_parent_path: absPP.dir,
            file_grandparent_path: path.dirname(absPP.dir),
            file_name_with_extn: absPP.base,
            file_name_without_extn: absPP.name,
            file_root: absPP.root, // e.g. C:\ on Windows, / on Linux/MacOS
            file_extn_tail,
            file_extn_modifiers: absPP.modifiersList.length > 0
              ? absPP.modifiersText
              : undefined,
            file_extn_full,
          }),
        );

        const stat = await Deno.stat(we.path);
        memoizeSQL(
          await fileStatSat.insertDML({
            hub_file_id,
            file_abs_path_and_file_name_extn: we.path,
            is_symlink: stat.isSymlink ? 1 : 0,
            size: stat.size,
            mtime: stat.mtime ?? undefined,
            atime: stat.atime ?? undefined,
            birthtime: stat.birthtime ?? undefined,
          }),
        );

        let suffixMT: MediaType | undefined = undefined;
        if (file_extn_tail && file_extn_full) {
          suffixMT = await memoizeSuffixDML(
            suffixMediaType,
            hub_fs_walk_id,
            file_extn_tail,
            undefined,
            file_extn_full,
          );

          for (let i = 0; i < absPP.modifiersList.length; i++) {
            const modf = absPP.modifiersList[i];
            memoizeSuffixDML(
              suffixMediaType,
              hub_fs_walk_id,
              modf,
              i,
              file_extn_full,
            );
          }
        }

        const frontmatter = await srcGlob.frontmatter?.(absPP, we, suffixMT);
        if (frontmatter) {
          memoizeSQL(
            await fileFrontmatterSat.insertDML({
              hub_file_id,
              file_abs_path_and_file_name_extn: we.path,
              nature: frontmatter.nature,
              frontmatter: JSON.stringify(frontmatter.frontmatter),
              content: frontmatter.content?.length == 0
                ? undefined
                : frontmatter.content,
              content_length: frontmatter.content?.length ?? undefined,
              error: frontmatter.error ? String(frontmatter.error) : undefined,
              reg_exp: frontmatter.regExp
                ? String(frontmatter.regExp)
                : undefined,
            }),
          );
        }

        memoizeSQL(
          await deviceFileLink.insertDML({
            hub_device_id,
            hub_file_id,
          }),
        );

        const dfswFileLink = memoizeSQL(
          await deviceFsWalkFileLink.insertDML({
            hub_device_id,
            hub_fs_walk_id,
            hub_file_id,
          }),
        );
        const { link_device_fs_walk_file_id } = dfswFileLink.returnable(
          dfswFileLink.insertable,
        );

        const weRelPath = path.relative(activeWalkerRootPath, we.path);
        const relPP = pathParts(weRelPath);
        const relFileExtnTail = relPP.ext.length > 0 ? relPP.ext : undefined;
        const relFileExtnFull = relPP.ext.length > 0
          ? relPP.modifiersText + relPP.ext
          : undefined;
        const relMediaType = relFileExtnTail
          ? suffixMediaType(relFileExtnTail)
          : undefined;
        memoizeSQL(
          await dfswflrPathPartsSat.insertDML({
            link_device_fs_walk_file_id,
            file_abs_path_and_file_name_extn: we.path,
            file_rel_path_and_file_name_extn: weRelPath,
            file_parent_rel_path: relPP.dir,
            file_grandparent_rel_path: path.dirname(relPP.dir),
            file_name_with_extn: relPP.base,
            file_name_without_extn: relPP.name,
            file_extn_tail: relFileExtnTail,
            file_extn_modifiers: relPP.modifiersList.length > 0
              ? relPP.modifiersText
              : undefined,
            file_extn_full: relFileExtnFull,
            file_content_type: relMediaType
              ? relMediaType.contentType
              : undefined,
            file_mime_type: relMediaType ? relMediaType.mimeType : undefined,
          }),
        );

        if (relFileExtnTail && relFileExtnFull) {
          // put extensions in the order of "most signficant" (last extension is
          // most important, followed by modifiers in reverse order).
          const allExtns = [relFileExtnTail, ...relPP.modifiersList.reverse()];
          const file_suffix_units_count = allExtns.length;
          const last = file_suffix_units_count - 1;
          for (let i = 0; i < file_suffix_units_count; i++) {
            const file_suffix_unit = allExtns[i];
            const suMT = suffixMediaType(file_suffix_unit);
            memoizeSQL(
              await dfswflSuffixMediaTypeSat.insertDML({
                link_device_fs_walk_file_id,
                file_suffix_unit,
                file_suffix_full: relFileExtnFull,
                file_suffix_unit_index: i,
                file_suffix_units_count,
                file_suffix_unit_is_final: i == last ? 1 : 0,
                file_suffix_unit_is_initial: i == 0 ? 1 : 0,
                content_type: suMT ? suMT.contentType : undefined,
                mime_type: suMT ? suMT.mimeType : undefined,
              }),
            );
          }
        }

        yield {
          state,
          models: fsm,
          srcGlob,
          walkEntry: we,
          weRelPath,
          stat,
          absPP,
          relPP,
          fsWalkHubRec,
          fileHubRec,
          dvState: {
            hub_device_id,
            hub_fs_walk_id,
            hub_file_id,
          },
        };
      }
    }
  };

  return {
    models: fsm,
    walkedEntries,
    prepareEntriesDML: async (
      state: SQLa.SqlTextMemoizer<Context> & {
        readonly mediaType?: FileSuffixMediaTypeDetector;
      },
      ...globs: WalkGlob[]
    ) => {
      for await (const _entry of walkedEntries(state, ...globs)) {
        // we're not doing anything with the yieled entries so they're just
        // being memoized
      }
    },
  };
}

export function deviceFileSysPlantUmlDiagram() {
  const ctx = SQLa.typicalSqlEmitContext();
  type Context = typeof ctx;

  const fsm = deviceFileSysModels<Context>();
  console.log(fsm.dvg.plantUmlIE(
    ctx,
    "main",
    Object.values(fsm).filter((m) =>
      SQLa.isTableDefinition(m) && SQLa.isSqlDomainsSupplier(m)
    ) as Any,
  ));
}

export async function deviceFileSysSQL(rootPath: string, ...globs: string[]) {
  const ctx = SQLa.typicalSqlEmitContext();
  type Context = typeof ctx;
  if (globs.length == 0) globs = ["**/*"];

  const fsc = deviceFileSysContent<Context>();
  console.log(fsc.models.seedDDL.SQL(ctx));

  const validity = fsc.models.isValid();
  if (typeof validity === "number") {
    console.error("FATAL errors in SQL (see lint messages in emitted SQL)");
    Deno.exit(validity);
  }

  const sts = SQLa.uniqueSqlTextState(ctx);
  await fsc.prepareEntriesDML(
    sts,
    ...globs.map((glob) => walkGlobbedFilesExcludeGit(rootPath, glob)),
  );
  for (const sql of sts.uniqueSQL) {
    console.log(sql, ";");
  }
}

if (import.meta.main) {
  // - If we're being called as a CLI, we emit text to STDOUT.
  // - `deno run -A --unstable ./dv-device-fs.ts (walk|er-diagram-puml) rootPath ...globs`
  //
  // - Examples assuming we're running from netspective-labs/factory root:
  //   $ deno run -A --unstable lib/sql/models/dv-device-fs.ts
  //   $ deno run -A --unstable lib/sql/models/dv-device-fs.ts walk
  //   $ deno run -A --unstable lib/sql/models/dv-device-fs.ts walk /tmp/X
  //   $ deno run -A --unstable lib/sql/models/dv-device-fs.ts walk /tmp/X "**/*.ts"
  //   $ deno run -A --unstable lib/sql/models/dv-device-fs.ts er-diagram-puml
  //   $ deno run -A --unstable lib/sql/models/dv-device-fs.ts er-diagram-puml > diagram.puml
  //   $ deno run -A --unstable lib/sql/models/dv-device-fs.ts er-diagram-puml | java -jar plantuml.jar -pipe -ttxt > diagram.txt
  //   $ deno run -A --unstable lib/sql/models/dv-device-fs.ts er-diagram-puml | java -jar plantuml.jar -pipe -tsvg > diagram.svg
  //   $ deno run -A --unstable lib/sql/models/dv-device-fs.ts er-diagram-puml | java -jar plantuml.jar -pipe > diagram.png
  //
  // - You can also create a SQLite database using the output:
  //   $ (deno run -A --unstable lib/sql/models/dv-device-fs.ts ; echo "\n.dump\n") | sqlite3 ":memory:" > lib/sql/models/dv-device-fs.dump.sql
  //   $ (deno run -A --unstable lib/sql/models/dv-device-fs.ts ; echo "\n.dump\n") | sqlite3 ":memory:" | sqlite3 lib/sql/models/dv-device-fs.db
  // - sending into SQLite memory first and then dumping afterwards is much faster
  //   because we're using static SQL with lookups for foreign keys.
  // - A good way to "test" is to use this CLI from $RF_HOME:
  //   $ sudo apt-get -y -qq install sqlite3
  //   $ rm -f lib/sql/models/dv-device-fs.db && $ (deno run -A --unstable lib/sql/models/dv-device-fs.ts ; echo "\n.dump\n") | sqlite3 ":memory:" | sqlite3 lib/sql/models/dv-device-fs.db
  //   then, open `dv-device-fs.sql` with VS Code SQL notebook for exploring the content
  //
  // - The same functionality is available through a single TS task in `lib/task/fs-walk-dv.ts`.
  //
  const cmd = Deno.args.length > 0 ? Deno.args[0] : "walk";
  if (cmd === "er-diagram-puml") {
    deviceFileSysPlantUmlDiagram();
  } else {
    const rootPath = Deno.args.length > 1 ? Deno.args[1] : Deno.cwd();
    deviceFileSysSQL(rootPath, ...Deno.args.slice(2));
  }
}
