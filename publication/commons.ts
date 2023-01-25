export const destroyPathContents = async (
  fsPath: string,
  options?: {
    readonly onAfterDestroy?: (fsPath: string) => void | Promise<void>;
    readonly onUnableToDestroy?: (
      fsPath: string,
      error: Error,
    ) => void | Promise<void>;
  },
) => {
  const {
    onAfterDestroy,
    // deno-lint-ignore require-await
    onUnableToDestroy = async (_fsPath: string, error: Error) => {
      if (!(error instanceof Deno.errors.NotFound)) {
        throw error;
      }
    },
  } = options ?? {};
  try {
    await Deno.remove(fsPath, { recursive: true });
    await onAfterDestroy?.(fsPath);
  } catch (error) {
    await onUnableToDestroy(fsPath, error);
  }
};
