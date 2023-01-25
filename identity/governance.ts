export type UUID = `${string}-${string}-${string}-${string}-${string}`;
export const uknownUUID: UUID = `????-????-????-????-????`;

export interface MutatableIdentitySupplier<Identity> {
  identity: Identity;
}

export type IdentitySupplier<Identity> = Readonly<
  MutatableIdentitySupplier<Identity>
>;
export type MutatableUniversallyUniqueIdentitySupplier =
  MutatableIdentitySupplier<UUID>;
export type UniversallyUniqueIdentitySupplier = Readonly<
  MutatableUniversallyUniqueIdentitySupplier
>;

export interface HumanFriendlyIdentity extends String {
  // see [nominal typing](https://basarat.gitbook.io/typescript/main-1/nominaltyping#using-interfaces)
  readonly _humanFriendlyIdBrand: string; // To prevent type errors that could mix strings
}

export interface IdentityFactory<Identity> {
  readonly randomID: () => Identity;
}

export type NamespacedIdentity<Identity extends string, NS extends string> =
  `${NS}::${Identity}`;

export interface NamespacedIdentityFactory<
  Namespace extends string,
  Identity extends string,
> extends IdentityFactory<Identity> {
  readonly randomNamespacedID: () => NamespacedIdentity<Identity, Namespace>;
  readonly idempotentNamespacedID: (
    deriveFrom: string,
  ) => Promise<NamespacedIdentity<Identity, Namespace>>;
}
