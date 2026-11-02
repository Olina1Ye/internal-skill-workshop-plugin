# Team Skill Hub · 团队 Skill 中心


团队 Skill 中心用于连接已有的 [Skill Base](https://github.com/ginuim/skill-base) 服务，在 DeepSeek Harness Web 中查找团队共享技能并一键安装。

- 浏览公开技能；通过验证码登录后查看有权限访问的私有技能。
- 查看技能作者、版本、适用工具和标签。
- 管理员可以预设团队服务地址，成员也可以自行填写。

当前插件的安装目标是 **DSH Web**；技能标注适用于 Codex、Claude 等工具，不代表本插件已经支持向这些工具安装技能。

## 中文快速开始

### 安装前准备

你需要一个 DSH Web 能访问的 Skill Base 服务根地址，例如 `https://skills.company.example`。团队成员可以使用管理员提供的地址，无需每人单独启动服务；自己本地试用时，需要先启动自己的 Skill Base 服务。本插件不包含或部署 Skill Base 服务。

### 安装与使用

```sh
dsh plugin --profile web add team-skill-hub
```

1. 重启 DSH Web，打开 **设置 → 团队 Skill 中心（Team Skill Hub）**。
2. 填写并保存 Skill Base 网站根地址，不要添加 `/api` 后缀。远程地址需要 HTTPS，本机开发可使用回环 HTTP 地址。
3. 搜索并浏览公开技能。
4. 如需访问私有技能，点击获取验证码，在 Skill Base 页面登录并生成验证码，再返回插件完成登录。
5. 选择技能并点击安装，技能会保存到 `$DSH_HOME/skills/<skill-id>`，默认位于 `~/.dsh/skills/`。已存在的同名目录不会被覆盖。

从旧包 `internal-skill-workshop` 迁移时，请先卸载旧插件，再安装新包，避免同时启用。原有服务地址和凭据使用原目录保存。当前主机连接仅支持本机回环访问；远程访问或反向代理部署不在当前支持范围内。

### 项目与问题反馈

- [GitHub 源码与文档](https://github.com/Olina1Ye/internal-skill-workshop-plugin)
- [npm 安装包](https://www.npmjs.com/package/team-skill-hub)
- [报告问题或提出功能建议](https://github.com/Olina1Ye/internal-skill-workshop-plugin/issues)

反馈时请注明 DSH 版本、插件版本、操作步骤、预期结果和实际报错。截图或日志中请隐藏验证码、访问令牌及其他敏感信息。

以下为英文说明与技术细节。

`team-skill-hub` is a DeepSeek Harness Web plugin for finding and
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
dsh plugin --profile web add team-skill-hub
```

Restart DSH Web, then open **Settings -> Team Skill Hub**.

## Migration from internal-skill-workshop

Remove the old plugin before installing `team-skill-hub`; do not enable both.
The internal profile entry ID and `$DSH_HOME/internal-skill-workshop` state
directory are retained so the saved server address and credentials are reused.
The GitHub repository URL remains unchanged.

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

1. Open **Settings -> Team Skill Hub**.
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
- The host RPC is disabled when DSH listens on a non-loopback address or
  allows remote authorities, including reverse-proxy deployments.
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
