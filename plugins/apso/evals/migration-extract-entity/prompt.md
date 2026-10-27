My Apso service (TypeScript) is deployed and its database holds production data. This is the deployed `.apsorc`:

```json
{
  "version": 2,
  "rootFolder": "src",
  "apiType": "Rest",
  "entities": [
    {
      "name": "Company",
      "created_at": true,
      "updated_at": true,
      "fields": [
        {
          "name": "name",
          "type": "text"
        }
      ]
    },
    {
      "name": "Contact",
      "created_at": true,
      "updated_at": true,
      "fields": [
        {
          "name": "fullName",
          "type": "text"
        },
        {
          "name": "phone",
          "type": "varchar",
          "length": 40,
          "nullable": true
        },
        {
          "name": "status",
          "type": "enum",
          "values": [
            "lead",
            "active",
            "archived"
          ],
          "default": "lead"
        },
        {
          "name": "score",
          "type": "text",
          "nullable": true
        }
      ]
    }
  ],
  "relationships": [
    {
      "from": "Contact",
      "to": "Company",
      "type": "ManyToOne",
      "index": true
    }
  ]
}
```

Contacts need more than one phone number (mobile, work, home). Move phone into its own PhoneNumber entity that belongs to Contact.

I changed `.apsorc` to this:

```json
{
  "version": 2,
  "rootFolder": "src",
  "apiType": "Rest",
  "entities": [
    {
      "name": "Company",
      "created_at": true,
      "updated_at": true,
      "fields": [
        {
          "name": "name",
          "type": "text"
        }
      ]
    },
    {
      "name": "Contact",
      "created_at": true,
      "updated_at": true,
      "fields": [
        {
          "name": "fullName",
          "type": "text"
        },
        {
          "name": "status",
          "type": "enum",
          "values": [
            "lead",
            "active",
            "archived"
          ],
          "default": "lead"
        },
        {
          "name": "score",
          "type": "text",
          "nullable": true
        }
      ]
    },
    {
      "name": "PhoneNumber",
      "created_at": true,
      "updated_at": true,
      "fields": [
        {
          "name": "number",
          "type": "varchar",
          "length": 40
        },
        {
          "name": "label",
          "type": "enum",
          "values": [
            "mobile",
            "work",
            "home"
          ],
          "default": "mobile"
        }
      ]
    }
  ],
  "relationships": [
    {
      "from": "Contact",
      "to": "Company",
      "type": "ManyToOne",
      "index": true
    },
    {
      "from": "PhoneNumber",
      "to": "Contact",
      "type": "ManyToOne",
      "index": true,
      "cascadeDelete": true
    }
  ]
}
```

Then I ran `apso migrate generate --baseline deployed.apsorc`, which wrote `src/migrations/1793104750704-SchemaUpdate-migration.ts`:

```ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdateMigration1793104750704 implements MigrationInterface {
    name = 'SchemaUpdateMigration1793104750704'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."phone_number_label_enum" AS ENUM('mobile', 'work', 'home')`);
        await queryRunner.query(`CREATE TABLE "phone_number" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "number" character varying(40) NOT NULL, "label" "public"."phone_number_label_enum" NOT NULL DEFAULT 'mobile', "contactId" integer NOT NULL, CONSTRAINT "PK_c16f58426537a660b3f2a26e983" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_069067410ee19d423487a189e4" ON "phone_number" ("contactId") `);
        await queryRunner.query(`ALTER TABLE "contact" DROP COLUMN "phone"`);
        await queryRunner.query(`ALTER TABLE "phone_number" ADD CONSTRAINT "FK_069067410ee19d423487a189e4d" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "phone_number" DROP CONSTRAINT "FK_069067410ee19d423487a189e4d"`);
        await queryRunner.query(`ALTER TABLE "contact" ADD "phone" character varying(40)`);
        await queryRunner.query(`DROP INDEX "public"."IDX_069067410ee19d423487a189e4"`);
        await queryRunner.query(`DROP TABLE "phone_number"`);
        await queryRunner.query(`DROP TYPE "public"."phone_number_label_enum"`);
    }

}
```

Get this ready to deploy. Write `.apsorc` and the final migration file into the project, then print both files.
