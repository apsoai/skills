CREATE TABLE "company" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "name" text NOT NULL, CONSTRAINT "PK_056f7854a7afdba7cbd6d45fc20" PRIMARY KEY ("id"));
CREATE TYPE "public"."contact_status_enum" AS ENUM('lead', 'active', 'archived');
CREATE TABLE "contact" ("id" SERIAL NOT NULL, "created_at" TIMESTAMP NOT NULL DEFAULT now(), "updated_at" TIMESTAMP NOT NULL DEFAULT now(), "fullName" text NOT NULL, "phone" character varying(40), "status" "public"."contact_status_enum" NOT NULL DEFAULT 'lead', "score" text, "companyId" integer NOT NULL, CONSTRAINT "PK_2cbbe00f59ab6b3bb5b8d19f989" PRIMARY KEY ("id"));
CREATE INDEX "IDX_196374b312744cf2c400c96238" ON "contact" ("companyId") ;
ALTER TABLE "contact" ADD CONSTRAINT "FK_196374b312744cf2c400c962383" FOREIGN KEY ("companyId") REFERENCES "company"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
-- Production-like rows. Hidden from the agent.
INSERT INTO "company" ("id", "name") VALUES (1, 'Acme'), (2, 'Globex');
SELECT setval('company_id_seq', 2);
INSERT INTO "contact" ("id", "fullName", "phone", "status", "score", "companyId") VALUES
  (1, 'Ada Lovelace', '555-0101', 'active', '12', 1),
  (2, 'Alan Turing', '555-0102', 'archived', '7', 1),
  (3, 'Grace Hopper', NULL, 'lead', ' 42', 2),
  (4, 'Edsger Dijkstra', '555-0104', 'archived', 'n/a', 2);
SELECT setval('contact_id_seq', 4);
