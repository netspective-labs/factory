import * as govn from "../resource/governance.ts";
import * as coll from "../resource/collection/mod.ts";
import * as r from "../route/mod.ts";

// deno-lint-ignore no-explicit-any
type Any = any;

export interface MemoizedResourceIssue {
  readonly humanFriendlyMessage: string;
  readonly locationHref?: string;
  readonly error?: Error;
  readonly inspectable?: string;
}

export interface MemoizedResource {
  readonly unit: r.RouteNode;
  readonly isReloadRequired: () => boolean;
  // deno-lint-ignore no-explicit-any
  readonly replay: (forceReloadIfPossible?: boolean) => Promise<any>;
  readonly potentialDestPath: string;
  readonly becauseOfIssue?: MemoizedResourceIssue;
}

export class MemoizedResources {
  readonly producersByRouteLocation = new Map<
    r.RouteLocation,
    MemoizedResource
  >();
  readonly producersByDestPath = new Map<string, MemoizedResource>();

  constructor(
    readonly init?: {
      reportIssue?: (issue: MemoizedResourceIssue) => void;
    },
  ) {
  }

  /**
   * Memoize a producer such that it's always reconstructed whenever replay is
   * requested. Whatever is in memory the first time it's memoized is what will
   * be replayed.
   * @param location provide the key to the location for later lookup
   * @param resource the resource
   * @param producer the producer we're memoizing
   * @param potentialDestPath either the name of the file that was generated or a potential that might be generated
   * @param becauseOfIssue if this memoize call is being made due to an issue with smartMemoize
   */
  memoize<Resource>(
    location: (unit: r.RouteNode) => r.RouteLocation,
    resource: Resource,
    producer: (resource: Resource) => Promise<Resource>,
    potentialDestPath: string,
    becauseOfIssue?: MemoizedResourceIssue,
  ) {
    const { reportIssue } = this.init ?? {};
    if (r.isRouteSupplier(resource)) {
      if (resource.route.terminal) {
        const unit = resource.route.terminal;
        const mp: MemoizedResource = {
          unit,
          potentialDestPath,
          isReloadRequired: () => true,
          replay: async () => {
            return await producer(resource);
          },
          becauseOfIssue,
        };
        this.producersByRouteLocation.set(location(unit), mp);
        this.producersByDestPath.set(potentialDestPath, mp);
      } else {
        reportIssue?.({
          humanFriendlyMessage:
            `Memoizing a resource producer without terminal route will not work`,
          inspectable: Deno.inspect(resource.route),
        });
      }
    } else {
      reportIssue?.({
        humanFriendlyMessage:
          `Memoizing a resource producer without a route will not work`,
        inspectable: Deno.inspect(resource),
      });
    }
  }

  /**
   * Memoize a producer "smartly" -- by only reloading from disk if it's a file
   * system resource and it has been modified on disk.
   * @param location provide the key to the location for later lookup
   * @param resource the resource
   * @param producer the producer we're memoizing
   * @param potentialDestPath either the name of the file that was generated or a potential that might be generated
   */
  smartMemoize<Resource>(
    location: (unit: r.RouteNode) => r.RouteLocation,
    resource: Resource,
    producer: (resource: Resource) => Promise<Resource>,
    potentialDestPath: string,
  ) {
    const { reportIssue } = this.init ?? {};
    if (r.isRouteSupplier(resource)) {
      if (resource.route.terminal) {
        if (r.isFileSysRouteUnit(resource.route.terminal)) {
          const unit = resource.route.terminal;
          if (unit.lastModifiedAt) {
            if (
              govn.isOriginationSupplier<coll.ResourceFactorySupplier<Any>>(
                resource,
              ) && coll.isResourceFactorySupplier(resource.origination)
            ) {
              const isReloadRequired = () => unit.isModifiedInFileSys();
              const mp: MemoizedResource = {
                unit,
                potentialDestPath,
                isReloadRequired,
                replay: async (forceReloadIfPossible?: boolean) => {
                  if (forceReloadIfPossible || isReloadRequired()) {
                    const cloned = await resource.origination.resourceFactory();
                    return await producer(cloned);
                  }
                  return await producer(resource);
                },
              };
              this.producersByRouteLocation.set(location(unit), mp);
              this.producersByDestPath.set(potentialDestPath, mp);
            } else {
              this.memoize(location, resource, producer, potentialDestPath, {
                humanFriendlyMessage:
                  `Smart-memoizing a resource producer that is not an origination supplier will not work, defaulting to static memoize instead`,
                inspectable: Deno.inspect({ unit, resource }),
              });
            }
          } else {
            this.memoize(location, resource, producer, potentialDestPath, {
              humanFriendlyMessage:
                `Smart-memoizing a resource producer without lastModifiedAt will not work, defaulting to static memoize instead`,
              inspectable: Deno.inspect(unit),
            });
          }
        }
      } else {
        reportIssue?.({
          humanFriendlyMessage:
            `Smart-memoizing a resource producer without terminal route will not work`,
          inspectable: Deno.inspect(resource.route),
        });
      }
    } else {
      reportIssue?.({
        humanFriendlyMessage:
          `Smart-memoizing a resource producer without a route will not work`,
        inspectable: Deno.inspect(resource),
      });
    }
  }
}
