import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import AdmZip from 'adm-zip';
import {
  apply,
  createWorkshopService,
  installSkillArchive,
  normalizeBaseUrl,
} from '../index.js';

function temporaryHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'internal-skill-workshop-'));
}

function skillArchive(skillId = 'alice-writer') {
  const zip = new AdmZip();
  zip.addFile(`${skillId}/SKILL.md`, Buffer.from([
    '---',
    'name: original-name',
    'description: Writes team copy.',
    '---',
    '',
    '# Writer',
    '',
  ].join('\n')));
  zip.addFile(`${skillId}/references/guide.md`, Buffer.from('Team guide.'));
  return zip.toBuffer();
}

function traversalArchive() {
  const zip = new AdmZip();
  zip.addFile('xx/SKILL.md', Buffer.from('---\nname: x\ndescription: x\n---\n'));
  const buffer = zip.toBuffer();
  const safeName = Buffer.from('xx/SKILL.md');
  const unsafeName = Buffer.from('../SKILL.md');
  let offset = 0;
  while ((offset = buffer.indexOf(safeName, offset)) >= 0) {
    unsafeName.copy(buffer, offset);
    offset += safeName.length;
  }
  return buffer;
}

test('host URL validation rejects credentials and insecure remote servers', () => {
  assert.equal(normalizeBaseUrl('https://skills.example.com/'), 'https://skills.example.com');
  assert.equal(normalizeBaseUrl('http://127.0.0.1:8000/'), 'http://127.0.0.1:8000');
  assert.throws(() => normalizeBaseUrl('http://skills.example.com'), /HTTPS/);
  assert.throws(() => normalizeBaseUrl('https://user:token@skills.example.com'), /credentials/);
});

test('public host state never returns the saved PAT', async () => {
  const home = temporaryHome();
  const seen = [];
  const service = createWorkshopService({}, {
    dshHome: home,
    fetch: async (url, init) => {
      seen.push({ url: String(url), init });
      return Response.json({ ok: true, token: 'sk-base-secret', user: { username: 'alice' } });
    },
  });
  try {
    assert.equal((await service.handle('config/save', { baseUrl: 'https://skills.example.com' })).ok, true);
    const signedIn = await service.handle('auth/verify', { code: 'ABCD-1234' });
    assert.equal(signedIn.ok, true);
    assert.equal(signedIn.value.authenticated, true);
    assert.equal(signedIn.value.username, 'alice');
    assert.equal(JSON.stringify(signedIn).includes('sk-base-secret'), false);
    assert.equal(seen[0].init.body, JSON.stringify({ code: 'ABCD-1234' }));

    const changed = await service.handle('config/save', { baseUrl: 'https://other.example.com' });
    assert.equal(changed.ok, true);
    assert.equal(changed.value.authenticated, false);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('managed address is the default and a personal address can override it', async () => {
  const home = temporaryHome();
  const service = createWorkshopService({ baseUrl: 'https://team.skills.example.com' }, {
    dshHome: home,
  });
  try {
    assert.deepEqual(service.publicState(), {
      baseUrl: 'https://team.skills.example.com',
      managedBaseUrl: 'https://team.skills.example.com',
      hasManagedBaseUrl: true,
      authenticated: false,
      username: '',
      installRoot: '$DSH_HOME/skills',
    });

    const saved = await service.handle('config/save', {
      baseUrl: 'https://personal.skills.example.com',
    });
    assert.equal(saved.ok, true);
    assert.equal(saved.value.baseUrl, 'https://personal.skills.example.com');
    assert.equal(saved.value.managedBaseUrl, 'https://team.skills.example.com');
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('private catalog requests attach the PAT only on the host', async () => {
  const home = temporaryHome();
  const requests = [];
  const service = createWorkshopService({}, {
    dshHome: home,
    fetch: async (url, init) => {
      requests.push({ url: String(url), init });
      if (String(url).endsWith('/auth/cli-code/verify')) {
        return Response.json({ ok: true, token: 'sk-base-secret', user: { username: 'alice' } });
      }
      return Response.json({
        skills: [{
          id: 'alice-private',
          visibility: 'private',
          webhook_url: 'https://secret.example.com/hook',
          owner: { id: 42, username: 'alice', name: 'Alice' },
        }, {
          id: '../../internal-skill-workshop/credentials.json',
          name: 'Unsafe local path probe',
        }],
      });
    },
  });
  try {
    await service.handle('config/save', { baseUrl: 'https://skills.example.com' });
    await service.handle('auth/verify', { code: 'ABCD-1234' });
    const search = await service.handle('catalog/search', { query: 'private' });
    assert.equal(search.ok, true);
    assert.equal(search.value.skills[0].id, 'alice-private');
    assert.equal(search.value.skills.length, 1);
    assert.equal(Object.hasOwn(search.value.skills[0], 'webhook_url'), false);
    assert.equal(Object.hasOwn(search.value.skills[0].owner, 'id'), false);
    assert.equal(requests[1].init.headers.Authorization, 'Bearer sk-base-secret');
    assert.equal(JSON.stringify(search).includes('sk-base-secret'), false);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('catalog JSON responses are size-limited', async () => {
  const home = temporaryHome();
  const service = createWorkshopService({ baseUrl: 'https://skills.example.com' }, {
    dshHome: home,
    fetch: async () => new Response('{}', {
      headers: { 'content-length': String(6 * 1024 * 1024) },
    }),
  });
  try {
    const search = await service.handle('catalog/search', {});
    assert.equal(search.ok, false);
    assert.match(search.error.message, /5 MB limit/);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('download error responses are size-limited', async () => {
  const home = temporaryHome();
  let requestCount = 0;
  const service = createWorkshopService({ baseUrl: 'https://skills.example.com' }, {
    dshHome: home,
    fetch: async () => {
      requestCount += 1;
      if (requestCount === 1) return Response.json({ latest_version: 'v1' });
      return new Response('{}', {
        status: 500,
        headers: { 'content-length': String(6 * 1024 * 1024) },
      });
    },
  });
  try {
    const install = await service.handle('install', { skillId: 'alice-writer' });
    assert.equal(install.ok, false);
    assert.match(install.error.message, /5 MB limit/);
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('safe install writes only to the DSH user skill root and normalizes the skill name', () => {
  const home = temporaryHome();
  try {
    const result = installSkillArchive(skillArchive(), 'alice-writer', { dshHome: home });
    assert.equal(result.installPath, path.join(home, 'skills', 'alice-writer'));
    const markdown = fs.readFileSync(path.join(result.installPath, 'SKILL.md'), 'utf8');
    assert.match(markdown, /name: alice-writer/);
    assert.match(markdown, /description: Writes team copy/);
    assert.equal(fs.readFileSync(path.join(result.installPath, 'references/guide.md'), 'utf8'), 'Team guide.');
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('safe install refuses traversal, mismatched roots, and existing destinations', () => {
  const home = temporaryHome();
  try {
    assert.throws(
      () => installSkillArchive(traversalArchive(), 'alice-writer', { dshHome: home }),
      /unsafe path/,
    );

    const mixed = new AdmZip();
    mixed.addFile('alice-writer/SKILL.md', Buffer.from('---\nname: x\ndescription: x\n---\n'));
    mixed.addFile('outside.txt', Buffer.from('outside'));
    assert.throws(
      () => installSkillArchive(mixed.toBuffer(), 'alice-writer', { dshHome: home }),
      /inside the Skill directory/,
    );

    installSkillArchive(skillArchive(), 'alice-writer', { dshHome: home });
    assert.throws(
      () => installSkillArchive(skillArchive(), 'alice-writer', { dshHome: home }),
      /already installed/,
    );
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('plugin registers a loopback-only host RPC channel', () => {
  const registered = [];
  apply({
    get: () => ({
      rpc: {
        handle(channel, handler, options) {
          registered.push({ channel, handler, options });
        },
      },
    }),
  });
  assert.equal(registered[0].channel, '/internal-skill-workshop');
  assert.deepEqual(registered[0].options, { authority: 'loopback' });
});
