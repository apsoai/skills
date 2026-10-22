---
type: llm
---

Judge the schema printed in the response as a Postgres data model for the requested app. Ignore Apso syntax; names may differ from the examples here.
- People and organizations share one identity that cases and contact details point at: either one party table with a kind (person or organization), or a party supertype with person and organization subtype tables. Separate person and organization tables that every case link and contact table must reference twice fail this point.
- Case participation is a junction between a case and a party carrying the role, so one party can be in many cases with different roles.
- Addresses, phone numbers and emails are child rows of the party (one or more tables), not numbered columns like phone2.
- Person-only and organization-only fields (date of birth, registration number) are not required on the other kind.
Fail if any of these is missing.
