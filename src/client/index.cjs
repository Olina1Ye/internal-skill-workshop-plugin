let React;

const STYLE_ID = 'internal-skill-workshop-styles';
const NS = 'internal-skill-workshop';
const CHANNEL = '/internal-skill-workshop';

const zh = {
  nav: '内部 Skill 工作台',
  heading: '内部 Skill 工作台',
  intro: '查找并安装团队发布的 Skill。',
  baseUrl: 'Skill Base 地址',
  baseUrlPlaceholder: 'https://skills.example.com',
  baseUrlHint: '填写站点根地址，不要带 /api。远程地址必须使用 HTTPS。',
  managedAddress: '团队管理员已预设此地址；你仍可保存个人地址覆盖它。',
  save: '保存',
  saved: '地址已保存。',
  account: '团队账号',
  signIn: '登录团队账号',
  signedInAs: '已登录：{username}',
  openLogin: '获取验证码',
  code: '验证码',
  codePlaceholder: 'ABCD-1234',
  verify: '验证',
  logout: '退出登录',
  loginHint: '在团队登录页获取验证码后填入此处。登录后可查看私有 Skill。',
  search: '搜索 Skill',
  searchPlaceholder: '名称或描述',
  searchAction: '搜索',
  loading: '正在加载 Skill...',
  loadingState: '正在连接 DSH host...',
  configureFirst: '先配置 Skill Base 地址。',
  noResults: '没有找到匹配的 Skill。',
  results: '个 Skill',
  detail: 'Skill 详情',
  chooseSkill: '选择一个 Skill 查看详情。',
  description: '描述',
  author: '作者',
  version: '最新版本',
  visibility: '可见性',
  public: '公开',
  private: '团队私有',
  type: '类型',
  tools: '兼容工具',
  tags: '标签',
  open: '在 Skill Base 中打开',
  install: '安装',
  installing: '正在安装...',
  installed: '已安装',
  installedVersion: '已安装版本',
  installSuccess: '已安装到 {path}',
  installRoot: '安装目录：{path}',
  hostUnavailable: '此功能只允许从本机 DSH Web 使用。',
  requestFailed: '操作失败。',
  catalogModePublic: '当前显示公开目录；登录后可查看团队私有 Skill。',
  catalogModePrivate: '当前账号可查看其有权限访问的公开与私有 Skill。',
};

const en = {
  nav: 'Internal Skill Workshop',
  heading: 'Internal Skill Workshop',
  intro: 'Find and install Skills published by your team.',
  baseUrl: 'Skill Base address',
  baseUrlPlaceholder: 'https://skills.example.com',
  baseUrlHint: 'Enter the site root without /api. Remote addresses must use HTTPS.',
  managedAddress: 'Your team administrator preset this address; you may still save a personal override.',
  save: 'Save',
  saved: 'Address saved.',
  account: 'Team account',
  signIn: 'Sign in to your team',
  signedInAs: 'Signed in as {username}',
  openLogin: 'Get code',
  code: 'Verification code',
  codePlaceholder: 'ABCD-1234',
  verify: 'Verify',
  logout: 'Sign out',
  loginHint: 'Get a code from the team sign-in page, then enter it here. Sign in to see private Skills.',
  search: 'Search Skills',
  searchPlaceholder: 'Name or description',
  searchAction: 'Search',
  loading: 'Loading Skills...',
  loadingState: 'Connecting to the DSH host...',
  configureFirst: 'Configure a Skill Base address first.',
  noResults: 'No matching Skills were found.',
  results: 'Skills',
  detail: 'Skill details',
  chooseSkill: 'Select a Skill to view its details.',
  description: 'Description',
  author: 'Author',
  version: 'Latest version',
  visibility: 'Visibility',
  public: 'Public',
  private: 'Team private',
  type: 'Type',
  tools: 'Compatible tools',
  tags: 'Tags',
  open: 'Open in Skill Base',
  install: 'Install',
  installing: 'Installing...',
  installed: 'Installed',
  installedVersion: 'Installed version',
  installSuccess: 'Installed to {path}',
  installRoot: 'Install directory: {path}',
  hostUnavailable: 'This feature is available only from a local DSH Web session.',
  requestFailed: 'The operation failed.',
  catalogModePublic: 'Showing the public catalog. Sign in to see private team Skills.',
  catalogModePrivate: 'This account can see the public and private Skills it is allowed to access.',
};

function isLoopback(hostname) {
  const normalized = hostname.toLowerCase();
  return normalized === 'localhost'
    || normalized === '127.0.0.1'
    || normalized === '[::1]'
    || normalized === '::1';
}

function normalizeBaseUrl(value) {
  const input = String(value ?? '').trim();
  if (!input) throw new Error('A Skill Base address is required.');
  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error('Use an http(s) address without credentials or query parameters.');
  }
  if (!['http:', 'https:'].includes(url.protocol)
    || url.username
    || url.password
    || url.search
    || url.hash) {
    throw new Error('Use an http(s) address without credentials or query parameters.');
  }
  if (url.protocol === 'http:' && !isLoopback(url.hostname)) {
    throw new Error('Use HTTPS for remote Skill Base servers. HTTP is allowed only for localhost development.');
  }
  return url.toString().replace(/\/$/, '');
}

function buildSkillsUrl(baseUrl, query) {
  const url = new URL('api/v1/skills', `${baseUrl}/`);
  const value = String(query ?? '').trim();
  if (value) url.searchParams.set('q', value);
  return url.toString();
}

function buildSkillPageUrl(baseUrl, skillId) {
  return new URL(`skills/${encodeURIComponent(skillId)}`, `${baseUrl}/`).toString();
}

function buildLoginUrl(baseUrl) {
  return new URL('login?from=cli', `${baseUrl}/`).toString();
}

function normalizeSkill(value) {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string') return null;
  const skill = value;
  return {
    id: skill.id,
    name: typeof skill.name === 'string' && skill.name ? skill.name : skill.id,
    description: typeof skill.description === 'string' ? skill.description : '',
    latestVersion: typeof skill.latest_version === 'string' ? skill.latest_version : '',
    installedVersion: typeof skill.installed_version === 'string' ? skill.installed_version : '',
    installed: skill.installed === true,
    visibility: skill.visibility === 'private' ? 'private' : 'public',
    skillType: typeof skill.skill_type === 'string' ? skill.skill_type : '',
    compatibleTools: Array.isArray(skill.compatible_tools)
      ? skill.compatible_tools.filter((item) => typeof item === 'string')
      : [],
    tags: Array.isArray(skill.tags)
      ? skill.tags.map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item.name === 'string') return item.name;
        return '';
      }).filter(Boolean)
      : [],
    author: skill.owner && typeof skill.owner === 'object'
      ? (typeof skill.owner.name === 'string' && skill.owner.name)
        || (typeof skill.owner.username === 'string' && skill.owner.username)
        || ''
      : '',
  };
}

async function fetchSkills(baseUrl, query, signal) {
  const response = await fetch(buildSkillsUrl(baseUrl, query), {
    method: 'GET',
    headers: { accept: 'application/json' },
    signal,
  });
  if (!response.ok) throw new Error(`Skill Base returned HTTP ${response.status}.`);
  const payload = await response.json();
  if (!payload || !Array.isArray(payload.skills)) {
    throw new Error('Skill Base returned an unexpected response.');
  }
  return payload.skills.map(normalizeSkill).filter(Boolean);
}

async function callHost(connection, endpoint, payload = {}, signal) {
  const result = await connection.rpc.call(CHANNEL, endpoint, payload, signal);
  if (!result.ok) throw new Error(result.error.message);
  return result.value;
}

function interpolate(template, values) {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replaceAll(`{${key}}`, String(value)),
    template,
  );
}

function ensureStyles() {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .iws-root { box-sizing: border-box; max-width: 1040px; color: var(--dsw-alias-label-primary, #202124); font-size: 14px; line-height: 1.5; }
    .iws-root *, .iws-root *::before, .iws-root *::after { box-sizing: border-box; }
    .iws-header { border-bottom: 1px solid var(--dsw-alias-border-l2, #e4e6eb); padding: 0 0 18px; }
    .iws-heading { margin: 0; font-size: 20px; font-weight: 600; line-height: 28px; }
    .iws-intro, .iws-hint, .iws-footnote { color: var(--dsw-alias-label-secondary, #5f6368); }
    .iws-intro { margin: 5px 0 0; }
    .iws-config { display: grid; grid-template-columns: minmax(0, 1fr) minmax(300px, .8fr); gap: 22px; padding: 20px 0; border-bottom: 1px solid var(--dsw-alias-border-l2, #e4e6eb); }
    .iws-form, .iws-auth { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
    .iws-label { color: var(--dsw-alias-label-primary, #202124); font-size: 13px; font-weight: 600; }
    .iws-control-row, .iws-auth-actions, .iws-detail-actions { display: flex; gap: 8px; align-items: stretch; flex-wrap: wrap; }
    .iws-input { min-width: 0; flex: 1; height: 36px; border: 1px solid var(--dsw-alias-border-l2, #d9dce1); border-radius: 7px; background: var(--dsw-alias-bg-base, #fff); color: inherit; font: inherit; padding: 0 11px; }
    .iws-code { max-width: 150px; text-transform: uppercase; }
    .iws-input:focus { border-color: var(--dsw-alias-brand-primary, #246bfe); outline: 2px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #246bfe) 22%, transparent); outline-offset: 0; }
    .iws-button { min-height: 36px; border: 1px solid var(--dsw-alias-border-l2, #d9dce1); border-radius: 7px; background: var(--dsw-alias-bg-base, #fff); color: inherit; cursor: pointer; display: inline-flex; align-items: center; justify-content: center; font: inherit; font-weight: 600; padding: 0 14px; text-decoration: none; }
    .iws-button:hover { background: var(--dsw-alias-interactive-bg-hover, #f3f5f8); }
    .iws-button:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #246bfe); outline-offset: 2px; }
    .iws-button:disabled { cursor: default; opacity: .55; }
    .iws-primary { border-color: var(--dsw-alias-brand-primary, #246bfe); background: var(--dsw-alias-brand-primary, #246bfe); color: #fff; }
    .iws-primary:hover { background: color-mix(in srgb, var(--dsw-alias-brand-primary, #246bfe) 86%, #000); }
    .iws-hint, .iws-footnote { margin: 0; font-size: 12px; }
    .iws-account-state { min-height: 36px; display: flex; align-items: center; font-weight: 600; }
    .iws-search { display: flex; gap: 8px; margin-top: 20px; }
    .iws-status { border-radius: 7px; margin-top: 12px; padding: 9px 11px; }
    .iws-status-info { background: var(--dsw-alias-bg-module-platform, #f3f5f8); color: var(--dsw-alias-label-secondary, #5f6368); }
    .iws-status-error { background: color-mix(in srgb, #d93025 12%, transparent); color: var(--dsw-alias-state-error-primary, #b3261e); }
    .iws-status-success { background: color-mix(in srgb, #188038 12%, transparent); color: var(--dsw-alias-label-primary, #202124); }
    .iws-workspace { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(300px, .95fr); gap: 16px; margin-top: 20px; }
    .iws-results, .iws-detail { min-width: 0; }
    .iws-results-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 8px; }
    .iws-section-title { font-size: 13px; font-weight: 600; margin: 0; }
    .iws-count { color: var(--dsw-alias-label-tertiary, #8a8f98); font-size: 12px; }
    .iws-list { display: flex; flex-direction: column; gap: 7px; }
    .iws-skill { display: block; width: 100%; border: 1px solid var(--dsw-alias-border-l2, #e4e6eb); border-radius: 7px; background: var(--dsw-alias-bg-base, #fff); color: inherit; cursor: pointer; padding: 11px 12px; text-align: left; }
    .iws-skill:hover, .iws-skill[aria-pressed="true"] { border-color: var(--dsw-alias-brand-primary, #246bfe); background: var(--dsw-alias-interactive-bg-hover, #f7f9fc); }
    .iws-skill-name { display: block; font-weight: 600; overflow-wrap: anywhere; }
    .iws-skill-description { color: var(--dsw-alias-label-secondary, #5f6368); display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; margin: 3px 0 0; overflow: hidden; }
    .iws-meta { color: var(--dsw-alias-label-tertiary, #8a8f98); display: flex; flex-wrap: wrap; gap: 4px 10px; font-size: 12px; margin-top: 6px; }
    .iws-badge { border: 1px solid var(--dsw-alias-border-l2, #e4e6eb); border-radius: 999px; padding: 0 7px; }
    .iws-detail { border-left: 1px solid var(--dsw-alias-border-l2, #e4e6eb); padding-left: 16px; }
    .iws-detail-panel { border: 1px solid var(--dsw-alias-border-l2, #e4e6eb); border-radius: 7px; padding: 14px; }
    .iws-detail-name { font-size: 17px; line-height: 24px; margin: 0; overflow-wrap: anywhere; }
    .iws-detail-description { color: var(--dsw-alias-label-secondary, #5f6368); white-space: pre-wrap; overflow-wrap: anywhere; margin: 8px 0 16px; }
    .iws-field { border-top: 1px solid var(--dsw-alias-border-l2, #e4e6eb); display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 10px; padding: 9px 0; }
    .iws-field-label { color: var(--dsw-alias-label-tertiary, #8a8f98); font-size: 12px; }
    .iws-field-value { overflow-wrap: anywhere; }
    .iws-tags { display: flex; flex-wrap: wrap; gap: 5px; }
    .iws-tag { border: 1px solid var(--dsw-alias-border-l2, #e4e6eb); border-radius: 999px; color: var(--dsw-alias-label-secondary, #5f6368); font-size: 12px; padding: 1px 7px; }
    .iws-empty { border: 1px dashed var(--dsw-alias-border-l2, #d9dce1); border-radius: 7px; color: var(--dsw-alias-label-tertiary, #8a8f98); padding: 18px 14px; }
    .iws-detail-actions { border-top: 1px solid var(--dsw-alias-border-l2, #e4e6eb); margin-top: 6px; padding-top: 14px; }
    .iws-footnote { margin-top: 18px; }
    @media (max-width: 760px) {
      [role="dialog"]:has(.iws-root) { flex-direction: column; }
      [role="dialog"]:has(.iws-root) > nav { border-right: 0; gap: 0; height: auto; padding: 10px 12px 0; width: 100%; }
      [role="dialog"]:has(.iws-root) > nav > :first-child { display: none; }
      [role="dialog"]:has(.iws-root) > nav > :last-child { flex-flow: row wrap; gap: 4px; width: 100%; }
      [role="dialog"]:has(.iws-root) > nav > :last-child > button { flex: 0 1 auto; padding: 7px 9px; width: auto; }
      [role="dialog"]:has(.iws-root) > nav + * { min-height: 0; width: 100%; }
      .iws-config, .iws-workspace { grid-template-columns: 1fr; }
      .iws-detail { border-left: 0; border-top: 1px solid var(--dsw-alias-border-l2, #e4e6eb); padding: 16px 0 0; }
      .iws-code { max-width: none; }
    }
  `;
  document.head.appendChild(style);
}

function displayText(value) {
  return value || '-';
}

function Field({ label, value, children }) {
  return React.createElement('div', { className: 'iws-field' }, [
    React.createElement('div', { className: 'iws-field-label', key: 'label' }, label),
    React.createElement('div', { className: 'iws-field-value', key: 'value' }, children || displayText(value)),
  ]);
}

function SkillCard({ skill, selected, onSelect, t }) {
  return React.createElement('button', {
    className: 'iws-skill',
    type: 'button',
    'aria-pressed': selected,
    onClick: () => onSelect(skill.id),
  }, [
    React.createElement('span', { className: 'iws-skill-name', key: 'name' }, skill.name),
    React.createElement('span', { className: 'iws-skill-description', key: 'description' }, displayText(skill.description)),
    React.createElement('span', { className: 'iws-meta', key: 'meta' }, [
      React.createElement('span', { className: 'iws-badge', key: 'visibility' }, t(skill.visibility)),
      skill.latestVersion ? React.createElement('span', { key: 'version' }, skill.latestVersion) : null,
      skill.author ? React.createElement('span', { key: 'author' }, skill.author) : null,
      skill.installed ? React.createElement('span', { className: 'iws-badge', key: 'installed' }, t('installed')) : null,
    ]),
  ]);
}

function SkillDetails({ skill, baseUrl, t, onInstall, installing }) {
  if (!skill) return React.createElement('div', { className: 'iws-empty' }, t('chooseSkill'));
  const installLabel = installing ? t('installing') : skill.installed ? t('installed') : t('install');
  return React.createElement('div', { className: 'iws-detail-panel' }, [
    React.createElement('h3', { className: 'iws-detail-name', key: 'name' }, skill.name),
    React.createElement('p', { className: 'iws-detail-description', key: 'description' }, displayText(skill.description)),
    React.createElement(Field, { label: t('author'), value: skill.author, key: 'author' }),
    React.createElement(Field, { label: t('version'), value: skill.latestVersion, key: 'version' }),
    React.createElement(Field, { label: t('visibility'), value: t(skill.visibility), key: 'visibility' }),
    skill.installed
      ? React.createElement(Field, { label: t('installedVersion'), value: skill.installedVersion || skill.latestVersion, key: 'installedVersion' })
      : null,
    React.createElement(Field, { label: t('type'), value: skill.skillType, key: 'type' }),
    React.createElement(Field, { label: t('tools'), value: skill.compatibleTools.join(', '), key: 'tools' }),
    React.createElement(Field, { label: t('tags'), key: 'tags' }, React.createElement('div', { className: 'iws-tags' }, skill.tags.length > 0
      ? skill.tags.map((tag) => React.createElement('span', { className: 'iws-tag', key: tag }, tag))
      : displayText(''))),
    React.createElement('div', { className: 'iws-detail-actions', key: 'actions' }, [
      React.createElement('button', {
        className: 'iws-button iws-primary',
        type: 'button',
        disabled: installing || skill.installed || !skill.latestVersion,
        onClick: () => onInstall(skill),
        key: 'install',
      }, installLabel),
      React.createElement('a', {
        className: 'iws-button',
        href: buildSkillPageUrl(baseUrl, skill.id),
        target: '_blank',
        rel: 'noreferrer',
        key: 'open',
      }, t('open')),
    ]),
  ]);
}

function WorkshopSection({ t: translate, connection }) {
  const t = typeof translate === 'function' ? translate : (key) => key;
  const [hostState, setHostState] = React.useState(null);
  const [baseUrlInput, setBaseUrlInput] = React.useState('');
  const [code, setCode] = React.useState('');
  const [query, setQuery] = React.useState('');
  const [skills, setSkills] = React.useState([]);
  const [selectedId, setSelectedId] = React.useState(null);
  const [status, setStatus] = React.useState({ kind: 'info', message: t('loadingState') });
  const [loading, setLoading] = React.useState(true);
  const [installingId, setInstallingId] = React.useState('');
  const controllerRef = React.useRef(null);

  function applyCatalog(payload) {
    const nextSkills = Array.isArray(payload?.skills)
      ? payload.skills.map(normalizeSkill).filter(Boolean)
      : [];
    setSkills(nextSkills);
    setSelectedId((current) => nextSkills.some((skill) => skill.id === current) ? current : null);
    return nextSkills;
  }

  React.useEffect(() => {
    const controller = new AbortController();
    controllerRef.current = controller;
    async function initialize() {
      try {
        const nextState = await callHost(connection, 'state', {}, controller.signal);
        setHostState(nextState);
        setBaseUrlInput(nextState.baseUrl || '');
        if (nextState.baseUrl) {
          const payload = await callHost(connection, 'catalog/search', { query: '' }, controller.signal);
          const nextSkills = applyCatalog(payload);
          setStatus({ kind: 'success', message: `${nextSkills.length} ${t('results')}` });
        } else {
          setStatus({ kind: 'info', message: t('configureFirst') });
        }
      } catch (error) {
        setStatus({ kind: 'error', message: error.message || t('requestFailed') });
      } finally {
        setLoading(false);
      }
    }
    initialize();
    return () => controller.abort();
  }, []);

  async function run(action, pendingMessage) {
    setLoading(true);
    if (pendingMessage) setStatus({ kind: 'info', message: pendingMessage });
    try {
      return await action();
    } catch (error) {
      setStatus({ kind: 'error', message: error.message || t('requestFailed') });
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function saveAddress(event) {
    event.preventDefault();
    const nextState = await run(
      () => callHost(connection, 'config/save', { baseUrl: baseUrlInput }),
      '',
    );
    if (!nextState) return;
    setHostState(nextState);
    setBaseUrlInput(nextState.baseUrl || '');
    setSkills([]);
    setSelectedId(null);
    setStatus({ kind: 'success', message: t('saved') });
  }

  async function verifyCode(event) {
    event.preventDefault();
    const nextState = await run(
      () => callHost(connection, 'auth/verify', { code }),
      '',
    );
    if (!nextState) return;
    setHostState(nextState);
    setCode('');
    const payload = await run(
      () => callHost(connection, 'catalog/search', { query }),
      t('loading'),
    );
    if (payload) {
      const nextSkills = applyCatalog(payload);
      setStatus({ kind: 'success', message: `${nextSkills.length} ${t('results')}` });
    }
  }

  async function logout() {
    const nextState = await run(() => callHost(connection, 'auth/logout'));
    if (!nextState) return;
    setHostState(nextState);
    const payload = await run(
      () => callHost(connection, 'catalog/search', { query }),
      t('loading'),
    );
    if (payload) {
      const nextSkills = applyCatalog(payload);
      setStatus({ kind: 'success', message: `${nextSkills.length} ${t('results')}` });
    }
  }

  async function search(event) {
    event.preventDefault();
    const payload = await run(
      () => callHost(connection, 'catalog/search', { query }),
      t('loading'),
    );
    if (!payload) return;
    const nextSkills = applyCatalog(payload);
    setStatus({ kind: 'success', message: `${nextSkills.length} ${t('results')}` });
  }

  async function install(skill) {
    setInstallingId(skill.id);
    const result = await run(
      () => callHost(connection, 'install', { skillId: skill.id }),
      t('installing'),
    );
    setInstallingId('');
    if (!result) return;
    setSkills((current) => current.map((item) => item.id === skill.id
      ? { ...item, installed: true, installedVersion: result.version }
      : item));
    setStatus({
      kind: 'success',
      message: interpolate(t('installSuccess'), { path: result.installPathDisplay }),
    });
  }

  const selected = skills.find((skill) => skill.id === selectedId) || null;
  const statusNode = status.message
    ? React.createElement('div', {
      className: `iws-status iws-status-${status.kind}`,
      role: status.kind === 'error' ? 'alert' : 'status',
    }, status.message)
    : null;
  const localOnly = connection?.isLoopback === false;

  return React.createElement('section', { className: 'iws-root' }, [
    React.createElement('header', { className: 'iws-header', key: 'header' }, [
      React.createElement('h2', { className: 'iws-heading', key: 'heading' }, t('heading')),
      React.createElement('p', { className: 'iws-intro', key: 'intro' }, t('intro')),
    ]),
    localOnly
      ? React.createElement('div', { className: 'iws-status iws-status-error', role: 'alert', key: 'local' }, t('hostUnavailable'))
      : null,
    React.createElement('div', { className: 'iws-config', key: 'config' }, [
      React.createElement('form', { className: 'iws-form', onSubmit: saveAddress, key: 'address' }, [
        React.createElement('label', { className: 'iws-label', htmlFor: 'iws-base-url', key: 'label' }, t('baseUrl')),
        React.createElement('div', { className: 'iws-control-row', key: 'controls' }, [
          React.createElement('input', {
            className: 'iws-input',
            id: 'iws-base-url',
            type: 'url',
            value: baseUrlInput,
            placeholder: t('baseUrlPlaceholder'),
            disabled: loading || localOnly,
            onChange: (event) => setBaseUrlInput(event.target.value),
            key: 'input',
          }),
          React.createElement('button', {
            className: 'iws-button',
            type: 'submit',
            disabled: loading || localOnly,
            key: 'save',
          }, t('save')),
        ]),
        React.createElement('p', { className: 'iws-hint', key: 'hint' },
          hostState?.hasManagedBaseUrl ? t('managedAddress') : t('baseUrlHint')),
      ]),
      React.createElement('div', { className: 'iws-auth', key: 'auth' }, [
        React.createElement('span', { className: 'iws-label', key: 'label' }, t('account')),
        hostState?.authenticated
          ? React.createElement('div', { className: 'iws-auth-actions', key: 'signed-in' }, [
            React.createElement('span', { className: 'iws-account-state', key: 'user' },
              interpolate(t('signedInAs'), { username: hostState.username })),
            React.createElement('button', {
              className: 'iws-button',
              type: 'button',
              disabled: loading,
              onClick: logout,
              key: 'logout',
            }, t('logout')),
          ])
          : React.createElement('form', { className: 'iws-auth-actions', onSubmit: verifyCode, key: 'signed-out' }, [
            hostState?.baseUrl ? React.createElement('a', {
              className: 'iws-button',
              href: buildLoginUrl(hostState.baseUrl),
              target: '_blank',
              rel: 'noreferrer',
              key: 'login',
            }, t('openLogin')) : null,
            React.createElement('input', {
              className: 'iws-input iws-code',
              type: 'text',
              value: code,
              maxLength: 9,
              placeholder: t('codePlaceholder'),
              'aria-label': t('code'),
              disabled: loading || !hostState?.baseUrl,
              onChange: (event) => setCode(event.target.value.toUpperCase()),
              key: 'code',
            }),
            React.createElement('button', {
              className: 'iws-button',
              type: 'submit',
              disabled: loading || !hostState?.baseUrl || !code,
              key: 'verify',
            }, t('verify')),
          ]),
        React.createElement('p', { className: 'iws-hint', key: 'hint' }, t('loginHint')),
      ]),
    ]),
    React.createElement('form', { className: 'iws-search', onSubmit: search, key: 'search' }, [
      React.createElement('input', {
        className: 'iws-input',
        type: 'search',
        value: query,
        placeholder: t('searchPlaceholder'),
        'aria-label': t('search'),
        disabled: loading || !hostState?.baseUrl || localOnly,
        onChange: (event) => setQuery(event.target.value),
        key: 'input',
      }),
      React.createElement('button', {
        className: 'iws-button iws-primary',
        type: 'submit',
        disabled: loading || !hostState?.baseUrl || localOnly,
        key: 'button',
      }, t('searchAction')),
    ]),
    statusNode,
    React.createElement('div', { className: 'iws-workspace', key: 'workspace' }, [
      React.createElement('div', { className: 'iws-results', key: 'results' }, [
        React.createElement('div', { className: 'iws-results-head', key: 'head' }, [
          React.createElement('h3', { className: 'iws-section-title', key: 'title' }, t('search')),
          skills.length > 0
            ? React.createElement('span', { className: 'iws-count', key: 'count' }, `${skills.length} ${t('results')}`)
            : null,
        ]),
        !hostState?.baseUrl && skills.length === 0
          ? React.createElement('div', { className: 'iws-empty', key: 'empty' }, t('configureFirst'))
          : !loading && skills.length === 0
            ? React.createElement('div', { className: 'iws-empty', key: 'empty' }, t('noResults'))
            : React.createElement('div', { className: 'iws-list', key: 'list' }, skills.map((skill) => React.createElement(SkillCard, {
              skill,
              selected: skill.id === selectedId,
              onSelect: setSelectedId,
              t,
              key: skill.id,
            }))),
      ]),
      React.createElement('aside', { className: 'iws-detail', 'aria-label': t('detail'), key: 'detail' }, [
        React.createElement('h3', { className: 'iws-section-title', key: 'title' }, t('detail')),
        React.createElement(SkillDetails, {
          skill: selected,
          baseUrl: hostState?.baseUrl || '',
          t,
          onInstall: install,
          installing: selected?.id === installingId,
          key: 'panel',
        }),
      ]),
    ]),
    React.createElement('p', { className: 'iws-footnote', key: 'mode' },
      hostState?.authenticated ? t('catalogModePrivate') : t('catalogModePublic')),
    React.createElement('p', { className: 'iws-footnote', key: 'root' },
      interpolate(t('installRoot'), { path: hostState?.installRoot || '$DSH_HOME/skills' })),
  ]);
}

function apply(ctx) {
  const slots = typeof ctx.get === 'function' ? ctx.get('slots') : ctx.slots;
  const locale = typeof ctx.get === 'function' ? ctx.get('locale') : ctx.locale;
  const connection = typeof ctx.get === 'function' ? ctx.get('connection') : ctx.connection;
  if (!slots || !locale || !connection) return;
  React = require('react');
  ensureStyles();
  if (typeof ctx.effect === 'function') {
    ctx.effect(() => locale.register(NS, { zh, en }), `${NS}: dictionaries`);
  } else {
    locale.register(NS, { zh, en });
  }
  const t = locale.bind(NS);
  slots.inject('settings.section', () => slots.register({
    name: 'settings.section',
    id: NS,
    order: 45,
    label: () => t('nav'),
    locale: NS,
    inject: () => ({ t, connection }),
  }, (props) => React.createElement(WorkshopSection, props)));
}

const inject = ['slots', 'locale', 'connection'];

module.exports = {
  name: NS,
  inject,
  apply,
  normalizeBaseUrl,
  buildSkillsUrl,
  buildSkillPageUrl,
  buildLoginUrl,
  normalizeSkill,
  fetchSkills,
  callHost,
};
