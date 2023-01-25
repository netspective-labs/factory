import { testingAsserts as ta } from "./deps-test.ts";
import * as mod from "./conn-uri.ts";

Deno.test("Engine instance connection invalid URI", async (tc) => {
  await tc.step("improper URI", () => {
    const pgCP = mod.engineConnProps(
      "postgres/pguser:pgsecret@localhost/dbinstance",
    );
    ta.assert(!pgCP);
  });

  await tc.step("improper URI with custom error", () => {
    let errorEncountered: Error | undefined;
    const pgCP = mod.engineConnProps(
      "postgres/pguser:pgsecret@localhost/dbinstance",
      {
        onInvalid: (error) => {
          errorEncountered = error;
          return undefined;
        },
      },
    );
    ta.assert(!pgCP);
    ta.assert(errorEncountered);
  });
});

Deno.test("Engine instance connection URI properties", async (tc) => {
  await tc.step("PostgreSQL", async (tc) => {
    await tc.step("typical without query params", () => {
      const pgCP = mod.engineConnProps(
        "postgres://pguser:pgsecret@localhost:5433/dbinstance",
      );
      ta.assertEquals(pgCP, {
        driver: "postgres",
        username: "pguser",
        password: "pgsecret",
        host: "localhost",
        database: "dbinstance",
        port: 5433,
      });
    });

    await tc.step(
      "typical without query params and un/pw interpolated from env",
      () => {
        Deno.env.set("SYNTHETIC_PGDB_USERNAME", "synthUSER");
        Deno.env.set("SYNTHETIC_PGDB_PASSWORD", "synthPASS");
        const pgCP = mod.engineConnProps(
          "postgres://${USERNAME}:${PASSWORD}@localhost:5433/dbinstance",
          {
            envVarNamingStrategy: (envVarName) =>
              `SYNTHETIC_PGDB_${envVarName}`,
          },
        );
        ta.assertEquals(pgCP, {
          driver: "postgres",
          username: "synthUSER",
          password: "synthPASS",
          host: "localhost",
          database: "dbinstance",
          port: 5433,
          interpolatables: {
            USERNAME: "synthUSER",
            PASSWORD: "synthPASS",
          },
        });
        Deno.env.delete("SYNTHETIC_PGDB_USERNAME");
        Deno.env.delete("SYNTHETIC_PGDB_PASSWORD");
      },
    );

    await tc.step("with query params", () => {
      type Custom = mod.EngineInstanceConnProps & {
        readonly some?: string;
        readonly extra?: string;
        readonly tls?: boolean;
        readonly complex?: { custom1: string; custom2: number };
      };

      const pgCP = mod.engineConnProps<Custom>(
        "postgres://pguser:pgsecret@localhost/dbinstance?some=one&extra=two&tls&myComplex=custom1Value,55",
        {
          transformQueryParam: (key, value) => {
            if (key == "tls") return { key, value: true };
            if (key == "myComplex") {
              const values = value.split(",");
              return {
                key: "complex",
                value: { custom1: values[0], custom2: parseInt(values[1]) },
              };
            }
            return { key: key as keyof Custom, value };
          },
        },
      );
      ta.assertEquals(pgCP, {
        driver: "postgres",
        username: "pguser",
        password: "pgsecret",
        host: "localhost",
        database: "dbinstance",
        some: "one",
        extra: "two",
        tls: true,
        complex: {
          custom1: "custom1Value",
          custom2: 55,
        },
      });
    });
  });

  await tc.step("SQLite with file name", async (tc) => {
    await tc.step("just filename", () => {
      const pgCP = mod.engineConnProps(
        "sqlite3://my.sqlite.db",
      );
      ta.assertEquals(pgCP, {
        driver: "sqlite3",
        filename: "my.sqlite.db",
      });
    });

    await tc.step("with relative path", () => {
      const pgCP = mod.engineConnProps(
        "sqlite3://path/to/test.sqlite",
      );
      ta.assertEquals(pgCP, {
        driver: "sqlite3",
        filename: "path/to/test.sqlite",
      });
    });

    await tc.step("with absolute path", () => {
      const pgCP = mod.engineConnProps(
        "sqlite3:///path/to/test.sqlite",
      );
      ta.assertEquals(pgCP, {
        driver: "sqlite3",
        filename: "/path/to/test.sqlite",
      });
    });
  });

  await tc.step("MySQL", async (tc) => {
    await tc.step("typical without query params", () => {
      const pgCP = mod.engineConnProps(
        "mysql://someuser@server.heroku.com:1337/herokudb",
      );
      ta.assertEquals(pgCP, {
        driver: "mysql",
        username: "someuser",
        host: "server.heroku.com",
        port: 1337,
        database: "herokudb",
      });
    });
  });

  await tc.step("shell", async (tc) => {
    await tc.step("osQuery", () => {
      const pgCP = mod.engineConnProps(
        "shell://osquery",
      );
      ta.assertEquals(pgCP, {
        driver: "shell",
        host: "osquery",
      });
    });

    await tc.step("mergestat", () => {
      const pgCP = mod.engineConnProps(
        "shell://mergestat",
      );
      ta.assertEquals(pgCP, {
        driver: "shell",
        host: "mergestat",
      });
    });

    await tc.step("fselect", () => {
      const pgCP = mod.engineConnProps(
        "shell://fselect",
      );
      ta.assertEquals(pgCP, {
        driver: "shell",
        host: "fselect",
      });
    });
  });
});
