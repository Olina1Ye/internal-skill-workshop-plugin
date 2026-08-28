# Security

## Data handling

The plugin host connects to the configured Skill Base server, optionally stores
a Skill Base PAT, downloads selected Skill archives, and installs validated
files under `$DSH_HOME/skills`.

The PAT remains on the DSH host. Browser RPC responses expose only whether a
user is signed in and the username. The browser never receives the PAT.

Remote Skill Base URLs must use HTTPS. HTTP is accepted only for loopback
development addresses. URLs containing credentials, query parameters, or
fragments are rejected, and HTTP redirects are not followed.

## Filesystem writes

Host writes are limited to:

```text
$DSH_HOME/internal-skill-workshop/config.json
$DSH_HOME/internal-skill-workshop/credentials.json
$DSH_HOME/internal-skill-workshop/installs.json
$DSH_HOME/skills/<validated-skill-id>
```

The browser cannot provide an installation path. Existing Skill directories are
not overwritten.

## Archive validation

The installer limits compressed size, unpacked size, and entry count. It rejects
path traversal, absolute paths, symbolic links, duplicate paths, files outside
the single Skill root, multiple or missing `SKILL.md` files, invalid YAML
frontmatter, and missing descriptions.

Catalog and authentication JSON responses are limited to 5 MB. Skill IDs from
the server are validated and length-limited before they can participate in a
local filesystem path.

## Reporting a vulnerability

Please use GitHub's private vulnerability reporting for this repository. Do
not include credentials, private server addresses, or production data in a
public issue.
