import * as colors from "https://deno.land/std@0.147.0/fmt/colors.ts";
import * as fs from "https://deno.land/std@0.147.0/fs/mod.ts";
import * as udd from "https://deno.land/x/udd@0.7.3/mod.ts";

export function updateDenoDepsTask() {
  return async () => {
    for await (const we of fs.walk(".", { includeDirs: false })) {
      if (we.name.endsWith(".ts")) {
        console.log(
          colors.dim(`Updating Deno dependencies in ${colors.gray(we.path)}`),
        );
        await udd.udd(we.path, { quiet: true });
      }
    }
  };
}
