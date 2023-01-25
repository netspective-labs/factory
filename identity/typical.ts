import { uuid } from "./deps.ts";
import * as safety from "../safety/mod.ts";
import * as govn from "./governance.ts";

export const isUntypedIdentitySupplier = safety.typeGuard<
  govn.IdentitySupplier<unknown>
>("identity");

export function isIdentitySupplier<Identity>(
  o: unknown,
): o is govn.IdentitySupplier<Identity> {
  if (isUntypedIdentitySupplier(o)) return true;
  return false;
}

export const isUniversallyUniqueIdentitySupplier = safety.typeGuard<
  govn.UniversallyUniqueIdentitySupplier
>("identity");

export function humanFriendlyIdentity(id: string): govn.HumanFriendlyIdentity {
  // deno-lint-ignore no-explicit-any
  return id as any as govn.HumanFriendlyIdentity;
}

export function typicalUuidFactory(): govn.IdentityFactory<govn.UUID> {
  return {
    randomID: () => {
      return UniversallyUniqueIdentitiesFactory.uuidV4Random();
    },
  };
}

export function typicalNamespacedUuidFactory<Namespace extends string>(
  namespace: Namespace,
  uuidV5Namespace?: govn.UUID,
): govn.NamespacedIdentityFactory<Namespace, govn.UUID> {
  const uuidsSupplier = new UniversallyUniqueIdentitiesFactory<Namespace>(
    namespace,
    uuidV5Namespace || UniversallyUniqueIdentitiesFactory.uuidV4Random(),
  );
  return {
    ...typicalUuidFactory(),
    randomNamespacedID: () => {
      return uuidsSupplier.namespacedUuidV4Random();
    },
    idempotentNamespacedID: async (from) => {
      return await uuidsSupplier.namespacedUuidV5FromText(from);
    },
  };
}

export class UniversallyUniqueIdentitiesFactory<Namespace extends string> {
  static uuidV4Random(): govn.UUID {
    // deno-lint-ignore no-explicit-any
    return globalThis.crypto.randomUUID() as any as govn.UUID;
  }

  constructor(
    readonly namespace: Namespace,
    readonly uuidV5Namespace: govn.UUID,
    readonly textEncoder = new TextEncoder(),
  ) {
  }

  uuidV4Random(): govn.UUID {
    return UniversallyUniqueIdentitiesFactory.uuidV4Random();
  }

  namespacedUuidV4Random(): govn.NamespacedIdentity<govn.UUID, Namespace> {
    const uuid = this.uuidV4Random();
    return `${this.namespace}::${uuid}`;
  }

  async uuidV5FromText(text: string): Promise<govn.UUID> {
    return await uuid.v5.generate(
      this.uuidV5Namespace,
      this.textEncoder.encode(text),
      // deno-lint-ignore no-explicit-any
    ) as any as govn.UUID;
  }

  async namespacedUuidV5FromText(
    text: string,
  ): Promise<govn.NamespacedIdentity<govn.UUID, Namespace>> {
    const uuid = await this.uuidV5FromText(text);
    return `${this.namespace}::${uuid}`;
  }

  uuidV5FromUint8Array(data: Uint8Array) {
    return uuid.v5.generate(
      this.uuidV5Namespace,
      data,
      // deno-lint-ignore no-explicit-any
    ) as any as govn.UUID;
  }

  namespacedUuidV5FromUint8Array(
    data: Uint8Array,
  ): govn.NamespacedIdentity<govn.UUID, Namespace> {
    const uuid = this.uuidV5FromUint8Array(data);
    return `${this.namespace}::${uuid}`;
  }
}
