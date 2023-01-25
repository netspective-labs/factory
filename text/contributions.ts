import * as safety from "../safety/mod.ts";

export interface TemplateLiteralContribution<T = unknown> {
  (literals: TemplateStringsArray, ...expressions: T[]): string;
}

/**
 * ContributedContentWeight allows "surround" and "order" for content
 * contributions. If a contribution is weighted as negative, it's "fore" of the
 * main content (before); if it's positive, it's "aft" of the main content
 * (after) and the absolute value determines the order it appears either fore
 * or aft.
 */
export type ContributedContentWeight = number;

export interface ContributedContent<Content> {
  readonly weight: number;
  readonly content: Content;
}

// deno-lint-ignore no-empty-interface
export interface ContributedText extends ContributedContent<string> {
}

export const isContributedText = safety.typeGuard<ContributedText>(
  "weight",
  "content",
);

export interface TextContributionsPlaceholder {
  readonly isTextContributionsPlaceholder: true;
  readonly contributions: ContributedText[];
  readonly text: (separator?: string) => string;
}

export const isTextContributionsPlaceholder = safety.typeGuard<
  TextContributionsPlaceholder
>(
  "isTextContributionsPlaceholder",
);

export interface ContributedContentSupplier<
  Content,
  CC extends ContributedContent<Content>,
  Result,
> {
  contributions(
    filter?:
      | "fore"
      | "prime"
      | "aft"
      | ((cc: CC, index: number, array: CC[]) => boolean),
    defaultResult?: Result,
  ): Result;
}

export interface Contributions extends
  ContributedContentSupplier<
    string,
    ContributedText,
    TextContributionsPlaceholder
  > {
  readonly fore: TemplateLiteralContribution;
  readonly prime: TemplateLiteralContribution;
  readonly aft: TemplateLiteralContribution;
  readonly template: (
    weight: ContributedContentWeight,
  ) => TemplateLiteralContribution;
  readonly contributions: (
    filter?:
      | "fore"
      | "prime"
      | "aft"
      | ((
        ch: ContributedText,
        index: number,
        array: ContributedText[],
      ) => boolean),
  ) => TextContributionsPlaceholder;
  readonly hasContent: boolean;
  readonly storage: ContributedText[];
}

export function contributions(placeholderText: string): Contributions {
  const compareWeight = (a: ContributedText, b: ContributedText) =>
    a.weight - b.weight;
  const storage: ContributedText[] = [];
  const template: (weight: number) => TemplateLiteralContribution = (
    weight,
  ) => {
    return (literals, ...expressions) => {
      let content = "";
      for (let i = 0; i < expressions.length; i++) {
        content += literals[i];
        content += expressions[i];
      }
      content += literals[literals.length - 1];
      const ch: ContributedText = { content, weight };
      result.storage.push(ch);
      return placeholderText;
    };
  };

  const result: Contributions = {
    fore: template(-1),
    prime: template(0),
    aft: template(1),
    template,
    contributions: (filter) => {
      if (filter) {
        if (typeof filter === "string") {
          switch (filter) {
            case "fore":
              return {
                isTextContributionsPlaceholder: true,
                contributions: result.storage.filter((cc) => cc.weight < 0)
                  .sort(compareWeight),
                text: (separator) =>
                  result.storage.filter((cc) => cc.weight < 0)
                    .sort(compareWeight).map((c) => c.content).join(
                      separator ?? "\n",
                    ),
              };
            case "prime":
              return {
                isTextContributionsPlaceholder: true,
                contributions: result.storage.filter((cc) => cc.weight == 0)
                  .sort(compareWeight),
                text: (separator) =>
                  result.storage.filter((cc) => cc.weight == 0)
                    .sort(compareWeight).map((c) => c.content).join(
                      separator ?? "\n",
                    ),
              };
            case "aft":
              return {
                isTextContributionsPlaceholder: true,
                contributions: result.storage.filter((cc) => cc.weight > 0)
                  .sort(compareWeight),
                text: (separator) =>
                  result.storage.filter((cc) => cc.weight > 0)
                    .sort(compareWeight).map((c) => c.content).join(
                      separator ?? "\n",
                    ),
              };
          }
        } else {
          return {
            isTextContributionsPlaceholder: true,
            contributions: result.storage.filter(filter).sort(compareWeight),
            text: (separator) =>
              result.storage.filter(filter).sort(compareWeight).map((c) =>
                c.content
              ).join(separator ?? "\n"),
          };
        }
      }
      return {
        isTextContributionsPlaceholder: true,
        contributions: result.storage.sort(compareWeight),
        text: (separator) =>
          result.storage.sort(compareWeight).map((c) => c.content).join(
            separator ?? "\n",
          ),
      };
    },
    storage,
    hasContent: storage.length > 0,
  };
  return result;
}
