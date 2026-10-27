SELECT bool_and("firstName" <> '') AS ok, 'every contact has a first name' AS label FROM "contact";
SELECT bool_and(btrim(concat_ws(' ', "firstName", "lastName")) = CASE "id" WHEN 1 THEN 'Ada Lovelace' WHEN 2 THEN 'Cher' WHEN 3 THEN 'Ludwig van Beethoven' WHEN 4 THEN 'Grace Hopper' END) AS ok, 'firstName and lastName together give back the original name' AS label FROM "contact";
