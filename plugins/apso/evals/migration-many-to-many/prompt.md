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

A contact can now work with several companies. Change the Contact to Company relationship from many-to-one to many-to-many.

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
      "type": "ManyToMany",
      "bi_directional": true
    }
  ]
}
```

Then I ran `apso migrate generate --baseline deployed.apsorc`, which wrote `src/migrations/1793104759002-SchemaUpdate-migration.ts`:

```ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdateMigration1793104759002 implements MigrationInterface {
    name = 'SchemaUpdateMigration1793104759002'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contact" DROP CONSTRAINT "FK_196374b312744cf2c400c962383"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_196374b312744cf2c400c96238"`);
        await queryRunner.query(`CREATE TABLE "contact_companies_company" ("contactId" integer NOT NULL, "companyId" integer NOT NULL, CONSTRAINT "PK_a240a097bb1e1d698bc213e0c72" PRIMARY KEY ("contactId", "companyId"))`);
        await queryRunner.query(`CREATE INDEX "IDX_e6e2d85d35645bd6b752226c49" ON "contact_companies_company" ("contactId") `);
        await queryRunner.query(`CREATE INDEX "IDX_30d0ef2a176bf879a2d36df096" ON "contact_companies_company" ("companyId") `);
        await queryRunner.query(`ALTER TABLE "contact" DROP COLUMN "companyId"`);
        await queryRunner.query(`ALTER TABLE "contact_companies_company" ADD CONSTRAINT "FK_e6e2d85d35645bd6b752226c49d" FOREIGN KEY ("contactId") REFERENCES "contact"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
        await queryRunner.query(`ALTER TABLE "contact_companies_company" ADD CONSTRAINT "FK_30d0ef2a176bf879a2d36df0966" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contact_companies_company" DROP CONSTRAINT "FK_30d0ef2a176bf879a2d36df0966"`);
        await queryRunner.query(`ALTER TABLE "contact_companies_company" DROP CONSTRAINT "FK_e6e2d85d35645bd6b752226c49d"`);
        await queryRunner.query(`ALTER TABLE "contact" ADD "companyId" integer NOT NULL`);
        await queryRunner.query(`DROP INDEX "public"."IDX_30d0ef2a176bf879a2d36df096"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_e6e2d85d35645bd6b752226c49"`);
        await queryRunner.query(`DROP TABLE "contact_companies_company"`);
        await queryRunner.query(`CREATE INDEX "IDX_196374b312744cf2c400c96238" ON "contact" ("companyId") `);
        await queryRunner.query(`ALTER TABLE "contact" ADD CONSTRAINT "FK_196374b312744cf2c400c962383" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
```

Get this ready to deploy. Write `.apsorc` and the final migration file into the project, then print both files.
