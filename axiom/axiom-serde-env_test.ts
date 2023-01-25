import { testingAsserts as ta } from "./deps-test.ts";
import * as axsd from "./axiom-serde.ts";
import * as mod from "./axiom-serde-env.ts";

const syntheticNS = (name: string) =>
  `CFGTEST_${mod.camelCaseToEnvVarName(name)}`;

Deno.test(`partial record from env using axiomSerDeDefaults`, () => {
  const envBuilder = mod.envBuilder({ ens: (given) => `SYNTHETIC_${given}` });
  const syntheticASDO = axsd.axiomSerDeObject({
    text: envBuilder.text("TEXT"), // optionally from environment
    number: axsd.integer(), // never from environment
    numberEnv: envBuilder.integer("INT"), // optionally from environment
  });

  Deno.env.set("SYNTHETIC_INT", String(10267));

  const defaults = syntheticASDO.prepareRecordSync({
    text: envBuilder.textEnvPlaceholder,
    number: 100,
    numberEnv: -1,
  });

  ta.assertEquals(defaults.text, envBuilder.textEnvPlaceholder);
  ta.assertEquals(defaults.number, 100);
  ta.assertEquals(defaults.numberEnv, 10267);

  Deno.env.delete("SYNTHETIC_INT");
});

Deno.test(`full record from env using deserializeIndividualEnv`, async (tc) => {
  await tc.step("invalid config, missing required properties", () => {
    const syntheticRecord = {
      text: axsd.text(),
      number: axsd.integer(),
      maxAgeInMS: axsd.bigint(),
      bool: axsd.boolean(),
      complexType: axsd.object({
        innerText: axsd.text(),
        innerNumber: axsd.integer(),
      }),
    };

    const testTextPropValue = "test";
    Deno.env.set("CFGTEST_TEXT", testTextPropValue);

    const iet = mod.deserializeFullRecordUsingIndividualEnvVars(
      syntheticRecord,
      {
        evNS: syntheticNS,
      },
    );
    const { serDeAxiomRecord: config } = iet;
    ta.assertEquals(false, iet.test(config));
    ta.assertEquals(5, iet.envVarsSearched.length);
    ta.assertEquals(1, iet.envVarsSearched.filter((s) => s.found).length);
    ta.assertEquals(4, iet.envVarsSearched.filter((s) => !s.found).length);
    ta.assertEquals(0, iet.envVarsSearched.filter((s) => s.defaulted).length);

    Deno.env.delete("CFGTEST_TEXT");
    ta.assertEquals(config.text, testTextPropValue);
  });

  await tc.step("valid config, all required properties defined", () => {
    const syntheticRecord = {
      text: axsd.text(),
      number: axsd.integer(),
      maxAgeInMS: axsd.bigint(),
      bool: axsd.boolean(),
      complexType: axsd.object({
        innerText: axsd.text(),
        innerNumber: axsd.integer(),
      }),
    };

    Deno.env.set("CFGTEST_TEXT", "test");
    Deno.env.set("CFGTEST_NUMBER", String(100));
    Deno.env.set("CFGTEST_MAX_AGE_IN_MS", String(2500));
    Deno.env.set("CFGTEST_BOOL", String(true));
    Deno.env.set(
      "CFGTEST_COMPLEX_TYPE",
      JSON.stringify({ innerText: "testInner", innerNumber: 25 }),
    );

    const iet = mod.deserializeFullRecordUsingIndividualEnvVars(
      syntheticRecord,
      {
        evNS: syntheticNS,
      },
    );
    const { serDeAxiomRecord: config } = iet;
    ta.assert(iet.test(config, {
      onInvalid: (reason) => {
        console.log(reason);
      },
    }));
    ta.assertEquals(5, iet.envVarsSearched.length);
    ta.assertEquals(5, iet.envVarsSearched.filter((s) => s.found).length);
    ta.assertEquals(0, iet.envVarsSearched.filter((s) => !s.found).length);
    ta.assertEquals(0, iet.envVarsSearched.filter((s) => s.defaulted).length);

    Deno.env.delete("CFGTEST_TEXT");
    Deno.env.delete("CFGTEST_NUMBER");
    Deno.env.delete("CFGTEST_MAX_AGE_IN_MS");
    Deno.env.delete("CFGTEST_BOOL");
    Deno.env.delete("CFGTEST_COMPLEX_TYPE");

    ta.assertEquals(config.text, "test");
    ta.assertEquals(config.number, 100);
    ta.assertEquals(config.maxAgeInMS, 2500n);
    ta.assertEquals(config.bool, true);
    ta.assertEquals(config.complexType, {
      innerText: "testInner",
      innerNumber: 25,
    });
  });

  await tc.step(
    "valid config with single required property, an alias, others optional with defaults",
    () => {
      const syntheticRecord = {
        text: axsd.text(),
        number: axsd.defaultable(
          axsd.integerOptional(),
          () => 47,
          (value) => value == undefined ? true : false,
        ),
        maxAgeInMS: mod.alias(
          axsd.bigintOptional(),
          "CFGTEST_MAXAGEINMS_ALIAS",
        ),
        bool: axsd.defaultable(
          axsd.boolean(),
          () => true,
          (value) => value == undefined ? true : false,
        ),
        complexType: axsd.objectOptional({
          innerText: axsd.text(),
          innerNumber: axsd.integer(),
        }),
      };

      Deno.env.set("CFGTEST_TEXT", "test");
      Deno.env.set("CFGTEST_MAXAGEINMS_ALIAS", String(2456));

      const iet = mod.deserializeFullRecordUsingIndividualEnvVars(
        syntheticRecord,
        {
          evNS: syntheticNS,
        },
      );
      const { serDeAxiomRecord: config } = iet;
      ta.assert(iet.test(config, {
        onInvalid: (reason) => {
          console.log(reason);
        },
      }));
      ta.assertEquals(6, iet.envVarsSearched.length); // 5 regular searches, 1 alias
      ta.assertEquals(2, iet.envVarsSearched.filter((s) => s.found).length);
      ta.assertEquals(4, iet.envVarsSearched.filter((s) => !s.found).length); // alias was found but 4 others weren't
      ta.assertEquals(2, iet.envVarsSearched.filter((s) => s.defaulted).length);

      Deno.env.delete("CFGTEST_TEXT");
      ta.assertEquals(config.text, "test");
      ta.assertEquals(config.number, 47);
      ta.assertEquals(config.maxAgeInMS, 2456n);
      ta.assertEquals(config.bool, true);
    },
  );
});

Deno.test(`full record from env using deserializeOmnibusEnv`, async (tc) => {
  await tc.step("invalid config, missing required properties", () => {
    const syntheticRecord = {
      text: axsd.text(),
      number: axsd.integer(),
      maxAgeInMS: axsd.bigint(),
      bool: axsd.boolean(),
      complexType: axsd.object({
        innerText: axsd.text(),
        innerNumber: axsd.integer(),
      }),
    };

    Deno.env.set(
      "CFGTEST_OMNIBUS",
      JSON.stringify(
        { text: "test" },
        (_, value) => typeof value === "bigint" ? value.toString() : value, // return everything else unchanged
      ),
    );

    const oet = mod.deserializeFullRecordUsingOmnibusEnvVar(
      syntheticRecord,
      "CFGTEST_OMNIBUS",
    );
    const { serDeAxiomRecord: config } = oet;
    ta.assertEquals(false, oet.test(config));
    ta.assert(oet.omnibusEnvVarName);
    ta.assert(oet.omnibusEnvVarValue);

    Deno.env.delete("CFGTEST_TEXT");
    ta.assertEquals(config.text, "test");
  });

  await tc.step("valid config, all required properties defined", () => {
    const syntheticRecord = {
      text: axsd.text(),
      number: axsd.integer(),
      // maxAgeInMS: axsd.bigint(), TODO: bigint in omnibus JSON doesn't work yet
      bool: axsd.boolean(),
      complexType: axsd.object({
        innerText: axsd.text(),
        innerNumber: axsd.integer(),
      }),
    };

    Deno.env.set(
      "CFGTEST_OMNIBUS",
      JSON.stringify({
        text: "test",
        number: 100,
        bool: true,
        complexType: { innerText: "testInner", innerNumber: 25 },
      }, (_, value) => typeof value === "bigint" ? value.toString() : value // return everything else unchanged
      ),
    );

    const oet = mod.deserializeFullRecordUsingOmnibusEnvVar(
      syntheticRecord,
      "CFGTEST_OMNIBUS",
    );
    const { serDeAxiomRecord: config } = oet;
    ta.assert(oet.test(config, {
      onInvalid: (reason) => {
        console.log(reason);
      },
    }));
    ta.assert(oet.omnibusEnvVarName);
    ta.assert(oet.omnibusEnvVarValue);

    Deno.env.delete("CFGTEST_OMNIBUS");

    ta.assertEquals(config.text, "test");
    ta.assertEquals(config.number, 100);
    ta.assertEquals(config.bool, true);
    ta.assertEquals(config.complexType, {
      innerText: "testInner",
      innerNumber: 25,
    });
  });
});
