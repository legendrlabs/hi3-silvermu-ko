// ==UserScript==
// @name         silvermu HI3 한국어 패치
// @namespace    https://github.com/legendrlabs/hi3-silvermu-ko
// @version      0.5.0
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
// @updateURL    https://raw.githubusercontent.com/legendrlabs/hi3-silvermu-ko/main/src/hi3-ko.meta.js
// ==/UserScript==

(() => {
  'use strict';

  const VERSION = '0.5.0';
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
    ['崩坏3', '붕괴3rd'],
    ['崩坏3资料站', '붕괴3rd 자료실'],
    ['崩坏3资料站 · 沐柏白的游戏博客', '붕괴3rd 자료실 · 沐柏白의 게임 블로그'],
    ['排版设置', '표시 설정'],
    ['字体与排版设置', '글꼴 및 표시 설정'],
    ['字体大小', '글자 크기'],
    ['行间距', '줄 간격'],
    ['恢复默认', '기본값 복원'],
    ['回到顶部', '맨 위로'],
    ['减小行距', '줄 간격 줄이기'],
    ['增大行距', '줄 간격 늘리기'],
    ['减小字体', '글자 크기 줄이기'],
    ['增大字体', '글자 크기 늘리기'],
    ['切换深色 / 白夜模式', '다크 / 라이트 모드 전환'],
    ['语言 / Language', '언어 / Language'],
    ['中文', '중국어'],
    ['自动保存', '자동 저장'],
    ['排序', '정렬'],
    ['版本（新→旧）', '버전 (최신→이전)'],
    ['名称（A→Z）', '이름 (A→Z)'],
    ['ID（大→小）', 'ID (큰값→작은값)'],
    ['⚔ 角色', '⚔ 캐릭터'],
    ['🗡 武器', '🗡 무기'],
    ['🌟 圣痕', '🌟 성흔'],
    ['🤝 协同者', '🤝 협동자'],
    ['🎒 道具', '🎒 아이템'],
    ['📋 任务', '📋 임무'],
    ['🌀 深渊/战场', '🌀 심연/전장'],
    ['🛒 商店', '🛒 상점'],
    ['与', '및'],
    ['本网站基于米哈游游戏数据制作，所有素材版权归米哈游所有。 ·',
      '본 사이트는 miHoYo 게임 데이터를 기반으로 제작되었으며, 모든 소재의 저작권은 miHoYo에 있습니다. ·'],

    // 카테고리 공통 UI
    ['描述', '설명'],
    ['弹窗故事示例', '팝업 스토리 예시'],
    ['本次更新新增', '이번 업데이트 신규'],
    ['前往', '이동'],
    ['关卡', '스테이지'],
    ['积分', '점수'],
    ['累计获取', '누적 획득'],
    ['完成', '완료'],
    ['可多选', '복수 선택 가능'],
    ['任务类型', '임무 유형'],
    ['道具', '아이템'],
    ['礼包', '패키지'],
    ['皮肤', '스킨'],
    ['新品', '신상품'],
    ['超值', '특가'],
    ['碎片', '조각'],
    ['🛒 活动商店', '🛒 이벤트 상점'],
    ['🗡️ 战场', '🗡️ 전장'],
    ['战场排期', '전장 일정'],
    ['记忆战场', '기억 전장'],
    ['冒险委托', '모험 의뢰'],
    ['往世乐土', '과거의 낙원'],
    ['驱动核心', '구동 코어'],
    ['KFC联动', 'KFC 콜라보'],

    // 성흔 공통 설명
    ['强力的攻击型圣痕', '강력한 공격형 성흔'],
    ['强力的防御型圣痕', '강력한 방어형 성흔'],
    ['强力的综合型圣痕', '강력한 종합형 성흔'],

    // 심연/전장 UI
    ['边缘区', '변두리 구역'],
    ['高危区', '고위험 구역'],
    ['密集区', '밀집 구역'],
    ['特异区', '특이 구역'],
    ['冰霜环境', '빙결 환경'],
    ['火焰环境', '화염 환경'],
    ['虚数环境', '허수 환경'],
    ['点燃环境', '점화 환경'],
    ['烁星环境', '별빛 환경'],
    ['统御环境', '통솔 환경'],
    ['雷电环境', '뇌전 환경'],
    ['量子环境', '양자 환경'],
    ['星尘环境', '성진 환경'],
    ['血棘环境', '출혈 환경'],
    ['影星环境', '그림자별 환경'],
    ['远程环境', '원거리 환경'],
    ['敌人受到的冰冻元素伤害增加50%，火焰元素伤害减少50%',
      '적이 받는 빙결 원소 피해 +50%, 화염 원소 피해 -50%'],
    ['敌人受到的火焰元素伤害增加50%，冰冻元素伤害减少50%',
      '적이 받는 화염 원소 피해 +50%, 빙결 원소 피해 -50%'],
    ['虚数属性角色造成的伤害提高20%', '허수 속성 캐릭터가 주는 피해 +20%'],
    ['量子属性角色造成的伤害提高20%', '양자 속성 캐릭터가 주는 피해 +20%'],
    ['星尘属性角色造成的伤害提高20%', '성진 속성 캐릭터가 주는 피해 +20%'],
    ['敌人受到的雷电元素伤害增加50%，物理伤害减少50%',
      '적이 받는 뇌전 원소 피해 +50%, 물리 피해 -50%'],
    ['敌人受到的远程攻击伤害增加50%，近战攻击伤害减少50%',
      '적이 받는 원거리 공격 피해 +50%, 근접 공격 피해 -50%'],
    ['敌人在点燃状态时受到伤害提高40%，点燃伤害提高45%',
      '점화 상태의 적이 받는 피해 +40%, 점화 피해 +45%'],
    ['敌人在流血状态时受到伤害提高40%，流血伤害提高45%',
      '출혈 상태의 적이 받는 피해 +40%, 출혈 피해 +45%'],

    // 공식/검증 가능한 한국어 슈트명부터 추가.
    ['咚！炽愿吉星', '쿵짝! 타오르는 소원'],
    ['天光驰彻', '솔라리스'],
    ['镇×偃月叩晓', '진×언월여명'],
    ['终末协理0017', '터미널 에이드 0017'],
    ['始源之律者', '기원의 율자'],
    ['死生之律者', '죽음과 생명의 율자'],
    ['真理之律者', '진리의 율자'],
    ['真我·人之律者', '진아·인간의 율자'],
    ['终焉之律者', '종언의 율자'],

    // 추가 검증된 한국어 슈트명
    ['繁星·绘世之卷', '번성·세상을 그리는 별'],
    ['浮生·渡尘之羽', '부생·도진의 날개'],
    ['诡戏千役「友情出演！」', '천의 얼굴 [우정 출연!]'],
    ['嗨♪爱愿妖精♥', '안녕♪ 사랑의 엘프♥'],
    ['黄金·璀耀之歌', '황금·찬란한 노래'],
    ['戒律·深罪之槛', '계율·죄의 심연'],
    ['空梦·掠集之兽', '환몽·꿈꾸는 고양이'],
    ['螺旋·愚戏之匣', '나선·환상의 상자'],
    ['时帆旅人', '시간의 인도자'],
    ['糖露星霜', '슈가스타'],
    ['女武神·热砂', '발키리·열정의 사막'],
    ['女武神·巡矢', '발키리·애로우'],
    ['女武神·重机', '발키리·블라스트'],
    ['奇迹☆魔法少女', '미라클☆마법소녀'],
    ['天元骑英', '천원기사'],
    ['位面武器·失序时空', '차원 무장·카오스'],
    ['瞒天乐游·曙影', '기만·여명의 그림자'],
    ['逆命魔龙·降临！', '역명의 마룡·강림!'],
    ['一客逍游', '자유로운 협객'],
    ['玉骑士·月痕', '옥기사·월흔'],
    ['愈生佑翎', '치유의 깃'],
    ['深空定锚·曙光', '스페이스 앵커·오로라'],
    ['享乐狂宴·邀影', '향락·광란의 연회'],
    ['破弃孤光·逐影', '파기·등불의 그림자'],
    ['月下誓约·予爱以心', '월하의 서약·핏빛 사랑'],
  ]);

  const PHRASES = [
    ['数据库 · 沐柏白的游戏博客', '데이터베이스 · 沐柏白의 게임 블로그'],
    ['游戏资料库 · 区分 正式服 与 测试服 · 越新的越靠前展示',
      '게임 자료실 · 정식 서버/테스트 서버 구분 · 최신 데이터부터 표시'],
    ['· 越新的越靠前展示', '· 최신 데이터부터 표시'],
    ['共 9 个分类 · 区分', '총 9개 카테고리 · 구분'],
  ];

  const STIGMATA_POS = { '上': '상', '中': '중', '下': '하' };
  const WEEKDAY_KO = {
    '一': '월', '二': '화', '三': '수', '四': '목',
    '五': '금', '六': '토', '日': '일',
  };

  const REGEX_RULES = [
    [/^显示\s*(\d+)\s*条$/, '$1개 표시'],
    [/^共\s*(\d+)\s*个分类\s*·\s*区分$/, '총 $1개 카테고리 · 구분'],

    // 공통 수량/버전/상점 패턴
    [/^含\s*(\d+)\s*版本$/, '$1개 버전 포함'],
    [/^含\s*(\d+)\s*件$/, '$1개 포함'],
    [/^限购\s*(\d+)$/, '구매 제한 $1'],
    [/^共\s*(\d+)\s*个购买渠道，折扣\s*(\d+)~(\d+)%$/,
      '구매 경로 $1개 · 할인 $2~$3%'],
    [/^商店\s*·\s*共\s*(\d+)\s*条$/, '상점 · 총 $1개'],
    [/^(\d+)\s*项$/, '$1개 항목'],
    [/^(\d+)\s*个$/, '$1개'],
    [/^(\d+)水晶$/, '수정 $1개'],
    [/^类型\s*(\d+)：\s*(\d+)\s*个任务$/, '유형 $1: 임무 $2개'],
    [/^其他区域（(\d+)）$/, '기타 구역 ($1)'],

    // 성흔 위치/설명 패턴
    [/^(.+)\((上|中|下)\)$/, (m, name, pos) => name + '(' + STIGMATA_POS[pos] + ')'],
    [/^究极的(攻击|防御|综合)型圣痕，能够组成(.+)套装$/,
      (m, type, setName) => {
        const t = { '攻击': '공격', '防御': '방어', '综合': '종합' }[type] || type;
        return '궁극의 ' + t + '형 성흔 · ' + setName + ' 세트 구성 가능';
      }],

    // 범용 접미사
    [/^(.+)晋升印章$/, '$1 승급 인장'],
    [/^(.+)升星材料$/, '$1 승급 재료'],
    [/^(.+)的账号数据$/, '$1 계정 데이터'],
    [/^(.+)自选箱$/, '$1 선택 상자'],
    [/^(.+)礼盒$/, '$1 선물 상자'],
    [/^(.+)商店$/, '$1 상점'],

    // CG / 날짜 / 페이지 이동
    [/^播放\s+(.+)$/, '재생 $1'],
    [/^(\d{4})\s*年\s*(\d{1,2})\s*月$/, '$1년 $2월'],
    [/^周([一二三四五六日])\s+(\d{1,2}\/\d{1,2})\s+[–-]\s+周([一二三四五六日])\s+(\d{1,2}\/\d{1,2})$/,
      (m, d1, date1, d2, date2) => WEEKDAY_KO[d1] + ' ' + date1 + ' – ' + WEEKDAY_KO[d2] + ' ' + date2],
    [/^‹\s*上一个$/, '‹ 이전'],
    [/^下一个\s*›$/, '다음 ›'],
  ];

  // 카드 요약문은 고유 스킬명까지 임의 번역하지 않고, 일반 용어만 안전하게 치환한다.
  const INLINE_NAMES = [
    ['咚！炽愿吉星', '쿵짝! 타오르는 소원'],
    ['繁星·绘世之卷', '번성·세상을 그리는 별'],
    ['浮生·渡尘之羽', '부생·도진의 날개'],
    ['诡戏千役「友情出演！」', '천의 얼굴 [우정 출연!]'],
    ['嗨♪爱愿妖精♥', '안녕♪ 사랑의 엘프♥'],
    ['黄金·璀耀之歌', '황금·찬란한 노래'],
    ['戒律·深罪之槛', '계율·죄의 심연'],
    ['空梦·掠集之兽', '환몽·꿈꾸는 고양이'],
    ['螺旋·愚戏之匣', '나선·환상의 상자'],
    ['时帆旅人', '시간의 인도자'],
    ['糖露星霜', '슈가스타'],
    ['女武神·热砂', '발키리·열정의 사막'],
    ['女武神·巡矢', '발키리·애로우'],
    ['女武神·重机', '발키리·블라스트'],
    ['奇迹☆魔法少女', '미라클☆마법소녀'],
    ['天元骑英', '천원기사'],
    ['位面武器·失序时空', '차원 무장·카오스'],
    ['瞒天乐游·曙影', '기만·여명의 그림자'],
    ['逆命魔龙·降临！', '역명의 마룡·강림!'],
    ['一客逍游', '자유로운 협객'],
    ['玉骑士·月痕', '옥기사·월흔'],
    ['愈生佑翎', '치유의 깃'],
    ['深空定锚·曙光', '스페이스 앵커·오로라'],
    ['享乐狂宴·邀影', '향락·광란의 연회'],
    ['破弃孤光·逐影', '파기·등불의 그림자'],
    ['月下誓约·予爱以心', '월하의 서약·핏빛 사랑'],
    ['天光驰彻', '솔라리스'],
    ['镇×偃月叩晓', '진×언월여명'],
    ['终末协理0017', '터미널 에이드 0017'],
    ['始源之律者', '기원의 율자'],
    ['死生之律者', '죽음과 생명의 율자'],
    ['真理之律者', '진리의 율자'],
    ['真我·人之律者', '진아·인간의 율자'],
    ['终焉之律者', '종언의 율자'],
  ];

  const DESCRIPTION_PHRASES = [
    ['特色：', '특징: '],
    ['机械属性', '기계 속성'],
    ['生物属性', '생물 속성'],
    ['异能属性', '이능 속성'],
    ['量子属性', '양자 속성'],
    ['虚数属性', '허수 속성'],
    ['星尘属性', '성진 속성'],
    ['远近战结合角色', '근·원거리 혼합 캐릭터'],
    ['近战角色', '근접 캐릭터'],
    ['远程角色', '원거리 캐릭터'],
    ['的角色', ' 캐릭터'],
    ['使用', '사용해 '],
    ['攻击敌人', '적을 공격'],
    ['战斗', '전투'],
    ['附加点燃积蓄效果', '점화 게이지를 누적'],
    ['为队伍提供增益', '파티에 버프를 제공'],
    ['拥有两种形态', '두 가지 형태를 보유'],
    ['在不同形态下，角色将拥有截然不同的攻击手段', '형태에 따라 완전히 다른 공격 수단을 사용'],
    ['使用龙爪和龙翼配合作战', '용의 발톱과 날개를 연계해 전투'],
    ['使用狙击枪远距离战斗', '저격총으로 원거리 전투'],
    ['使用速射弩攻击敌人', '연사 석궁으로 적을 공격'],
    ['使用火炮攻击敌人', '대포로 적을 공격'],
    ['使用弓箭射击敌人', '활로 적을 공격'],
    ['使用十字架攻击敌人', '십자가로 적을 공격'],
    ['使用链锯攻击敌人', '체인톱으로 적을 공격'],
    ['使用火箭锤攻击敌人', '로켓 해머로 적을 공격'],
    ['使用长剑贴身作战', '장검으로 근접 전투'],
    ['利用手偶变化出不同武器攻击敌人', '인형을 다양한 무기로 변형해 적을 공격'],
    ['可灵活的对敌人造成雷电元素伤害', '유연하게 뇌전 원소 피해를 가함'],
    ['造成雷电元素伤害', '뇌전 원소 피해를 가함'],
    ['造成火焰元素伤害', '화염 원소 피해를 가함'],
    ['造成冰冻元素伤害', '빙결 원소 피해를 가함'],
    ['造成物理伤害', '물리 피해를 가함'],
    ['为队伍提供增益', '파티에 버프 제공'],
    ['攻击型辅助角色', '공격형 서포터'],
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

    for (const [pattern, replacement] of REGEX_RULES) {
      if (pattern.test(out)) {
        out = out.replace(pattern, replacement);
        break;
      }
    }

    if (out.startsWith('特色：') || out.startsWith('특징: ')) {
      for (const [from, to] of DESCRIPTION_PHRASES) out = out.split(from).join(to);
    }

    // 고유명은 카드 제목뿐 아니라 상점/아이템/설명 내부에서도 치환한다.
    for (const [from, to] of INLINE_NAMES) {
      if (out.includes(from)) out = out.split(from).join(to);
    }

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

  const DIAGNOSTIC_IGNORE = [
    /^吉ICP备\d+号$/,
    /^붕괴3rd 자료실 · 沐柏白의 게임 블로그$/,
  ];

  function collectUntranslatedStrings() {
    const counts = new Map();

    function add(value) {
      const text = normalizeText(value);
      if (!text || !HAN_RE.test(text)) return;
      if (DIAGNOSTIC_IGNORE.some((pattern) => pattern.test(text))) return;
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

  const pendingRoots = new Set();
  let flushScheduled = false;

  function scheduleTranslation(root) {
    if (!root) return;
    pendingRoots.add(root);
    if (flushScheduled) return;
    flushScheduled = true;

    const flush = () => {
      flushScheduled = false;
      const roots = [...pendingRoots];
      pendingRoots.clear();

      // 부모가 이미 큐에 있으면 그 자식은 따로 순회하지 않는다.
      const minimalRoots = roots.filter((node, index, arr) => {
        if (!(node instanceof Node)) return false;
        return !arr.some((other, otherIndex) =>
          otherIndex !== index &&
          other instanceof Node &&
          other !== node &&
          other.contains?.(node)
        );
      });

      for (const node of minimalRoots) {
        try {
          translateTree(node);
        } catch (error) {
          console.warn('[silvermu-hi3-ko] translate skipped', error);
        }
      }
    };

    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(flush, { timeout: 600 });
    } else {
      window.setTimeout(flush, 120);
    }
  }

  function activateTranslation() {
    const root = document.documentElement || document;

    // 초기 렌더링 완료 후 1회만 전체 번역.
    scheduleTranslation(root);

    // 대형 목록에서 자기 자신이 만든 text/attribute mutation까지 다시 감시하면
    // 렌더링을 방해할 수 있으므로 childList 추가만 가볍게 감시한다.
    const observer = new MutationObserver((records) => {
      let queued = 0;

      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) continue;
          scheduleTranslation(node);
          queued += 1;

          // 한 프레임에 대량 삽입되는 경우 상위 컨테이너 한 번만 처리.
          if (queued >= 80) {
            scheduleTranslation(record.target);
            break;
          }
        }
        if (queued >= 80) break;
      }
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
    });

    addBadge();
  }

  function start() {
    if (!enabled()) return;

    // 원본 앱과 대형 JSON 목록 렌더링을 우선한다.
    const boot = () => window.setTimeout(activateTranslation, 1500);

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
