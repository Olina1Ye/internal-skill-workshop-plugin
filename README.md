# internal-skill-workshop

`internal-skill-workshop` is a DeepSeek Harness Web plugin for browsing public Skill metadata from a configured [Skill Base](https://github.com/ginuim/skill-base) server.

The first release provides:

- a DSH Settings section for the Skill Base address;
- search by Skill Base's public name and description fields;
- a detail view for the author, version, type, compatible tools, and tags;
- a link to open the full Skill Base page.

The plugin does not upload local files, read Agent directories, store Skill Base credentials, or install Skills. Use the Skill Base Web application, `skb`, or Companion for those operations.

## Install

```sh
dsh plugin --profile web add https://github.com/Olina1Ye/internal-skill-workshop-plugin/releases/download/v0.1.0/internal-skill-workshop-0.1.0.tgz
```

After restarting DSH Web, open Settings and select **Internal Skill Workshop**. Enter the Skill Base address, save it, and search the public catalog.

For local development, `http://localhost` and `http://127.0.0.1` addresses are accepted. Remote addresses must use HTTPS.

## Development

```sh
npm test
npm pack --dry-run
```

The plugin is intentionally standalone and read-only. It does not bundle the Skill Base server, CLI, or desktop client.
