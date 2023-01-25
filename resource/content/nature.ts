import * as safety from "../../safety/mod.ts";
import * as govn from "./governance.ts";
import * as c from "./flexible.ts";

export const isNatureSupplier = safety.typeGuard<govn.NatureSupplier<unknown>>(
  "nature",
);

export const isMediaTypeNature = safety.typeGuard<
  govn.MediaTypeNature<unknown>
>(
  "mediaType",
  "guard",
);

export const textMediaTypeNature: govn.MediaTypeNature<govn.TextResource> = {
  mediaType: "text/plain",
  guard: (o: unknown): o is govn.TextResource => {
    if (
      isNatureSupplier(o) && isMediaTypeNature(o.nature) &&
      o.nature.mediaType === textMediaTypeNature.mediaType &&
      (c.isTextSupplier(o) && c.isTextSyncSupplier(o))
    ) {
      return true;
    }
    return false;
  },
};

export const htmlMediaTypeNature: govn.MediaTypeNature<govn.HtmlResource> = {
  mediaType: "text/html",
  guard: (o: unknown): o is govn.HtmlResource => {
    if (
      isNatureSupplier(o) && isMediaTypeNature(o.nature) &&
      o.nature.mediaType === htmlMediaTypeNature.mediaType &&
      c.isHtmlSupplier(o)
    ) {
      return true;
    }
    return false;
  },
};

export const jsonMediaTypeNature: govn.MediaTypeNature<
  govn.StructuredDataResource
> = {
  mediaType: "application/json",
  guard: (o: unknown): o is govn.StructuredDataResource => {
    if (
      isNatureSupplier(o) && isMediaTypeNature(o.nature) &&
      o.nature.mediaType === jsonMediaTypeNature.mediaType &&
      c.isSerializedDataSupplier(o)
    ) {
      return true;
    }
    return false;
  },
};

export const json5MediaTypeNature: govn.MediaTypeNature<
  govn.StructuredDataResource
> = {
  mediaType: "application/json5",
  guard: (o: unknown): o is govn.StructuredDataResource => {
    if (
      isNatureSupplier(o) && isMediaTypeNature(o.nature) &&
      o.nature.mediaType === json5MediaTypeNature.mediaType &&
      c.isSerializedDataSupplier(o)
    ) {
      return true;
    }
    return false;
  },
};

export const sqlMediaTypeNature: govn.MediaTypeNature<govn.TextResource> = {
  mediaType: "application/sql",
  guard: (o: unknown): o is govn.TextResource => {
    if (
      isNatureSupplier(o) && isMediaTypeNature(o.nature) &&
      o.nature.mediaType === sqlMediaTypeNature.mediaType &&
      (c.isTextSupplier(o) && c.isTextSyncSupplier(o))
    ) {
      return true;
    }
    return false;
  },
};

export const yamlMediaTypeNature: govn.MediaTypeNature<
  govn.StructuredDataResource
> = {
  mediaType: "text/vnd.yaml",
  guard: (o: unknown): o is govn.StructuredDataResource => {
    if (
      isNatureSupplier(o) && isMediaTypeNature(o.nature) &&
      o.nature.mediaType === yamlMediaTypeNature.mediaType &&
      c.isSerializedDataSupplier(o)
    ) {
      return true;
    }
    return false;
  },
};

export const tomlMediaTypeNature: govn.MediaTypeNature<
  govn.StructuredDataResource
> = {
  mediaType: "application/toml",
  guard: (o: unknown): o is govn.StructuredDataResource => {
    if (
      isNatureSupplier(o) && isMediaTypeNature(o.nature) &&
      o.nature.mediaType === tomlMediaTypeNature.mediaType &&
      c.isSerializedDataSupplier(o)
    ) {
      return true;
    }
    return false;
  },
};

export const prepareText: (
  text: string,
) => govn.FlexibleContent & govn.FlexibleContentSync = (text) => {
  return {
    text: text,
    textSync: text,
  };
};

export const prepareHTML: (text: string) => govn.HtmlSupplier = (
  text: string,
) => {
  const fc = c.flexibleContent(text);
  return {
    html: fc,
  };
};

export const prepareJSON: govn.StructuredDataSerializer = (
  instance,
  replacer,
) => {
  const fc = c.flexibleContent(JSON.stringify(instance, replacer));
  return {
    serializedData: fc,
  };
};
