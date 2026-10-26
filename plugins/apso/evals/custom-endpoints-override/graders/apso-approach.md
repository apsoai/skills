---
type: llm
---

Judge the approach described in the response:
- The archive endpoint lives in an extension controller under `src/extensions/`, not in `src/autogen/`.
- To replace the generated `GET /tasks`, it sets `"http": false` on the Task entity in `.apsorc` and writes its own controller for that route.
- It gives a reason for using `"http": false`, such as avoiding a clash with the generated route. Any correct reason passes.
- It does not edit anything in `src/autogen/`.
