import { path } from "./deps.ts";

export interface AbsolutePathTransformer {
  (relative?: string): string;
}

export function pathRelativeToModuleCWD(
  moduleImportMetaURL: string,
  basePathRelToModule?: string,
): AbsolutePathTransformer {
  const basePath = basePathRelToModule
    ? path.resolve(path.join(
      modulePathRelativeToCWD(moduleImportMetaURL),
      basePathRelToModule,
    ))
    : modulePathRelativeToCWD(moduleImportMetaURL);
  return (relative) => {
    return relative ? path.join(basePath, relative) : basePath;
  };
}

export function modulePathRelativeToCWD(moduleImportMetaURL: string): string {
  return path.relative(
    Deno.cwd(),
    path.dirname(moduleImportMetaURL).substr("file://".length),
  );
}
