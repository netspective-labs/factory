import * as colors from "https://deno.land/std@0.147.0/fmt/colors.ts";
import "https://deno.land/x/dzx@0.3.1/mod.ts";

export interface DoctorReporter {
  (
    args: {
      ok: string;
    } | {
      warn: string;
    } | {
      suggest: string;
    } | {
      test: () => boolean;
      pass: string;
      fail: string;
    } | {
      expectText: string;
      textNotFound: string;
    },
  ): void;
}

export interface DoctorDiagnostic {
  readonly diagnose: (report: DoctorReporter) => Promise<void>;
}

export interface DoctorCategory {
  readonly label: string;
  readonly diagnostics: () => Generator<DoctorDiagnostic, void>;
}

export function doctorCategory(
  label: string,
  diagnostics: () => Generator<DoctorDiagnostic, void>,
): DoctorCategory {
  return {
    label,
    diagnostics,
  };
}

export function denoDoctor(): DoctorCategory {
  return doctorCategory("Deno", function* () {
    const deno: DoctorDiagnostic = {
      diagnose: async (report: DoctorReporter) => {
        report({ ok: (await $o`deno --version`).split("\n")[0] });
      },
    };
    yield deno;
  });
}

export function doctor(categories: () => Generator<DoctorCategory>) {
  return async () => {
    for (const cat of categories()) {
      console.info($.dim(cat.label));
      for (const diag of cat.diagnostics()) {
        await diag.diagnose((options) => {
          if ("expectText" in options) {
            if (options.expectText && options.expectText.trim().length > 0) {
              console.info("  🆗", colors.green(options.expectText));
            } else {
              console.warn("  🚫", colors.brightRed(options.textNotFound));
            }
          } else if ("test" in options) {
            if (options.test()) {
              console.info("  🆗", colors.green(options.pass));
            } else {
              console.warn("  🚫", colors.brightRed(options.fail));
            }
          } else if ("suggest" in options) {
            console.info("  💡", colors.yellow(options.suggest));
          } else {
            if ("ok" in options) {
              console.info("  🆗", colors.green(options.ok));
            } else {
              console.warn("  🚫", colors.brightRed(options.warn));
            }
          }
        });
      }
    }
  };
}
