// ==UserScript==
// @name         silvermu HI3 한국어 패치
// @namespace    https://github.com/whtjddlfcjswo1-cloud/hi3-silvermu-ko
// @version      0.1.0
// @description  silvermu.top 붕괴3rd 데이터베이스의 비공식 한국어 번역 레이어입니다.
// @author       Community
// @match        https://silvermu.top/database/hi3.html*
// @run-at       document-start
// @grant        GM_registerMenuCommand
// @license      MIT
// @homepageURL  https://github.com/whtjddlfcjswo1-cloud/hi3-silvermu-ko
// @supportURL   https://github.com/whtjddlfcjswo1-cloud/hi3-silvermu-ko/issues
// @downloadURL  https://raw.githubusercontent.com/whtjddlfcjswo1-cloud/hi3-silvermu-ko/main/src/hi3-ko.user.js
// @updateURL    https://raw.githubusercontent.com/whtjddlfcjswo1-cloud/hi3-silvermu-ko/main/src/hi3-ko.user.js
// ==/UserScript==

(() => {
  'use strict';

  const STORAGE_KEY = 'silvermu-hi3-ko-enabled';
  const BADGE_ID = 'silvermu-hi3-ko-badge';

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
    ['搜索名称…', '이름 검색…'],
    ['搜索名称...', '이름 검색...'],
    ['越新的越靠前展示', '최신 데이터부터 표시'],
    ['区分 正式服 与 测试服', '정식 서버와 테스트 서버를 구분'],
    ['加载中', '불러오는 중'],
    ['加载中…', '불러오는 중…'],
    ['暂无数据', '데이터 없음'],
    ['名称', '이름'],
    ['类型', '유형'],
    ['版本', '버전'],
    ['角色', '캐릭터'],
    ['武器', '무기'],
    ['圣痕', '성흔'],
    ['技能', '스킬'],
    ['敌人', '적'],
    ['属性', '속성'],
    ['稀有度', '희귀도'],
    ['获取方式', '획득 방법'],
    ['上线时间', '출시일'],
    ['关闭', '닫기'],
  ]);

  const PHRASES = [
    ['游戏资料库 · 区分 正式服 与 测试服 · 越新的越靠前展示',
      '게임 자료실 · 정식 서버/테스트 서버 구분 · 최신 데이터부터 표시'],
  ];

  const ATTRS = ['placeholder', 'title', 'aria-label'];

  function enabled() {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === null ? true : value === '1';
  }

  function setEnabled(value) {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    location.reload();
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
    if (!parent || ['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA'].includes(parent.tagName)) return;
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

  function addBadge() {
    if (document.getElementById(BADGE_ID)) return;
    const badge = document.createElement('button');
    badge.id = BADGE_ID;
    badge.type = 'button';
    badge.textContent = 'KO';
    badge.title = 'silvermu HI3 한국어 패치 사용 중 · 클릭하면 원문으로 전환';
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
    document.documentElement.appendChild(badge);
  }

  function start() {
    if (!enabled()) return;

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

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        translateTree(document.body);
        addBadge();
      }, { once: true });
    } else {
      translateTree(document.body);
      addBadge();
    }
  }

  if (typeof GM_registerMenuCommand === 'function') {
    GM_registerMenuCommand('한국어 패치 켜기', () => setEnabled(true));
    GM_registerMenuCommand('한국어 패치 끄기', () => setEnabled(false));
  }

  start();
})();
