import * as d from "./fs/discover.ts";
import * as gh from "./task/github.ts";
import * as dt from "./task/doctor.ts";

export async function srcDepsMutator<OrgRepo extends string>(
  args:
    & {
      orgRepo: OrgRepo; // only "org/name" like "netspective-labs/factory"
      srcRelPathSupplier: (src: Required<d.DiscoverPathResult>) => string;
      onSrcNotFound?: {
        gitHub?: {
          prepareSandbox: (
            d: d.DiscoverPathResult,
            depsTs: string,
          ) => Promise<void>;
          prepareRemote: (
            d: d.DiscoverPathResult,
            depsTs: string,
          ) => Promise<void>;
        };
      };
    }
    & ({
      src: Required<d.DiscoverPathResult>;
    } | {
      discoverSrcPath?: string;
      srcDiscoveryStartPath: string;
    }),
) {
  const src = "src" in args ? args.src : await d.discoverGlob(
    `**/${args.discoverSrcPath ?? args.orgRepo}`,
    args.srcDiscoveryStartPath,
  );
  const srcRelPath = src.found
    ? args.srcRelPathSupplier(src as Required<d.DiscoverPathResult>)
    : undefined;

  const result = {
    args,
    src,
    srcRelPath,
    isSandbox: (depsTs: string) => {
      // Test to see if any of the imports in deps.ts contains relative paths
      // URIs such as ../netspective-labs/factory/ or ../github.com/netspective-labs/factory/.
      // If so, it means that the deps.ts refers to "sandbox" or "local"
      // Resource Factory modules.
      const origDepsTs = Deno.readTextFileSync(depsTs);
      const relRegExp = new RegExp(`["'].*?\\.\\.\\/.*?${args.orgRepo}\\/`);
      return relRegExp.test(origDepsTs);
    },
    doctor: (label: string, depsTs: string) => {
      // deno-lint-ignore require-await
      return async (report: dt.DoctorReporter) => {
        report({
          test: () => !result.isSandbox(depsTs),
          pass: `${depsTs} using remote ${label} URLs`,
          fail: `${depsTs} using sandbox ${label} files`,
        });
      };
    },
    gitHub: {
      remoteTag: async (defaultTag = "main") => {
        return await gh.latestGitHubRepoTag(
          { repo: args.orgRepo },
          defaultTag,
        );
      },
      remoteRegExp: new RegExp(
        `https:\/\/raw.githubusercontent.com\/${args.orgRepo}\/.*?\/`,
        "g",
      ),
      prepareSandbox: async (
        depsTs: string,
        options?: { onNoMutations: (lookedFor: RegExp) => string },
      ) => {
        if (!src.found) {
          args.onSrcNotFound?.gitHub?.prepareSandbox(src, depsTs);
          return;
        }

        const origDepsTs = Deno.readTextFileSync(depsTs);
        const mutatedDepsTs = origDepsTs.replaceAll(
          result.gitHub.remoteRegExp,
          `${srcRelPath}/`,
        );
        if (mutatedDepsTs != origDepsTs) {
          await Deno.writeTextFile(depsTs, mutatedDepsTs);
        } else {
          options?.onNoMutations?.(result.gitHub.remoteRegExp);
        }
      },
      prepareRemote: async (
        depsTs: string,
        options?: { onNoMutations: (lookedFor: string) => string },
      ) => {
        if (!src.found) {
          args.onSrcNotFound?.gitHub?.prepareRemote(src, depsTs);
          return;
        }

        const origDepsTs = Deno.readTextFileSync(depsTs);
        const lookFor = `"${srcRelPath}/`;
        const mutatedDepsTs = origDepsTs.replaceAll(
          lookFor,
          `"https://raw.githubusercontent.com/${args.orgRepo}/${await result
            .gitHub.remoteTag()}/`,
        );
        if (mutatedDepsTs != origDepsTs) {
          await Deno.writeTextFile(depsTs, mutatedDepsTs);
        } else {
          options?.onNoMutations?.(lookFor);
        }
      },
    },
  };
  return result;
}

/**
 * Instead of using multiple import maps, mutate the local deps.ts to point to
 * an appropriate set of https://github.com/netspective-labs/factory modules.
 * When local (mGit path conventions): ../../../github.com/netspective-labs/factory*
 * when remote (latest): https://raw.githubusercontent.com/netspective-labs/factory/main*
 * when remote (pinned): https://raw.githubusercontent.com/netspective-labs/factory/${tag}*
 */
export async function resFactoryDepsMutator(
  srcDiscoveryStartPath: string,
  srcRelPathSupplier: (src: Required<d.DiscoverPathResult>) => string,
  options?: {
    onSrcNotFound?: {
      gitHub?: {
        prepareSandbox: (
          d: d.DiscoverPathResult,
          depsTs: string,
        ) => Promise<void>;
        prepareRemote: (
          d: d.DiscoverPathResult,
          depsTs: string,
        ) => Promise<void>;
      };
    };
  },
) {
  const mutator = await srcDepsMutator({
    orgRepo: "netspective-labs/factory",
    srcDiscoveryStartPath,
    srcRelPathSupplier,
    onSrcNotFound: options?.onSrcNotFound,
  });

  return mutator;
}
