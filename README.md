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

## Updating an existing installation

Marketplace installs only pull a release when the plugin's advertised **version
increases** (see [`RELEASE.md`](RELEASE.md)). To update an already-installed copy:

```bash
claude plugin marketplace update apso   # refresh the catalog from this repo
claude plugin update apso@apso          # pull the new version — restart to apply
```

Team/project installs that enable auto-update on the marketplace refresh on their
own at session start. In a project's `.claude/settings.json`:

```jsonc
{
  "extraKnownMarketplaces": {
    "apso": { "source": { "source": "github", "repo": "apsoai/skills" } }
  },
  "enabledPlugins": [{ "marketplace": "apso", "plugin": "apso" }]
}
```

Cowork installs from an uploaded zip don't auto-update — re-zip `plugins/apso/` and re-upload.

## Contents

```
.
├── .claude-plugin/marketplace.json   # Marketplace catalog
└── plugins/
    └── apso/                         # The Apso plugin
        ├── .claude-plugin/plugin.json
        ├── .mcp.json                 # Apso MCP server (connector)
        ├── skills/                   # 16 skills (data / api / auth / integrations)
        ├── references/               # schema guide + architecture (distribution model, taxonomy)
        └── README.md                 # Plugin docs + skill list
```

See [`plugins/apso/README.md`](plugins/apso/README.md) for the full skill and tool list.

## Powered By

[Apso](https://apso.dev) — Backend-as-a-service. Define a schema, get a production API.
