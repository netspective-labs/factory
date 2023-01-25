import { fs, path } from "../deps.ts";

import * as st from "../../statistics/stream.ts";
import * as k from "../../knowledge/mod.ts";
import * as fsr from "../../route/fs-route-parse.ts";
import * as fsLink from "../../fs/link.ts";
import * as gi from "../../structure/govn-index.ts";
import * as m from "../../metrics/mod.ts";
import * as extn from "../../module/mod.ts";
import * as memo from "../memoize.ts";
import * as r from "../../route/mod.ts";

import * as jrs from "../../resource/json.ts";
import * as dtr from "../../resource/delimited-text.ts";
import * as tfr from "../../resource/text.ts";
import * as br from "../../resource/bundle.ts";
import * as orig from "../../resource/originate/mod.ts";
import * as c from "../../resource/content/mod.ts";
import * as p from "../../resource/persist/mod.ts";
import * as coll from "../../resource/collection/mod.ts";
import * as fm from "../../resource/frontmatter/mod.ts";
import * as i from "../../resource/instantiate.ts";
import * as md from "../../resource/markdown/mod.ts";
import * as ds from "../../resource/html/mod.ts";
import * as udsp from "../../resource/design-system/universal/publication.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export class PublicationResourcesIndex<Resource = Any>
  extends gi.UniversalIndex<Resource> {
  flowMetrics() {
    const iset = new Set<string>();
    let frontmatterSuppliers = 0;
    let modelSuppliers = 0;
    this.resourcesIndex.forEach((r) => {
      if (i.isInstantiatorSupplier(r)) iset.add(r.instantiatorIdentity);
      if (fm.isFrontmatterSupplier(r)) frontmatterSuppliers++;
      if (c.isModelSupplier(r)) modelSuppliers++;
    });
    return {
      instantiators: iset,
      frontmatterSuppliers,
      modelSuppliers,
    };
  }
}

export class PublicationPersistedIndex {
  // key is the filename written (e.g. public/**/*.html, etc.)
  readonly persistedDestFiles = new Map<string, p.FileSysPersistResult>();

  index(destFileName: string, fsapee: p.FileSysPersistResult): void {
    this.persistedDestFiles.set(destFileName, fsapee);
  }

  has(destFileName: string): boolean {
    return this.persistedDestFiles.has(destFileName);
  }
}

export interface StaticPublIssue {
  readonly humanFriendlyMessage: string;
  readonly locationHref?: string;
  readonly error?: Error;
}

export interface StaticPublInit {
  readonly extensionsManager: extn.ExtensionsManager;
  readonly originationSources: Iterable<orig.FilePathsSupplier>;
  readonly destRootPath: string;
  readonly fsRouteFactory: r.FileSysRouteFactory;
  readonly routes: udsp.PublicationRoutes;
  readonly rewriteMarkdownLink?: md.MarkdownLinkUrlRewriter;
  readonly termsManager?: k.TermsManager;
  readonly reportIssue?: (issue: StaticPublIssue) => void;
}

export class ScopedStatistics {
  readonly stats = new Map<string, st.StreamStatistics>();
  constructor(readonly scope: string) {
  }

  encounter(identity: string, value: number) {
    let stats = this.stats.get(identity);
    if (!stats) {
      stats = new st.StreamStatistics();
      this.stats.set(identity, stats);
    }
    stats.encounter(value);
  }

  // deno-lint-ignore no-explicit-any
  populateMetrics(metrics: m.Metrics, baggage: any) {
    this.stats.forEach((stats, identity) => {
      m.populateStreamMetrics(
        stats,
        metrics,
        baggage,
        `${this.scope}_${identity}_duration`,
        `${identity} duration`,
        "milliseconds",
      );
    });
  }
}

export interface StaticPublicationStrategy {
  readonly isPersisting: boolean;
}

export abstract class StaticPublication {
  readonly producerStats: ScopedStatistics;
  readonly resourcesIndex: PublicationResourcesIndex;
  readonly persistedIndex: PublicationPersistedIndex;
  readonly consumedFileSysWalkPaths = new Set<string>();
  readonly fspEventsEmitter = new p.FileSysPersistenceEventsEmitter();
  // deno-lint-ignore no-explicit-any
  readonly dsFactory: ds.DesignSystemFactory<any, any, any, any>;
  readonly memoizedProducers: memo.MemoizedResources;

  constructor(
    readonly spInit: StaticPublInit,
    readonly strategy: StaticPublicationStrategy = { isPersisting: true },
  ) {
    this.dsFactory = this.prepareDesignSystemFactory(spInit);
    this.memoizedProducers = new memo.MemoizedResources({
      reportIssue: spInit.reportIssue,
    });
    this.persistedIndex = new PublicationPersistedIndex();
    this.resourcesIndex = new PublicationResourcesIndex();
    this.producerStats = new ScopedStatistics("producer");
    this.fspEventsEmitter.on(
      "afterPersistContributionFile",
      // deno-lint-ignore require-await
      async (result) => {
        // TODO: warn if file written more than once either here or directly in persist
        this.persistedIndex.index(result.destFileName, result);
      },
    );
    this.fspEventsEmitter.on(
      "afterPersistContributionFileSync",
      (result) => {
        // TODO: warn if file written more than once either here or directly in persist
        this.persistedIndex.index(result.destFileName, result);
      },
    );
  }

  protected abstract prepareDesignSystemFactory(
    spInit: StaticPublInit,
  ): ds.DesignSystemFactory<Any, Any, Any, Any>;

  fileSysRouteParser(): fsr.FileSysRouteParser {
    return fsr.humanFriendlyFileSysRouteParser;
  }

  fileSysRouteOptions(): r.FileSysRouteOptions {
    return {
      fsRouteFactory: this.spInit.fsRouteFactory,
      extensionsManager: this.spInit.extensionsManager,
      routeParser: this.fileSysRouteParser(),
    };
  }

  /**
   * Create symlinks for files such as images, CSS style sheets, and other
   * "assets".
   */
  async symlinkAssets(
    onDestExists?: (src: fs.WalkEntry, dest: string) => void,
  ) {
    await Promise.all([
      ...Array.from(this.spInit.originationSources).map((os) => {
        // For any files that are in the content directory but were not "consumed"
        // (transformed or rendered) we will assume that they should be symlinked
        // to the destination path in the same directory structure as they exist
        // in the source content path. Images, and other assets sitting in same
        // directories as *.html, *.ts, *.md, etc. will be symlink'd so that they
        // do not need to be copied.
        return fsLink.linkAssets(os.rootPath, this.spInit.destRootPath, {
          destExistsHandler: onDestExists,
        }, {
          glob: "**/*",
          options: { exclude: ["**/*.ts"] },
          include: (we) =>
            we.isFile && !this.consumedFileSysWalkPaths.has(we.path),
        });
      }),
    ]);
  }

  /**
   * Supply all valid directives that should be handled by Markdown engines.
   * @returns list of directives we will allow in Markdown
   */
  directiveExpectationsSupplier():
    | c.DirectiveExpectationsSupplier<c.DirectiveExpectation<Any, Any>>
    | undefined {
    // by default we delegate directive expectations to the design system
    return this.dsFactory.designSystem;
  }

  /**
   * Supply the markdown renderers that our Markdown resources can use to render
   * their content to HTML.
   * @returns list of Markdown layouts we will allow Markdown resources to use
   */
  markdownRenderers(): md.MarkdownRenderStrategy {
    return new md.MarkdownRenderStrategy(
      new md.MarkdownLayouts({
        directiveExpectations: this.directiveExpectationsSupplier(),
        rewriteURL: this.spInit.rewriteMarkdownLink,
        customize: (mdi) => {
          mdi.renderer.rules.image = md.autoCorrectPrettyUrlImagesRule(
            mdi.renderer.rules.image,
          );
        },
      }),
    );
  }

  // deno-lint-ignore no-explicit-any
  postProduceOriginators(): coll.ResourcesFactoriesSupplier<any>[] {
    return [];
  }

  originationRefinery() {
    // usually all we want to do is put originated resources into a tree
    return this.spInit.routes.resourcesTreePopulatorSync();
  }

  memoizersRefinery() {
    return coll.pipelineUnitsRefineryUntyped(
      this.dsFactory.designSystem.potentialPrettyUrlsHtmlProducer(
        this.spInit.destRootPath,
        this.dsFactory.contentStrategy,
        {
          isPersisting: false,
          // deno-lint-ignore require-await
          memoize: async (resource, suggestedDestName, producer) => {
            this.memoizedProducers.smartMemoize(
              (unit) =>
                this.dsFactory.contentStrategy.navigation?.location(unit) ??
                  "/renderersRefinery/no-navigation",
              resource,
              producer,
              "/" + path.relative(this.spInit.destRootPath, suggestedDestName),
            );
          },
        },
      ),
    );
  }

  persistersRefinery() {
    const fspEE = this.fspEventsEmitter;
    // fspEE.on("afterPersistResourceFile", (resource, fspr) => {
    //   console.log("persistersRefinery", fspr.destFileName);
    // });
    return coll.pipelineUnitsRefineryUntypedObservable<
      { readonly startMS: number },
      {
        readonly identity: string;
        // deno-lint-ignore no-explicit-any
        readonly refinery: coll.ResourceRefinery<any>;
        startMS?: number;
      }
    >(
      // deno-lint-ignore require-await
      async () => ({ startMS: Date.now() }),
      // deno-lint-ignore require-await
      async function (eachCtx) {
        eachCtx.startMS = Date.now();
      },
      // deno-lint-ignore require-await
      async (eachCtx) => {
        if (eachCtx.startMS) {
          this.producerStats.encounter(
            eachCtx.identity,
            Date.now() - eachCtx.startMS,
          );
        }
      },
      // deno-lint-ignore require-await
      async (ctx) => {
        this.producerStats.encounter(
          "cumulative",
          Date.now() - ctx.startMS,
        );
      },
      {
        identity: "potentialPrettyUrlsHtmlProducer",
        refinery: this.dsFactory.designSystem.potentialPrettyUrlsHtmlProducer(
          this.spInit.destRootPath,
          this.dsFactory.contentStrategy,
          { fspEE },
        ),
      },
      {
        identity: "jsonTextProducer",
        refinery: jrs.jsonTextProducer(this.spInit.destRootPath, {
          routeTree: this.spInit.routes.resourcesTree,
        }, fspEE),
      },
      {
        identity: "csvProducer",
        refinery: dtr.csvProducer<unknown>(
          this.spInit.destRootPath,
          undefined, // TODO: what should `state` be?
          fspEE,
        ),
      },
      {
        identity: "textFileProducer",
        refinery: tfr.textFileProducer<unknown>(
          this.spInit.destRootPath,
          undefined, // TODO: what should `state` be?
          {
            eventsEmitter: fspEE,
          },
        ),
      },
      {
        identity: "bundleProducer",
        refinery: br.bundleProducer<unknown>(
          this.spInit.destRootPath,
          undefined, // TODO: what should `state` be?
          {
            eventsEmitter: fspEE,
          },
        ),
      },
    );
  }

  async initProduce() {
    await this.dsFactory.beforeFirstRender?.(this.dsFactory);
  }

  async *resources<Resource>(refine: coll.ResourceRefinerySync<Resource>) {
    const mdRenderers = this.markdownRenderers();
    const fsro = this.fileSysRouteOptions();
    const fso = orig.typicalfsFileSuffixOriginators(
      fsro,
      {
        markdownRS: mdRenderers,
        // deno-lint-ignore require-await
        onOriginated: async (_, fsPath) => {
          // if we "consumed" (handled) the resource it means we do not want it to
          // go to the destination directory so let's track it
          this.consumedFileSysWalkPaths.add(fsPath);
        },
      },
    );
    yield* orig.originateAll(
      fso.instances(this.spInit.originationSources),
      "before",
      { refine },
    );
  }

  async finalizePrePersist(
    originationRefinery: coll.ResourceRefinerySync<
      r.RouteSupplier<r.RouteNode>
    >,
    resourcesIndex: PublicationResourcesIndex,
  ) {
    // the first round of all resources are now available, but haven't yet been
    // persisted so let's prepare the navigation trees before we persist
    this.spInit.routes.prepareNavigationTree();

    // the navigation tree may have generated redirect HTML pages (e.g. aliases
    // or redirects) so let's get those into the index too
    const redirects = this.spInit.routes.redirectResources();
    for await (
      const resource of orig.originateAll(
        redirects.resourcesFactories(),
        "before",
        {
          refine: originationRefinery,
        },
      )
    ) {
      await resourcesIndex.index(resource);
    }
  }

  async finalizeProduce(): Promise<void> {
    // any files that were not consumed should "mirrored" to the destination
    await this.symlinkAssets();
  }

  async produce() {
    // give opportunity for subclasses to intialize the production pipeline
    await this.initProduce();

    // we store all our resources in this index, as they are produced;
    // ultimately the index contains every originated resource
    const resourcesIndex = this.resourcesIndex;

    // find and construct every orginatable resource from file system and other
    // sources; as each resource is prepared, store it in the index -- each
    // resource create child resources recursively and this loop handles all
    // "fanned out" resources as well
    const originationRefinery = this.originationRefinery();
    for await (const resource of this.resources(originationRefinery)) {
      await resourcesIndex.index(resource);
    }

    // the first round of all resources are now available, but haven't yet been
    // persisted so let's do any routes finalization, new resources construction
    // or any other pre-persist activities
    await this.finalizePrePersist(originationRefinery, resourcesIndex);

    // if we're acting like a normal static site generator (SSG) then we'll be
    // "persisting" (saving) our generated output; otherwise, we will be acting
    // in a "service" model and serving individually-rendered resources when
    // requested by path
    if (this.strategy.isPersisting) {
      // now all resources, child resources, redirect pages, etc. have been
      // created so we can persist all pages that are in our index
      const persist = this.persistersRefinery();
      const ri = resourcesIndex.resourcesIndex;
      for (let i = 0; i < ri.length; i++) {
        const resource = ri[i];
        await persist(resource);
      }
    } else {
      // now all resources, child resources, redirect pages, etc. have been
      // created so we can "memoize" all pages that are in our index instead of
      // storing to disk -- memoization can "replay" any resources on demand;
      // NOTE: if the navigation structure has changed, the entire publication
      // should be rebuilt because memoization only works on a single resource
      // file basis.
      const memoize = this.memoizersRefinery();
      const ri = resourcesIndex.resourcesIndex;
      for (let i = 0; i < ri.length; i++) {
        const resource = ri[i];
        await memoize(resource);
      }
    }

    // give opportunity for subclasses to finalize the production pipeline
    await this.finalizeProduce();
  }
}
