import { path } from "./deps.ts";
import * as exec from "./mod.ts";
import * as sql from "../../sql/mod.ts";

export const DEFAULT_MERGESTAT_PATH =
  Deno.env.get("RF_SQL_SHELL_FSELECT_LOCATION") ??
    path.join(
      path.dirname(path.fromFileUrl(import.meta.url)),
      "bin",
      "mergestat",
    );

export function gitSqlCmdProxyInit(mergeStatPath = DEFAULT_MERGESTAT_PATH) {
  return new exec.SqlCmdExecutive({
    prepareExecuteSqlCmd: (SQL) => {
      return {
        cmd: [mergeStatPath, "-f", "json", SQL],
        stdout: "piped",
        stderr: "piped",
      };
    },
    events: () => {
      return new sql.SqlEventEmitter();
    },
  });
}

export const gitSqlCmdProxy = gitSqlCmdProxyInit(DEFAULT_MERGESTAT_PATH);

export function gitSqlInventory(
  databaseID: string,
): sql.DbmsEngineSchemalessDatabase {
  // use `gitql show-tables` to get schema

  // https://github.com/filhodanuvem/gitql
  const _gitqlDialect = () => {
    const filteredTables = (filter?: (t: sql.DbmsTable) => boolean) => {
      const commitsColumns = (
        filter?: (t: sql.DbmsTableColumn) => boolean,
      ) => {
        const columns: sql.DbmsTableUntypedColumn[] = [
          "hash",
          "date",
          "author",
          "author_email",
          "committer",
          "committer_email",
          "message",
          "full_message",
        ].map((name) => ({ identity: name }));
        return filter ? columns.filter((c) => filter(c)) : columns;
      };
      const commitsTable: sql.DbmsTable = {
        identity: "commits",
        filteredColumns: commitsColumns,
        columns: commitsColumns(),
      };

      const refsColumns = (
        filter?: (t: sql.DbmsTableColumn) => boolean,
      ) => {
        const columns: sql.DbmsTableUntypedColumn[] = [
          "hash",
          "name",
          "full_name",
          "type",
        ].map((name) => ({ identity: name }));
        return filter ? columns.filter((c) => filter(c)) : columns;
      };
      const refsTable: sql.DbmsTable = {
        identity: "refs",
        filteredColumns: refsColumns,
        columns: refsColumns(),
      };

      const tagsColumns = (
        filter?: (t: sql.DbmsTableColumn) => boolean,
      ) => {
        const columns: sql.DbmsTableUntypedColumn[] = [
          "hash",
          "name",
          "full_name",
        ].map((name) => ({ identity: name }));
        return filter ? columns.filter((c) => filter(c)) : columns;
      };
      const tagsTable: sql.DbmsTable = {
        identity: "tags",
        filteredColumns: tagsColumns,
        columns: tagsColumns(),
      };

      const branchesColumns = (
        filter?: (t: sql.DbmsTableColumn) => boolean,
      ) => {
        const columns: sql.DbmsTableUntypedColumn[] = [
          "hash",
          "name",
          "full_name",
        ].map((name) => ({ identity: name }));
        return filter ? columns.filter((c) => filter(c)) : columns;
      };
      const branchesTable: sql.DbmsTable = {
        identity: "branches",
        filteredColumns: branchesColumns,
        columns: branchesColumns(),
      };

      const tables: sql.DbmsTable[] = [
        commitsTable,
        refsTable,
        tagsTable,
        branchesTable,
      ];
      return filter ? tables.filter((t) => filter(t)) : tables;
    };
    const db: sql.DbmsEngineSchemalessDatabase = {
      isSchemaDatabase: false,
      identity: databaseID,
      filteredTables,
      tables: filteredTables(),
    };
    return db;
  };

  // https://github.com/mergestat/mergestat
  const mergestatDialect = () => {
    const filteredTables = (filter?: (t: sql.DbmsTable) => boolean) => {
      const commitsColumns = (
        filter?: (t: sql.DbmsTableColumn) => boolean,
      ) => {
        const columns: sql.DbmsTableUntypedColumn[] = [
          "hash",
          "date",
          "author_name",
          "author_email",
          "author_when",
          "committer_name",
          "committer_email",
          "committer_when",
          "message",
          "parents",
        ].map((name) => ({ identity: name }));
        return filter ? columns.filter((c) => filter(c)) : columns;
      };
      const commitsTable: sql.DbmsTable = {
        identity: "commits",
        filteredColumns: commitsColumns,
        columns: commitsColumns(),
      };

      const refsColumns = (
        filter?: (t: sql.DbmsTableColumn) => boolean,
      ) => {
        const columns: sql.DbmsTableUntypedColumn[] = [
          "hash",
          "name",
          "full_name",
          "type",
          "remote",
          "target",
        ].map((name) => ({ identity: name }));
        return filter ? columns.filter((c) => filter(c)) : columns;
      };
      const refsTable: sql.DbmsTable = {
        identity: "refs",
        filteredColumns: refsColumns,
        columns: refsColumns(),
      };

      const statsColumns = (
        filter?: (t: sql.DbmsTableColumn) => boolean,
      ) => {
        const columns: sql.DbmsTableUntypedColumn[] = [
          "file_path",
          "additions",
          "deletions",
        ].map((name) => ({ identity: name }));
        return filter ? columns.filter((c) => filter(c)) : columns;
      };
      const statsTable: sql.DbmsTable = {
        identity: "stats",
        filteredColumns: statsColumns,
        columns: statsColumns(),
      };

      const filesColumns = (
        filter?: (t: sql.DbmsTableColumn) => boolean,
      ) => {
        const columns: sql.DbmsTableUntypedColumn[] = [
          "path",
          "executable",
          "contents",
        ].map((name) => ({ identity: name }));
        return filter ? columns.filter((c) => filter(c)) : columns;
      };
      const filesTable: sql.DbmsTable = {
        identity: "files",
        filteredColumns: filesColumns,
        columns: filesColumns(),
      };

      const tables: sql.DbmsTable[] = [
        commitsTable,
        refsTable,
        statsTable,
        filesTable,
      ];
      return filter ? tables.filter((t) => filter(t)) : tables;
    };
    const db: sql.DbmsEngineSchemalessDatabase = {
      isSchemaDatabase: false,
      identity: databaseID,
      filteredTables,
      tables: filteredTables(),
    };
    return db;
  };

  return mergestatDialect();
}
