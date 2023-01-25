import * as safety from "../../safety/mod.ts";

export interface ContentModel {
  readonly isContentModel: true;
  readonly isContentAvailable: boolean;
}

export type HTML = string;

export interface MediaTypeSupplier {
  readonly mediaType: string;
}

export type FlexibleText =
  | string
  // deno-lint-ignore no-explicit-any
  | ((...args: any[]) => string);

export interface TextSupplier {
  // deno-lint-ignore no-explicit-any
  readonly text: string | ((...args: any[]) => Promise<string>);
}

export interface TextSyncSupplier {
  readonly textSync: FlexibleText;
}

export interface Uint8ArraySupplier {
  readonly uint8Array:
    | Uint8Array
    // deno-lint-ignore no-explicit-any
    | ((...args: any[]) => Promise<Uint8Array>);
}

export interface Uint8ArraySyncSupplier {
  // deno-lint-ignore no-explicit-any
  readonly uint8ArraySync: Uint8Array | ((...args: any[]) => Uint8Array);
}

export interface ContentSupplier {
  readonly content: (writer: Deno.Writer) => Promise<number>;
}

export interface ContentSyncSupplier {
  readonly contentSync: (writer: Deno.WriterSync) => number;
}

export interface HtmlSupplier {
  readonly html: FlexibleContent | FlexibleContentSync | string;
}

export interface SerializedDataSupplier {
  readonly serializedData: FlexibleContent | FlexibleContentSync | string;
}

export interface DiagnosticsSupplier {
  readonly diagnostics: FlexibleContent | FlexibleContentSync | string;
}

export interface OptionalFlexibleContent
  extends
    Partial<TextSupplier>,
    Partial<Uint8ArraySupplier>,
    Partial<ContentSupplier> {
}

export type FlexibleContent = safety.RequireAtLeastOne<
  OptionalFlexibleContent & OptionalFlexibleContentSync,
  | "text"
  | "uint8Array"
  | "content"
  | "textSync"
  | "uint8ArraySync"
  | "contentSync"
>;

export interface OptionalFlexibleContentSync
  extends
    Partial<TextSyncSupplier>,
    Partial<Uint8ArraySyncSupplier>,
    Partial<ContentSyncSupplier> {
}

export type FlexibleContentSync = safety.RequireAtLeastOne<
  OptionalFlexibleContentSync,
  | "textSync"
  | "uint8ArraySync"
  | "contentSync"
>;

export type PersistFileSysDestination = string;

export interface TextSuppliersFactory {
  readonly prepareText: (text: string) => FlexibleContent & FlexibleContentSync;
}

export interface HtmlSuppliersFactory {
  readonly prepareHTML: (text: string) => HtmlSupplier;
}

export interface StructuredDataSerializer {
  (
    // deno-lint-ignore no-explicit-any
    instance: any,
    // deno-lint-ignore no-explicit-any
    replacer?: (this: any, key: string, value: any) => any,
  ): SerializedDataSupplier;
}

export interface StructuredDataFactory {
  readonly prepareStructuredData: StructuredDataSerializer;
}

// deno-lint-ignore no-empty-interface
export interface UntypedModel extends Record<string, unknown> {
}

export interface MutatableModelSupplier<Model> {
  model: Model;
}

/**
 * Models are portions of content in resources that are used to make decisions
 * about _behavior_ stemming _from content_. For example, routes use _models_
 * (instead of content) so that multiple types of content can be modeled with
 * common behavior. Models are about determining behavior when the actual
 * text/content is less important than the _structure_ of the content.
 */
export interface ModelSupplier<Model> extends MutatableModelSupplier<Model> {
  readonly model: Model;
}

export type ModelIdentity = string;

export interface IdentifiableModelSupplier<Model> extends ModelSupplier<Model> {
  readonly modelIdentity: ModelIdentity;
}

export interface NatureSupplier<Nature> {
  readonly nature: Nature;
}

export type MediaTypeIdentity = string;

export interface MediaTypeNature<Resource> {
  readonly mediaType: MediaTypeIdentity;
  readonly guard: safety.TypeGuard<Resource>;
}

export interface TextResource
  extends
    TextSupplier,
    TextSyncSupplier,
    NatureSupplier<MediaTypeNature<TextSupplier & TextSyncSupplier>> {
}

export interface HtmlResource extends
  HtmlSupplier,
  NatureSupplier<
    MediaTypeNature<HtmlSupplier>
  > {
}

// deno-lint-ignore no-explicit-any
export interface StructuredDataInstanceSupplier<Model = any> {
  readonly structuredDataInstance: Model;
}

export interface StructuredDataResource extends
  NatureSupplier<
    MediaTypeNature<SerializedDataSupplier>
  >,
  StructuredDataInstanceSupplier,
  SerializedDataSupplier {
}

export type DirectiveIdentity = string;

export interface DirectiveExpectation<Directive, EncounteredResult> {
  readonly identity: DirectiveIdentity;
  readonly encountered: (
    d: Directive,
  ) => EncounteredResult;
}

export interface DirectiveExpectationsSupplier<
  // deno-lint-ignore no-explicit-any
  DE extends DirectiveExpectation<any, any>,
> {
  readonly allowedDirectives: (filter?: (d: DE) => boolean) => Iterable<DE>;
}

export interface LintRule {
  readonly code: string;
  readonly humanFriendly: string;
  readonly namespace?: string;
}

export interface LintRuleSupplier<Rule = LintRule> {
  (code: string, namespace?: string): Rule;
}

export interface LintDiagnostic {
  readonly rule: LintRule;
}

export interface LintReporter<Diagnostic = LintDiagnostic> {
  readonly report: (ld: Diagnostic) => void;
}

export interface Lintable<Diagnostic = LintDiagnostic> {
  lint: (reporter: LintReporter<Diagnostic>) => void;
}
