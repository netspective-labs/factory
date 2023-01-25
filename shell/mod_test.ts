import { testingAsserts as ta } from "./deps-test.ts";
import "./mod.ts"; // need window.shell from here

const testSH = window.rawShell;
ta.assert(testSH);

Deno.test(`Test raw shell with invalid command which produces Deno exception (non-zero result)`, async () => {
  let reportError: Error | undefined;
  const result = await testSH.execute(
    {
      runOptions: () => testSH.cmdTextRunOptions("bad command --with --params"),
      reportError: (error) => {
        reportError = error;
      },
    },
  );
  ta.assertEquals(
    result,
    undefined,
    "Since the command was bad, we shouldn't have a result",
  );
  ta.assert(reportError, "Error should be trapped and reported");
});

Deno.test(`Test raw shell with Git command execution (non-zero result)`, async () => {
  const testDir = Deno.makeTempDirSync();
  let consumeStdErr: string | undefined;
  const result = await testSH.execute(
    {
      runOptions: () => ({
        ...testSH.cmdTextRunOptions("git status"),
        cwd: testDir,
      }),
      consumeStdErr: (stdErr) => {
        consumeStdErr = stdErr;
      },
    },
  );
  ta.assert(result, "The command should be valid");
  ta.assert(
    consumeStdErr,
    "Error should be reported since testDir is not a Git repo",
  );
  ta.assertEquals(result.status.code, 128);
  Deno.removeSync(testDir, { recursive: true });
});

Deno.test(`Test raw shell with Git command execution (zero result)`, async () => {
  let resultReported = false;
  let stdOutConsumed: string | undefined;
  const result = await testSH.execute(
    {
      runOptions: () => testSH.cmdTextRunOptions("git status"),
      reportResult: (ser) => {
        resultReported = true;
        ta.assertEquals(ser.status.code, 0, "Command result should be zero");
      },
      consumeStdOut: (stdOut) => {
        stdOutConsumed = stdOut;
      },
    },
  );
  ta.assert(result, "The command should be valid");
  ta.assert(
    resultReported,
    "resultReported not encountered, reportResult did not execute",
  );
  ta.assert(
    stdOutConsumed,
    "stdOutConsumed not defined, consumeStdOut did not execute",
  );
});

Deno.test(`Test raw shell with Git command execution (dry run)`, async () => {
  let dryRunReportEncountered = false;
  const result = await testSH.execute(
    {
      runOptions: () => ({
        ...testSH.cmdTextRunOptions("git status -s"),
        isDryRun: true,
      }),
      reportRun: (ro, isDryRun) => {
        dryRunReportEncountered = isDryRun || false;
        ta.assertEquals(ro.cmd, ["git", "status", "-s"]);
      },
    },
  );
  ta.assertEquals(result, undefined, "if dry run is true, no result");
  ta.assert(
    dryRunReportEncountered,
    "dryRunReportEncountered not encountered, reportRun did not execute",
  );
});

Deno.test(`Test sh with command -v`, async () => {
  const result = await window.sh.execText(
    "command -v bash || which bash || type -p bash",
  );
  ta.assert(result);
  ta.assert(result.trim() == "/bin/bash" || result.trim() == "/usr/bin/bash");
});

Deno.test(`Test bash with echo`, async () => {
  const result = await window.bash.execText(`echo "test"`);
  ta.assert(result);
  ta.assertEquals(result.trim(), "test");
});

Deno.test(`Test shebang`, async () => {
  let shebangOutput: string | undefined;
  const result = await window.rawShell.execShebang((suggested) => ({
    ...suggested,
    consumeStdOut: (stdOut) => shebangOutput = stdOut,
  }))`
    #!/bin/bash

    set -euo pipefail;
    echo "test"
  `;
  ta.assert(result);
  ta.assert(shebangOutput);
  ta.assertEquals(shebangOutput.trim(), "test");
});
