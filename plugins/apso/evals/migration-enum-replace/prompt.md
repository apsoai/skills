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

Replace the `archived` status on Contact with `closed`. Contacts that are archived today should become closed.

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
            "closed"
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

Then I ran `apso migrate generate --baseline deployed.apsorc`, which wrote `src/migrations/1793049700161-SchemaUpdate-migration.ts`:

```ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdateMigration1793049700161 implements MigrationInterface {
    name = 'SchemaUpdateMigration1793049700161'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."contact_status_enum" RENAME TO "contact_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."contact_status_enum" AS ENUM('lead', 'active', 'closed')`);
        await queryRunner.query(`ALTER TABLE "contact" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "contact" ALTER COLUMN "status" TYPE "public"."contact_status_enum" USING "status"::"text"::"public"."contact_status_enum"`);
        await queryRunner.query(`ALTER TABLE "contact" ALTER COLUMN "status" SET DEFAULT 'lead'`);
        await queryRunner.query(`DROP TYPE "public"."contact_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."contact_status_enum_old" AS ENUM('lead', 'active', 'archived')`);
        await queryRunner.query(`ALTER TABLE "contact" ALTER COLUMN "status" DROP DEFAULT`);
        await queryRunner.query(`ALTER TABLE "contact" ALTER COLUMN "status" TYPE "public"."contact_status_enum_old" USING "status"::"text"::"public"."contact_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "contact" ALTER COLUMN "status" SET DEFAULT 'lead'`);
        await queryRunner.query(`DROP TYPE "public"."contact_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."contact_status_enum_old" RENAME TO "contact_status_enum"`);
    }

}
```

Get this ready to deploy. Write `.apsorc` and the final migration file into the project, then print both files.
