SELECT (SELECT count(*) FROM "contact_companies_company") = 4 AS ok, 'one link per existing contact' AS label;
SELECT (SELECT count(*) FROM "contact_companies_company" WHERE ("contactId", "companyId") IN ((1, 1), (2, 1), (3, 2), (4, 2))) = 4 AS ok, 'each contact keeps its original company' AS label;
