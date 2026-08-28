# internal-skill-workshop

`internal-skill-workshop` is a DeepSeek Harness Web plugin for browsing public Skill metadata from a configured [Skill Base](https://github.com/ginuim/skill-base) server.

The first release provides:

- a DSH Settings section for the Skill Base address;
- search by Skill Base's public name and description fields;
- a detail view for the author, version, type, compatible tools, and tags;
- a link to open the full Skill Base page.

The plugin does not upload local files, read Agent directories, store Skill Base credentials, or install Skills. Use the Skill Base Web application, `skb`, or Companion for those operations.

## Install

You need a running Skill Base server that DSH Web can reach. The plugin is a
catalog client; it does not include or deploy the server.

```sh
dsh plugin --profile web add internal-skill-workshop
```

The versioned [GitHub Release tarball](https://github.com/Olina1Ye/internal-skill-workshop-plugin/releases/tag/v0.1.0) is also available as a fallback install source.

## Use

1. Restart DSH Web after installation.
2. Open **Settings -> Internal Skill Workshop**.
3. Enter the root address of your Skill Base server, without an `/api` suffix.
4. Save the address, then search the public catalog.
5. Select a result to inspect its metadata or open its full Skill Base page.

For local development, `http://localhost` and `http://127.0.0.1` addresses are accepted. Remote addresses must use HTTPS.

This release is read-only. It browses public Skill metadata and does not log in,
publish, install, update, or translate Skills.

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

`SKILL_BASE_TRANSLATION_TIMEOUT_MS` is optional and defaults to 20 seconds. The
account ID and token must remain on the server. For Docker deployments, ensure
the deployment explicitly passes them into the application container; adding
them to a host `.env` file alone may not do that. If they are not configured,
only the translation action is unavailable; catalog browsing through this
plugin is unaffected.

## Development

```sh
npm test
npm pack --dry-run
```

The plugin is intentionally standalone and read-only. It does not bundle the Skill Base server, CLI, or desktop client.
