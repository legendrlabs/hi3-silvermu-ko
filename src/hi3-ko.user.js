// ==UserScript==
// @name         silvermu HI3 한국어 패치
// @namespace    https://github.com/legendrlabs/hi3-silvermu-ko
// @version      0.2.1
// @description  silvermu.top 붕괴3rd 데이터베이스의 비공식 한국어 번역 레이어 + 미번역/리소스 진단 도구입니다.
// @author       Community
// @match        https://silvermu.top/database/hi3.html*
// @run-at       document-idle
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @license      MIT
// @homepageURL  https://github.com/legendrlabs/hi3-silvermu-ko
// @supportURL   https://github.com/legendrlabs/hi3-silvermu-ko/issues
// @downloadURL  https://raw.githubusercontent.com/legendrlabs/hi3-silvermu-ko/main/src/hi3-ko.user.js
// @updateURL    https://raw.githubusercontent.com/legendrlabs/hi3-silvermu-ko/main/src/hi3-ko.user.js
// ==/UserScript==

(() => {
  'use strict';

  const VERSION = '0.2.1';
  const STORAGE_KEY = 'silvermu-hi3-ko-enabled';
  const BADGE_ID = 'silvermu-hi3-ko-badge';
  const HAN_RE = /[\u3400-\u9FFF]/u;
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA']);
  const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];

  /**
   * 번역 원칙
   * 1. 확인 가능한 UI 문구는 정확 일치로 치환한다.
   * 2. 게임 고유명사는 공식 한국어 명칭을 확인한 뒤 별도 PR로 추가한다.
   * 3. 번역을 모르는 문자열은 원문을 그대로 둔다. 자동 추측 번역은 하지 않는다.
   */
  const EXACT = new Map([
    ['数据库', '데이터베이스'],
    ['游戏资料库', '게임 자료실'],
    ['正式服', '정식 서버'],
    ['测试服', '테스트 서버'],
    ['详情', '상세 정보'],
    ['搜索', '검색'],
    ['搜索名称…', '이름 검색…'],
    ['搜索名称...', '이름 검색...'],
    ['越新的越靠前展示', '최신 데이터부터 표시'],
    ['区分 正式服 与 测试服', '정식 서버와 테스트 서버를 구분'],
    ['加载中', '불러오는 중'],
    ['加载中…', '불러오는 중…'],
    ['暂无数据', '데이터 없음'],
    ['无数据', '데이터 없음'],
    ['全部', '전체'],
    ['名称', '이름'],
    ['类型', '유형'],
    ['版本', '버전'],
    ['角色', '캐릭터'],
    ['武器', '무기'],
    ['圣痕', '성흔'],
    ['技能', '스킬'],
    ['装备', '장비'],
    ['敌人', '적'],
    ['属性', '속성'],
    ['稀有度', '희귀도'],
    ['星级', '성급'],
    ['等级', '레벨'],
    ['攻击', '공격'],
    ['防御', '방어'],
    ['生命', '생명'],
    ['会心', '회심'],
    ['效果', '효과'],
    ['介绍', '소개'],
    ['说明', '설명'],
    ['来源', '출처'],
    ['推荐', '추천'],
    ['获取方式', '획득 방법'],
    ['上线时间', '출시일'],
    ['更新时间', '업데이트 시간'],
    ['关闭', '닫기'],
    ['返回', '뒤로'],
    ['确认', '확인'],
    ['取消', '취소'],
  ]);

  const PHRASES = [
    ['数据库 · 沐柏白的游戏博客', '데이터베이스 · 沐柏白의 게임 블로그'],
    ['游戏资料库 · 区分 正式服 与 测试服 · 越新的越靠前展示',
      '게임 자료실 · 정식 서버/테스트 서버 구분 · 최신 데이터부터 표시'],
  ];

  function enabled() {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === null ? true : value === '1';
  }

  function setEnabled(value) {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    location.reload();
  }

  function normalizeText(value) {
    return String(value ?? '').replace(/\s+/g, ' ').trim();
  }

  function translateString(input) {
    if (!input || typeof input !== 'string') return input;

    const leading = input.match(/^\s*/)?.[0] ?? '';
    const trailing = input.match(/\s*$/)?.[0] ?? '';
    const core = input.slice(leading.length, input.length - trailing.length);

    if (EXACT.has(core)) return leading + EXACT.get(core) + trailing;

    let out = core;
    for (const [from, to] of PHRASES) out = out.split(from).join(to);
    return leading + out + trailing;
  }

  function translateTextNode(node) {
    if (!node || node.nodeType !== Node.TEXT_NODE) return;
    const parent = node.parentElement;
    if (!parent || SKIP_TAGS.has(parent.tagName)) return;
    const next = translateString(node.nodeValue);
    if (next !== node.nodeValue) node.nodeValue = next;
  }

  function translateElement(el) {
    if (!(el instanceof Element)) return;

    for (const attr of ATTRS) {
      if (!el.hasAttribute(attr)) continue;
      const before = el.getAttribute(attr);
      const after = translateString(before);
      if (after !== before) el.setAttribute(attr, after);
    }

    if (el instanceof HTMLInputElement && ['button', 'submit', 'reset'].includes(el.type)) {
      const next = translateString(el.value);
      if (next !== el.value) el.value = next;
    }

    for (const child of el.childNodes) {
      if (child.nodeType === Node.TEXT_NODE) translateTextNode(child);
    }
  }

  function translateTree(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      translateTextNode(root);
      return;
    }
    if (!(root instanceof Element) && root !== document) return;

    if (root instanceof Element) translateElement(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) translateTextNode(node);
      else translateElement(node);
    }
  }

  function collectUntranslatedStrings() {
    const counts = new Map();

    function add(value) {
      const text = normalizeText(value);
      if (!text || !HAN_RE.test(text)) return;
      counts.set(text, (counts.get(text) || 0) + 1);
    }

    const root = document.documentElement;
    if (!root) return [];

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) {
        const parent = node.parentElement;
        if (parent && !SKIP_TAGS.has(parent.tagName)) add(node.nodeValue);
        continue;
      }

      const el = node;
      if (!(el instanceof Element) || SKIP_TAGS.has(el.tagName)) continue;
      for (const attr of ATTRS) {
        if (el.hasAttribute(attr)) add(el.getAttribute(attr));
      }
      if (el instanceof HTMLInputElement && ['button', 'submit', 'reset'].includes(el.type)) add(el.value);
    }

    return [...counts.entries()]
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count || a.text.localeCompare(b.text, 'zh-CN'));
  }

  function sanitizeUrl(raw) {
    try {
      const url = new URL(raw, location.href);
      const keys = [...new Set([...url.searchParams.keys()])];
      url.search = keys.length
        ? '?' + keys.map((key) => encodeURIComponent(key) + '=<redacted>').join('&')
        : '';
      url.hash = '';
      return url.href;
    } catch {
      return String(raw).split('#')[0].split('?')[0];
    }
  }

  function collectResources() {
    const rows = new Map();

    function add(type, rawUrl) {
      if (!rawUrl) return;
      const url = sanitizeUrl(rawUrl);
      const key = type + '|' + url;
      if (!rows.has(key)) rows.set(key, { type, url });
    }

    for (const entry of performance.getEntriesByType('resource')) {
      const type = entry.initiatorType || 'resource';
      const name = entry.name || '';
      if (
        ['script', 'fetch', 'xmlhttprequest', 'link'].includes(type) ||
        /\.(?:js|mjs|json)(?:[?#]|$)/i.test(name) ||
        /(?:api|data|database|hi3)/i.test(name)
      ) {
        add(type, name);
      }
    }

    document.querySelectorAll('script[src]').forEach((el) => add('script', el.src));
    document.querySelectorAll('link[href]').forEach((el) => {
      const rel = (el.getAttribute('rel') || '').toLowerCase();
      if (rel.includes('stylesheet') || rel.includes('preload') || rel.includes('modulepreload')) {
        add('link', el.href);
      }
    });

    return [...rows.values()].sort((a, b) => a.type.localeCompare(b.type) || a.url.localeCompare(b.url));
  }

  function buildDiagnosticReport() {
    const untranslated = collectUntranslatedStrings();
    const resources = collectResources();
    const lines = [
      '# silvermu HI3 KO diagnostic',
      'version: ' + VERSION,
      'page: ' + location.href,
      'generated_at: ' + new Date().toISOString(),
      '',
      '## UNTRANSLATED_HAN_STRINGS (' + untranslated.length + ')',
    ];

    if (!untranslated.length) lines.push('(none)');
    for (const item of untranslated.slice(0, 500)) {
      lines.push('[' + item.count + '] ' + item.text.slice(0, 1000));
    }
    if (untranslated.length > 500) lines.push('... +' + (untranslated.length - 500) + ' more');

    lines.push('', '## RESOURCE_URLS (' + resources.length + ')');
    if (!resources.length) lines.push('(none)');
    for (const item of resources.slice(0, 500)) {
      lines.push('[' + item.type + '] ' + item.url);
    }
    if (resources.length > 500) lines.push('... +' + (resources.length - 500) + ' more');

    return {
      text: lines.join('\n'),
      untranslatedCount: untranslated.length,
      resourceCount: resources.length,
    };
  }

  async function copyText(text) {
    if (typeof GM_setClipboard === 'function') {
      GM_setClipboard(text, 'text');
      return true;
    }
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    return false;
  }

  async function copyDiagnosticReport() {
    const report = buildDiagnosticReport();
    try {
      const copied = await copyText(report.text);
      if (!copied) {
        window.prompt('아래 진단 보고서를 복사해서 GitHub Issue 또는 ChatGPT에 붙여넣어 주세요.', report.text);
        return;
      }
      window.alert(
        '진단 보고서를 클립보드에 복사했습니다.\n' +
        '미번역 중국어: ' + report.untranslatedCount + '개\n' +
        '관련 리소스: ' + report.resourceCount + '개\n\n' +
        '이 내용을 ChatGPT에 그대로 붙여넣어 주세요.'
      );
    } catch (error) {
      console.error('[silvermu-hi3-ko] diagnostic copy failed', error);
      window.prompt('자동 복사에 실패했습니다. 아래 내용을 수동으로 복사해 주세요.', report.text);
    }
  }

  async function copyUntranslatedOnly() {
    const rows = collectUntranslatedStrings();
    const text = rows.map((item) => '[' + item.count + '] ' + item.text).join('\n') || '(none)';
    try {
      const copied = await copyText(text);
      if (copied) window.alert('미번역 중국어 목록 ' + rows.length + '개를 복사했습니다.');
      else window.prompt('미번역 중국어 목록', text);
    } catch {
      window.prompt('미번역 중국어 목록', text);
    }
  }

  function addBadge() {
    if (document.getElementById(BADGE_ID)) return;
    const badge = document.createElement('button');
    badge.id = BADGE_ID;
    badge.type = 'button';
    badge.textContent = 'KO';
    badge.title = '한국어 패치 v' + VERSION + ' · 클릭: 원문으로 전환 · 우클릭: 진단 보고서 복사';
    Object.assign(badge.style, {
      position: 'fixed',
      right: '14px',
      bottom: '14px',
      zIndex: '2147483647',
      minWidth: '42px',
      height: '32px',
      padding: '0 10px',
      border: '1px solid currentColor',
      borderRadius: '999px',
      background: 'Canvas',
      color: 'CanvasText',
      font: '600 13px/1 system-ui, sans-serif',
      cursor: 'pointer',
      opacity: '0.88',
    });
    badge.addEventListener('click', () => setEnabled(false));
    badge.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      void copyDiagnosticReport();
    });
    document.documentElement.appendChild(badge);
  }

  function activateTranslation() {
    const root = document.documentElement || document;
    translateTree(root);

    const observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === 'characterData') translateTextNode(record.target);
        if (record.type === 'attributes') translateElement(record.target);
        for (const node of record.addedNodes) translateTree(node);
      }
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: ATTRS,
    });

    addBadge();
  }

  function start() {
    if (!enabled()) return;

    // 원본 앱 초기화와 충돌하지 않도록 페이지 로드 이후에 번역 레이어를 시작한다.
    const boot = () => window.setTimeout(activateTranslation, 800);

    if (document.readyState === 'complete') boot();
    else window.addEventListener('load', boot, { once: true });
  }

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('한국어 패치 켜기', () => setEnabled(true));
    GM_registerMenuCommand('한국어 패치 끄기', () => setEnabled(false));
    GM_registerMenuCommand('진단 보고서 복사', () => void copyDiagnosticReport());
    GM_registerMenuCommand('미번역 중국어만 복사', () => void copyUntranslatedOnly());
  }

  start();
})();
