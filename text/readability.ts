import { DOMParser } from "https://deno.land/x/deno_dom@v0.1.32-alpha/deno-dom-wasm.ts";
import { Readability } from "https://cdn.skypack.dev/@mozilla/readability@0.4.2";

export interface ReadabilityResult {
  /** article title */
  readonly title: string;
  /** author metadata */
  readonly byline: string;
  /** content direction */
  readonly dir: string;
  /** HTML of processed article content */
  readonly content: string;
  /** text content of the article (all HTML removed) */
  readonly textContent: string;
  /** length of an article, in characters */
  readonly length: number;
  /** article description, or short excerpt from the content */
  readonly excerpt: string;
  readonly siteName: string;
}

export interface OriginContentSupplier {
  (): Promise<string>;
}

export function originContentURL(url: string): OriginContentSupplier {
  return async () => {
    const resp = await fetch(url, { redirect: "follow" });
    return await resp.text();
  };
}

export async function extractReadableHTML(
  ocs: OriginContentSupplier | string,
): Promise<ReadabilityResult> {
  const source = typeof ocs === "function" ? await ocs() : ocs;
  const doc = new DOMParser().parseFromString(source, "text/html")!;
  return new Readability(doc, {}).parse();
}
