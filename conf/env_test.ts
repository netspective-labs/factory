import { testingAsserts as ta } from "./deps-test.ts";
import * as safety from "../safety/mod.ts";
import * as mod from "./mod.ts";

interface TestComplexConfigProperty {
  innerText: string;
  innerNumber: number;
}

const isTestComplexConfigProperty = safety.typeGuard<TestComplexConfigProperty>(
  "innerText",
  "innerNumber",
);

interface TestConfig {
  text: string;
  number: number;
  maxAgeInMS: number;
  bool: boolean;
  complexType: TestComplexConfigProperty;
}

// deno-lint-ignore no-empty-interface
interface TestContext {
}

const testConfiguredPropsCount = 5;
function testConfigProperties(
  ec: mod.EnvConfiguration<TestConfig, TestContext>,
): mod.ConfigurableEnvVarPropertiesSupplier<TestConfig, TestContext> {
  return {
    properties: [
      ec.textProperty("text", [{ override: "altText" }]),
      ec.numericProperty("number"),
      ec.numericProperty("maxAgeInMS"),
      ec.booleanProperty("bool"),
      ec.jsonTextProperty<TestComplexConfigProperty>(
        "complexType",
        isTestComplexConfigProperty,
        () => ({ innerText: "bad", "innerNumber": -1 }),
      ),
    ],
  };
}

export class TestEnvConfiguration
  extends mod.EnvConfiguration<TestConfig, TestContext> {
  readonly unhandled: mod.ConfigurableEnvVarProperties<
    TestConfig,
    TestContext
  > = [];

  constructor() {
    super(
      testConfigProperties,
      mod.namespacedEnvVarNameUppercase("CFGTEST_"),
      mod.envConfigurationEventsConsoleEmitter("ENV_TEST_VERBOSE"),
    );
  }

  constructSync(): TestConfig {
    return {
      text: "",
      number: 0,
      maxAgeInMS: 0,
      bool: false,
      complexType: {
        innerText: "",
        innerNumber: 0,
      },
    };
  }

  unhandledPropertySync(
    _attempts: mod.ConfigurableEnvVarPropertyPopulateAttempt<
      TestConfig,
      // deno-lint-ignore no-explicit-any
      any,
      TestContext
    >[],
    p: mod.ConfigurableEnvVarProperty<TestConfig, unknown, TestContext>,
    _ctx: TestContext,
    _config: TestConfig,
  ): unknown {
    this.unhandled.push(p);
    return undefined;
  }
}

export class TestAsyncEnvConfiguration
  extends mod.AsyncEnvConfiguration<TestConfig, TestContext> {
  readonly unhandled: mod.ConfigurableEnvVarProperties<
    TestConfig,
    TestContext
  > = [];

  constructor() {
    super(
      testConfigProperties,
      mod.namespacedEnvVarNameUppercase("CFGTEST_"),
      mod.envConfigurationEventsConsoleEmitter("ENV_TEST_VERBOSE"),
    );
  }

  constructSync(): TestConfig {
    return {
      text: "",
      number: 0,
      maxAgeInMS: 0,
      bool: false,
      complexType: {
        innerText: "",
        innerNumber: 0,
      },
    };
  }

  unhandledPropertySync(
    _attempts: mod.ConfigurableEnvVarPropertyPopulateAttempt<
      TestConfig,
      // deno-lint-ignore no-explicit-any
      any,
      TestContext
    >[],
    // deno-lint-ignore no-explicit-any
    p: mod.ConfigurableEnvVarProperty<TestConfig, any, TestContext>,
    _ctx: TestContext,
    _config: TestConfig,
  ): unknown {
    this.unhandled.push(p);
    return undefined;
  }
}

Deno.test(`EnvConfiguration with unhandled number, bool, complex type`, () => {
  const testTextPropValue = "test";
  Deno.env.set("CFGTEST_TEXT", testTextPropValue);
  const proxy = new TestAsyncEnvConfiguration();
  const envConfig = new mod.CacheableConfigurationSupplier("TEST", proxy);
  const config = envConfig.configureSync({});
  Deno.env.delete("CFGTEST_TEXT");
  ta.assertEquals(
    proxy.ps.properties.length,
    testConfiguredPropsCount,
  );
  ta.assert(config);
  ta.assertEquals(config.text, testTextPropValue);

  // others should remain unhandled
  ta.assertEquals(proxy.unhandled.length, 4);
});

Deno.test(`EnvConfiguration with aliases`, () => {
  const testTextPropValue = "altTextTest";
  Deno.env.set("CFGTEST_ALT_TEXT", testTextPropValue);
  const envConfig = new TestAsyncEnvConfiguration();
  const config = envConfig.configureSync({});
  Deno.env.delete("CFGTEST_ALT_TEXT");
  ta.assertEquals(config.text, testTextPropValue);
});

Deno.test(`EnvConfiguration with complex property name`, () => {
  const maxAgeInMS = 1001;
  Deno.env.set("CFGTEST_MAX_AGE_IN_MS", String(maxAgeInMS));
  const envConfig = new TestAsyncEnvConfiguration();
  const config = envConfig.configureSync({});
  Deno.env.delete("CFGTEST_MAX_AGE_IN_MS");
  ta.assertEquals(config.maxAgeInMS, maxAgeInMS);
});

Deno.test(`AsyncEnvConfiguration with unhandled complex type`, async () => {
  const testTextPropValue = "test";
  const testNumberPropValue = 100;
  Deno.env.set("CFGTEST_TEXT", testTextPropValue);
  Deno.env.set("CFGTEST_NUMBER", testNumberPropValue.toString());
  const envConfig = new TestAsyncEnvConfiguration();
  const config = await envConfig.configure({});
  Deno.env.delete("CFGTEST_TEXT");
  Deno.env.delete("CFGTEST_NUMBER");
  ta.assertEquals(
    envConfig.ps.properties.length,
    testConfiguredPropsCount,
  );
  ta.assert(config);
  ta.assertEquals(config.text, testTextPropValue);
  ta.assertEquals(config.number, testNumberPropValue);

  // others should remain unhandled
  ta.assertEquals(envConfig.unhandled.length, 3);
});

Deno.test(`AsyncEnvConfiguration, cached, with no unhandled types`, async () => {
  const testTextPropValue = "test";
  const testNumberPropValue = 100;
  const testComplexValue = { innerText: "complex", innerNumber: -1 };
  const testMaxAgeInMS = 1001;
  const testBool = true;
  Deno.env.set("CFGTEST_TEXT", testTextPropValue);
  Deno.env.set("CFGTEST_NUMBER", testNumberPropValue.toString());
  Deno.env.set("CFGTEST_COMPLEX_TYPE", JSON.stringify(testComplexValue));
  Deno.env.set("CFGTEST_MAX_AGE_IN_MS", JSON.stringify(testMaxAgeInMS));
  Deno.env.set("CFGTEST_BOOL", JSON.stringify(testBool));
  const proxy = new TestAsyncEnvConfiguration();
  const envConfig = new mod.CacheableConfigurationSupplier("TEST", proxy);
  const config = await envConfig.configure({});
  Deno.env.delete("CFGTEST_TEXT");
  Deno.env.delete("CFGTEST_NUMBER");
  Deno.env.delete("CFGTEST_COMPLEX_TYPE");
  Deno.env.delete("CFGTEST_MAX_AGE_IN_MS");
  Deno.env.delete("CFGTEST_BOOL");
  ta.assertEquals(
    proxy.ps.properties.length,
    testConfiguredPropsCount,
  );
  ta.assert(config);
  ta.assertEquals(config.text, testTextPropValue);
  ta.assertEquals(config.number, testNumberPropValue);
  ta.assertEquals(config.maxAgeInMS, testMaxAgeInMS);
  ta.assertEquals(config.bool, testBool);
  ta.assertEquals(config.complexType, testComplexValue);
  ta.assertEquals(proxy.unhandled.length, 0);
});

Deno.test(`AsyncEnvConfiguration with failed guards`, async () => {
  Deno.env.set("CFGTEST_NUMBER", "bad");
  Deno.env.set("CFGTEST_COMPLEX_TYPE", `{ badText: "complex" }`);
  const envConfig = new TestAsyncEnvConfiguration();
  const config = await envConfig.configure({});
  Deno.env.delete("CFGTEST_NUMBER");
  Deno.env.delete("CFGTEST_COMPLEX_TYPE");
  ta.assertEquals(
    envConfig.ps.properties.length,
    testConfiguredPropsCount,
  );
  ta.assert(config);
  // the guard failure condition replaces complexType with something useful
  ta.assertEquals(config.number, NaN);
  ta.assertEquals(config.complexType, { innerNumber: -1, innerText: "bad" });

  // others should remain unhandled
  ta.assertEquals(envConfig.unhandled.length, 3);
});

Deno.test(`Omnibus JSON Configuration (single env var as JSON text)`, async () => {
  const factoryDefault = {
    text: "",
    number: 0,
    maxAgeInMS: 0,
    bool: false,
    complexType: {
      innerText: "",
      innerNumber: 0,
    },
  };
  const omnibusTestValue = {
    text: "test",
    number: 1001,
    maxAgeInMS: 100,
    bool: true,
    complexType: {
      innerText: "inner test",
      innerNumber: -1,
    },
  };
  const omnibusEnvVarName = "OMNIBUS_TEST";
  Deno.env.set(omnibusEnvVarName, JSON.stringify(omnibusTestValue));
  const testConfigGuard = safety.typeGuard<TestConfig>("text", "number");
  const envConfig = new mod.OmnibusEnvJsonArgConfiguration<TestConfig, never>(
    omnibusEnvVarName,
    () => factoryDefault,
    testConfigGuard,
    () => factoryDefault,
    mod.omnibusEnvJsonArgConfigurationEventsConsoleEmitter("ENV_TEST_VERBOSE"),
  );
  const syncConfig = envConfig.configureSync();
  ta.assertEquals(syncConfig, omnibusTestValue);

  const asyncConfig = await envConfig.configure();
  ta.assertEquals(asyncConfig, omnibusTestValue);

  Deno.env.delete(omnibusEnvVarName);
});
