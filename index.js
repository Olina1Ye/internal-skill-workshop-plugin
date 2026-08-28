import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { parseDocument } from 'yaml';

export const name = 'internal-skill-workshop';
export const inject = ['connection'];

const CHANNEL = '/internal-skill-workshop';
const MAX_ARCHIVE_BYTES = 50 * 1024 * 1024;
const MAX_UNPACKED_BYTES = 100 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 2_000;
const MAX_JSON_BYTES = 5 * 1024 * 1024;
const REQUEST_TIMEOUT_MS = 20_000;
const SKILL_ID = /^(?=.{1,128}$)[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CLI_CODE = /^[A-Z0-9]{4}-[A-Z0-9]{4}$/;

class WorkshopError extends Error {
  constructor(message) {
    super(message);
    this.name = 'WorkshopError';
  }
}

function isLoopback(hostname) {
  const normalized = hostname.toLowerCase();
  return normalized === 'localhost'
    || normalized === '127.0.0.1'
    || normalized === '[::1]'
    || normalized === '::1';
}

export function normalizeBaseUrl(value) {
  const input = String(value ?? '').trim();
  if (!input) throw new WorkshopError('A Skill Base address is required.');

  let url;
  try {
    url = new URL(input);
  } catch {
    throw new WorkshopError('Use an http(s) address without credentials or query parameters.');
  }

  if (!['http:', 'https:'].includes(url.protocol)
    || url.username
    || url.password
    || url.search
    || url.hash) {
    throw new WorkshopError('Use an http(s) address without credentials or query parameters.');
  }
  if (url.protocol === 'http:' && !isLoopback(url.hostname)) {
    throw new WorkshopError('Use HTTPS for remote Skill Base servers. HTTP is allowed only for localhost development.');
  }
  return url.toString().replace(/\/$/, '');
}

function resolveDshHome(explicit) {
  const configured = explicit ?? process.env.DSH_HOME;
  if (typeof configured === 'string' && configured.trim()) return path.resolve(configured.trim());
  return path.join(os.homedir(), '.dsh');
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function writeJsonAtomically(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const temporary = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  try {
    fs.writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
    fs.renameSync(temporary, filePath);
    fs.chmodSync(filePath, 0o600);
  } finally {
    fs.rmSync(temporary, { force: true });
  }
}

function rpcFailure(error) {
  const message = error instanceof WorkshopError
    ? error.message
    : 'Internal Skill Workshop could not complete the request.';
  return { ok: false, error: { code: 'internal', message, details: {} } };
}

async function fetchWithTimeout(doFetch, url, init, signal) {
  const controller = new AbortController();
  const onAbort = () => controller.abort(signal?.reason);
  signal?.addEventListener('abort', onAbort, { once: true });
  const timer = setTimeout(() => controller.abort(new Error('request timeout')), REQUEST_TIMEOUT_MS);
  try {
    return await doFetch(url, { ...init, redirect: 'error', signal: controller.signal });
  } catch (error) {
    if (controller.signal.aborted) throw new WorkshopError('Skill Base request timed out or was cancelled.');
    throw new WorkshopError('Skill Base could not be reached.');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', onAbort);
  }
}

async function readLimitedBody(response, limit, tooLargeMessage) {
  const declared = Number(response.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > limit) throw new WorkshopError(tooLargeMessage);
  if (!response.body) return Buffer.alloc(0);

  const chunks = [];
  let total = 0;
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      throw new WorkshopError(tooLargeMessage);
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks, total);
}

async function parseJsonResponse(response) {
  let payload;
  try {
    const body = await readLimitedBody(
      response,
      MAX_JSON_BYTES,
      'Skill Base JSON response exceeds the 5 MB limit.',
    );
    payload = JSON.parse(body.toString('utf8'));
  } catch (error) {
    if (error instanceof WorkshopError) throw error;
    if (!response.ok) throw new WorkshopError(`HTTP ${response.status}`);
    throw new WorkshopError('Skill Base returned an unexpected response.');
  }
  if (!response.ok) {
    const detail = typeof payload?.detail === 'string' ? payload.detail : `HTTP ${response.status}`;
    throw new WorkshopError(detail);
  }
  return payload;
}

function apiUrl(baseUrl, suffix) {
  return new URL(`api/v1/${suffix.replace(/^\/+/, '')}`, `${baseUrl}/`).toString();
}

function authHeaders(token, extra = {}) {
  return token ? { ...extra, Authorization: `Bearer ${token}` } : extra;
}

function publicSkill(value, installed, installedVersion) {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !SKILL_ID.test(value.id)) {
    return null;
  }
  return {
    id: value.id,
    name: typeof value.name === 'string' ? value.name : value.id,
    description: typeof value.description === 'string' ? value.description : '',
    latest_version: typeof value.latest_version === 'string' ? value.latest_version : '',
    visibility: value.visibility === 'private' ? 'private' : 'public',
    skill_type: typeof value.skill_type === 'string' ? value.skill_type : '',
    compatible_tools: Array.isArray(value.compatible_tools)
      ? value.compatible_tools.filter((item) => typeof item === 'string')
      : [],
    tags: Array.isArray(value.tags)
      ? value.tags.map((item) => typeof item === 'string'
        ? item
        : item && typeof item.name === 'string' ? { name: item.name } : null).filter(Boolean)
      : [],
    owner: value.owner && typeof value.owner === 'object'
      ? {
        username: typeof value.owner.username === 'string' ? value.owner.username : '',
        name: typeof value.owner.name === 'string' ? value.owner.name : '',
      }
      : null,
    installed,
    installed_version: installedVersion,
  };
}

async function readLimitedResponse(response, limit = MAX_ARCHIVE_BYTES) {
  if (!response.ok) {
    let detail = `HTTP ${response.status}`;
    try {
      const body = await readLimitedBody(
        response,
        MAX_JSON_BYTES,
        'Skill Base JSON response exceeds the 5 MB limit.',
      );
      const payload = JSON.parse(body.toString('utf8'));
      if (typeof payload?.detail === 'string') detail = payload.detail;
    } catch (error) {
      if (error instanceof WorkshopError) throw error;
      // Keep the status-only error for non-JSON download responses.
    }
    throw new WorkshopError(detail);
  }
  if (!response.body) throw new WorkshopError('Skill Base returned an empty archive.');
  return readLimitedBody(response, limit, 'Skill archive exceeds the 50 MB download limit.');
}

function normalizeEntryName(value) {
  const raw = String(value ?? '');
  if (!raw || raw.includes('\0') || raw.startsWith('/') || raw.startsWith('\\') || /^[A-Za-z]:/.test(raw)) {
    throw new WorkshopError('Skill archive contains an unsafe path.');
  }
  const normalized = raw.replaceAll('\\', '/').replace(/\/+$/, '');
  const segments = normalized.split('/');
  if (!normalized || segments.some((segment) => !segment || segment === '.' || segment === '..')) {
    throw new WorkshopError('Skill archive contains an unsafe path.');
  }
  return normalized;
}

function isSymbolicLink(entry) {
  return (((entry.attr >>> 16) & 0xf000) === 0xa000);
}

function normalizedSkillMarkdown(source, skillId) {
  const match = source.match(/^---\s*\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) throw new WorkshopError('SKILL.md must contain YAML frontmatter.');
  const document = parseDocument(match[1]);
  if (document.errors.length > 0) throw new WorkshopError('SKILL.md contains invalid YAML frontmatter.');
  const description = document.get('description');
  if (typeof description !== 'string' || !description.trim()) {
    throw new WorkshopError('SKILL.md frontmatter requires a description.');
  }
  document.set('name', skillId);
  const body = source.slice(match[0].length);
  return `---\n${document.toString()}---\n${body}`;
}

function archiveFiles(buffer, skillId) {
  let zip;
  try {
    zip = new AdmZip(buffer);
  } catch {
    throw new WorkshopError('Skill Base returned an invalid ZIP archive.');
  }
  const entries = zip.getEntries();
  if (entries.length === 0 || entries.length > MAX_ARCHIVE_ENTRIES) {
    throw new WorkshopError('Skill archive has an invalid number of entries.');
  }

  let unpackedBytes = 0;
  const files = [];
  for (const entry of entries) {
    const name = normalizeEntryName(entry.entryName);
    if (isSymbolicLink(entry)) throw new WorkshopError('Skill archive cannot contain symbolic links.');
    if (entry.isDirectory) continue;
    const size = Number(entry.header?.size ?? 0);
    if (!Number.isSafeInteger(size) || size < 0) throw new WorkshopError('Skill archive contains an invalid entry.');
    unpackedBytes += size;
    if (unpackedBytes > MAX_UNPACKED_BYTES) {
      throw new WorkshopError('Skill archive exceeds the 100 MB unpacked limit.');
    }
    files.push({ entry, name });
  }

  const skillFiles = files.filter(({ name }) => path.posix.basename(name) === 'SKILL.md');
  if (skillFiles.length !== 1) throw new WorkshopError('Skill archive must contain exactly one SKILL.md.');
  const root = path.posix.dirname(skillFiles[0].name);
  const prefix = root === '.' ? '' : `${root}/`;
  const seen = new Set();
  let actualUnpackedBytes = 0;

  return files.map(({ entry, name }) => {
    if (prefix && !name.startsWith(prefix)) {
      throw new WorkshopError('Every archive file must be inside the Skill directory.');
    }
    const relative = prefix ? name.slice(prefix.length) : name;
    const key = relative.toLowerCase();
    if (!relative || seen.has(key)) throw new WorkshopError('Skill archive contains duplicate paths.');
    seen.add(key);
    let content;
    try {
      content = entry.getData();
    } catch {
      throw new WorkshopError('Skill archive could not be decompressed safely.');
    }
    actualUnpackedBytes += content.length;
    if (actualUnpackedBytes > MAX_UNPACKED_BYTES) {
      throw new WorkshopError('Skill archive exceeds the 100 MB unpacked limit.');
    }
    if (relative === 'SKILL.md') {
      content = Buffer.from(normalizedSkillMarkdown(content.toString('utf8'), skillId), 'utf8');
    }
    const executable = (((entry.attr >>> 16) & 0o111) !== 0);
    return { relative, content, mode: executable ? 0o755 : 0o644 };
  });
}

export function installSkillArchive(buffer, skillId, options = {}) {
  if (!SKILL_ID.test(skillId)) throw new WorkshopError('Skill ID is invalid.');
  if (!Buffer.isBuffer(buffer) || buffer.length === 0 || buffer.length > MAX_ARCHIVE_BYTES) {
    throw new WorkshopError('Skill archive is empty or too large.');
  }
  const dshHome = resolveDshHome(options.dshHome);
  const skillsRoot = path.join(dshHome, 'skills');
  const installPath = path.join(skillsRoot, skillId);
  fs.mkdirSync(skillsRoot, { recursive: true, mode: 0o755 });
  if (fs.existsSync(installPath)) {
    throw new WorkshopError(`Skill "${skillId}" is already installed; existing files were not changed.`);
  }
  const files = archiveFiles(buffer, skillId);
  const stagingRoot = fs.mkdtempSync(path.join(skillsRoot, '.internal-skill-workshop-'));
  const stagedSkill = path.join(stagingRoot, skillId);
  try {
    for (const file of files) {
      const destination = path.join(stagedSkill, ...file.relative.split('/'));
      fs.mkdirSync(path.dirname(destination), { recursive: true, mode: 0o755 });
      fs.writeFileSync(destination, file.content, { flag: 'wx', mode: file.mode });
    }
    if (!fs.existsSync(path.join(stagedSkill, 'SKILL.md'))) {
      throw new WorkshopError('Skill archive does not contain a root SKILL.md.');
    }
    if (fs.existsSync(installPath)) {
      throw new WorkshopError(`Skill "${skillId}" is already installed; existing files were not changed.`);
    }
    fs.renameSync(stagedSkill, installPath);
    return { skillId, installPath, installPathDisplay: `$DSH_HOME/skills/${skillId}` };
  } finally {
    fs.rmSync(stagingRoot, { recursive: true, force: true });
  }
}

function normalizeSkillId(value) {
  const skillId = String(value ?? '').trim();
  if (!SKILL_ID.test(skillId)) throw new WorkshopError('Skill ID is invalid.');
  return skillId;
}

export function createWorkshopService(config = {}, options = {}) {
  const dshHome = resolveDshHome(options.dshHome);
  const stateDir = path.join(dshHome, 'internal-skill-workshop');
  const configPath = path.join(stateDir, 'config.json');
  const credentialPath = path.join(stateDir, 'credentials.json');
  const installRegistryPath = path.join(stateDir, 'installs.json');
  const doFetch = options.fetch ?? globalThis.fetch;
  const managedBaseUrl = config.baseUrl ? normalizeBaseUrl(config.baseUrl) : '';

  function savedBaseUrl() {
    const value = readJson(configPath)?.baseUrl;
    if (typeof value !== 'string' || !value) return '';
    try {
      return normalizeBaseUrl(value);
    } catch {
      return '';
    }
  }
  function currentBaseUrl() {
    return savedBaseUrl() || managedBaseUrl;
  }
  function credentials() {
    const value = readJson(credentialPath);
    if (!value || value.baseUrl !== currentBaseUrl()
      || typeof value.token !== 'string' || !value.token
      || typeof value.username !== 'string' || !value.username) return null;
    return value;
  }
  function publicState() {
    const baseUrl = currentBaseUrl();
    const credential = credentials();
    return {
      baseUrl,
      managedBaseUrl,
      hasManagedBaseUrl: Boolean(managedBaseUrl),
      authenticated: Boolean(credential),
      username: credential?.username || '',
      installRoot: '$DSH_HOME/skills',
    };
  }

  async function saveAddress(payload) {
    const baseUrl = normalizeBaseUrl(payload?.baseUrl);
    const previous = currentBaseUrl();
    writeJsonAtomically(configPath, { baseUrl });
    if (previous !== baseUrl) fs.rmSync(credentialPath, { force: true });
    return publicState();
  }
  async function verifyCode(payload, signal) {
    const baseUrl = currentBaseUrl();
    if (!baseUrl) throw new WorkshopError('Configure the Skill Base address before signing in.');
    const code = String(payload?.code ?? '').trim().toUpperCase();
    if (!CLI_CODE.test(code)) throw new WorkshopError('Enter a verification code in the form ABCD-1234.');
    const response = await fetchWithTimeout(doFetch, apiUrl(baseUrl, 'auth/cli-code/verify'), {
      method: 'POST',
      headers: { accept: 'application/json', 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    }, signal);
    const result = await parseJsonResponse(response);
    if (result?.ok !== true
      || typeof result.token !== 'string' || !result.token || result.token.length > 8_192
      || typeof result.user?.username !== 'string'
      || !result.user.username.trim() || result.user.username.length > 200) {
      throw new WorkshopError('Skill Base returned an invalid sign-in response.');
    }
    writeJsonAtomically(credentialPath, {
      baseUrl,
      token: result.token,
      username: result.user.username.trim(),
    });
    return publicState();
  }
  async function search(payload, signal) {
    const baseUrl = currentBaseUrl();
    if (!baseUrl) throw new WorkshopError('Configure the Skill Base address before searching.');
    const query = String(payload?.query ?? '').trim().slice(0, 200);
    const url = new URL(apiUrl(baseUrl, 'skills'));
    if (query) url.searchParams.set('q', query);
    const credential = credentials();
    const response = await fetchWithTimeout(doFetch, url, {
      method: 'GET',
      headers: authHeaders(credential?.token, { accept: 'application/json' }),
    }, signal);
    const result = await parseJsonResponse(response);
    if (!Array.isArray(result?.skills)) throw new WorkshopError('Skill Base returned an unexpected response.');
    const installs = readJson(installRegistryPath) || {};
    return {
      skills: result.skills.map((skill) => {
        const id = typeof skill?.id === 'string' && SKILL_ID.test(skill.id) ? skill.id : '';
        if (!id) return null;
        const record = id && installs[id] && typeof installs[id] === 'object' ? installs[id] : null;
        return publicSkill(
          skill,
          Boolean(id && fs.existsSync(path.join(dshHome, 'skills', id))),
          record?.version || '',
        );
      }).filter(Boolean),
      authenticated: Boolean(credential),
    };
  }
  async function install(payload, signal) {
    const baseUrl = currentBaseUrl();
    if (!baseUrl) throw new WorkshopError('Configure the Skill Base address before installing.');
    const skillId = normalizeSkillId(payload?.skillId);
    const credential = credentials();
    const detailResponse = await fetchWithTimeout(doFetch, apiUrl(baseUrl, `skills/${encodeURIComponent(skillId)}`), {
      method: 'GET',
      headers: authHeaders(credential?.token, { accept: 'application/json' }),
    }, signal);
    const detail = await parseJsonResponse(detailResponse);
    const version = typeof detail?.latest_version === 'string'
      ? detail.latest_version.trim().slice(0, 200)
      : '';
    if (!version) throw new WorkshopError(`Skill "${skillId}" has no installable version.`);
    const downloadResponse = await fetchWithTimeout(
      doFetch,
      apiUrl(baseUrl, `skills/${encodeURIComponent(skillId)}/versions/${encodeURIComponent(version)}/download`),
      { method: 'GET', headers: authHeaders(credential?.token, { accept: 'application/zip' }) },
      signal,
    );
    const archive = await readLimitedResponse(downloadResponse);
    const installed = installSkillArchive(archive, skillId, { dshHome });
    const registry = readJson(installRegistryPath) || {};
    registry[skillId] = { version, installedAt: new Date().toISOString() };
    writeJsonAtomically(installRegistryPath, registry);
    return {
      skillId: installed.skillId,
      installPathDisplay: installed.installPathDisplay,
      version,
    };
  }

  const handlers = {
    state: () => publicState(),
    'config/save': saveAddress,
    'auth/verify': verifyCode,
    'auth/logout': () => {
      fs.rmSync(credentialPath, { force: true });
      return publicState();
    },
    'catalog/search': search,
    install,
  };
  return {
    publicState,
    async handle(endpoint, payload, signal) {
      const handler = handlers[endpoint];
      if (!handler) return rpcFailure(new WorkshopError('Unknown Internal Skill Workshop operation.'));
      try {
        return { ok: true, value: await handler(payload, signal) };
      } catch (error) {
        return rpcFailure(error);
      }
    },
  };
}

export function apply(ctx, config = {}) {
  const connection = typeof ctx.get === 'function' ? ctx.get('connection') : ctx.connection;
  if (!connection?.rpc) return;
  const service = createWorkshopService(config);
  connection.rpc.handle(
    CHANNEL,
    (endpoint, payload, signal) => service.handle(endpoint, payload, signal),
    { authority: 'loopback' },
  );
}
