import * as govn from "./governance.ts";

// Forked from https://github.com/domharrington/node-gitlog/blob/master/src/index.ts
// Version ac30a135f71337992806b5959c811af5c184c3cd
// Portions Copyright (c) 2016, Dominic Harrington

const delimiter = "\t";

const notOptFields = ["status", "files"] as const;
type NotOptField = typeof notOptFields[number];

const defaultFields = [
  "abbrevHash",
  "hash",
  "subject",
  "authorName",
  "authorDate",
] as const;
export type DefaultField = typeof defaultFields[number];

export interface GitlogOptions<Fields extends string = DefaultField>
  extends govn.GitLogOptions {
  /** The location of the repo */
  repo: string;
  /** An array of fields to return from the log */
  fields?: readonly Fields[];
}

const defaultOptions = {
  number: 500,
  fields: defaultFields,
  nameStatus: true,
  includeMergeCommitFiles: false,
  findCopiesHarder: false,
  all: false,
};

/** Add optional parameter to command */
function addOptionalArguments<Field extends string = DefaultField>(
  command: string[],
  options: GitlogOptions<Field>,
) {
  const commandWithOptions = command;
  const cmdOptional = [
    "author",
    "since",
    "after",
    "until",
    "before",
    "committer",
  ] as const;

  for (let i = cmdOptional.length; i--;) {
    if (options[cmdOptional[i]]) {
      commandWithOptions.push(`--${cmdOptional[i]}=${options[cmdOptional[i]]}`);
    }
  }

  return commandWithOptions;
}

/** Parse the output of "git log" for commit information */
const parseCommits = <T extends string>(
  commits: string[],
  fields: readonly T[],
  nameStatus: boolean,
) => {
  // deno-lint-ignore no-explicit-any
  type Commit = Record<T | NotOptField, any>;

  return commits.map((rawCommit) => {
    const parts = rawCommit.split("@end@");
    const commit = parts[0].split(delimiter);

    if (parts[1]) {
      const parseNameStatus = parts[1].trimLeft().split("\n");

      // Removes last empty char if exists
      if (parseNameStatus[parseNameStatus.length - 1] === "") {
        parseNameStatus.pop();
      }

      // Split each line into it's own delimited array
      const nameAndStatusDelimited = parseNameStatus.map((d) =>
        d.split(delimiter)
      );

      // 0 will always be status, last will be the filename as it is in the commit,
      // anything in between could be the old name if renamed or copied
      nameAndStatusDelimited.forEach((item) => {
        const status = item[0];
        const tempArr = [status, item[item.length - 1]];

        // If any files in between loop through them
        for (let i = 1, len = item.length - 1; i < len; i++) {
          // If status R then add the old filename as a deleted file + status
          // Other potentials are C for copied but this wouldn't require the original deleting
          if (status.slice(0, 1) === "R") {
            tempArr.push("D", item[i]);
          }
        }

        commit.push(...tempArr);
      });
    }

    // Remove the first empty char from the array
    commit.shift();

    const parsed: Partial<Commit> = {};

    if (nameStatus) {
      // Create arrays for non optional fields if turned on
      notOptFields.forEach((d) => {
        parsed[d] = [];
      });
    }

    commit.forEach((commitField, index) => {
      if (fields[index]) {
        parsed[fields[index]] = commitField;
      } else if (nameStatus) {
        const pos = (index - fields.length) % notOptFields.length;

        const arr = parsed[notOptFields[pos]];

        if (Array.isArray(arr)) {
          arr.push(commitField);
        }
      }
    });

    if (parsed.files && parsed.status) {
      // git emits status and files arrays separately but we want them in a
      // single array since it's more convenient
      const assets: { path: string; status: string }[] = [];
      for (let i = 0; i < parsed.files.length; i++) {
        assets.push({
          path: parsed.files[i],
          status: parsed.status[i],
        });
      }
      // deno-lint-ignore no-explicit-any
      (parsed as any).assets = assets;
    }

    return parsed as Commit;
  });
};

/** Run "git log" and return the result as JSON */
function createCommandArguments<
  T extends govn.CommitField | DefaultField = DefaultField,
>(options: GitlogOptions<T>) {
  // Start constructing command
  let command: string[] = ["log", "-l0"];

  if (options.findCopiesHarder) {
    command.push("--find-copies-harder");
  }

  if (options.all) {
    command.push("--all");
  }

  if (options.includeMergeCommitFiles) {
    command.push("-m");
  } else {
    command.push("--no-merges");
  }

  if (options.number === -1) {
    command.push(`-1`);
  } else {
    command.push(`-n ${options.number}`);
  }

  command = addOptionalArguments(command, options);

  // Start of custom format
  let prettyArgument = "--pretty=@begin@";

  // Iterating through the fields and adding them to the custom format
  if (options.fields) {
    options.fields.forEach((field) => {
      if (
        // deno-lint-ignore no-explicit-any
        !govn.gitCommitFieldMap[field] && !notOptFields.includes(field as any)
      ) {
        throw new Error(`Unknown field: ${field}`);
      }

      prettyArgument += delimiter + govn.gitCommitFieldMap[field];
    });
  }

  // Close custom format
  prettyArgument += "@end@";
  command.push(prettyArgument);

  // Append branch (revision range) if specified
  if (options.branch) {
    command.push(options.branch);
  }

  // File and file status
  if (options.nameStatus && !options.fileLineRange) {
    command.push("--name-status");
  }

  if (options.fileLineRange) {
    command.push(
      `-L ${options.fileLineRange.startLine},${options.fileLineRange.endLine}:${options.fileLineRange.file}`,
    );
  }

  if (options.file) {
    command.push("--");
    command.push(options.file);
  }

  return command;
}

export function gitLogCmd<Field extends govn.CommitField = DefaultField>(
  userOptions?: -1 | Omit<GitlogOptions<Field>, "repo">,
  inherit?: Partial<Deno.RunOptions>,
): [
  grcos: govn.GitRunCmdOptionsSupplier,
  onSuccess: (
    stdOut: string,
  ) =>
    | govn.GitCommitBase<Field>[]
    | govn.GitCommitBaseWithFiles<Field>[]
    | void,
] {
  const options = {
    // deno-lint-ignore no-explicit-any
    ...(defaultOptions as any),
    ...(typeof userOptions === "number" ? { number: -1 } : userOptions),
  };
  return [(gp) => {
    return {
      cmd: [
        "git",
        `--git-dir=${gp.gitDir}`,
        `--work-tree=${gp.workTreePath}`,
        "--no-pager",
        ...createCommandArguments(options),
      ],
      stdout: "piped",
      stderr: "piped",
      ...inherit,
    };
  }, (stdOut) => {
    const commits = stdOut.split("@begin@");
    if (commits[0] === "") {
      commits.shift();
    }
    return parseCommits<Field>(
      commits,
      options.fields,
      options.nameStatus,
    );
  }];
}
