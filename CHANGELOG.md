# Changelog

## 0.2.1 - 2026-11-02

- Rename the npm package to `team-skill-hub` and the UI to Team Skill Hub / 团队 Skill 中心.
- Preserve existing profile IDs and saved state for migration.

- Fix plugin activation and host RPC registration on DSH 0.2.1-rc.5.
- Disable host RPC for non-loopback and remote-authority deployments.
- Clean up the registered RPC handler when the plugin unloads.

## 0.2.0 - 2026-08-28

- Add an administrator-provided default Skill Base address.
- Add verification-code sign-in and private Skill browsing.
- Keep Skill Base PATs on the loopback DSH host.
- Add one-click installation into `$DSH_HOME/skills`.
- Reject unsafe archives and existing destination directories.

## 0.1.0 - 2026-08-27

- Publish a prebuilt GitHub Release tarball for DSH installation.
- Add a DSH Web settings panel for configuring a Skill Base server.
- Add public catalog search and skill metadata details.
- Restrict remote servers to HTTPS and reject URL credentials, query strings,
  and fragments.
- Keep the host bundle free of filesystem and network behavior.
