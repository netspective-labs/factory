import * as core from "./core.ts";
import * as dt from "./doctor.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export function denoConfigHelpers(options?: {
  srcFilePath?: string;
  exists: () => Promise<Deno.FileInfo | false>;
  acquire?: (
    onContent?: (content: string) => string,
  ) => Promise<Record<string, unknown>>;
  persist?: (
    config: Record<string, unknown>,
    origContent?: string,
  ) => Promise<void>;
}) {
  const { srcFilePath = "deno.jsonc" } = options ?? {};
  const exists = options?.exists ?? (async () => {
    try {
      return await Deno.lstat(srcFilePath);
    } catch (_) {
      return false;
    }
  });
  const acquire = options?.acquire ??
    (async (onContent?: (content: string) => string) => {
      let denoConfig: Record<string, unknown> = {};
      try {
        let content = await Deno.readTextFile(srcFilePath);
        if (onContent) content = onContent(content);
        denoConfig = JSON.parse(content);
      } catch (_) {
        // else: file not found or parse error, use empty
      }
      return denoConfig;
    });
  const persist = options?.persist ??
    (async (config: Record<string, unknown>, origContent?: string) => {
      const newContent = JSON.stringify(config, undefined, "  ");
      if (origContent && newContent == origContent) return;
      await Deno.writeTextFile(srcFilePath, newContent);
    });

  const result = {
    srcFilePath,
    exists,
    acquire,
    persist,
    doctor: <EE extends core.EventEmitter<Any>>(ee: EE) => {
      return async (report: dt.DoctorReporter) => {
        if (await exists()) {
          report({ ok: `${srcFilePath} available` });
          const missingTasks = await result.taskAdaptersMissing(ee);
          report({
            test: () => missingTasks == 0,
            pass: `all Taskfile.ts tasks mirrored in ${srcFilePath}`,
            fail:
              `${srcFilePath} is missing ${missingTasks} Taskfile.ts tasks, re-run update-deno-config`,
          });
        } else {
          report({
            suggest:
              `${srcFilePath} not available (can be auto-generated with Taskfile.ts tasks)`,
          });
        }
      };
    },
    /**
     * Generate ("contribute") each task in EE so that it becomes a task that
     * can be called with `deno task` CLI.
     */
    persistTaskAdapters: <EE extends core.EventEmitter<Any>>(
      ee: EE,
      options?: {
        denoTaskNameToEETaskName?: (denoTaskName: string) => string;
        eeTaskNameToDenoTaskName?: (eeTaskName: string) => string;
        denoTaskCliCmdAdapter?: (eeTaskName: string) => string;
        removeDenoTask?: (denoTask: string, isEETaskName: boolean) => boolean;
        finalizeConfig?: (
          denoConfig: Record<string, unknown>,
        ) => Record<string, unknown>;
      },
    ) => {
      return async () => {
        let origContent: string | undefined;
        const denoConfig = await acquire((content) => {
          origContent = content;
          return content;
        });

        if (!("tasks" in denoConfig)) denoConfig.tasks = {};
        const denoTasks = denoConfig.tasks as Record<string, string>;

        const eeTasks = core.eventEmitterInternalMap(ee);
        const denoTaskNameToEETaskName = options?.denoTaskNameToEETaskName ??
          ((denoTaskName: string) =>
            core.kebabCaseToCamelTaskName(denoTaskName));
        const eeTaskNameToDenoTaskName = options?.eeTaskNameToDenoTaskName ??
          ((eeTaskName: string) => core.camelCaseToKebabTaskName(eeTaskName));
        const denoTaskCliCmdAdapter = options?.denoTaskCliCmdAdapter ??
          ((eeTaskName: string) =>
            `deno run -A --unstable Taskfile.ts ${eeTaskName}`);

        const removeDenoTask = options?.removeDenoTask;
        if (removeDenoTask) {
          for (const denoTaskName of Object.keys(denoTasks)) {
            if (
              removeDenoTask(
                denoTaskName,
                eeTasks.has(denoTaskNameToEETaskName(denoTaskName)),
              )
            ) {
              delete denoTasks[denoTaskName];
            }
          }
        }

        for (const eeTaskName of eeTasks.keys()) {
          denoTasks[eeTaskNameToDenoTaskName(eeTaskName)] =
            denoTaskCliCmdAdapter(eeTaskName);
        }

        persist(
          options?.finalizeConfig
            ? options.finalizeConfig(denoConfig)
            : denoConfig,
          origContent,
        );
      };
    },
    taskAdaptersMissing: async <EE extends core.EventEmitter<Any>>(
      ee: EE,
      options?: {
        eeTaskNameToDenoTaskName?: (eeTaskName: string) => string;
      },
    ) => {
      const denoConfig = await acquire();
      const eeTasks = core.eventEmitterInternalMap(ee);
      const eeTaskNameToDenoTaskName = options?.eeTaskNameToDenoTaskName ??
        ((eeTaskName: string) => core.camelCaseToKebabTaskName(eeTaskName));

      if (!("tasks" in denoConfig)) return eeTasks.size;
      const denoTasks = denoConfig.tasks as Record<string, string>;

      let missing = 0;
      for (const eeTaskName of eeTasks.keys()) {
        if (!denoTasks[eeTaskNameToDenoTaskName(eeTaskName)]) missing++;
      }

      return missing;
    },
  };
  return result;
}
