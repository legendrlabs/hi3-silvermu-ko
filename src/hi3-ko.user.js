// ==UserScript==
// @name         silvermu HI3 한국어 패치
// @namespace    https://github.com/legendrlabs/hi3-silvermu-ko
// @version      0.10.1
// @description  silvermu.top 붕괴3rd 데이터베이스 한국어 번역 레이어 + Chrome 로컬 AI 전체 번역/커버리지 검사 도구입니다.
// @author       Community
// @match        https://silvermu.top/database/hi3.html*
// @run-at       document-idle
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @grant        unsafeWindow
// @license      MIT
// @homepageURL  https://github.com/legendrlabs/hi3-silvermu-ko
// @supportURL   https://github.com/legendrlabs/hi3-silvermu-ko/issues
// @downloadURL  https://raw.githubusercontent.com/legendrlabs/hi3-silvermu-ko/main/src/hi3-ko.user.js
// @updateURL    https://raw.githubusercontent.com/legendrlabs/hi3-silvermu-ko/main/src/hi3-ko.meta.js
// ==/UserScript==

(() => {
  'use strict';

  const VERSION = '0.10.1';
  const STORAGE_KEY = 'silvermu-hi3-ko-enabled';
  const BADGE_ID = 'silvermu-hi3-ko-badge';
  const HAN_RE = /[\u3400-\u9FFF]/u;
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEXTAREA']);
  const ATTRS = ['placeholder', 'title', 'aria-label', 'alt'];
  const AI_BUTTON_ID = 'silvermu-hi3-ko-ai-button';
  const QA_BUTTON_ID = 'silvermu-hi3-ko-qa-button';
  const AI_STATUS_ID = 'silvermu-hi3-ko-ai-status';
  const UI_HOST_ID = 'silvermu-hi3-ko-ui-host';
  let floatingUiRoot = null;
  const AI_ENABLED_KEY = 'silvermu-hi3-ko-ai-enabled';
  const CACHE_DB_NAME = 'silvermu-hi3-ko-cache';
  const CACHE_DB_VERSION = 1;
  const CACHE_STORE = 'translations';
  const FULL_PROGRESS_KEY = 'silvermu-hi3-ko-full-progress-v1';
  const CACHE_MIGRATION_KEY = 'silvermu-hi3-ko-cache-migration-version';
  const FULL_DATASETS = {
    characters: '/data/db/bh3/characters.json',
    weapons: '/data/db/bh3/weapons.json',
    stigmata: '/data/db/bh3/stigmata.json',
    elfs: '/data/db/bh3/elfs.json',
    materials: '/data/db/bh3/materials.json',
    tasks: '/data/db/bh3/tasks.json',
    abyss: '/data/db/bh3/abyss.json',
    battlefield: '/data/db/bh3/battlefield.json',
    shops: '/data/db/bh3/shops.json',
    cg: '/data/db/bh3/cg.json',
    dictionary: '/data/db/bh3/dictionary.json',
  };

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
    ['时序之律者', '시간의 율자'],
    ['愈生佑翎', '치유의 깃'],
    ['窈窕谍影', '미스 스파이'],
    ['孑遗千星', '별의 여행자'],
    ['天命难逃', '데스테리'],
    ['天行·绘星之卷', '천행·우주를 그리는 별'],
    ['织羽梦旌', '드림위버'],
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
    ['雪地狙击', '설원 저격수'],
    ['女武神·游侠', '발키리·레인저'],
    ['女武神·强袭', '발키리·스트라이크'],
    ['女武神·战车', '발키리·채리엇'],
    ['圣女祈祷', '성녀의 기도'],
    ['白骑士·月光', '백기사·월광'],
    ['影舞冲击', '그림자의 춤'],
    ['领域装·白练', '투예복·백련'],
    ['驱动装·山吹', '기동장갑·황매화'],
    ['脉冲装·绯红', '펄스 슈트·비홍'],
    ['血色玫瑰', '핏빛 장미'],
    ['女武神·凯旋', '발키리·개선'],
    ['战场疾风', '전장의 질풍'],
    ['融核装·深红', '퓨전 아머·스칼렛'],
    ['次元边界突破', '차원 경계 돌파'],
    ['处刑装·紫苑', '처형복·반혼초'],
    ['第六夜想曲', '제6 야상곡'],
    ['炽翎', '치령'],
    ['影骑士·月轮', '영기사·월륜'],
    ['女武神·迅羽', '발키리·해청'],
    ['圣仪装·今样', '성결 예장·금양'],
    ['神恩颂歌', '신은송가'],
    ['真炎幸魂', '진염행혼'],
    ['银狼的黎明', '은랑의 여명'],
    ['樱火轮舞', '앵화윤무'],
    ['女武神·誓约', '발키리·서약'],
    ['御神装·勿忘', '현신화·물망초'],
    ['逆神巫女', '역신 무녀'],
    ['雷电女王的鬼铠', '뇌전 여왕의 귀신 갑주'],
    ['异度黑核侵蚀', '이도 흑핵 침식'],
    ['彼岸双生', '피안쌍생'],
    ['幻海梦蝶', '환해의 꿈나비'],
    ['蓝莓特攻', '블루베리 특공'],
    ['黯蔷薇', '검은 장미'],
    ['真红骑士·月蚀', '진홍의 기사·월식'],
    ['原罪猎人', '원죄 사냥꾼'],
    ['月下初拥', '월하초옹'],
    ['理之律者', '이치의 율자'],
    ['空之律者', '공간의 율자'],
    ['失落迷迭', '로스트 로즈마리'],
    ['魇夜星渊', '염야성연'],
    ['白夜执事', '백야집사'],
    ['苍骑士·月魂', '창기사·월혼'],
    ['猎袭装·影铁', '헌트 슈트·팬텀 아이언'],
    ['彗星驱动', '혜성 구동'],
    ['雾都迅羽', '안개성의 해청'],
    ['狂热蓝调Δ', '열광 템포Δ'],

    // 최신 캐릭터 카드 설명: 문장 단위 번역
    ['特色：机械属性的角色，使用龙爪和龙翼配合作战，附加点燃积蓄效果，为队伍提供增益',
      '특징: 기계 속성 캐릭터. 용의 발톱과 날개를 연계해 전투하며, 점화 게이지를 누적하고 파티에 버프를 제공한다.'],
    ['特色：机械属性的角色，指挥理型之种作战，必杀开启梦境召唤精神实体附身其中',
      '특징: 기계 속성 캐릭터. 이형의 씨앗을 지휘해 싸우며, 필살기 사용 시 꿈을 펼쳐 정신 실체를 소환하고 빙의시킨다.'],
    ['特色：机械属性的近战角色，挥舞链刃攻击敌人',
      '특징: 기계 속성 근접 캐릭터. 사슬 칼날을 휘둘러 적을 공격한다.'],
    ['特色：机械属性的近战角色，挥舞辟邪麟刀攻击',
      '특징: 기계 속성 근접 캐릭터. 벽사린도를 휘둘러 공격한다.'],
    ['特色：机械属性的远程角色，使用狙击枪远距离战斗',
      '특징: 기계 속성 원거리 캐릭터. 저격총으로 원거리 전투를 한다.'],
    ['特色：机械属性的远程角色，使用速射弩攻击敌人',
      '특징: 기계 속성 원거리 캐릭터. 연사 석궁으로 적을 공격한다.'],
    ['特色：机械属性的远程角色，拥有两种形态。在不同形态下，角色将拥有截然不同的攻击手段',
      '특징: 기계 속성 원거리 캐릭터. 두 가지 형태를 보유하며 형태에 따라 전혀 다른 공격 수단을 사용한다.'],
    ['特色：机械属性的远近战结合角色，能灵活投掷环刃战斗',
      '특징: 기계 속성 근·원거리 혼합 캐릭터. 차크람을 자유롭게 투척하며 전투한다.'],
    ['特色：机械属性的远近战结合角色，使用大型剪刀释放魔法攻击',
      '특징: 기계 속성 근·원거리 혼합 캐릭터. 대형 가위를 사용해 마법 공격을 펼친다.'],
    ['特色：量子属性的角色，使用环刃的双刀模式跳起铃鼓舞蹈进行战斗',
      '특징: 양자 속성 캐릭터. 차크람의 쌍검 모드와 탬버린 춤을 활용해 전투한다.'],
    ['特色：量子属性的近战角色，利用手偶变化出不同武器攻击敌人',
      '특징: 양자 속성 근접 캐릭터. 손인형을 여러 무기로 변화시켜 적을 공격한다.'],
    ['特色：量子属性的近战角色，在战斗中交替使用使用面具和金鱼戏耍对手',
      '특징: 양자 속성 근접 캐릭터. 전투 중 가면과 금붕어를 번갈아 사용해 상대를 농락한다.'],
    ['特色：量子属性的远程角色，使用火炮攻击敌人',
      '특징: 양자 속성 원거리 캐릭터. 대포로 적을 공격한다.'],
    ['特色：生物属性的近战角色，连续释放多段必杀技打击敌人，并施加麻痹效果',
      '특징: 생물 속성 근접 캐릭터. 다단 필살기를 연속 사용해 적을 공격하고 마비를 부여한다.'],
    ['特色：生物属性的近战角色，灵活切换【拳】【腿】两种架势进行战斗。生命力极强，可使用生命强化自身战斗能力',
      '특징: 생물 속성 근접 캐릭터. [주먹]/[다리] 두 자세를 자유롭게 전환하며, 높은 생명력을 활용해 전투 능력을 강화한다.'],
    ['特色：生物属性的近战角色，使用伞中剑对敌人进行疾风骤雨般的攻击，并施加流血效果',
      '특징: 생물 속성 근접 캐릭터. 우산 속 검으로 폭풍 같은 연속 공격을 가하고 출혈을 부여한다.'],
    ['特色：生物属性的远程角色，使用环刃的法环模式战斗，以此来对敌人降下裁决',
      '특징: 생물 속성 원거리 캐릭터. 차크람의 법환 모드로 전투하며 적에게 심판을 내린다.'],
    ['特色：星尘属性的角色，可使用法杖进行远程攻击或使用镰刀进行近战攻击',
      '특징: 성진 속성 캐릭터. 지팡이로 원거리 공격을 하거나 낫으로 근접 공격을 한다.'],
    ['特色：星尘属性的近战角色',
      '특징: 성진 속성 근접 캐릭터.'],
    ['特色：星尘属性的近战角色，使用光剑和行星的力量战斗',
      '특징: 성진 속성 근접 캐릭터. 광검과 행성의 힘을 사용해 전투한다.'],
    ['特色：星尘属性的近战角色，舞动驱动核心攻击敌人',
      '특징: 성진 속성 근접 캐릭터. 구동 코어를 휘둘러 적을 공격한다.'],
    ['特色：星尘属性的远程角色，可化身「栖叶灵相」与「贯金神光」两种形态。在不同形态下，角色将拥有截然不同的攻击手段',
      '특징: 성진 속성 원거리 캐릭터. [서엽영상]과 [관금신광] 두 형태로 변신하며, 형태에 따라 전혀 다른 공격 수단을 사용한다.'],
    ['特色：星尘属性的远程角色，战斗期间指挥小信使和爱愿之花配合作战，星环爆发下生成爱愿穹野',
      '특징: 성진 속성 원거리 캐릭터. 전투 중 작은 사자와 소원의 꽃을 지휘하며, 별의 고리 폭발 시 소원의 영역을 생성한다.'],
    ['特色：虚数属性的近战角色',
      '특징: 허수 속성 근접 캐릭터.'],
    ['特色：虚数属性的近战角色，可灵活的对敌人造成雷电元素伤害',
      '특징: 허수 속성 근접 캐릭터. 유연하게 뇌전 원소 피해를 가한다.'],
    ['特色：虚数属性的近战角色，利用幻身重现招式发动攻击',
      '특징: 허수 속성 근접 캐릭터. 환영체로 기술을 재현해 공격한다.'],
    ['特色：虚数属性的近战角色，能灵活运用枪剑与各式技能，在空中自由的战斗',
      '특징: 허수 속성 근접 캐릭터. 총검과 다양한 기술을 활용해 공중에서 자유롭게 전투한다.'],
    ['特色：虚数属性的近战角色，使用环刃的双刀模式战斗，与宠物猫咪协同攻击敌人',
      '특징: 허수 속성 근접 캐릭터. 차크람의 쌍검 모드와 반려묘를 연계해 적을 공격한다.'],
    ['特色：虚数属性的近战角色，拥有两种形态，「肆野形态」下于地面作战，且拥有可以自动格挡的浮游盾，「驰空形态」下护盾变为浮空板，进行高速空战',
      '특징: 허수 속성 근접 캐릭터. 두 형태를 전환하며, 지상에서는 자동 방어 부유 방패를 사용하고 공중 형태에서는 방패를 보드로 바꿔 고속 공중전을 펼친다.'],
    ['特色：虚数属性的远程角色，操控武器或法术攻击敌人',
      '특징: 허수 속성 원거리 캐릭터. 무기와 마법을 조종해 적을 공격한다.'],
    ['特色：虚数属性的远程角色，能切换两种形态，进行爆发输出和元素辅助',
      '특징: 허수 속성 원거리 캐릭터. 두 형태를 전환해 폭발적인 딜링과 원소 지원을 수행한다.'],
    ['特色：虚数属性的远程角色，使用双枪攻击敌人',
      '특징: 허수 속성 원거리 캐릭터. 쌍권총으로 적을 공격한다.'],
    ['特色：虚数属性远近战结合角色，使用拳套痛击敌人',
      '특징: 허수 속성 근·원거리 혼합 캐릭터. 건틀릿으로 적을 강타한다.'],
    ['特色：异能属性的近战角色',
      '특징: 이능 속성 근접 캐릭터.'],
    ['特色：异能属性的近战角色，使用火箭锤攻击敌人',
      '특징: 이능 속성 근접 캐릭터. 로켓 해머로 적을 공격한다.'],
    ['特色：异能属性的近战角色，使用链锯攻击敌人，攻击型辅助角色',
      '특징: 이능 속성 근접 캐릭터. 체인톱으로 적을 공격하는 공격형 서포터다.'],
    ['特色：异能属性的近战角色，使用十字架攻击敌人',
      '특징: 이능 속성 근접 캐릭터. 십자가로 적을 공격한다.'],
    ['特色：异能属性的远程角色，使用弓箭射击敌人',
      '특징: 이능 속성 원거리 캐릭터. 활로 적을 공격한다.'],
    ['特色：异能属性的远程角色，使用速射弩攻击敌人',
      '특징: 이능 속성 원거리 캐릭터. 연사 석궁으로 적을 공격한다.'],
    ['特色：异能属性的远近战结合角色，使用长剑贴身作战，统御飞剑远程攻击',
      '특징: 이능 속성 근·원거리 혼합 캐릭터. 장검으로 근접 전투를 하고 비검을 지휘해 원거리 공격을 한다.'],
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
  const FEATURE_EXACT = new Map([
    ['特色：异能属性的中距离角色，使用丰富灵体武器技能，具有禁锢能力', '특징: 이능 속성 중거리 캐릭터. 다양한 영체 무기 스킬을 사용하며 적을 속박할 수 있다.'],
    ['特色：异能属性的中距离角色，通过标记敌人和灼烧标记造成大量火焰伤害', '특징: 이능 속성 중거리 캐릭터. 적에게 표식을 남기고 표식을 불태워 높은 화염 피해를 준다.'],
    ['特色：异能属性的灵魂觉醒近战角色，可对敌人持续造成大量雷电元素伤害', '특징: 이능 속성 영혼 각성 근접 캐릭터. 적에게 지속적으로 높은 뇌전 원소 피해를 줄 수 있다.'],
    ['特色：异能属性的灵魂觉醒近战角色，灵活对敌人叠加鸦羽标记造成冰冻元素伤害', '특징: 이능 속성 영혼 각성 근접 캐릭터. 까마귀 깃털 표식을 중첩해 빙결 원소 피해를 준다.'],
    ['特色：异能属性的灵魂觉醒近战角色，灵活运用临界状态，造成冰冻元素伤害', '특징: 이능 속성 영혼 각성 근접 캐릭터. 임계 상태를 활용해 빙결 원소 피해를 준다.'],
    ['特色：异能属性的灵魂觉醒近战角色，通过不同的攻击组合释放强力的元素技能', '특징: 이능 속성 영혼 각성 근접 캐릭터. 여러 공격 조합으로 강력한 원소 스킬을 발동한다.'],
    ['特色：异能属性的灵魂觉醒远程角色，重装小兔全程自主攻击，与角色进行配合', '특징: 이능 속성 영혼 각성 원거리 캐릭터. 중장토끼가 전투 내내 자율 공격하며 캐릭터와 연계한다.'],
    ['特色：异能属性的近战角色', '특징: 이능 속성 근접 캐릭터.'],
    ['特色：异能属性的近战角色，使用十字架攻击敌人', '특징: 이능 속성 근접 캐릭터. 십자가를 사용해 적을 공격한다.'],
    ['特色：异能属性的近战角色，使用火箭锤攻击敌人', '특징: 이능 속성 근접 캐릭터. 로켓 해머를 사용해 적을 공격한다.'],
    ['特色：异能属性的近战角色，使用链锯攻击敌人，攻击型辅助角色', '특징: 이능 속성 근접 캐릭터. 체인톱으로 적을 공격하는 공격형 서포터다.'],
    ['特色：异能属性的近战角色，可以持续输出大量物理伤害', '특징: 이능 속성 근접 캐릭터. 높은 물리 피해를 지속적으로 넣을 수 있다.'],
    ['特色：异能属性的近战角色，带有丰富的火焰技能，爆发力强', '특징: 이능 속성 근접 캐릭터. 다양한 화염 스킬을 보유하며 순간 화력이 강하다.'],
    ['特色：异能属性的近战角色，技能以雷电为主，能够麻痹敌人', '특징: 이능 속성 근접 캐릭터. 뇌전 계열 스킬이 중심이며 적에게 마비를 부여할 수 있다.'],
    ['特色：异能属性的近战角色，攻击频率高，范围广，对群攻击能力超强', '특징: 이능 속성 근접 캐릭터. 공격 빈도와 범위가 넓어 다수전 능력이 뛰어나다.'],
    ['特色：异能属性的近战角色，用连段的打击技击溃敌人', '특징: 이능 속성 근접 캐릭터. 연속 타격 콤보로 적을 몰아붙인다.'],
    ['特色：异能属性的近战角色，能够自我治疗，续航能力强', '특징: 이능 속성 근접 캐릭터. 자가 회복이 가능해 전투 지속력이 높다.'],
    ['特色：异能属性的近战角色，通过技能连携对敌人附加火焰伤害', '특징: 이능 속성 근접 캐릭터. 스킬 연계로 적에게 추가 화염 피해를 준다.'],
    ['特色：异能属性的远程角色', '특징: 이능 속성 원거리 캐릭터.'],
    ['特色：异能属性的远程角色，使用弓箭射击敌人', '특징: 이능 속성 원거리 캐릭터. 활로 적을 공격한다.'],
    ['特色：异能属性的远程角色，使用速射弩攻击敌人', '특징: 이능 속성 원거리 캐릭터. 연사 석궁으로 적을 공격한다.'],
    ['特色：异能属性的远程角色，可以盾挡反击敌人，极限模式下可切换为近战攻击', '특징: 이능 속성 원거리 캐릭터. 방패로 공격을 막고 반격하며, 극한 모드에서는 근접 공격으로 전환할 수 있다.'],
    ['特色：异能属性的远程角色，擅长使用蓄力攻击，可以制造黑洞吸引敌人', '특징: 이능 속성 원거리 캐릭터. 차지 공격에 특화되어 있으며 블랙홀을 만들어 적을 끌어당길 수 있다.'],
    ['特色：异能属性的远近战结合角色，使用长剑贴身作战，统御飞剑远程攻击', '특징: 이능 속성 근·원거리 혼합 캐릭터. 장검으로 근접 전투를 하고 비검을 지휘해 원거리 공격을 한다.'],
    ['特色：星尘属性的角色，可使用法杖进行远程攻击或使用镰刀进行近战攻击', '특징: 성진 속성 캐릭터. 지팡이로 원거리 공격을 하거나 낫으로 근접 공격을 한다.'],
    ['特色：星尘属性的近战角色', '특징: 성진 속성 근접 캐릭터.'],
    ['特色：星尘属性的近战角色，使用光剑和行星的力量战斗', '특징: 성진 속성 근접 캐릭터. 광검과 행성의 힘을 이용해 전투한다.'],
    ['特色：星尘属性的近战角色，舞动驱动核心攻击敌人', '특징: 성진 속성 근접 캐릭터. 구동 코어를 휘둘러 적을 공격한다.'],
    ['特色：星尘属性的远程角色，可化身「栖叶灵相」与「贯金神光」两种形态。在不同形态下，角色将拥有截然不同的攻击手段', '특징: 성진 속성 원거리 캐릭터. 「栖叶灵相」와 「贯金神光」 두 형태로 변신하며, 형태에 따라 전혀 다른 공격 방식을 사용한다.'],
    ['特色：星尘属性的远程角色，战斗期间指挥小信使和爱愿之花配合作战，星环爆发下生成爱愿穹野', '특징: 성진 속성 원거리 캐릭터. 전투 중 작은 사자와 소원의 꽃을 지휘하며, 별의 고리 폭발 시 소원의 영역을 생성한다.'],
    ['特色：机械属性的中距离角色，使用丰富灵体武器技能，熟练运用流血状态对敌人进行打击', '특징: 기계 속성 중거리 캐릭터. 다양한 영체 무기 스킬과 출혈 상태를 활용해 적을 공격한다.'],
    ['特色：机械属性的灵魂觉醒角色，可切换至骑乘模式', '특징: 기계 속성 영혼 각성 캐릭터. 탑승 모드로 전환할 수 있다.'],
    ['特色：机械属性的灵魂觉醒近战角色，拥有灵活的作战方式，多段必杀攻击能造成高额火焰元素伤害', '특징: 기계 속성 영혼 각성 근접 캐릭터. 유연한 전투 방식을 갖췄으며 다단 필살기로 높은 화염 원소 피해를 준다.'],
    ['特色：机械属性的灵魂觉醒近战角色，积蓄动能后可发动强力的中距离范围攻击', '특징: 기계 속성 영혼 각성 근접 캐릭터. 동력을 모은 뒤 강력한 중거리 범위 공격을 발동할 수 있다.'],
    ['特色：机械属性的灵魂觉醒近战角色，积蓄动能后释放相应强度的巨枪冲击', '특징: 기계 속성 영혼 각성 근접 캐릭터. 동력을 모아 축적량에 비례한 강력한 창격을 발동한다.'],
    ['特色：机械属性的灵魂觉醒远程角色，善于持续对敌人输出伤害', '특징: 기계 속성 영혼 각성 원거리 캐릭터. 적에게 지속적으로 피해를 넣는 데 능하다.'],
    ['特色：机械属性的角色，使用龙爪和龙翼配合作战，附加点燃积蓄效果，为队伍提供增益', '특징: 기계 속성 캐릭터. 용의 발톱과 날개를 연계해 전투하며 점화 게이지를 누적하고 파티에 버프를 제공한다.'],
    ['特色：机械属性的角色，指挥理型之种作战，必杀开启梦境召唤精神实体附身其中', '특징: 기계 속성 캐릭터. 이형의 씨앗을 지휘해 싸우며, 필살기 사용 시 꿈을 펼쳐 정신 실체를 소환하고 빙의시킨다.'],
    ['特色：机械属性的近战角色，与自律追踪兵器协同作战', '특징: 기계 속성 근접 캐릭터. 자율 추적 병기와 협동해 전투한다.'],
    ['特色：机械属性的近战角色，位移手段多样化，生存能力强', '특징: 기계 속성 근접 캐릭터. 다양한 이동 수단을 보유해 생존력이 높다.'],
    ['特色：机械属性的近战角色，使用大型机械拳套作战，能发动强大的多段蓄力攻击粉碎敌人的护盾，同时具有强大的空中击坠能力，为其他队友制造输出环境', '특징: 기계 속성 근접 캐릭터. 대형 기계 건틀릿으로 다단 차지 공격을 펼쳐 적의 실드를 파괴하고, 강한 공중 격추 능력으로 아군의 딜링 환경을 만든다.'],
    ['特色：机械属性的近战角色，使用拟态圣剑的力量进行战斗', '특징: 기계 속성 근접 캐릭터. 모조 성검의 힘을 사용해 전투한다.'],
    ['特色：机械属性的近战角色，可解放自驱幻灵为自己而战，并拥有极强的防御能力，可化解敌人的攻击并造成反击伤害', '특징: 기계 속성 근접 캐릭터. 자율 환령을 해방해 함께 싸우며, 높은 방어력으로 적의 공격을 받아내고 반격 피해를 줄 수 있다.'],
    ['特色：机械属性的近战角色，在月食形态下，能爆发出强大的战斗能力，造成大量雷电伤害', '특징: 기계 속성 근접 캐릭터. 월식 형태에서 강력한 전투력을 발휘해 높은 뇌전 피해를 준다.'],
    ['特色：机械属性的近战角色，完美连段，爆发可挥出核能刀波', '특징: 기계 속성 근접 캐릭터. 매끄러운 콤보를 이어가며 폭발 시 핵에너지 검기를 발사한다.'],
    ['特色：机械属性的近战角色，挥舞辟邪麟刀攻击', '특징: 기계 속성 근접 캐릭터. 벽사린도를 휘둘러 공격한다.'],
    ['特色：机械属性的近战角色，挥舞链刃攻击敌人', '특징: 기계 속성 근접 캐릭터. 사슬 칼날을 휘둘러 적을 공격한다.'],
    ['特色：机械属性的近战角色，攻击和防御较为均衡', '특징: 기계 속성 근접 캐릭터. 공격과 방어의 균형이 좋다.'],
    ['特色：机械属性的近战角色，攻击方式多样化，具有强力的防守反击技能', '특징: 기계 속성 근접 캐릭터. 공격 방식이 다양하며 강력한 방어·반격 스킬을 보유한다.'],
    ['特色：机械属性的远程角色，使用分支攻击释放「噬界之蛇」的躯体压制敌人，交替释放分支攻击与强化普通攻击战斗', '특징: 기계 속성 원거리 캐릭터. 분기 공격으로 「噬界之蛇」의 몸체를 소환해 적을 압박하고, 분기 공격과 강화 기본 공격을 번갈아 사용한다.'],
    ['特色：机械属性的远程角色，使用狙击枪远距离战斗', '특징: 기계 속성 원거리 캐릭터. 저격총으로 원거리 전투를 한다.'],
    ['特色：机械属性的远程角色，使用速射弩攻击敌人', '특징: 기계 속성 원거리 캐릭터. 연사 석궁으로 적을 공격한다.'],
    ['特色：机械属性的远程角色，拥有两种形态。在不同形态下，角色将拥有截然不同的攻击手段', '특징: 기계 속성 원거리 캐릭터. 두 가지 형태를 보유하며 형태에 따라 전혀 다른 공격 방식을 사용한다.'],
    ['特色：机械属性的远程角色，能量强大，可以释放重装小兔自主攻击', '특징: 기계 속성 원거리 캐릭터. 강력한 에너지를 바탕으로 중장토끼를 해방해 자율 공격시킬 수 있다.'],
    ['特色：机械属性的远程角色，靠拉开与敌人的距离制造输出机会', '특징: 기계 속성 원거리 캐릭터. 적과 거리를 벌려 안정적인 공격 기회를 만든다.'],
    ['特色：机械属性的远近战结合角色，使用大型剪刀释放魔法攻击', '특징: 기계 속성 근·원거리 혼합 캐릭터. 대형 가위를 사용해 마법 공격을 펼친다.'],
    ['特色：机械属性的远近战结合角色，能灵活投掷环刃战斗', '특징: 기계 속성 근·원거리 혼합 캐릭터. 차크람을 자유롭게 투척하며 전투한다.'],
    ['特色：生物属性的中距离角色，攻击型辅助角色', '특징: 생물 속성 중거리 캐릭터. 공격형 서포터다.'],
    ['特色：生物属性的灵魂觉醒近战角色，可以自由切换三种武器攻击，提供强力辅助效果', '특징: 생물 속성 영혼 각성 근접 캐릭터. 세 종류의 무기를 자유롭게 전환하며 강력한 지원 효과를 제공한다.'],
    ['特色：生物属性的灵魂觉醒近战角色，可以自由切换战斗方式，制造并利用流血状态', '특징: 생물 속성 영혼 각성 근접 캐릭터. 전투 방식을 자유롭게 전환하며 출혈 상태를 만들고 활용한다.'],
    ['特色：生物属性的灵魂觉醒近战角色，在特定时机可发动特殊攻击造成大量火焰伤害', '특징: 생물 속성 영혼 각성 근접 캐릭터. 특정 타이밍에 특수 공격을 발동해 높은 화염 피해를 준다.'],
    ['特色：生物属性的灵魂觉醒近战角色，通过标记敌人和清除标记造成大量伤害', '특징: 생물 속성 영혼 각성 근접 캐릭터. 적에게 표식을 부여하고 제거해 큰 피해를 준다.'],
    ['特色：生物属性的灵魂觉醒远程角色，灵活运用律者形态，召唤空间核心造成大量伤害', '특징: 생물 속성 영혼 각성 원거리 캐릭터. 율자 형태를 활용하고 공간 코어를 소환해 큰 피해를 준다.'],
    ['特色：生物属性的灵魂觉醒远程角色，灵活运用隐身状态，对敌人进行封杀', '특징: 생물 속성 영혼 각성 원거리 캐릭터. 은신 상태를 활용해 적을 제압한다.'],
    ['特色：生物属性的近战角色', '특징: 생물 속성 근접 캐릭터.'],
    ['特色：生物属性的近战角色，使用伞中剑对敌人进行疾风骤雨般的攻击，并施加流血效果', '특징: 생물 속성 근접 캐릭터. 우산 속 검으로 폭풍 같은 연속 공격을 가하고 출혈을 부여한다.'],
    ['特色：生物属性的近战角色，单体近战超快输出，伤害可观', '특징: 생물 속성 근접 캐릭터. 단일 대상에 매우 빠른 근접 연타를 넣어 높은 피해를 준다.'],
    ['特色：生物属性的近战角色，召唤白银之月，灵活施加冰蚀与冰牢状态，控制力超强', '특징: 생물 속성 근접 캐릭터. 백은의 달을 소환해 빙식과 빙결 구속 상태를 부여하며 제어 능력이 뛰어나다.'],
    ['特色：生物属性的近战角色，在特定时机可发动特殊攻击造成大量雷电伤害', '특징: 생물 속성 근접 캐릭터. 특정 타이밍에 특수 공격을 발동해 높은 뇌전 피해를 준다.'],
    ['特色：生物属性的近战角色，控场技能丰富，强力辅助', '특징: 생물 속성 근접 캐릭터. 다양한 군중 제어 스킬을 갖춘 강력한 서포터다.'],
    ['特色：生物属性的近战角色，攻击速度快，暴击较高', '특징: 생물 속성 근접 캐릭터. 공격 속도가 빠르고 치명타 성능이 높다.'],
    ['特色：生物属性的近战角色，灵活切换【拳】【腿】两种架势进行战斗。生命力极强，可使用生命强化自身战斗能力', '특징: 생물 속성 근접 캐릭터. [주먹]/[다리] 두 자세를 자유롭게 전환하며, 높은 생명력을 활용해 전투 능력을 강화한다.'],
    ['特色：生物属性的近战角色，蓄力斩击，打断能力强', '특징: 생물 속성 근접 캐릭터. 차지 베기로 적의 행동을 끊는 능력이 뛰어나다.'],
    ['特色：生物属性的近战角色，连击手段丰富，连段型物理伤害角色', '특징: 생물 속성 근접 캐릭터. 다양한 연계기를 사용하는 콤보형 물리 딜러다.'],
    ['特色：生物属性的近战角色，连续释放多段必杀技打击敌人，并施加麻痹效果', '특징: 생물 속성 근접 캐릭터. 다단 필살기를 연속 사용해 적을 공격하고 마비를 부여한다.'],
    ['特色：生物属性的远程角色', '특징: 생물 속성 원거리 캐릭터.'],
    ['特色：生物属性的远程角色，使用弓箭射击敌人，能召唤眷属配合战斗', '특징: 생물 속성 원거리 캐릭터. 활로 적을 공격하며 권속을 소환해 함께 전투한다.'],
    ['特色：生物属性的远程角色，使用环刃的法环模式战斗，以此来对敌人降下裁决', '특징: 생물 속성 원거리 캐릭터. 차크람의 법환 모드로 전투하며 적에게 심판을 내린다.'],
    ['特色：生物属性的远程角色，完美蓄力，可以长时间冰冻敌人', '특징: 생물 속성 원거리 캐릭터. 완전 차지 공격으로 적을 장시간 빙결시킬 수 있다.'],
    ['特色：生物属性的远程角色，群体伤害可观', '특징: 생물 속성 원거리 캐릭터. 다수 대상 피해 능력이 뛰어나다.'],
    ['特色：虚数属性的近战角色', '특징: 허수 속성 근접 캐릭터.'],
    ['特色：虚数属性的近战角色，使用环刃的双刀模式战斗，与宠物猫咪协同攻击敌人', '특징: 허수 속성 근접 캐릭터. 차크람의 쌍검 모드와 반려묘를 연계해 적을 공격한다.'],
    ['特色：虚数属性的近战角色，利用幻身重现招式发动攻击', '특징: 허수 속성 근접 캐릭터. 환영체로 기술을 재현해 공격한다.'],
    ['特色：虚数属性的近战角色，可灵活的对敌人造成雷电元素伤害', '특징: 허수 속성 근접 캐릭터. 유연하게 뇌전 원소 피해를 가한다.'],
    ['特色：虚数属性的近战角色，拥有两种形态，「肆野形态」下于地面作战，且拥有可以自动格挡的浮游盾，「驰空形态」下护盾变为浮空板，进行高速空战', '특징: 허수 속성 근접 캐릭터. 두 형태를 전환하며, 지상에서는 자동 방어 부유 방패를 사용하고 공중 형태에서는 방패를 보드로 바꿔 고속 공중전을 펼친다.'],
    ['特色：虚数属性的近战角色，能灵活运用枪剑与各式技能，在空中自由的战斗', '특징: 허수 속성 근접 캐릭터. 총검과 다양한 스킬을 활용해 공중에서 자유롭게 전투한다.'],
    ['特色：虚数属性的远程角色，使用双枪攻击敌人', '특징: 허수 속성 원거리 캐릭터. 쌍권총으로 적을 공격한다.'],
    ['特色：虚数属性的远程角色，使用弓箭射击敌人，回收黑羽可以获得强化状态', '특징: 허수 속성 원거리 캐릭터. 활로 적을 공격하며 검은 깃털을 회수해 강화 상태에 진입한다.'],
    ['特色：虚数属性的远程角色，操控武器或法术攻击敌人', '특징: 허수 속성 원거리 캐릭터. 무기와 마법을 조종해 적을 공격한다.'],
    ['特色：虚数属性的远程角色，能切换两种形态，进行爆发输出和元素辅助', '특징: 허수 속성 원거리 캐릭터. 두 형태를 전환해 폭발적인 딜링과 원소 지원을 수행한다.'],
    ['特色：虚数属性远近战结合角色，使用拳套痛击敌人', '특징: 허수 속성 근·원거리 혼합 캐릭터. 건틀릿으로 적을 강타한다.'],
    ['特色：量子属性的角色，使用环刃的双刀模式跳起铃鼓舞蹈进行战斗', '특징: 양자 속성 캐릭터. 차크람의 쌍검 모드와 탬버린 춤을 활용해 전투한다.'],
    ['特色：量子属性的近战角色', '특징: 양자 속성 근접 캐릭터.'],
    ['特色：量子属性的近战角色，使用投技打断敌人招式，并可随着战斗进行越来越强大，爆发力强', '특징: 양자 속성 근접 캐릭터. 잡기 기술로 적의 공격을 끊고 전투가 길어질수록 강해지며 순간 화력이 높다.'],
    ['特色：量子属性的近战角色，利用手偶变化出不同武器攻击敌人', '특징: 양자 속성 근접 캐릭터. 손인형을 여러 무기로 변형해 적을 공격한다.'],
    ['特色：量子属性的近战角色，可切换人格并具有不同的必杀技与QTE，可应对多种情况', '특징: 양자 속성 근접 캐릭터. 인격을 전환해 서로 다른 필살기와 QTE를 사용하며 다양한 상황에 대응한다.'],
    ['特色：量子属性的近战角色，可暂时获得暗影形态力量，消耗暗影值进行大范围输出', '특징: 양자 속성 근접 캐릭터. 일시적으로 그림자 형태의 힘을 얻고 그림자 게이지를 소모해 광범위 공격을 펼친다.'],
    ['特色：量子属性的近战角色，在战斗中交替使用使用面具和金鱼戏耍对手', '특징: 양자 속성 근접 캐릭터. 전투 중 가면과 금붕어를 번갈아 사용해 상대를 농락한다.'],
    ['特色：量子属性的近战角色，役使生物灵进行战斗，配合队友可在短时间内造成极高的雷电元素伤害，并具有一定的辅助能力', '특징: 양자 속성 근접 캐릭터. 생물 영체를 부려 전투하며 아군과 연계해 짧은 시간에 매우 높은 뇌전 원소 피해를 주고 지원도 수행한다.'],
    ['特色：量子属性的远程角色，使用火炮攻击敌人', '특징: 양자 속성 원거리 캐릭터. 대포로 적을 공격한다.']
  ]);

  const INLINE_NAMES = [
    ['彼岸双生', '피안쌍생'],
    ['幻海梦蝶', '환해의 꿈나비'],
    ['蓝莓特攻', '블루베리 특공'],
    ['黯蔷薇', '검은 장미'],
    ['真红骑士·月蚀', '진홍의 기사·월식'],
    ['原罪猎人', '원죄 사냥꾼'],
    ['月下初拥', '월하초옹'],
    ['理之律者', '이치의 율자'],
    ['空之律者', '공간의 율자'],
    ['失落迷迭', '로스트 로즈마리'],
    ['魇夜星渊', '염야성연'],
    ['白夜执事', '백야집사'],
    ['苍骑士·月魂', '창기사·월혼'],
    ['猎袭装·影铁', '헌트 슈트·팬텀 아이언'],
    ['彗星驱动', '혜성 구동'],
    ['雾都迅羽', '안개성의 해청'],
    ['狂热蓝调Δ', '열광 템포Δ'],
    ['第六夜想曲', '제6 야상곡'],
    ['炽翎', '치령'],
    ['影骑士·月轮', '영기사·월륜'],
    ['女武神·迅羽', '발키리·해청'],
    ['圣仪装·今样', '성결 예장·금양'],
    ['神恩颂歌', '신은송가'],
    ['真炎幸魂', '진염행혼'],
    ['银狼的黎明', '은랑의 여명'],
    ['樱火轮舞', '앵화윤무'],
    ['女武神·誓约', '발키리·서약'],
    ['御神装·勿忘', '현신화·물망초'],
    ['逆神巫女', '역신 무녀'],
    ['雷电女王的鬼铠', '뇌전 여왕의 귀신 갑주'],
    ['异度黑核侵蚀', '이도 흑핵 침식'],
    ['领域装·白练', '투예복·백련'],
    ['驱动装·山吹', '기동장갑·황매화'],
    ['脉冲装·绯红', '펄스 슈트·비홍'],
    ['血色玫瑰', '핏빛 장미'],
    ['女武神·凯旋', '발키리·개선'],
    ['战场疾风', '전장의 질풍'],
    ['融核装·深红', '퓨전 아머·스칼렛'],
    ['次元边界突破', '차원 경계 돌파'],
    ['处刑装·紫苑', '처형복·반혼초'],
    ['时序之律者', '시간의 율자'],
    ['愈生佑翎', '치유의 깃'],
    ['窈窕谍影', '미스 스파이'],
    ['孑遗千星', '별의 여행자'],
    ['天命难逃', '데스테리'],
    ['天行·绘星之卷', '천행·우주를 그리는 별'],
    ['织羽梦旌', '드림위버'],
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

    if (FEATURE_EXACT.has(core)) return leading + FEATURE_EXACT.get(core) + trailing;
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

  function getTranslatorApi() {
    try {
      if (typeof Translator !== 'undefined') return Translator;
    } catch {}
    try {
      if (typeof unsafeWindow !== 'undefined' && unsafeWindow.Translator) return unsafeWindow.Translator;
    } catch {}
    return null;
  }

  let translator = null;
  let translatorCreating = null;
  let backTranslator = null;
  let backTranslatorCreating = null;
  let qaRunning = false;
  let qaCancelled = false;
  let aiEnabled = false;
  let aiProcessorRunning = false;
  let fullBuildCancelled = false;
  const aiJobs = new Map();
  const aiQueue = [];

  function ensureFloatingUiRoot() {
    if (floatingUiRoot?.isConnected) return floatingUiRoot;

    let host = document.getElementById(UI_HOST_ID);
    if (!host) {
      host = document.createElement('div');
      host.id = UI_HOST_ID;

      // 호스트 자체는 화면을 차지하지 않고, Shadow DOM 내부의 fixed 요소만 표시한다.
      Object.assign(host.style, {
        all: 'initial',
        position: 'fixed',
        left: '0',
        top: '0',
        width: '0',
        height: '0',
        margin: '0',
        padding: '0',
        border: '0',
        zIndex: '2147483647',
        pointerEvents: 'none',
        contain: 'style',
        isolation: 'isolate',
      });

      document.documentElement.appendChild(host);
    }

    floatingUiRoot = host.shadowRoot || host.attachShadow({ mode: 'open' });

    if (!floatingUiRoot.querySelector('style[data-hi3-ko-ui]')) {
      const style = document.createElement('style');
      style.dataset.hi3KoUi = '1';
      style.textContent = `
        :host {
          all: initial !important;
        }

        button {
          appearance: none !important;
          -webkit-appearance: none !important;
          box-sizing: border-box !important;
          margin: 0 !important;
          outline: none !important;
          text-transform: none !important;
          letter-spacing: normal !important;
          white-space: nowrap !important;
          user-select: none !important;
          -webkit-user-select: none !important;
          transition: none !important;
          animation: none !important;
          filter: none !important;
        }

        #${AI_BUTTON_ID},
        #${QA_BUTTON_ID},
        #${BADGE_ID} {
          pointer-events: auto !important;
          transform: translateZ(0) !important;
          will-change: transform !important;
          backface-visibility: hidden !important;
          -webkit-backface-visibility: hidden !important;
          contain: layout style paint !important;
        }

        #${AI_STATUS_ID} {
          pointer-events: none !important;
          transform: translateZ(0) !important;
          will-change: transform !important;
          backface-visibility: hidden !important;
          -webkit-backface-visibility: hidden !important;
          contain: layout style paint !important;
        }
      `;
      floatingUiRoot.appendChild(style);
    }

    return floatingUiRoot;
  }

  function getFloatingUiElement(id) {
    const root = floatingUiRoot || document.getElementById(UI_HOST_ID)?.shadowRoot;
    return root?.getElementById(id) || null;
  }

  function setAiStatus(text, busy = false) {
    const el = getFloatingUiElement(AI_STATUS_ID);
    if (!el) return;
    el.textContent = text;
    el.style.display = text ? 'block' : 'none';
    el.dataset.busy = busy ? '1' : '0';
  }

  function openCacheDb() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(CACHE_DB_NAME, CACHE_DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(CACHE_STORE)) {
          db.createObjectStore(CACHE_STORE, { keyPath: 'source' });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function cacheGet(source) {
    try {
      const db = await openCacheDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(CACHE_STORE, 'readonly');
        const req = tx.objectStore(CACHE_STORE).get(source);
        req.onsuccess = () => resolve(req.result?.translated || null);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return null;
    }
  }

  async function cachePut(source, translated, method = 'chrome-ai') {
    if (!source || !translated || source === translated) return;
    try {
      const db = await openCacheDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(CACHE_STORE, 'readwrite');
        tx.objectStore(CACHE_STORE).put({
          source,
          translated,
          method,
          updatedAt: new Date().toISOString(),
        });
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.warn('[silvermu-hi3-ko] cache write failed', error);
    }
  }

  async function cachePutMany(entries, method = 'chrome-ai') {
    const clean = entries.filter((entry) =>
      entry?.source && entry?.translated && entry.source !== entry.translated
    );
    if (!clean.length) return;

    try {
      const db = await openCacheDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(CACHE_STORE, 'readwrite');
        const store = tx.objectStore(CACHE_STORE);
        const now = new Date().toISOString();
        for (const entry of clean) {
          store.put({
            source: entry.source,
            translated: entry.translated,
            method: entry.method || method,
            updatedAt: now,
          });
        }
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } catch (error) {
      console.warn('[silvermu-hi3-ko] bulk cache write failed', error);
    }
  }

  async function cacheGetAll() {
    try {
      const db = await openCacheDb();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(CACHE_STORE, 'readonly');
        const req = tx.objectStore(CACHE_STORE).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch {
      return [];
    }
  }

  async function cacheClear() {
    try {
      const db = await openCacheDb();
      await new Promise((resolve, reject) => {
        const tx = db.transaction(CACHE_STORE, 'readwrite');
        tx.objectStore(CACHE_STORE).clear();
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
    } catch {}
  }

  function protectKnownNames(input) {
    let text = String(input);
    const slots = [];
    for (const [from, to] of INLINE_NAMES) {
      if (!text.includes(from)) continue;
      const token = '[[HI3NAME' + slots.length + ']]';
      slots.push({ token, value: to });
      text = text.split(from).join(token);
    }
    return {
      text,
      restore(value) {
        let out = String(value);
        for (const slot of slots) out = out.split(slot.token).join(slot.value);
        return out;
      },
    };
  }

  const REVIEWED_OUTPUT_EXACT = new Map([
    ['다른 쪽 쌍둥이', '피안쌍생'],
    ['판타지 바다 꿈 나비', '환해의 꿈나비'],
    ['블루베리 공격', '블루베리 특공'],
    ['다크 로즈', '검은 장미'],
    ['전정한 레드 나이트 문 일식', '진홍의 기사·월식'],
    ['오리지널 신 헌터', '원죄 사냥꾼'],
    ['달 아래에서 시작합니다', '월하초옹'],
    ['하늘의 로어', '공간의 율자'],
    ['킹 나이트 문 소울', '창기사·월혼'],
    ['사냥 부착물 - 그림자 철', '헌트 슈트·팬텀 아이언'],
    ['여섯 번째 밤 삼', '제6 야상곡'],
    ['여섯 번째 밤 상', '제6 야상곡'],
    ['Sixth Night Serenade', '제6 야상곡'],
    ['치 링', '치령'],
    ['새도우 나이트 문 휠', '영기사·월륜'],
    ['Shadow Knight Moon Wheel', '영기사·월륜'],
    ['발키리 Xun Yu', '발키리·해청'],
    ['Valkyrie Xun Yu', '발키리·해청'],
    ['거룩한 의식복 - 오늘', '성결 예장·금양'],
    ['하나님의 은혜', '신은송가'],
    ['진정한 불꽃 쌍둥이의 영혼', '진염행혼'],
    ['실버 늑대의 새벽', '은랑의 여명'],
    ['사쿠라 파이어 휠 댄스', '앵화윤무'],
    ['발키리·맹세', '발키리·서약'],
    ['Royal God 복장 - 잊지 마세요', '현신화·물망초'],
    ['신에 대한 미코', '역신 무녀'],
    ['천둥의 여왕의 유령 갑옷', '뇌전 여왕의 귀신 갑주'],
    ['Xenometric Black Nucleus 침식', '이도 흑핵 침식'],
    ['Xenometric Black Nucleus', '이도 흑핵 침식'],
  ]);

  const POST_EDIT_GLOSSARY = [
    // 세계관 핵심 용어
    ['律者', '율자', ['변호사', '법률가', 'Lawr', 'lawr', 'Lawyer', 'lawyer', 'Herrscher', 'Herscher', '법칙']],
    ['天命', '천명', ['운명', 'Destiny', 'destiny', 'Schicksal', 'Shicksal']],
    ['逆熵', '네겐트로피', ['역 엔트로피', '역엔트로피', 'Anti-Entropy', 'anti-entropy', 'Reverse Entropy']],
    ['圣痕', '성흔', ['낙인', 'Stigma', 'stigma', '성스러운 흔적', '성스러운 낙인']],
    ['舰长', '함장', ['캡틴', '선장', 'Captain', 'captain']],
    ['女武神', '발키리', ['전투여신', '전투 여신', '전투무녀', '전투 무녀', '전투처녀', '전투 처녀', 'Valkyrie']],
    ['崩坏兽', '붕괴수', ['Honkai Beast', 'Honkai beast', '혼카이 비스트', 'Broken Beast', 'broken beast', '붕괴된 짐승', '부서진 짐승']],
    ['崩坏能', '붕괴 에너지', ['Honkai Energy', 'Honkai energy', '혼카이 에너지', 'Broken Energy', 'broken energy', '붕괴된 에너지', '부서진 에너지', '파손 에너지']],
    ['崩坏', '붕괴', ['Honkai', 'honkai', '혼카이']],
    ['爱酱', '아이쨩', ['사랑 소스', '러브 소스', 'AI 소스', '아이 소스', 'Love Sauce', 'Ai-chan', 'AI-chan']],
    ['重装小兔', '중장토끼', ['Armored Bunny', 'Armor Bunny', '장갑 토끼', '중장 토끼']],
    ['月光王座', '월광왕좌', ['Moonlight Throne', '달빛 왕좌', '달빛 옥좌']],
    ['神之键', '신의 열쇠', ['God Key', 'Key of God', '신의 키']],
    ['往世乐土', '과거의 낙원', ['Elysian Realm', '왕세낙토']],
    ['记忆战场', '기억 전장', ['Memory Battlefield', '메모리 전장']],
    ['圣芙蕾雅', '성 프레이야', ['St. Freya', 'Saint Freya', '성 프레야']],

    // 주요 인명
    ['琪亚娜', '키아나', ['Kiana', '키아나아']],
    ['雷电芽衣', '라이덴 메이', ['Raiden Mei', '라이덴 메이이']],
    ['芽衣', '메이', ['Mei', '메이이']],
    ['布洛妮娅', '브로냐', ['Bronya', 'Bronia', '브로니아']],
    ['德丽莎', '테레사', ['Theresa', 'Teresa', '데리사']],
    ['无量塔姬子', '무라타 히메코', ['Murata Himeko', '무라타 지코']],
    ['姬子', '히메코', ['Himeko', '지코']],
    ['符华', '후카', ['Fu Hua', 'Fuhua', '푸화']],
    ['卡莲', '카렌', ['Kallen', 'Karen', '카를렌']],
    ['西琳', '시린', ['Sirin', 'Xilin', '실린']],
    ['可可利亚', '코콜리아', ['Cocolia', 'Kokolia', 'Cocoia']],
    ['齐格飞', '지크프리트', ['Siegfried', '지그페이', '지그프리드']],
    ['塞西莉亚', '세실리아', ['Cecilia', '세시리아']],
    ['八重樱', '야에 사쿠라', ['Yae Sakura', '예아 사쿠라', '야에 사쿠라']],
    ['八重凛', '야에 린', ['Yae Rin', '예아 린']],
    ['幽兰黛尔', '듀란달', ['Durandal', '유란델']],
    ['丽塔', '리타', ['Rita']],
    ['希儿', '제레', ['Seele', '실']],
    ['爱莉希雅', '엘리시아', ['Elysia', '엘리샤']],
    ['阿波尼亚', '아포니아', ['Aponia']],
    ['伊甸', '에덴', ['Eden']],
    ['维尔薇', '빌브이', ['Vill-V', 'Vil-V']],
    ['千劫', '칼파스', ['Kalpas', '칼파']],
    ['梅比乌斯', '뫼비우스', ['Mobius', 'Möbius', '모비우스']],
    ['帕朵菲莉丝', '파르도 필리스', ['Pardofelis', 'Pardo Felis']],
    ['格蕾修', '그리세오', ['Griseo']],
    ['科斯魔', '코스마', ['Kosma']],
    ['凯文', '케빈', ['Kevin']],
    ['希娜狄雅', '세나디아', ['Senadina', 'Sina Diya', 'Hina Diya']],
    ['科拉莉', '코랄리', ['Coralie', 'Korali']],
    ['赫丽娅', '헬리아', ['Helia']],
    ['薇塔', '비타', ['Vita']],
    ['寻梦者', '드림시커', ['Dreamseeker', '몽상가', '몽상자']],

    // 전투/스탯 용어
    ['火焰元素伤害', '화염 원소 피해', ['화염 요소 피해', '화재 원소 피해', 'Fire Elemental Damage']],
    ['冰冻元素伤害', '빙결 원소 피해', ['얼음 요소 피해', '빙결 요소 피해', '동결 원소 피해', 'Ice Elemental Damage']],
    ['雷电元素伤害', '뇌전 원소 피해', ['번개 피해', '번개 원소 피해', '뇌전 요소 피해', 'Lightning Elemental Damage']],
    ['物理伤害', '물리 피해', ['Physical Damage', '물리적 피해']],
    ['必杀技', '필살기', ['궁극기', 'Ultimate']],
    ['普通攻击', '기본 공격', ['일반 공격', 'Normal Attack']],
    ['分支攻击', '분기 공격', ['Branch Attack']],
    ['蓄力攻击', '차지 공격', ['충전 공격', 'Charged Attack']],
    ['极限闪避', '극한 회피', ['Ultimate Evasion', '한계 회피']],
    ['时空断裂', '시공 단열', ['Time Fracture', '시공간 파열']],
    ['时空减速', '시공 감속', ['Time Slow', '시공간 감속']],
    ['流血', '출혈', ['Bleeding', 'Bleed']],
    ['点燃', '점화', ['Ignite', '연소']],
    ['麻痹', '마비', ['Paralysis']],
    ['脆弱', '취약', ['Impair', '약화']],
    ['会心', '회심', ['Crit', '크리티컬']],

    // 자주 보이는 장비/캐릭터 표기 오역
    ['圣遗物', '성유물', ['거룩한 유물', '성스러운 유물', 'Holy Relic', 'Holy Relics']],
    ['驱动装', '기동장갑', ['드라이버', 'Driver']],
    ['白骑士·月光', '백기사·월광', ['화이트 나이트 문라이트', 'White Knight Moonlight']],
    ['女武神·游侠', '발키리·레인저', ['발키리 레인저', 'Valkyrie Ranger']],
    ['女武神·强袭', '발키리·스트라이크', ['발키리 스트라이크', 'Valkyrie Strike']],
    ['女武神·战车', '발키리·채리엇', ['발키리 전차', 'Valkyrie Chariot']],
    ['雪地狙击', '설원 저격수', ['스노우 스나이퍼', 'Snowy Sniper']],
    ['圣女祈祷', '성녀의 기도', ['성도 기도', 'Saint Prayer']],
    ['影舞冲击', '그림자의 춤', ['그림자 댄스 임팩트', 'Shadow Dash']],
    ['脉冲装·绯红', '펄스 슈트·비홍', ['펄스 복장', 'Pulse Suit Crimson']],
    ['领域装·白练', '투예복·백련', ['영역 장갑', 'Domain Suit White']],
  ];

  function replaceLimited(text, bad, good, limit) {
    if (!bad || bad === good || limit <= 0 || !text.includes(bad)) return { text, used: 0 };
    let out = text;
    let used = 0;
    while (used < limit) {
      const index = out.indexOf(bad);
      if (index < 0) break;
      out = out.slice(0, index) + good + out.slice(index + bad.length);
      used += 1;
    }
    return { text: out, used };
  }

  function postEditTranslation(source, translated) {
    let out = String(translated ?? '');
    if (!out) return out;

    const reviewedExact = REVIEWED_OUTPUT_EXACT.get(out.trim());
    if (reviewedExact) return reviewedExact;

    for (const [sourceTerm, good, badForms] of POST_EDIT_GLOSSARY) {
      const sourceCount = source.split(sourceTerm).length - 1;
      if (!sourceCount) continue;

      let remaining = sourceCount;
      for (const bad of badForms) {
        if (remaining <= 0) break;
        const result = replaceLimited(out, bad, good, remaining);
        out = result.text;
        remaining -= result.used;
      }
    }

    // 흔한 기계번역 표기 흔들림 정리
    out = out
      .replace(/\bQte\b/g, 'QTE')
      .replace(/\bqte\b/g, 'QTE')
      .replace(/\s+([,.!?。！？])/g, '$1')
      .replace(/([가-힣])\s+([,.!?])/g, '$1$2')
      .replace(/ {2,}/g, ' ');

    return out;
  }

  async function rewriteCacheWithPostEdit(options = {}) {
    const { silent = false } = options;
    if (!silent) setAiStatus('기존 번역 캐시 용어 교정 중…', true);

    try {
      const rows = await cacheGetAll();
      const changed = [];

      for (const row of rows) {
        const revised = postEditTranslation(row.source, row.translated);
        if (revised && revised !== row.translated) {
          changed.push({
            source: row.source,
            translated: revised,
            method: 'post-edited',
          });
        }
      }

      const chunk = 500;
      for (let i = 0; i < changed.length; i += chunk) {
        await cachePutMany(changed.slice(i, i + chunk), 'post-edited');
      }

      if (!silent) {
        setAiStatus('기존 캐시 용어 교정 완료: ' + changed.length + '개');
        window.alert(
          '기존 AI 번역 캐시의 붕괴3rd 용어를 교정했습니다.\n' +
          '수정된 번역: ' + changed.length + '개\n\n' +
          '페이지를 새로고침하면 적용됩니다.'
        );
      }

      return changed.length;
    } catch (error) {
      console.error('[silvermu-hi3-ko] post edit failed', error);
      if (!silent) setAiStatus('캐시 교정 실패: ' + (error?.message || error));
      return 0;
    }
  }

  async function autoMigrateCachedTranslations() {
    const migrated = localStorage.getItem(CACHE_MIGRATION_KEY);
    if (migrated === VERSION) return false;

    setAiStatus('기존 번역 캐시를 v' + VERSION + ' 기준으로 정리 중…', true);
    const changed = await rewriteCacheWithPostEdit({ silent: true });
    localStorage.setItem(CACHE_MIGRATION_KEY, VERSION);

    // 기존 화면에 이미 출력된 기계번역은 중국어가 사라져 있어 재스캔으로 잡히지 않는다.
    // 캐시를 갱신한 뒤 딱 한 번 새로고침하여 원문->새 캐시 흐름을 다시 태운다.
    if (changed > 0) {
      setAiStatus('기존 번역 ' + changed + '개 정리 완료 · 화면 다시 불러오는 중…', true);
      window.setTimeout(() => location.reload(), 350);
      return true;
    }

    setAiStatus('');
    return false;
  }

  async function ensureTranslator() {
    if (translator) return translator;
    if (translatorCreating) return translatorCreating;

    const API = getTranslatorApi();
    if (!API) throw new Error('Chrome Translator API를 찾을 수 없습니다.');

    translatorCreating = API.create({
      sourceLanguage: 'zh',
      targetLanguage: 'ko',
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          const pct = Math.round((e.loaded || 0) * 100);
          setAiStatus('중→한 번역 모델 준비 중… ' + pct + '%', true);
        });
      },
    }).then((t) => {
      translator = t;
      translatorCreating = null;
      setAiStatus('Chrome 로컬 AI 번역 준비 완료');
      window.setTimeout(() => setAiStatus(''), 1800);
      return t;
    }).catch((error) => {
      translatorCreating = null;
      throw error;
    });

    return translatorCreating;
  }

  async function ensureBackTranslator() {
    if (backTranslator) return backTranslator;
    if (backTranslatorCreating) return backTranslatorCreating;

    const API = getTranslatorApi();
    if (!API) throw new Error('Chrome Translator API를 찾을 수 없습니다.');

    backTranslatorCreating = API.create({
      sourceLanguage: 'ko',
      targetLanguage: 'zh',
      monitor(m) {
        m.addEventListener('downloadprogress', (e) => {
          const pct = Math.round((e.loaded || 0) * 100);
          setAiStatus('한→중 검수 모델 준비 중… ' + pct + '%', true);
        });
      },
    }).then((t) => {
      backTranslator = t;
      backTranslatorCreating = null;
      return t;
    }).catch((error) => {
      backTranslatorCreating = null;
      throw error;
    });

    return backTranslatorCreating;
  }

  function normalizeForQa(text) {
    return String(text || '')
      .replace(/[\s\p{P}\p{S}]+/gu, '')
      .toLowerCase();
  }

  function makeNgramSet(text, n) {
    const clean = normalizeForQa(text);
    const set = new Set();
    if (!clean) return set;
    if (clean.length < n) {
      set.add(clean);
      return set;
    }
    for (let i = 0; i <= clean.length - n; i += 1) {
      set.add(clean.slice(i, i + n));
    }
    return set;
  }

  function jaccardSet(a, b) {
    if (!a.size && !b.size) return 1;
    if (!a.size || !b.size) return 0;
    let inter = 0;
    for (const item of a) if (b.has(item)) inter += 1;
    return inter / (a.size + b.size - inter);
  }

  function semanticSimilarityZh(a, b) {
    const uni = jaccardSet(makeNgramSet(a, 1), makeNgramSet(b, 1));
    const bi = jaccardSet(makeNgramSet(a, 2), makeNgramSet(b, 2));
    return 0.4 * uni + 0.6 * bi;
  }

  function extractNumberTokens(text) {
    return (String(text).match(/\d+(?:\.\d+)?%?/g) || []).sort();
  }

  function sameNumberTokens(a, b) {
    return JSON.stringify(extractNumberTokens(a)) === JSON.stringify(extractNumberTokens(b));
  }

  const QA_ALLOWED_LATIN = new Set([
    'QTE','SP','HP','ATK','DEF','SS','SSS','EX','DLC','CG','ID','AI',
    'Type','TYPE','BINGO','KFC','CN','S','A','B','C'
  ]);

  const QA_BAD_SHORT_PHRASES = [
    '다른 쪽', '판타지 바다', '하늘의 로어', '에서 시작합니다',
    '유령 갑옷', '영혼 각성', 'Royal God', 'Xun Yu', 'Xenometric',
    'Original Sin Hunter', 'Shadow Knight', 'White Knight', 'Blueberry Attack'
  ];

  function staticReviewedTranslation(source) {
    if (FEATURE_EXACT.has(source)) return FEATURE_EXACT.get(source);
    if (EXACT.has(source)) return EXACT.get(source);
    return null;
  }

  function qaHeuristic(source, candidate) {
    let score = 100;
    const reasons = [];
    const out = String(candidate || '').trim();
    const src = String(source || '').trim();

    if (!out) return { score: 0, reasons: ['빈 번역'] };

    if (HAN_RE.test(out)) {
      score -= 28;
      reasons.push('중국어 잔존');
    }

    if (!sameNumberTokens(src, out)) {
      score -= 22;
      reasons.push('숫자/퍼센트 불일치');
    }

    let glossaryPenalty = 0;
    for (const [sourceTerm, good] of POST_EDIT_GLOSSARY) {
      if (src.includes(sourceTerm) && !out.includes(good)) {
        glossaryPenalty += 8;
      }
    }
    if (glossaryPenalty) {
      score -= Math.min(28, glossaryPenalty);
      reasons.push('용어집 불일치');
    }

    const latin = out.match(/[A-Za-z][A-Za-z0-9_-]{2,}/g) || [];
    const suspiciousLatin = latin.filter((token) =>
      !QA_ALLOWED_LATIN.has(token) && !src.toLowerCase().includes(token.toLowerCase())
    );
    if (suspiciousLatin.length) {
      score -= Math.min(20, suspiciousLatin.length * 5);
      reasons.push('불필요한 영문 혼입');
    }

    const srcLen = Math.max(1, normalizeForQa(src).length);
    const outLen = normalizeForQa(out).length;
    const ratio = outLen / srcLen;
    if (ratio < 0.32 || ratio > 3.6) {
      score -= 20;
      reasons.push('길이 비정상');
    } else if (ratio < 0.48 || ratio > 2.8) {
      score -= 8;
      reasons.push('길이 편차');
    }

    const isShortTitle = srcLen <= 22 && !/[。！？；,.!?]/.test(src);
    if (isShortTitle) {
      for (const bad of QA_BAD_SHORT_PHRASES) {
        if (out.includes(bad)) {
          score -= 22;
          reasons.push('직역형 제목');
          break;
        }
      }
      if (out.split(/\s+/).length >= 6) {
        score -= 10;
        reasons.push('제목 과도한 문장화');
      }
    }

    if (/\b(?:the|of|and|with|from|to)\b/i.test(out) && !/[A-Za-z]{3,}/.test(src)) {
      score -= 8;
      reasons.push('영어 문장 잔존');
    }

    return { score: Math.max(0, score), reasons };
  }

  async function freshTranslateForQa(source, sentenceWise = false) {
    const reviewed = staticReviewedTranslation(source);
    if (reviewed) return reviewed;

    const t = await ensureTranslator();
    const protectedText = protectKnownNames(source);

    if (!sentenceWise || source.length < 45) {
      const raw = await withTimeout(t.translate(protectedText.text), 35000, 'QA fresh translate');
      return postEditTranslation(source, protectedText.restore(raw));
    }

    const parts = protectedText.text.split(/([。！？；\n]+)/).filter(Boolean);
    const out = [];
    for (const part of parts) {
      if (/^[。！？；\n]+$/.test(part)) {
        out.push(part);
        continue;
      }
      const translated = await withTimeout(t.translate(part), 35000, 'QA sentence translate');
      out.push(translated);
    }
    return postEditTranslation(source, protectedText.restore(out.join('')));
  }

  async function backTranslateForQa(korean) {
    const t = await ensureBackTranslator();
    return await withTimeout(t.translate(korean), 35000, 'QA back translate');
  }

  async function qaCandidateScore(source, candidate, useBackTranslation = true) {
    const heuristic = qaHeuristic(source, candidate);
    let semantic = null;
    let finalScore = heuristic.score;

    if (useBackTranslation) {
      try {
        const back = await backTranslateForQa(candidate);
        semantic = semanticSimilarityZh(source, back);
        finalScore += semantic * 35;
      } catch (error) {
        console.warn('[silvermu-hi3-ko] back translation failed', error);
      }
    }

    return {
      candidate,
      heuristic: heuristic.score,
      reasons: heuristic.reasons,
      semantic,
      finalScore,
    };
  }

  async function reviewOneTranslation(source, current) {
    const reviewed = staticReviewedTranslation(source);
    if (reviewed) {
      return {
        source,
        before: current,
        after: reviewed,
        changed: reviewed !== current,
        confidence: 1,
        reasons: ['검수 고정 번역'],
        markReviewed: true,
      };
    }

    const currentFixed = postEditTranslation(source, current);
    const currentHeuristic = qaHeuristic(source, currentFixed);

    // 1차 고속 통과: 이미 충분히 정상적인 번역은 역번역을 하지 않는다.
    if (currentHeuristic.score >= 92 && !HAN_RE.test(currentFixed)) {
      return {
        source,
        before: current,
        after: currentFixed,
        changed: currentFixed !== current,
        confidence: 0.94,
        reasons: currentHeuristic.reasons,
        score: currentHeuristic.score,
        markReviewed: true,
      };
    }

    const candidates = [{
      candidate: currentFixed,
      heuristic: currentHeuristic.score,
      reasons: currentHeuristic.reasons,
    }];

    try {
      const fresh = await freshTranslateForQa(source, false);
      if (fresh && !candidates.some((x) => x.candidate === fresh)) {
        const h = qaHeuristic(source, fresh);
        candidates.push({ candidate: fresh, heuristic: h.score, reasons: h.reasons });
      }
    } catch {}

    // 장문이며 두 후보 모두 좋지 않을 때만 문장 분할 재번역을 추가한다.
    const bestCheapNow = Math.max(...candidates.map((x) => x.heuristic));
    if (source.length >= 60 && bestCheapNow < 84) {
      try {
        const segmented = await freshTranslateForQa(source, true);
        if (segmented && !candidates.some((x) => x.candidate === segmented)) {
          const h = qaHeuristic(source, segmented);
          candidates.push({ candidate: segmented, heuristic: h.score, reasons: h.reasons });
        }
      } catch {}
    }

    candidates.sort((a, b) => b.heuristic - a.heuristic);
    const cheapBest = candidates[0];
    const cheapSecond = candidates[1];

    // 휴리스틱 점수 차이가 충분하면 역번역 없이 선택한다.
    if (
      cheapBest.heuristic >= 82 &&
      (!cheapSecond || cheapBest.heuristic - cheapSecond.heuristic >= 12)
    ) {
      const confidence = Math.min(0.96, 0.72 + Math.max(0, cheapBest.heuristic - 82) / 70);
      return {
        source,
        before: current,
        after: cheapBest.candidate,
        changed: cheapBest.candidate !== current,
        confidence,
        reasons: cheapBest.reasons,
        score: cheapBest.heuristic,
        markReviewed: confidence >= 0.8,
      };
    }

    // 2차 정밀 검수: 정말 애매한 상위 2개 후보에만 역번역을 사용한다.
    const precisionTargets = candidates.slice(0, 2);
    const scored = [];
    for (const item of precisionTargets) {
      const full = await qaCandidateScore(source, item.candidate, true);
      scored.push(full);
    }
    scored.sort((a, b) => b.finalScore - a.finalScore);

    const best = scored[0];
    const second = scored[1];
    const confidence = second
      ? Math.max(0, Math.min(1, (best.finalScore - second.finalScore + 15) / 30))
      : Math.max(0, Math.min(1, best.finalScore / 125));

    return {
      source,
      before: current,
      after: best.candidate,
      changed: best.candidate !== current,
      confidence,
      reasons: best.reasons,
      score: best.finalScore,
      semantic: best.semantic,
      markReviewed: confidence >= 0.72 && best.finalScore >= 92,
    };
  }

  function getCurrentDatasetName() {
    const cat = new URL(location.href).searchParams.get('cat') || 'characters';
    const aliases = {
      characters: 'characters',
      weapons: 'weapons',
      stigmata: 'stigmata',
      elfs: 'elfs',
      materials: 'materials',
      tasks: 'tasks',
      abyss: 'abyss',
      shops: 'shops',
      cg: 'cg',
    };
    return aliases[cat] || 'characters';
  }

  async function runQaReview(scope = 'current') {
    if (qaRunning) {
      setAiStatus('자동검수가 이미 실행 중입니다.');
      return;
    }

    qaRunning = true;
    qaCancelled = false;
    updateQaButton();

    const unresolved = [];
    let changed = 0;
    let reviewedCount = 0;

    try {
      // 사용자 클릭 직후 양방향 번역기를 먼저 준비한다.
      await ensureTranslator();
      await ensureBackTranslator();

      const rows = await cacheGetAll();
      const rowMap = new Map(rows.map((row) => [row.source, row]));
      let sources = [];

      if (scope === 'current') {
        const name = getCurrentDatasetName();
        const path = FULL_DATASETS[name];
        setAiStatus('QA: ' + name + ' 원문 읽는 중…', true);
        sources = await fetchSingleDatasetStrings(name, path);
      } else {
        setAiStatus('QA: 전체 데이터에서 의심 번역 선별 중…', true);
        const set = new Set();
        for (const [name, path] of Object.entries(FULL_DATASETS)) {
          if (qaCancelled) break;
          const strings = await fetchSingleDatasetStrings(name, path);
          for (const source of strings) set.add(source);
        }
        sources = [...set];
      }

      const targets = [];
      for (const source of sources) {
        const row = rowMap.get(source);
        if (!row?.translated) continue;
        if (row.method === 'static' || row.method === 'qa-reviewed') continue;

        const fixed = postEditTranslation(source, row.translated);
        const check = qaHeuristic(source, fixed);
        const srcLen = normalizeForQa(source).length;
        const isShortTitle = srcLen <= 22 && !/[。！？；,.!?]/.test(source);

        // 설명은 낮은 점수만, 짧은 제목은 조금 더 넓게 검수한다.
        if (check.score < 88 || (isShortTitle && check.score < 96)) {
          targets.push({ source, translated: fixed });
        }
      }

      if (!targets.length) {
        setAiStatus('QA: 의심 번역이 없습니다.');
        window.setTimeout(() => setAiStatus(''), 1500);
        return;
      }

      for (let i = 0; i < targets.length; i += 1) {
        if (qaCancelled) break;

        const item = targets[i];
        setAiStatus(
          '자동검수(고속) ' + (i + 1) + '/' + targets.length +
          ' · 수정 ' + changed + '개 · 보류 ' + unresolved.length + '개',
          true
        );

        const result = await reviewOneTranslation(item.source, item.translated);
        reviewedCount += 1;

        // 확신이 충분한 결과는 변경 여부와 무관하게 qa-reviewed로 표시한다.
        // 다음 QA 실행에서 같은 항목을 다시 검사하지 않게 해 전체 속도를 높인다.
        if (result.confidence >= 0.58 && (result.changed || result.markReviewed)) {
          await cachePutMany([{
            source: result.source,
            translated: result.after,
            method: 'qa-reviewed',
          }], 'qa-reviewed');
          if (result.changed) changed += 1;
        } else if ((result.score || 0) < 105 || result.confidence < 0.58) {
          unresolved.push({
            source: result.source,
            current: result.after,
            confidence: Number((result.confidence || 0).toFixed(3)),
            score: result.score || null,
            reasons: result.reasons || [],
          });
        }

        await new Promise((resolve) => window.setTimeout(resolve, 10));
      }

      if (qaCancelled) {
        setAiStatus('자동검수 취소됨 · 완료분은 저장됨');
        return;
      }

      if (unresolved.length) {
        await exportJson('hi3-ko-qa-unresolved-' + VERSION + '.json', {
          patchVersion: VERSION,
          generatedAt: new Date().toISOString(),
          scope,
          reviewed: reviewedCount,
          changed,
          unresolved,
        });
      }

      setAiStatus(
        '자동검수 완료 · 검사 ' + reviewedCount +
        '개 · 수정 ' + changed +
        '개 · 보류 ' + unresolved.length + '개'
      );

      window.setTimeout(() => location.reload(), 900);
    } catch (error) {
      console.error('[silvermu-hi3-ko] QA failed', error);
      setAiStatus('자동검수 오류: ' + (error?.message || error));
    } finally {
      qaRunning = false;
      updateQaButton();
    }
  }

  async function translateWithAi(source) {
    // 새 수동/규칙 번역은 예전에 저장된 AI 캐시보다 항상 우선한다.
    const staticFirst = translateString(source);
    if (staticFirst !== source && !HAN_RE.test(staticFirst)) {
      await cachePut(source, staticFirst, 'static');
      return staticFirst;
    }

    const cached = await cacheGet(source);
    if (cached) return postEditTranslation(source, cached);

    const t = await ensureTranslator();
    const protectedText = protectKnownNames(source);
    let result;

    if (protectedText.text.length <= 5000) {
      result = await t.translate(protectedText.text);
    } else {
      const parts = [];
      let rest = protectedText.text;
      while (rest.length > 5000) {
        let cut = rest.lastIndexOf('\n', 4800);
        if (cut < 1200) cut = rest.lastIndexOf('。', 4800);
        if (cut < 1200) cut = 4800;
        parts.push(rest.slice(0, cut + 1));
        rest = rest.slice(cut + 1);
      }
      if (rest) parts.push(rest);
      const translatedParts = [];
      for (const part of parts) translatedParts.push(await t.translate(part));
      result = translatedParts.join('');
    }

    result = protectedText.restore(result);
    result = postEditTranslation(source, result);
    if (result && result !== source) await cachePut(source, result, 'chrome-ai');
    return result || source;
  }

  function preserveWhitespace(original, translated) {
    const leading = original.match(/^\s*/)?.[0] || '';
    const trailing = original.match(/\s*$/)?.[0] || '';
    return leading + translated.trim() + trailing;
  }

  function applyAiResult(job, translated) {
    for (const target of job.targets) {
      try {
        if (target.kind === 'text') {
          if (!target.node?.isConnected) continue;
          target.node.nodeValue = preserveWhitespace(target.original, translated);
        } else if (target.kind === 'attr') {
          if (!target.el?.isConnected) continue;
          target.el.setAttribute(target.attr, translated);
        } else if (target.kind === 'value') {
          if (!target.el?.isConnected) continue;
          target.el.value = translated;
        }
      } catch {}
    }
  }

  async function processAiQueue() {
    if (aiProcessorRunning || !aiEnabled) return;
    aiProcessorRunning = true;
    let done = 0;

    try {
      while (aiEnabled && aiQueue.length) {
        const source = aiQueue.shift();
        const job = aiJobs.get(source);
        if (!job) continue;
        aiJobs.delete(source);

        try {
          const translated = await translateWithAi(source);
          applyAiResult(job, translated);
        } catch (error) {
          console.warn('[silvermu-hi3-ko] AI translate failed', error);
          setAiStatus('AI 번역 오류: ' + (error?.message || error));
          break;
        }

        done += 1;
        if (done % 5 === 0) {
          setAiStatus('현재 화면 번역 중… 대기 ' + aiQueue.length + '개', true);
          await new Promise((resolve) => window.setTimeout(resolve, 0));
        }
      }
    } finally {
      aiProcessorRunning = false;
      if (aiEnabled && !aiQueue.length) {
        setAiStatus('현재 화면 번역 완료');
        window.setTimeout(() => setAiStatus(''), 1500);
      }
    }
  }

  function enqueueAiTarget(source, target) {
    const normalized = normalizeText(source);
    if (!normalized || !HAN_RE.test(normalized)) return;

    let job = aiJobs.get(normalized);
    if (!job) {
      job = { source: normalized, targets: [] };
      aiJobs.set(normalized, job);
      aiQueue.push(normalized);
    }
    job.targets.push(target);
  }

  function scanAiTargets(root = document) {
    if (!aiEnabled || !root) return;

    const visitText = (node) => {
      const parent = node.parentElement;
      if (!parent || SKIP_TAGS.has(parent.tagName)) return;
      const value = node.nodeValue || '';
      if (!HAN_RE.test(value)) return;
      enqueueAiTarget(value, { kind: 'text', node, original: value });
    };

    const visitElement = (el) => {
      if (!(el instanceof Element) || SKIP_TAGS.has(el.tagName)) return;
      for (const attr of ATTRS) {
        const value = el.getAttribute(attr);
        if (value && HAN_RE.test(value)) {
          enqueueAiTarget(value, { kind: 'attr', el, attr, original: value });
        }
      }
      if (el instanceof HTMLInputElement && ['button', 'submit', 'reset'].includes(el.type)) {
        if (HAN_RE.test(el.value)) enqueueAiTarget(el.value, { kind: 'value', el, original: el.value });
      }
    };

    if (root.nodeType === Node.TEXT_NODE) visitText(root);
    else if (root instanceof Element) visitElement(root);

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeType === Node.TEXT_NODE) visitText(node);
      else visitElement(node);
    }

    void processAiQueue();
  }

  async function enableAiTranslation() {
    const API = getTranslatorApi();
    if (!API) {
      window.alert('이 Chrome에서는 Translator API를 사용할 수 없습니다. 데스크톱 Chrome 138 이상이 필요합니다.');
      return;
    }

    aiEnabled = true;
    localStorage.setItem(AI_ENABLED_KEY, '1');
    setAiStatus('Chrome 로컬 AI 번역 준비 중…', true);

    try {
      await ensureTranslator();
      scanAiTargets(document);
      updateAiButton();
    } catch (error) {
      aiEnabled = false;
      localStorage.setItem(AI_ENABLED_KEY, '0');
      updateAiButton();
      window.alert('Chrome AI 번역기를 시작하지 못했습니다.\n' + (error?.message || error));
    }
  }

  function disableAiTranslation() {
    aiEnabled = false;
    localStorage.setItem(AI_ENABLED_KEY, '0');
    updateAiButton();
    setAiStatus('AI 자동번역 꺼짐');
    window.setTimeout(() => setAiStatus(''), 1200);
  }

  function updateAiButton() {
    const btn = getFloatingUiElement(AI_BUTTON_ID);
    if (!btn) return;
    btn.textContent = aiEnabled ? 'AI✓' : 'AI';
    btn.title = aiEnabled
      ? 'Chrome 로컬 AI 번역 켜짐 · 클릭: 끄기 · 우클릭: 전체 DB 번역/전수검사'
      : '클릭: 현재 화면 전체번역 · 우클릭: 전체 DB 번역/전수검사';
  }

  function updateQaButton() {
    const btn = getFloatingUiElement(QA_BUTTON_ID);
    if (!btn) return;
    btn.textContent = qaRunning ? 'QA…' : 'QA';
    btn.title = qaRunning
      ? '자동검수 실행 중 · 클릭하면 취소'
      : '클릭: 현재 카테고리 자동검수 · 우클릭: 전체 DB 자동검수';
  }

  function addQaButton() {
    const uiRoot = ensureFloatingUiRoot();
    if (getFloatingUiElement(QA_BUTTON_ID)) return;

    const btn = document.createElement('button');
    btn.id = QA_BUTTON_ID;
    btn.type = 'button';
    Object.assign(btn.style, {
      position: 'fixed',
      left: '66px',
      right: 'auto',
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
      pointerEvents: 'auto',
      transform: 'translateZ(0)',
      willChange: 'transform',
      backfaceVisibility: 'hidden',
      animation: 'none',
      transition: 'none',
      contain: 'layout style paint',
    });

    btn.addEventListener('click', () => {
      if (qaRunning) {
        qaCancelled = true;
        setAiStatus('자동검수 취소 요청됨…', true);
        return;
      }
      void runQaReview('current');
    });

    btn.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      if (qaRunning) return;
      void runQaReview('all');
    });

    uiRoot.appendChild(btn);
    updateQaButton();
  }

  function addAiButton() {
    const uiRoot = ensureFloatingUiRoot();
    if (getFloatingUiElement(AI_BUTTON_ID)) return;

    const btn = document.createElement('button');
    btn.id = AI_BUTTON_ID;
    btn.type = 'button';
    Object.assign(btn.style, {
      position: 'fixed',
      left: '14px',
      right: 'auto',
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
      pointerEvents: 'auto',
      transform: 'translateZ(0)',
      willChange: 'transform',
      backfaceVisibility: 'hidden',
      animation: 'none',
      transition: 'none',
      contain: 'layout style paint',
    });

    btn.addEventListener('click', () => {
      if (aiEnabled) disableAiTranslation();
      else void enableAiTranslation();
    });
    btn.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      void buildFullTranslationPack();
    });

    uiRoot.appendChild(btn);
    updateAiButton();
    addQaButton();

    const status = document.createElement('div');
    status.id = AI_STATUS_ID;
    Object.assign(status.style, {
      position: 'fixed',
      left: '14px',
      right: 'auto',
      bottom: '54px',
      zIndex: '2147483647',
      display: 'none',
      maxWidth: '360px',
      padding: '8px 11px',
      borderRadius: '8px',
      background: 'Canvas',
      color: 'CanvasText',
      border: '1px solid currentColor',
      font: '12px/1.45 system-ui, sans-serif',
      opacity: '0.94',
      boxShadow: '0 3px 18px rgba(0,0,0,.2)',
      pointerEvents: 'none',
      transform: 'translateZ(0)',
      willChange: 'transform',
      backfaceVisibility: 'hidden',
      animation: 'none',
      transition: 'none',
      contain: 'layout style paint',
    });
    uiRoot.appendChild(status);
  }

  function collectChineseStrings(value, out, seen = new WeakSet()) {
    if (value == null) return;
    if (typeof value === 'string') {
      const text = value.trim();
      if (!text || !HAN_RE.test(text)) return;
      if (/^(?:https?:|assets\/|\/assets\/)/i.test(text)) return;
      out.add(text);
      return;
    }
    if (typeof value !== 'object') return;
    if (seen.has(value)) return;
    seen.add(value);
    if (Array.isArray(value)) {
      for (const item of value) collectChineseStrings(item, out, seen);
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (/^(?:image|icon|url|server|id)$/i.test(key)) continue;
      collectChineseStrings(child, out, seen);
    }
  }

  function withTimeout(promise, ms, label = 'operation') {
    let timer;
    return Promise.race([
      promise,
      new Promise((_, reject) => {
        timer = window.setTimeout(
          () => reject(new Error(label + ' timeout (' + Math.round(ms / 1000) + 's)')),
          ms
        );
      }),
    ]).finally(() => window.clearTimeout(timer));
  }

  async function fetchSingleDatasetStrings(name, path) {
    setAiStatus('전체 검사: ' + name + ' 데이터 읽는 중…', true);
    const response = await fetch(path, { cache: 'no-cache' });
    if (!response.ok) throw new Error(name + ' 데이터 요청 실패: HTTP ' + response.status);
    const json = await response.json();
    const strings = new Set();
    collectChineseStrings(json, strings);
    return [...strings];
  }

  async function fetchDatasetStrings() {
    const result = {};
    for (const [name, path] of Object.entries(FULL_DATASETS)) {
      if (fullBuildCancelled) break;
      setAiStatus('전체 검사: ' + name + ' 데이터 읽는 중…', true);
      const response = await fetch(path, { cache: 'no-cache' });
      if (!response.ok) throw new Error(name + ' 데이터 요청 실패: HTTP ' + response.status);
      const json = await response.json();
      const strings = new Set();
      collectChineseStrings(json, strings);
      result[name] = [...strings];
    }
    return result;
  }

  async function exportJson(filename, value) {
    const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 3000);
  }

  async function exportTranslationPack(datasetStrings = null) {
    const rows = await cacheGetAll();
    const translations = {};
    for (const row of rows) {
      translations[row.source] = postEditTranslation(row.source, row.translated);
    }

    const payload = {
      format: 'silvermu-hi3-ko-cache-v1',
      patchVersion: VERSION,
      generatedAt: new Date().toISOString(),
      engine: 'Chrome Translator API zh→ko + static overrides',
      translations,
    };

    if (!datasetStrings) {
      await exportJson('hi3-ko-translation-pack-' + VERSION + '.json', payload);
      return null;
    }

    const report = {
      patchVersion: VERSION,
      generatedAt: new Date().toISOString(),
      datasets: {},
    };
    let total = 0;
    let translated = 0;

    for (const [name, strings] of Object.entries(datasetStrings)) {
      let ok = 0;
      const remaining = [];
      for (const source of strings) {
        const staticText = translateString(source);
        if (!HAN_RE.test(staticText)) {
          ok += 1;
          continue;
        }
        const cached = translations[source];
        if (cached && !HAN_RE.test(cached)) ok += 1;
        else remaining.push(source);
      }

      total += strings.length;
      translated += ok;
      report.datasets[name] = {
        total: strings.length,
        translated: ok,
        remaining: strings.length - ok,
        coverage: strings.length ? Number((ok / strings.length * 100).toFixed(2)) : 100,
        remainingSamples: remaining.slice(0, 200),
      };
    }

    report.total = {
      strings: total,
      translated,
      remaining: total - translated,
      coverage: total ? Number((translated / total * 100).toFixed(2)) : 100,
    };

    await exportJson('hi3-ko-full-audit-' + VERSION + '.json', {
      ...payload,
      coverage: report,
    });
    return report;
  }

  async function translateBatch(items) {
    if (!items.length) return [];
    const t = await ensureTranslator();

    async function translateMarked(batch) {
      const protectedItems = batch.map((source) => protectKnownNames(source));
      const marked = protectedItems
        .map((item, i) => '[[HI3SEG' + i + ']]\n' + item.text)
        .join('\n');

      const translated = await withTimeout(
        t.translate(marked),
        45000,
        'Chrome Translator'
      );

      const re = /\[\[HI3SEG(\d+)\]\]\s*/g;
      const marks = [];
      let match;
      while ((match = re.exec(translated))) {
        marks.push({
          index: Number(match[1]),
          start: match.index,
          contentStart: re.lastIndex,
        });
      }
      if (marks.length !== batch.length) throw new Error('segment markers changed');

      const out = new Array(batch.length);
      for (let i = 0; i < marks.length; i++) {
        const end = i + 1 < marks.length ? marks[i + 1].start : translated.length;
        const raw = translated.slice(marks[i].contentStart, end).trim();
        out[marks[i].index] = protectedItems[marks[i].index].restore(raw);
      }
      if (out.some((x) => !x)) throw new Error('segment parse failed');
      return out;
    }

    try {
      return await translateMarked(items);
    } catch (error) {
      // 큰 묶음이 타임아웃/세그먼트 훼손되면 반으로 쪼개 재시도한다.
      if (items.length > 1) {
        const mid = Math.ceil(items.length / 2);
        const left = await translateBatch(items.slice(0, mid));
        const right = await translateBatch(items.slice(mid));
        return left.concat(right);
      }

      // 마지막 1문장도 45초 이상 걸리면 실패로 남기고 다음 항목으로 진행.
      try {
        const translated = await withTimeout(
          translateWithAi(items[0]),
          45000,
          'single translation'
        );
        return [translated];
      } catch (singleError) {
        console.warn('[silvermu-hi3-ko] single translation skipped', items[0], singleError);
        return [items[0]];
      }
    }
  }

  async function exportFullAuditFromCache() {
    setAiStatus('기존 캐시로 전체 감사 파일 생성 중…', true);
    try {
      const datasets = {};
      for (const [name, path] of Object.entries(FULL_DATASETS)) {
        datasets[name] = await fetchSingleDatasetStrings(name, path);
      }
      const report = await exportTranslationPack(datasets);
      setAiStatus('감사 파일 저장 완료 · 커버리지 ' + report.total.coverage + '%');
      window.alert(
        '기존 번역 캐시를 사용해 감사 파일을 다시 만들었습니다.\n\n' +
        '파일명: hi3-ko-full-audit-' + VERSION + '.json\n' +
        '커버리지: ' + report.total.coverage + '%'
      );
    } catch (error) {
      console.error('[silvermu-hi3-ko] audit export failed', error);
      setAiStatus('감사 파일 생성 실패: ' + (error?.message || error));
      window.alert('감사 파일 생성에 실패했습니다.\n' + (error?.message || error));
    }
  }

  async function buildFullTranslationPack() {
    const API = getTranslatorApi();
    if (!API) {
      window.alert('전체 번역팩 생성에는 데스크톱 Chrome 138 이상의 Translator API가 필요합니다.');
      return;
    }

    fullBuildCancelled = false;
    aiEnabled = true;
    localStorage.setItem(AI_ENABLED_KEY, '1');
    setAiStatus('전체 DB 번역팩 준비 중…', true);

    try {
      await ensureTranslator();

      // 캐시는 최초 1회만 메모리로 올린다.
      const cacheRows = await cacheGetAll();
      const cacheMap = new Map(cacheRows.map((row) => [row.source, row.translated]));

      const datasetEntries = Object.entries(FULL_DATASETS);
      const allDatasetStrings = {};
      let totalSeen = 0;
      let totalDone = 0;

      let savedProgress = {};
      try {
        savedProgress = JSON.parse(localStorage.getItem(FULL_PROGRESS_KEY) || '{}');
      } catch {}

      for (let datasetIndex = 0; datasetIndex < datasetEntries.length; datasetIndex += 1) {
        if (fullBuildCancelled) break;

        const [name, path] = datasetEntries[datasetIndex];
        const strings = await fetchSingleDatasetStrings(name, path);
        allDatasetStrings[name] = strings;
        totalSeen += strings.length;

        const pending = [];
        const staticWrites = [];
        let datasetDone = 0;

        for (const source of strings) {
          const staticText = translateString(source);

          if (!HAN_RE.test(staticText)) {
            datasetDone += 1;
            if (!cacheMap.has(source)) {
              staticWrites.push({ source, translated: staticText, method: 'static' });
              cacheMap.set(source, staticText);
            }
            continue;
          }

          const cached = cacheMap.get(source);
          if (cached && !HAN_RE.test(cached)) {
            datasetDone += 1;
          } else {
            pending.push(source);
          }
        }

        if (staticWrites.length) {
          await cachePutMany(staticWrites, 'static');
        }

        totalDone += datasetDone;

        // 한 번에 4개 / 약 2,500자만 번역.
        // Chrome Translator에 동시에 여러 translate()를 호출하지 않는다.
        let cursor = 0;
        const savedCursor = Number(savedProgress[name]?.cursor || 0);

        // saved cursor는 참고값일 뿐, 실제 pending은 캐시 기준으로 재구축하므로
        // 이미 번역된 항목을 자동으로 제외한다.
        if (savedCursor > 0) {
          console.info('[silvermu-hi3-ko] resume', name, savedCursor);
        }

        while (cursor < pending.length && !fullBuildCancelled) {
          const batch = [];
          let chars = 0;

          while (cursor < pending.length && batch.length < 4) {
            const value = pending[cursor];
            if (batch.length && chars + value.length > 2500) break;
            batch.push(value);
            chars += value.length;
            cursor += 1;
          }

          if (!batch.length) {
            batch.push(pending[cursor]);
            cursor += 1;
          }

          const translated = await translateBatch(batch);
          const writes = [];

          for (let i = 0; i < batch.length; i++) {
            const source = batch[i];
            const result = translated[i];
            if (result && result !== source) {
              writes.push({ source, translated: result, method: 'chrome-ai' });
              cacheMap.set(source, result);
            }
          }

          if (writes.length) await cachePutMany(writes, 'chrome-ai');

          datasetDone += batch.length;
          totalDone += batch.length;

          savedProgress[name] = {
            cursor,
            total: pending.length,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem(FULL_PROGRESS_KEY, JSON.stringify(savedProgress));

          const catPct = strings.length
            ? Math.round(datasetDone / strings.length * 100)
            : 100;

          setAiStatus(
            '[' + (datasetIndex + 1) + '/' + datasetEntries.length + '] ' +
            name + ' ' + datasetDone + '/' + strings.length +
            ' (' + catPct + '%) · 남은 AI ' + (pending.length - cursor) + '개',
            true
          );

          // 각 묶음마다 UI thread 양보.
          await new Promise((resolve) => window.setTimeout(resolve, 25));
        }

        if (!fullBuildCancelled) {
          savedProgress[name] = {
            cursor: pending.length,
            total: pending.length,
            done: true,
            updatedAt: new Date().toISOString(),
          };
          localStorage.setItem(FULL_PROGRESS_KEY, JSON.stringify(savedProgress));
          setAiStatus(name + ' 완료 · 다음 카테고리 준비 중…', true);
          await new Promise((resolve) => window.setTimeout(resolve, 100));
        }
      }

      if (fullBuildCancelled) {
        setAiStatus('전체 번역 작업 취소됨 · 완료분은 캐시에 보존됨');
        return;
      }

      // 혹시 이전 실행에서 이미 완료되어 이번에 fetch하지 않은 것은 없지만,
      // 명시적으로 전체 데이터가 준비되었는지 확인한다.
      for (const [name, path] of Object.entries(FULL_DATASETS)) {
        if (!allDatasetStrings[name]) {
          allDatasetStrings[name] = await fetchSingleDatasetStrings(name, path);
        }
      }

      const report = await exportTranslationPack(allDatasetStrings);
      localStorage.removeItem(FULL_PROGRESS_KEY);
      scanAiTargets(document);

      setAiStatus('전체 DB 완료 · 커버리지 ' + report.total.coverage + '% · 파일 저장됨');
      window.alert(
        '전체 DB 번역/검사가 끝났습니다.\n' +
        '전체 고유 중국어 문자열: ' + report.total.strings + '개\n' +
        '번역 완료: ' + report.total.translated + '개\n' +
        '남음: ' + report.total.remaining + '개\n' +
        '커버리지: ' + report.total.coverage + '%\n\n' +
        '다운로드된 hi3-ko-full-audit JSON 파일 1개를 ChatGPT에 올려 주세요.'
      );
    } catch (error) {
      console.error('[silvermu-hi3-ko] full build failed', error);
      setAiStatus('전체 번역 실패: ' + (error?.message || error));
      window.alert(
        '전체 번역팩 생성 중 오류가 발생했습니다.\n' +
        (error?.message || error) +
        '\n\n완료된 번역은 캐시에 남아 있으므로 업데이트 후 다시 실행하면 이어집니다.'
      );
    }
  }

  function addBadge() {
    const uiRoot = ensureFloatingUiRoot();
    if (getFloatingUiElement(BADGE_ID)) return;
    const badge = document.createElement('button');
    badge.id = BADGE_ID;
    badge.type = 'button';
    badge.textContent = 'KO';
    badge.title = '한국어 패치 v' + VERSION + ' · 클릭: 원문으로 전환 · 우클릭: 진단 보고서 복사';
    Object.assign(badge.style, {
      position: 'fixed',
      left: '118px',
      right: 'auto',
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
      pointerEvents: 'auto',
      transform: 'translateZ(0)',
      willChange: 'transform',
      backfaceVisibility: 'hidden',
      animation: 'none',
      transition: 'none',
      contain: 'layout style paint',
    });
    badge.addEventListener('click', () => setEnabled(false));
    badge.addEventListener('contextmenu', (event) => {
      event.preventDefault();
      void copyDiagnosticReport();
    });
    uiRoot.appendChild(badge);
    addAiButton();
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
          if (aiEnabled) scanAiTargets(node);
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

  async function activateTranslation() {
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

    // 버전 변경 시 기존 기계번역 캐시를 먼저 정리하고, 필요하면 1회 자동 새로고침.
    const reloadingForMigration = await autoMigrateCachedTranslations();
    if (reloadingForMigration) return;

    aiEnabled = localStorage.getItem(AI_ENABLED_KEY) === '1';
    updateAiButton();

    // Translator.create는 사용자 동작이 필요할 수 있으므로 자동 시작하지 않는다.
    // AI가 이전 세션에서 켜져 있었다면 다음 사용자 클릭 때 다시 초기화한다.
    if (aiEnabled && !translator) {
      const arm = () => {
        document.removeEventListener('click', arm, true);
        void enableAiTranslation();
      };
      document.addEventListener('click', arm, true);
      setAiStatus('AI 번역 대기 중 · 페이지를 한 번 클릭하면 시작');
    }
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
    GM_registerMenuCommand('Chrome AI 현재 화면 전체번역', () => void enableAiTranslation());
    GM_registerMenuCommand('전체 DB 번역팩 생성 + 전수검사', () => void buildFullTranslationPack());
    GM_registerMenuCommand('전체 DB 번역 작업 취소', () => {
      fullBuildCancelled = true;
      setAiStatus('전체 DB 번역 취소 요청됨');
    });
    GM_registerMenuCommand('기존 AI 번역 붕괴3rd 용어 일괄 교정', () => void rewriteCacheWithPostEdit());
    GM_registerMenuCommand('현재 카테고리 자동검수(QA)', () => void runQaReview('current'));
    GM_registerMenuCommand('전체 DB 자동검수(QA)', () => void runQaReview('all'));
    GM_registerMenuCommand('자동검수 취소', () => {
      qaCancelled = true;
      setAiStatus('자동검수 취소 요청됨…', true);
    });
    GM_registerMenuCommand('전수검사 JSON 다시 내보내기 (재번역 없음)', () => void exportFullAuditFromCache());
    GM_registerMenuCommand('현재 번역팩 내보내기', () => void exportTranslationPack());
    GM_registerMenuCommand('AI 번역 캐시 초기화', async () => {
      if (!window.confirm('저장된 AI 번역 캐시를 전부 지울까요?')) return;
      await cacheClear();
      window.alert('AI 번역 캐시를 초기화했습니다.');
    });
  }

  start();
})();
