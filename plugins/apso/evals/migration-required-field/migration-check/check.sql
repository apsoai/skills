SELECT (SELECT count(*) FROM "company" WHERE "region"::text = 'us') = 2 AS ok, 'existing companies backfilled to us' AS label;
