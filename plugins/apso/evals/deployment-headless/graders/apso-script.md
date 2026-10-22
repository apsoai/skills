---
type: llm
---

The script runs headless: sets APSO_NONINTERACTIVE=1, logs in with `--token`, selects the `acme` workspace by slug (`apso use acme` or `--workspace acme`), links the EXISTING service with `--service billing-api` (not `--create`), and deploys with `apso deploy --yes`.
It notes that GitHub connect is the one step that needs a human/browser if the service has no GitHub connection.
Fail if it uses `apso link --create`, invents `apso workspace create`, or relies on interactive prompts.
