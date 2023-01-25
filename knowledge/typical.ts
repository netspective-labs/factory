import * as safety from "../safety/mod.ts";
import * as govn from "./governance.ts";

export class TypicalTermsManager implements govn.TermsManager {
  isTermDefn(o: unknown): o is govn.TermDefn {
    if (Array.isArray(o) && o.length > 0 && o.length < 4) {
      const [term, _label, _namespace] = o;
      if (term) return true;
    }
    return false;
  }

  readonly isTermElaboration = safety.typeGuard<govn.TermElaboration>("term");

  isTerm(o: unknown): o is govn.Term {
    if (typeof o === "string") return true;
    if (this.isTermDefn(o)) return true;
    if (this.isTermElaboration(o)) return true;
    return false;
  }

  termLabel(
    t: govn.Term,
    onInvalid?: (t: govn.Term) => govn.TermLabel,
  ): govn.TermLabel {
    if (typeof t === "string") return t;
    if (this.isTermDefn(t)) return t[1] || t[0];
    if (this.isTermElaboration(t)) return t.label || t.term;
    return onInvalid ? onInvalid(t) : `${t} is not a Term`;
  }

  termNamespace(
    t: govn.Term,
    onInvalid?: (t: govn.Term) => govn.TermNamespace | undefined,
  ): govn.TermNamespace | undefined {
    if (typeof t === "string") return undefined;
    if (this.isTermDefn(t)) return t.length > 2 ? t[2] : undefined;
    if (this.isTermElaboration(t)) return t.namespace;
    return onInvalid ? onInvalid(t) : undefined;
  }

  isFolksonomy(o: unknown): o is govn.Folksonomy {
    if (Array.isArray(o)) {
      for (const potential of o) {
        // if any single item is not a term, then assume it's not taxonomy
        if (!this.isTerm(potential)) return false;
      }
      return true;
    }
    if (this.isTerm(o)) return true;
    return false;
  }

  isTaxonomy(o: unknown): o is govn.Taxonomy {
    // right now taxonomy is same as folksonomy
    if (this.isFolksonomy(o)) return true;
    return false;
  }
}
