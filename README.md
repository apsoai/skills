# Apso — Plugin Marketplace for Claude

This repository is a [plugin marketplace](https://code.claude.com/docs/en/plugin-marketplaces)
hosting the **Apso** plugin for Claude Cowork and Claude Code: database schema
design, REST API generation, and backend deployment.

## Install

**Claude Code**

```bash
claude plugin marketplace add apsoai/skills
claude plugin install apso@apso
```

**Claude Cowork** — upload `plugins/apso` as a custom plugin (zip the directory),
or install from the marketplace once published.

## Contents

```
.
├── .claude-plugin/marketplace.json   # Marketplace catalog
└── plugins/
    └── apso/                         # The Apso plugin
        ├── .claude-plugin/plugin.json
        ├── .mcp.json                 # Apso MCP server (connector)
        ├── skills/                   # 15 schema + API skills
        ├── references/               # Apso schema guide
        └── README.md                 # Plugin docs + skill list
```

See [`plugins/apso/README.md`](plugins/apso/README.md) for the full skill and tool list.

## Powered By

[Apso](https://apso.dev) — Backend-as-a-service. Define a schema, get a production API.
