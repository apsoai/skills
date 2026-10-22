---
type: llm
---

The archive endpoint lives in an extension controller under `src/extensions/` (not in `src/autogen/`).
To replace the generated GET /tasks, it sets `"http": false` on the Task entity in .apsorc and regenerates, then writes its own controller for that route. It explains that NestJS cannot override a generated route by registering a duplicate.
Fail if it edits anything in `src/autogen/`.
