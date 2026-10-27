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

Split Contact.fullName into firstName and lastName. lastName is optional, since some contacts go by one name.

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
          "name": "firstName",
          "type": "text"
        },
        {
          "name": "lastName",
          "type": "text",
          "nullable": true
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

Then I ran `apso migrate generate --baseline deployed.apsorc`, which wrote `src/migrations/1793104767166-SchemaUpdate-migration.ts`:

```ts
import { MigrationInterface, QueryRunner } from "typeorm";

export class SchemaUpdateMigration1793104767166 implements MigrationInterface {
    name = 'SchemaUpdateMigration1793104767166'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contact" DROP COLUMN "fullName"`);
        await queryRunner.query(`ALTER TABLE "contact" ADD "firstName" text NOT NULL`);
        await queryRunner.query(`ALTER TABLE "contact" ADD "lastName" text`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "contact" DROP COLUMN "lastName"`);
        await queryRunner.query(`ALTER TABLE "contact" DROP COLUMN "firstName"`);
        await queryRunner.query(`ALTER TABLE "contact" ADD "fullName" text NOT NULL`);
    }

}
```

Get this ready to deploy. Write `.apsorc` and the final migration file into the project, then print both files.
