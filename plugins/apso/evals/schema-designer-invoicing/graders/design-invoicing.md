---
type: llm
---

Judge the schema printed in the response as a Postgres data model for the requested invoicing app. Ignore Apso syntax; table and column names may differ from the examples here.
- Each invoice line stores the unit price it was sold at (a snapshot), not only a reference to the product.
- Product prices are kept as history with a validity period (for example a ProductPrice table with validFrom and validTo, or an effective date), so the price on any date can be found.
- The invoice number is unique per organization, not globally.
- Individual and company customers share one way of being invoiced: a single customer table with a kind or type, or a customer supertype with person and company subtypes. Two unrelated customer tables that invoices must both point at fail this point.
- The response names at least one rule the schema cannot enforce by itself (for example atomic number assignment, or preventing overlapping price periods) and says where it should be enforced.
Fail if any of these is missing.
