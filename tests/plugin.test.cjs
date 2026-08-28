const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');
const test = require('node:test');

const packageDir = join(__dirname, '..');
const manifest = require(join(packageDir, 'package.json'));
const client = require(join(packageDir, 'src/client/index.cjs'));

test('declares an installable DSH bundle and web client', () => {
  assert.equal(manifest.name, 'internal-skill-workshop');
  assert.equal(
    manifest.repository.url,
    'git+https://github.com/Olina1Ye/internal-skill-workshop-plugin.git',
  );
  assert.equal(
    manifest.homepage,
    'https://github.com/Olina1Ye/internal-skill-workshop-plugin#readme',
  );
  assert.equal(manifest.dsh.bundle.patch, './cordis.patch.yml');
  assert.equal(manifest.dsh.client.platform, 'web');
  assert.deepEqual(manifest.dsh.client.inject, [
    '@deepseek-ai/dsh-client-runtime',
    '@deepseek-ai/dsh-client-locale',
    '@deepseek-ai/dsh-client-ui-settings',
  ]);
  assert.match(readFileSync(join(packageDir, 'cordis.patch.yml'), 'utf8'), /name:\s+internal-skill-workshop/);
});

test('documents post-install usage and keeps translation credentials server-side', () => {
  const readme = readFileSync(join(packageDir, 'README.md'), 'utf8');

  assert.match(readme, /dsh plugin --profile web add internal-skill-workshop/);
  assert.match(readme, /Settings.*Internal Skill Workshop/s);
  assert.match(readme, /does not require an API key/i);
  assert.match(readme, /CLOUDFLARE_ACCOUNT_ID/);
  assert.match(readme, /CLOUDFLARE_API_TOKEN/);
  assert.match(readme, /server\s+process or container/i);
});

test('normalizes public and localhost Skill Base addresses', () => {
  assert.equal(client.normalizeBaseUrl('https://skills.example.com/'), 'https://skills.example.com');
  assert.equal(client.normalizeBaseUrl('http://localhost:8000/'), 'http://localhost:8000');
  assert.equal(client.normalizeBaseUrl('http://127.0.0.1:8000/base/'), 'http://127.0.0.1:8000/base');
});

test('rejects unsafe or ambiguous Skill Base addresses', () => {
  for (const value of [
    '',
    'skills.example.com',
    'ftp://skills.example.com',
    'http://skills.example.com',
    'https://user:secret@skills.example.com',
    'https://skills.example.com?token=secret',
    'https://skills.example.com#fragment',
  ]) {
    assert.throws(() => client.normalizeBaseUrl(value));
  }
});

test('builds the public Skill Base API and detail URLs', () => {
  assert.equal(
    client.buildSkillsUrl('https://skills.example.com', 'vue guide'),
    'https://skills.example.com/api/v1/skills?q=vue+guide',
  );
  assert.equal(
    client.buildSkillsUrl('https://skills.example.com/base', 'vue'),
    'https://skills.example.com/base/api/v1/skills?q=vue',
  );
  assert.equal(
    client.buildSkillPageUrl('https://skills.example.com', 'alice-writer'),
    'https://skills.example.com/skills/alice-writer',
  );
});

test('normalizes only the public skill fields rendered by the UI', () => {
  assert.deepEqual(client.normalizeSkill({
    id: 'alice-writer',
    name: 'Writer',
    description: 'Writes copy.',
    latest_version: 'v20260826.120000',
    skill_type: 'content-creation',
    compatible_tools: ['codex'],
    tags: [{ name: 'copywriting' }, '中文'],
    owner: { name: 'Alice', username: 'alice' },
    webhook_url: 'https://secret.example.com',
  }), {
    id: 'alice-writer',
    name: 'Writer',
    description: 'Writes copy.',
    latestVersion: 'v20260826.120000',
    skillType: 'content-creation',
    compatibleTools: ['codex'],
    tags: ['copywriting', '中文'],
    author: 'Alice',
  });
  assert.equal(client.normalizeSkill({ name: 'missing id' }), null);
});

test('build output registers the client module with DSH', () => {
  const builtPath = join(packageDir, 'client/client.js');
  const built = readFileSync(builtPath, 'utf8');
  assert.match(built, /window\.__ModuleLoader__\.load/);
  assert.match(built, /id: 'internal-skill-workshop'/);
  assert.match(built, /settings\.section/);
});
