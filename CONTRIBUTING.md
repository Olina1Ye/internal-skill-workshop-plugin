# Contributing

Keep changes focused on the standalone DSH plugin. The plugin is a read-only
catalog browser; server administration, authentication, and skill installation
belong in Skill Base or its clients.

Before opening a pull request, run:

```sh
npm test
npm pack --dry-run
```

Do not commit credentials, private Skill Base addresses, local databases, or
generated npm tarballs.
