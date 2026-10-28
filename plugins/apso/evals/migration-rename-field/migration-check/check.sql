SELECT (SELECT count(*) FROM "contact" WHERE "mobilePhone" IN ('555-0101', '555-0102', '555-0104')) = 3 AS ok, 'existing phone values kept in mobilePhone' AS label;
