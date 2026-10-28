SELECT (SELECT count(*) FROM "organization") = 2 AS ok, 'organization rows kept' AS label;
SELECT (SELECT count(*) FROM "contact" c JOIN "organization" o ON o."id" = c."organizationId") = 4 AS ok, 'contacts still linked through organizationId' AS label;
SELECT EXISTS (SELECT 1 FROM pg_constraint WHERE contype = 'f' AND conrelid = 'contact'::regclass AND confrelid = 'organization'::regclass) AS ok, 'foreign key now references organization' AS label;
