import { testingAsserts as ta } from "../render/deps-test.ts";
import * as SQLa from "../render/mod.ts";
import * as mod from "./plantuml-ie-notation.ts";
import * as tf from "../models/pubctl.ts";
import * as ws from "../../text/whitespace.ts";

Deno.test("PlantUML IE Diagram (full)", () => {
  const defns = tf.pubCtlDatabaseDefn();
  const puml = mod.plantUmlIE(
    SQLa.typicalSqlEmitContext(),
    function* () {
      for (const defn of Object.values(defns)) {
        if (SQLa.isTableDefinition(defn)) {
          yield defn;
        }
      }
    },
    mod.typicalPlantUmlIeOptions(defns.modelsGovn.erdConfig),
  );

  // copy the fixtures into https://www.planttext.com/ to see what the output will look like
  // deno-fmt-ignore
  ta.assertEquals(puml, ws.unindentWhitespace(`
    @startuml IE
      hide circle
      skinparam linetype ortho
      skinparam roundcorner 20
      skinparam class {
        BackgroundColor White
        ArrowColor Silver
        BorderColor Silver
        FontColor Black
        FontSize 12
      }

      entity "publ_host" as publ_host {
        * **publ_host_id**: INTEGER
        --
        * host: TEXT
          host_identity: JSON
        * mutation_count: INTEGER
        * numeric_enum: INTEGER <<ENUM(synthetic_enum_numeric)>>
          created_at: DATETIME
        --
        publBuildEvents: PublBuildEvent[]
      }

      entity "publ_build_event" as publ_build_event {
        * **publ_build_event_id**: INTEGER
        --
        * publ_host_id: INTEGER <<FK(publ_host)>>
        * iteration_index: INTEGER
        * build_initiated_at: DATETIME
        * build_completed_at: DATETIME
        * build_duration_ms: INTEGER
        * resources_originated_count: INTEGER
        * resources_persisted_count: INTEGER
        * resources_memoized_count: INTEGER
        * text_enum: TEXT <<ENUM(synthetic_enum_text)>>
          created_at: DATETIME
        --
        services: Service[]
      }

      entity "publ_server_service" as publ_server_service {
        * **publ_server_service_id**: INTEGER
        --
        * service_started_at: DATETIME
        * listen_host: TEXT
        * listen_port: INTEGER
        * publish_url: TEXT
        * publ_build_event_id: INTEGER <<FK(publ_build_event)>>
          created_at: DATETIME
      }

      entity "publ_server_static_access_log" as publ_server_static_access_log {
        * **publ_server_static_access_log_id**: INTEGER
        --
        * status: INTEGER
        * asset_nature: TEXT
        * location_href: TEXT
        * filesys_target_path: TEXT
          filesys_target_symlink: TEXT
        * publ_server_service_id: INTEGER <<FK(publ_server_service)>>
          created_at: DATETIME
      }

      entity "publ_server_error_log" as publ_server_error_log {
        * **publ_server_error_log_id**: INTEGER
        --
        * location_href: TEXT
        * error_summary: TEXT
          error_elaboration: JSON
        * publ_server_service_id: INTEGER <<FK(publ_server_service)>>
          created_at: DATETIME
      }

      entity "synthetic_enum_numeric" as synthetic_enum_numeric {
        * **code**: INTEGER
        --
        * value: TEXT
          created_at: DATETIME
      }

      entity "synthetic_enum_text" as synthetic_enum_text {
        * **code**: TEXT
        --
        * value: TEXT
          created_at: DATETIME
      }

      synthetic_enum_numeric |o..o| publ_host
      publ_host |o..o{ publ_build_event
      synthetic_enum_text |o..o| publ_build_event
      publ_build_event |o..o{ publ_server_service
      publ_server_service |o..o{ publ_server_static_access_log
      publ_server_service |o..o{ publ_server_error_log
    @enduml`));
});

Deno.test("PlantUML IE Diagram (entitites and relationships only, no attributes or children)", () => {
  const puml = mod.plantUmlIE(
    SQLa.typicalSqlEmitContext(),
    function* () {
      const defns = tf.pubCtlDatabaseDefn();
      for (const defn of Object.values(defns)) {
        if (SQLa.isTableDefinition(defn)) {
          yield defn;
        }
      }
    },
    mod.typicalPlantUmlIeOptions({
      includeEntityAttr: () => false,
      includeChildren: () => false,
      relationshipIndicator: (edge) => {
        const refIsEnum = SQLa.isEnumTableDefn(edge.ref.entity);
        // Relationship types see: https://plantuml.com/es/ie-diagram
        // Zero or One	|o--
        // Exactly One	||--
        // Zero or Many	}o--
        // One or Many	}|--
        return refIsEnum ? "|o..o|" : "|o..o{";
      },
    }),
  );

  // copy the fixtures into https://www.planttext.com/ to see what the output will look like
  // deno-fmt-ignore
  ta.assertEquals(puml, ws.unindentWhitespace(`
    @startuml IE
      hide circle
      skinparam linetype ortho
      skinparam roundcorner 20
      skinparam class {
        BackgroundColor White
        ArrowColor Silver
        BorderColor Silver
        FontColor Black
        FontSize 12
      }

      entity "publ_host" as publ_host {
      }

      entity "publ_build_event" as publ_build_event {
      }

      entity "publ_server_service" as publ_server_service {
      }

      entity "publ_server_static_access_log" as publ_server_static_access_log {
      }

      entity "publ_server_error_log" as publ_server_error_log {
      }

      entity "synthetic_enum_numeric" as synthetic_enum_numeric {
      }

      entity "synthetic_enum_text" as synthetic_enum_text {
      }

      synthetic_enum_numeric |o..o| publ_host
      publ_host |o..o{ publ_build_event
      synthetic_enum_text |o..o| publ_build_event
      publ_build_event |o..o{ publ_server_service
      publ_server_service |o..o{ publ_server_static_access_log
      publ_server_service |o..o{ publ_server_error_log
    @enduml`));
});
