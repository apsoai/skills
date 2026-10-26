SELECT (SELECT count(*) FROM "contact" WHERE "status"::text = 'closed') = 2 AS ok, 'archived contacts became closed' AS label;
SELECT (SELECT count(*) FROM "contact") = 4 AS ok, 'no contacts lost' AS label;
