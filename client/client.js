window.__ModuleLoader__.load({
  id: 'internal-skill-workshop',
  factory: (require) => {
    var module = { exports: {} };
    var exports = module.exports;
    Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
    let React;

    const STORAGE_KEY = 'internal-skill-workshop.base-url';
    const STYLE_ID = 'internal-skill-workshop-styles';
    const NS = 'internal-skill-workshop';

    const zh = {
      nav: 'Internal Skill Workshop',
      heading: 'Internal Skill Workshop',
      intro: 'Browse skills published to a configured Skill Base server.',
      baseUrl: 'Skill Base address',
      baseUrlPlaceholder: 'https://skills.example.com',
      baseUrlHint: 'Only public Skill metadata is read. Sign in and manage files in Skill Base.',
      save: 'Save',
      saved: 'Address saved.',
      search: 'Search skills',
      searchPlaceholder: 'Name or description',
      searchAction: 'Search',
      loading: 'Loading skills...',
      configureFirst: 'Enter a Skill Base address to start browsing.',
      noResults: 'No matching skills were found.',
      results: 'skills found',
      detail: 'Skill details',
      chooseSkill: 'Select a skill to view its details.',
      description: 'Description',
      author: 'Author',
      version: 'Latest version',
      type: 'Type',
      tools: 'Compatible tools',
      tags: 'Tags',
      open: 'Open in Skill Base',
      invalidUrl: 'Use an http(s) address without credentials or query parameters.',
      insecureUrl: 'Use HTTPS for remote Skill Base servers. HTTP is allowed only for localhost development.',
      requestFailed: 'Skill Base could not be reached.',
      invalidResponse: 'Skill Base returned an unexpected response.',
      publicOnly: 'Public catalog view',
    };

    const en = {
      nav: 'Internal Skill Workshop',
      heading: 'Internal Skill Workshop',
      intro: 'Browse skills published to a configured Skill Base server.',
      baseUrl: 'Skill Base address',
      baseUrlPlaceholder: 'https://skills.example.com',
      baseUrlHint: 'Only public Skill metadata is read. Sign in and manage files in Skill Base.',
      save: 'Save',
      saved: 'Address saved.',
      search: 'Search skills',
      searchPlaceholder: 'Name or description',
      searchAction: 'Search',
      loading: 'Loading skills...',
      configureFirst: 'Enter a Skill Base address to start browsing.',
      noResults: 'No matching skills were found.',
      results: 'skills found',
      detail: 'Skill details',
      chooseSkill: 'Select a skill to view its details.',
      description: 'Description',
      author: 'Author',
      version: 'Latest version',
      type: 'Type',
      tools: 'Compatible tools',
      tags: 'Tags',
      open: 'Open in Skill Base',
      invalidUrl: 'Use an http(s) address without credentials or query parameters.',
      insecureUrl: 'Use HTTPS for remote Skill Base servers. HTTP is allowed only for localhost development.',
      requestFailed: 'Skill Base could not be reached.',
      invalidResponse: 'Skill Base returned an unexpected response.',
      publicOnly: 'Public catalog view',
    };

    function readStoredBaseUrl() {
      try {
        return globalThis.localStorage?.getItem(STORAGE_KEY) || '';
      } catch {
        return '';
      }
    }

    function writeStoredBaseUrl(value) {
      try {
        globalThis.localStorage?.setItem(STORAGE_KEY, value);
      } catch {
        // Restricted webviews may not expose storage.
      }
    }

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

    function normalizeSkill(value) {
      if (!value || typeof value !== 'object' || typeof value.id !== 'string') return null;
      const skill = value;
      return {
        id: skill.id,
        name: typeof skill.name === 'string' && skill.name ? skill.name : skill.id,
        description: typeof skill.description === 'string' ? skill.description : '',
        latestVersion: typeof skill.latest_version === 'string' ? skill.latest_version : '',
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

      let payload;
      try {
        payload = await response.json();
      } catch {
        throw new Error('Skill Base returned an unexpected response.');
      }
      if (!payload || !Array.isArray(payload.skills)) {
        throw new Error('Skill Base returned an unexpected response.');
      }
      return payload.skills.map(normalizeSkill).filter(Boolean);
    }

    function ensureStyles() {
      if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
      const style = document.createElement('style');
      style.id = STYLE_ID;
      style.textContent = `
        .iws-root { box-sizing: border-box; max-width: 980px; color: var(--dsw-alias-label-primary, #202124); font-size: 14px; line-height: 1.5; }
        .iws-root *, .iws-root *::before, .iws-root *::after { box-sizing: border-box; }
        .iws-header { border-bottom: 1px solid var(--dsw-alias-border-l2, #e4e6eb); padding: 0 0 18px; }
        .iws-heading { margin: 0; font-size: 20px; font-weight: 600; line-height: 28px; }
        .iws-intro { color: var(--dsw-alias-label-secondary, #5f6368); margin: 5px 0 0; }
        .iws-form { display: flex; flex-direction: column; gap: 8px; margin: 20px 0 0; }
        .iws-label { color: var(--dsw-alias-label-primary, #202124); font-size: 13px; font-weight: 600; }
        .iws-control-row { display: flex; gap: 8px; align-items: stretch; }
        .iws-input { min-width: 0; flex: 1; height: 36px; border: 1px solid var(--dsw-alias-border-l2, #d9dce1); border-radius: 7px; background: var(--dsw-alias-bg-base, #fff); color: inherit; font: inherit; padding: 0 11px; }
        .iws-input:focus { border-color: var(--dsw-alias-brand-primary, #246bfe); outline: 2px solid color-mix(in srgb, var(--dsw-alias-brand-primary, #246bfe) 22%, transparent); outline-offset: 0; }
        .iws-button { min-height: 36px; border: 1px solid var(--dsw-alias-border-l2, #d9dce1); border-radius: 7px; background: var(--dsw-alias-bg-base, #fff); color: inherit; cursor: pointer; font: inherit; font-weight: 600; padding: 0 14px; }
        .iws-button:hover { background: var(--dsw-alias-interactive-bg-hover, #f3f5f8); }
        .iws-button:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary, #246bfe); outline-offset: 2px; }
        .iws-button:disabled { cursor: default; opacity: .55; }
        .iws-primary { border-color: var(--dsw-alias-brand-primary, #246bfe); background: var(--dsw-alias-brand-primary, #246bfe); color: #fff; }
        .iws-primary:hover { background: color-mix(in srgb, var(--dsw-alias-brand-primary, #246bfe) 86%, #000); }
        .iws-hint { color: var(--dsw-alias-label-tertiary, #8a8f98); margin: 0; font-size: 12px; }
        .iws-search { border-top: 1px solid var(--dsw-alias-border-l2, #e4e6eb); display: flex; gap: 8px; margin-top: 20px; padding-top: 20px; }
        .iws-status { border-radius: 7px; margin-top: 12px; padding: 9px 11px; }
        .iws-status-info { background: var(--dsw-alias-bg-module-platform, #f3f5f8); color: var(--dsw-alias-label-secondary, #5f6368); }
        .iws-status-error { background: color-mix(in srgb, #d93025 12%, transparent); color: var(--dsw-alias-state-error-primary, #b3261e); }
        .iws-status-success { background: color-mix(in srgb, #188038 12%, transparent); color: var(--dsw-alias-label-primary, #202124); }
        .iws-workspace { display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(280px, .95fr); gap: 16px; margin-top: 20px; }
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
        .iws-open { display: inline-flex; margin-top: 14px; text-decoration: none; }
        .iws-footnote { color: var(--dsw-alias-label-tertiary, #8a8f98); font-size: 12px; margin: 20px 0 0; }
        @media (max-width: 720px) { .iws-workspace { grid-template-columns: 1fr; } .iws-detail { border-left: 0; border-top: 1px solid var(--dsw-alias-border-l2, #e4e6eb); padding: 16px 0 0; } }
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

    function SkillCard({ skill, selected, onSelect }) {
      return React.createElement('button', {
        className: 'iws-skill',
        type: 'button',
        'aria-pressed': selected,
        onClick: () => onSelect(skill.id),
      }, [
        React.createElement('span', { className: 'iws-skill-name', key: 'name' }, skill.name),
        React.createElement('span', { className: 'iws-skill-description', key: 'description' }, displayText(skill.description)),
        React.createElement('span', { className: 'iws-meta', key: 'meta' }, [
          skill.skillType ? React.createElement('span', { key: 'type' }, skill.skillType) : null,
          skill.latestVersion ? React.createElement('span', { key: 'version' }, skill.latestVersion) : null,
          skill.author ? React.createElement('span', { key: 'author' }, skill.author) : null,
        ]),
      ]);
    }

    function SkillDetails({ skill, baseUrl, t }) {
      if (!skill) {
        return React.createElement('div', { className: 'iws-empty' }, t('chooseSkill'));
      }
      return React.createElement('div', { className: 'iws-detail-panel' }, [
        React.createElement('h3', { className: 'iws-detail-name', key: 'name' }, skill.name),
        React.createElement('p', { className: 'iws-detail-description', key: 'description' }, displayText(skill.description)),
        React.createElement(Field, { label: t('author'), value: skill.author, key: 'author' }),
        React.createElement(Field, { label: t('version'), value: skill.latestVersion, key: 'version' }),
        React.createElement(Field, { label: t('type'), value: skill.skillType, key: 'type' }),
        React.createElement(Field, { label: t('tools'), value: skill.compatibleTools.join(', '), key: 'tools' }),
        React.createElement(Field, { label: t('tags'), key: 'tags' }, React.createElement('div', { className: 'iws-tags' }, skill.tags.length > 0
          ? skill.tags.map((tag) => React.createElement('span', { className: 'iws-tag', key: tag }, tag))
          : displayText('')),
        ),
        React.createElement('a', {
          className: 'iws-button iws-primary iws-open',
          href: buildSkillPageUrl(baseUrl, skill.id),
          target: '_blank',
          rel: 'noreferrer',
        }, t('open')),
      ]);
    }

    function WorkshopSection({ t: translate }) {
      const t = typeof translate === 'function' ? translate : (key) => key;
      const [baseUrlInput, setBaseUrlInput] = React.useState(readStoredBaseUrl());
      const [baseUrl, setBaseUrl] = React.useState(() => {
        try {
          return normalizeBaseUrl(readStoredBaseUrl());
        } catch {
          return '';
        }
      });
      const [query, setQuery] = React.useState('');
      const [skills, setSkills] = React.useState([]);
      const [selectedId, setSelectedId] = React.useState(null);
      const [status, setStatus] = React.useState({ kind: 'idle', message: '' });
      const [loading, setLoading] = React.useState(false);
      const controllerRef = React.useRef(null);

      React.useEffect(() => () => controllerRef.current?.abort(), []);

      function saveAddress(event) {
        event.preventDefault();
        try {
          const normalized = normalizeBaseUrl(baseUrlInput);
          writeStoredBaseUrl(normalized);
          setBaseUrl(normalized);
          setSkills([]);
          setSelectedId(null);
          setStatus({ kind: 'success', message: t('saved') });
        } catch (error) {
          setStatus({ kind: 'error', message: error.message === 'A Skill Base address is required.' ? t('invalidUrl') : error.message });
        }
      }

      async function search(event) {
        event.preventDefault();
        let normalized;
        try {
          normalized = normalizeBaseUrl(baseUrlInput || baseUrl);
        } catch (error) {
          setStatus({ kind: 'error', message: error.message === 'A Skill Base address is required.' ? t('invalidUrl') : error.message });
          return;
        }

        writeStoredBaseUrl(normalized);
        setBaseUrl(normalized);
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        setLoading(true);
        setStatus({ kind: 'info', message: t('loading') });
        try {
          const nextSkills = await fetchSkills(normalized, query, controller.signal);
          setSkills(nextSkills);
          setSelectedId((current) => nextSkills.some((skill) => skill.id === current) ? current : null);
          setStatus({ kind: 'success', message: `${nextSkills.length} ${t('results')}` });
        } catch (error) {
          if (error?.name === 'AbortError') return;
          setSkills([]);
          setSelectedId(null);
          setStatus({ kind: 'error', message: error.message.startsWith('Skill Base returned HTTP') ? t('requestFailed') : error.message });
        } finally {
          if (controllerRef.current === controller) {
            controllerRef.current = null;
            setLoading(false);
          }
        }
      }

      const selected = skills.find((skill) => skill.id === selectedId) || null;
      const statusNode = status.message
        ? React.createElement('div', { className: `iws-status iws-status-${status.kind}`, role: status.kind === 'error' ? 'alert' : 'status' }, status.message)
        : null;

      return React.createElement('section', { className: 'iws-root' }, [
        React.createElement('header', { className: 'iws-header', key: 'header' }, [
          React.createElement('h2', { className: 'iws-heading', key: 'heading' }, t('heading')),
          React.createElement('p', { className: 'iws-intro', key: 'intro' }, t('intro')),
        ]),
        React.createElement('form', { className: 'iws-form', onSubmit: saveAddress, key: 'config' }, [
          React.createElement('label', { className: 'iws-label', htmlFor: 'iws-base-url', key: 'label' }, t('baseUrl')),
          React.createElement('div', { className: 'iws-control-row', key: 'controls' }, [
            React.createElement('input', {
              className: 'iws-input',
              id: 'iws-base-url',
              type: 'url',
              value: baseUrlInput,
              placeholder: t('baseUrlPlaceholder'),
              onChange: (event) => setBaseUrlInput(event.target.value),
              key: 'input',
            }),
            React.createElement('button', { className: 'iws-button', type: 'submit', key: 'save' }, t('save')),
          ]),
          React.createElement('p', { className: 'iws-hint', key: 'hint' }, t('baseUrlHint')),
        ]),
        React.createElement('form', { className: 'iws-search', onSubmit: search, key: 'search' }, [
          React.createElement('input', {
            className: 'iws-input',
            type: 'search',
            value: query,
            placeholder: t('searchPlaceholder'),
            'aria-label': t('search'),
            onChange: (event) => setQuery(event.target.value),
            key: 'input',
          }),
          React.createElement('button', { className: 'iws-button iws-primary', type: 'submit', disabled: loading, key: 'button' }, t('searchAction')),
        ]),
        statusNode,
        React.createElement('div', { className: 'iws-workspace', key: 'workspace' }, [
          React.createElement('div', { className: 'iws-results', key: 'results' }, [
            React.createElement('div', { className: 'iws-results-head', key: 'head' }, [
              React.createElement('h3', { className: 'iws-section-title', key: 'title' }, t('search')),
              skills.length > 0 ? React.createElement('span', { className: 'iws-count', key: 'count' }, `${skills.length} ${t('results')}`) : null,
            ]),
            !baseUrl && skills.length === 0
              ? React.createElement('div', { className: 'iws-empty', key: 'empty' }, t('configureFirst'))
              : baseUrl && !loading && skills.length === 0
                ? React.createElement('div', { className: 'iws-empty', key: 'empty' }, t('noResults'))
                : React.createElement('div', { className: 'iws-list', key: 'list' }, skills.map((skill) => React.createElement(SkillCard, {
                  skill,
                  selected: skill.id === selectedId,
                  onSelect: setSelectedId,
                  key: skill.id,
                }))),
          ]),
          React.createElement('aside', { className: 'iws-detail', 'aria-label': t('detail'), key: 'detail' }, [
            React.createElement('h3', { className: 'iws-section-title', key: 'title' }, t('detail')),
            React.createElement(SkillDetails, { skill: selected, baseUrl, t, key: 'panel' }),
          ]),
        ]),
        React.createElement('p', { className: 'iws-footnote', key: 'footnote' }, t('publicOnly')),
      ]);
    }

    function apply(ctx) {
      const slots = typeof ctx.get === 'function' ? ctx.get('slots') : ctx.slots;
      const locale = typeof ctx.get === 'function' ? ctx.get('locale') : ctx.locale;
      if (!slots || !locale) return;

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
        inject: () => ({ t }),
      }, (props) => React.createElement(WorkshopSection, props)));
    }

    const inject = ['slots', 'locale'];

    module.exports = {
      name: NS,
      inject,
      apply,
      normalizeBaseUrl,
      buildSkillsUrl,
      buildSkillPageUrl,
      normalizeSkill,
      fetchSkills,
    };

    return module.exports;
  }
});
