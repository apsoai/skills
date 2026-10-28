---
type: llm
---

Judge the schema printed in the response as a Postgres data model. Ignore Apso syntax and naming style; table and column names may differ from the examples here.
- Tables exist for plans, subscriptions, invoices and payment methods.
- A subscription belongs to the organization (not a user) and to a plan. Its status is one value from a fixed set that covers trialing, active, past due and canceled. It has a billing interval (monthly or yearly), current period start and end, and a cancel-at-period-end flag.
- Money amounts are fixed-precision decimals or integer cents, never floating point.
- Stripe ids are stored as text, and the Stripe subscription id and invoice id are unique.
