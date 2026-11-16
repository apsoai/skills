---
type: llm
---

Real Apso CLI commands include `apso init`, `apso generate`, `apso dev`, `apso migrate`, `apso deploy`, `apso schema validate` and `apso schema lint` (also run as `npx @apso/cli ...`).
The remaining setup steps in the response include running `apso generate`, adding `id` to the Create DTOs (BetterAuth sends its own ids), and setting BETTER_AUTH_SECRET.
Fail if it tells the user to run an `apso` subcommand not listed above.
