import { testingAsserts as ta } from "./deps-test.ts";
import * as mod from "./flexible.ts";

Deno.test(`flexibleTextSyncCustom[textSync]`, () => {
  ta.assertEquals(
    mod.flexibleTextSyncCustom({
      textSync: "flexibleText",
    }),
    "flexibleText",
  );
  ta.assertEquals(
    mod.flexibleTextSyncCustom({
      textSync: () => "flexibleText()",
    }),
    "flexibleText()",
  );
});

Deno.test(`flexibleTextSyncCustom[Uint8ArraySync]`, () => {
  const te = new TextEncoder();
  ta.assertEquals(
    mod.flexibleTextSyncCustom({
      uint8ArraySync: te.encode("flexibleTextSyncCustom[Uint8Array]"),
    }),
    "flexibleTextSyncCustom[Uint8Array]",
  );
  ta.assertEquals(
    mod.flexibleTextSyncCustom({
      uint8ArraySync: () => te.encode("flexibleTextSyncCustom[Uint8Array]()"),
    }),
    "flexibleTextSyncCustom[Uint8Array]()",
  );
});

Deno.test(`flexibleTextSyncCustom[contentSync]`, () => {
  ta.assertEquals(
    mod.flexibleTextSyncCustom({
      contentSync: (writer) => {
        const te = new TextEncoder();
        return writer.writeSync(
          te.encode("flexibleTextSyncCustom[contentSync]"),
        );
      },
    }),
    "flexibleTextSyncCustom[contentSync]",
  );
});

Deno.test(`flexibleTextCustom[text] async (with sync backup)`, async () => {
  ta.assertEquals(
    await mod.flexibleTextCustom({
      text: "flexibleTextCustom",
    }),
    "flexibleTextCustom",
  );
  ta.assertEquals(
    await mod.flexibleTextCustom({
      // deno-lint-ignore require-await
      text: async (_arg: string) => "flexibleTextCustom()",
    }),
    "flexibleTextCustom()",
  );
  ta.assertEquals(
    await mod.flexibleTextCustom({
      textSync: "flexibleTextCustom(sync backup)",
    }),
    "flexibleTextCustom(sync backup)",
  );
  ta.assertEquals(
    await mod.flexibleTextCustom({
      textSync: () => "flexibleTextCustom(sync func backup)",
    }),
    "flexibleTextCustom(sync func backup)",
  );
});

Deno.test(`flexibleTextCustom[Uint8Array] async (with sync backup)`, async () => {
  const te = new TextEncoder();
  ta.assertEquals(
    await mod.flexibleTextCustom({
      uint8Array: te.encode("flexibleTextCustom[Uint8Array]"),
    }),
    "flexibleTextCustom[Uint8Array]",
  );
  ta.assertEquals(
    await mod.flexibleTextCustom({
      // deno-lint-ignore require-await
      uint8Array: async () => te.encode("flexibleTextCustom[Uint8Array]()"),
    }),
    "flexibleTextCustom[Uint8Array]()",
  );
  ta.assertEquals(
    await mod.flexibleTextCustom({
      uint8ArraySync: () =>
        te.encode("flexibleTextCustom[Uint8Array](sync func backup)"),
    }),
    "flexibleTextCustom[Uint8Array](sync func backup)",
  );
  ta.assertEquals(
    await mod.flexibleTextCustom({
      uint8ArraySync: te.encode("flexibleTextCustom[Uint8Array](sync backup)"),
    }),
    "flexibleTextCustom[Uint8Array](sync backup)",
  );
});

Deno.test(`flexibleTextCustom[content] async (with sync backup)`, async () => {
  ta.assertEquals(
    await mod.flexibleTextCustom({
      content: (writer) => {
        const te = new TextEncoder();
        return writer.write(te.encode("flexibleTextCustom[content]"));
      },
    }),
    "flexibleTextCustom[content]",
  );
  ta.assertEquals(
    await mod.flexibleTextCustom({
      content: (writer) => {
        const te = new TextEncoder();
        return writer.write(
          te.encode("flexibleTextCustom[content](sync backup)"),
        );
      },
    }),
    "flexibleTextCustom[content](sync backup)",
  );
});
