---
type: llm
---

Judge the controller printed in the response and the explanation:
- The approve route is in an extension controller under `src/extensions/`, not in `src/autogen/`, and is `POST` under the `invoices` path.
- The route has `@McpTool` imported from `@apso/mcp`, with a snake_case tool name and a description that says what the call does. A description that only repeats the name, such as "Approve invoice", fails.
- The request body is typed with a DTO class that has a note field carrying `@ApiProperty`. `any` or an inline object type fails.
- Reading invoices is exposed by setting `mcp` to read only on the Invoice entity in `.apsorc`, not by hand-writing list or get tools. Create, update and delete are not exposed.
- The approve logic looks the invoice up by the caller's organization as well as its id.
- The explanation says agent calls go through the same guards as REST calls, or equivalent. It does not call tenant scoping row-level security or say the database enforces it.
- It does not invent settings: no `mcp` block at the top level of `.apsorc`, no `mcpTools` key, no separate MCP server project.
