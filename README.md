# internal-skill-workshop

`internal-skill-workshop` is a DeepSeek Harness Web plugin for finding and
installing team Skills from a configured
[Skill Base](https://github.com/ginuim/skill-base) server.

It provides:

- a DSH Settings section for the team Skill Base address;
- an administrator-provided default server address;
- public catalog browsing without an account;
- verification-code sign-in for private team Skills;
- one-click installation into the DSH user Skill directory;
- metadata for the author, version, visibility, type, compatible tools, and tags.

Publishing and Skill administration remain in Skill Base Web, `skb`, or
Companion.

## Install

You need a running Skill Base server that DSH Web can reach. The plugin is a
team catalog client; it does not include or deploy the server.

```sh
dsh plugin --profile web add internal-skill-workshop
```

Restart DSH Web, then open **Settings -> Internal Skill Workshop**.

## Team setup

An administrator can preset one shared server address in the profile's
`cordis.patch.yml`:

```yaml
- id: internal-skill-workshop
  config:
    baseUrl: https://skills.company.example
```

Every team member using that profile starts with the same address. A member may
save a personal address from the plugin; the personal value takes precedence.
Remote servers must use HTTPS. Loopback HTTP is accepted for local development.

## Member workflow

1. Open **Settings -> Internal Skill Workshop**.
2. Confirm or enter the Skill Base root address without an `/api` suffix.
3. Search immediately to browse public Skills.
4. To see private Skills, choose **Get code**. Sign in on the Skill Base page
   and copy the generated verification code back into the plugin.
5. Select a Skill and choose **Install**.

The plugin installs to:

```text
$DSH_HOME/skills/<skill-id>
```

`$DSH_HOME` defaults to `~/.dsh`. The plugin does not accept a path from the
browser and refuses to overwrite an existing Skill directory. Updating and
replacing locally modified Skills are intentionally out of scope for this
release.

## Credentials

The plugin never asks for a Skill Base password. It exchanges a five-minute,
single-use verification code for a Skill Base personal access token (PAT).
The DSH host stores the PAT in:

```text
$DSH_HOME/internal-skill-workshop/credentials.json
```

The file is written with owner-only permissions where the platform supports
them. The PAT is attached to Skill Base requests only by the DSH host and is
never returned to the browser, placed in a URL, or stored in browser
`localStorage`. **Sign out** removes the local PAT.

Skill Base currently issues long-lived PATs through this flow. Signing out of
the plugin removes the local copy but does not revoke the server-side token;
server administrators should remove an exposed or retired PAT from Skill Base.

## API keys and translation

The DSH plugin does not require an API key. Do not paste a Cloudflare or Skill
Base credential into its server-address setting.

If a Skill Base deployment provides a **Translate to Chinese** action on its
publishing page, that is a separate server-side feature. The Skill Base server
operator enables it by supplying these environment variables to the server
process or container:

```dotenv
CLOUDFLARE_ACCOUNT_ID=<Cloudflare account ID>
CLOUDFLARE_API_TOKEN=<token with Workers AI access>
SKILL_BASE_TRANSLATION_TIMEOUT_MS=20000
```

`SKILL_BASE_TRANSLATION_TIMEOUT_MS` is optional and defaults to 20 seconds.
The account ID and token must remain on the server. For Docker deployments,
ensure the deployment explicitly passes them into the application container;
adding them to a host `.env` file alone may not do that.

## Security boundaries

- The browser can call the plugin host only through a loopback-only DSH RPC
  channel.
- The host validates the Skill Base URL and rejects remote HTTP, credentials,
  query strings, fragments, and redirects.
- Downloaded archives are limited to 50 MB compressed, 100 MB unpacked, and
  2,000 entries.
- Skill Base JSON responses are limited to 5 MB, and untrusted Skill IDs are
  validated before any local path check.
- ZIP traversal, absolute paths, symbolic links, duplicate paths, files outside
  the Skill root, and invalid `SKILL.md` frontmatter are rejected.
- The host sends the browser only the catalog fields rendered by the UI.
- Installation is staged and then atomically renamed into
  `$DSH_HOME/skills/<skill-id>`.

## Development

```sh
npm test
npm audit
npm pack --dry-run
```
