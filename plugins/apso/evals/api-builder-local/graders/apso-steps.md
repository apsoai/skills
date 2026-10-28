---
type: llm
---

The answer gives a working Apso CLI workflow. Real Apso commands are: `npm install -g @apso/cli`, `apso init`, `apso generate`, `npm install`, `apso dev`, `npm run compose`, `npm run provision`, `npm run start:dev`, `apso migrate`, `apso deploy`. Any of these may appear.
- It runs `apso generate`, installs dependencies, and starts the API locally (`apso dev`, or compose + provision + start:dev).
- It says `src/autogen/` is overwritten on every generate and that custom logic belongs in `src/extensions/`. Importing generated classes from autogen inside extension code is fine.
Fail only if it tells the user to edit or add files inside `src/autogen/`, or uses an `apso` subcommand not in the list above.
