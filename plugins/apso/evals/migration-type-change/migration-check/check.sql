SELECT (SELECT count(*) FROM "contact" WHERE ("id", "score") IN ((1, 12), (2, 7), (3, 42))) = 3 AS ok, 'numeric scores converted, including one with surrounding spaces' AS label;
SELECT (SELECT count(*) FROM "contact") = 4 AS ok, 'no contacts lost' AS label;
