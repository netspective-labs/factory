import { fs, path } from "./deps.ts";
import * as fsr from "./fs-route.ts";
import * as tab from "../tabular/mod.ts";

export interface TabularFsWalkerRecord {
  readonly namespace: string;
  readonly root: string;
  readonly options: string;
}

export interface TabularFsPathRecord
  extends Pick<path.ParsedPath, "root" | "dir"> {
  readonly walkerId: tab.TabularRecordIdRef;
  readonly isSymlink: boolean;
  readonly outsideRoot: false | string;
}

export interface TabularFsFileRecord extends path.ParsedPath {
  /**
   * If there are multiple extensions they become comma-separated "modifiers"
   */
  readonly modifiers?: string;
  readonly isSymlink: boolean;
}

export interface TabularFsFileAncestorRecord {
  readonly pathId: tab.TabularRecordIdRef;
  readonly fileId: tab.TabularRecordIdRef;
  readonly level: number;
}

export function tabularFsBuilders() {
  return {
    walker: tab.tabularRecordsAutoRowIdBuilder<TabularFsWalkerRecord, "walker">(
      {
        upsertStrategy: {
          exists: (w, _rowID, index) =>
            index("walker")?.get(`${w.namespace}->${w.root}`),
          index: (w, index) =>
            index("walker").set(`${w.namespace}->${w.root}`, w),
        },
      },
    ),
    path: tab.tabularRecordsAutoRowIdBuilder<TabularFsPathRecord, "path">({
      upsertStrategy: {
        exists: (p, _rowID, index) => index("path")?.get(`${p.root}->${p.dir}`),
        index: (p, index) => index("path").set(`${p.root}->${p.dir}`, p),
      },
    }),
    file: tab.tabularRecordsAutoRowIdBuilder<TabularFsFileRecord, "file">({
      upsertStrategy: {
        exists: (f, _rowID, index) => index("file")?.get(`${f.root}->${f.dir}`),
        index: (f, index) => index("file").set(`${f.root}->${f.dir}`, f),
      },
    }),
    fileAncestor: tab.tabularRecordsAutoRowIdBuilder<
      TabularFsFileAncestorRecord
    >(),
  };
}

export interface FileSystemTabularRecordsWalker {
  readonly namespace: string;
  readonly rootAbsPath: string;
  readonly options: fs.WalkOptions;
}

export async function* fileSystemTabularRecords(
  walkers: Iterable<FileSystemTabularRecordsWalker>,
  viewDefnsStrategy = (
    name:
      | "walker"
      | "path"
      | "file"
      | "file_ancestor",
  ) => ({
    identity: name == "walker" ? `fs_walk` : `fs_walk_${name}`,
    namespace: "observability",
  }),
  builders = tabularFsBuilders(),
) {
  const {
    walker: walkerRB,
    path: pathRB,
    file: fileRB,
    fileAncestor: fileAncestorRB,
  } = builders;

  const upsertAncestors = (
    dir: string,
    fileRecord:
      & TabularFsFileRecord
      & Readonly<tab.MutatableTabularRecordIdSupplier>,
    we: fs.WalkEntry,
    walkerRecord:
      & TabularFsWalkerRecord
      & Readonly<tab.MutatableTabularRecordIdSupplier>,
    terminalAncestor: string,
    level = 0,
  ) => {
    const ancestorPath = dir.substring(terminalAncestor.length + 1);
    if (ancestorPath.length > 0) {
      const pathRecord = pathRB.upsert({
        walkerId: walkerRecord.id,
        root: fileRecord.root,
        dir: ancestorPath,
        isSymlink: we.isSymlink,
        outsideRoot: false,
      });
      fileAncestorRB.upsert({
        pathId: pathRecord.id,
        fileId: fileRecord.id,
        level,
      });
      upsertAncestors(
        path.resolve(path.dirname(ancestorPath)),
        fileRecord,
        we,
        walkerRecord,
        terminalAncestor,
        level + 1,
      );
    }
  };

  for (const walker of walkers) {
    const walkerRecord = walkerRB.upsert({
      namespace: walker.namespace,
      root: walker.rootAbsPath,
      options: Deno.inspect(walker.options),
    });
    const walkerParentPath = path.dirname(walker.rootAbsPath);
    const walkerTerminalAncestor = walkerParentPath.length > 0
      ? walkerParentPath
      : walker.rootAbsPath;

    // walk each subdirectory and file of the given root and treat each file as
    // as "terminal" (leaf) node of our tree
    for await (const terminal of fs.walk(walker.rootAbsPath, walker.options)) {
      if (terminal.isDirectory) continue;

      const route = fsr.typicalFileSysRouteParser(
        terminal.path,
        walker.rootAbsPath,
      );
      const fileRecord = fileRB.upsert({
        ...route.parsedPath,
        modifiers: route.modifiers ? route.modifiers.join(", ") : undefined,
        isSymlink: terminal.isSymlink,
      });

      if (terminal.path.startsWith(walkerTerminalAncestor)) {
        upsertAncestors(
          path.dirname(terminal.path),
          fileRecord,
          terminal,
          walkerRecord,
          walkerTerminalAncestor,
        );
      } else {
        // symlink or something took us outside of our root path
        const pathRecord = pathRB.upsert({
          walkerId: walkerRecord.id,
          root: fileRecord.root,
          dir: terminal.path,
          outsideRoot: path.relative(
            walkerTerminalAncestor,
            terminal.path,
          ),
          isSymlink: terminal.isSymlink,
        });
        fileAncestorRB.upsert({
          pathId: pathRecord.id,
          fileId: fileRecord.id,
          level: -1,
        });
      }
    }
  }

  yield tab.definedTabularRecordsProxy(
    viewDefnsStrategy("walker"),
    walkerRB.records,
  );
  yield tab.definedTabularRecordsProxy(
    viewDefnsStrategy("path"),
    pathRB.records,
  );
  yield tab.definedTabularRecordsProxy(
    viewDefnsStrategy("file"),
    fileRB.records,
  );
  yield tab.definedTabularRecordsProxy(
    viewDefnsStrategy("file_ancestor"),
    fileAncestorRB.records,
  );
}
