# Releasing the Apso plugin

The plugin is distributed through this repo as a Claude Code / Cowork marketplace.
Marketplace installs only pull a release when the advertised **version increases**, so
**every change to `plugins/apso/` must bump the version.** CI (`plugin-release-guard`)
enforces this on PRs to `main`.

## Checklist

1. **PR straight to `main`** (no long-lived branches — that's what stranded the
   `domain-events` skill).
2. **Bump the version** in both files, keeping them identical:
   - `plugins/apso/.claude-plugin/plugin.json` → `version`
   - `.claude-plugin/marketplace.json` → the `apso` entry's `version`
   - semver: new skill / feature = minor (`0.1.0 → 0.2.0`); fix = patch.
3. **Validate locally:** `claude plugin validate .`
4. **Merge to `main`.**
5. **Tag the release (optional but recommended):**
   `claude plugin tag --push -m "apso %s"` — creates `apso--v<version>`, validating that
   `plugin.json` and the marketplace entry agree.

## How deployed installs update

Marketplace installs via the Claude Code CLI:

```bash
claude plugin marketplace update apso   # refresh the catalog from this repo
claude plugin update apso@apso          # pull the new version (restart to apply)
```

Org/team installs that set `"autoUpdate": true` on the marketplace in
`.claude/settings.json` (`extraKnownMarketplaces`) refresh automatically at session start.

Cowork installs from an uploaded `.plugin` zip do **not** auto-update — rebuild the zip from
`plugins/apso/` and re-upload.
