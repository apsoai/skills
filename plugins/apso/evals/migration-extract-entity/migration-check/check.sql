SELECT (SELECT count(*) FROM "phone_number") = 3 AS ok, 'one phone_number row per contact that had a phone' AS label;
SELECT (SELECT count(*) FROM "phone_number" p JOIN "contact" c ON c."id" = p."contactId" WHERE (c."id", p."number") IN ((1, '555-0101'), (2, '555-0102'), (4, '555-0104'))) = 3 AS ok, 'each number belongs to its original contact' AS label;
