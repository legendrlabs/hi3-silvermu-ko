# silvermu HI3 한국어 패치

`https://silvermu.top/database/hi3.html`의 화면 문구를 한국어로 표시하는 **비공식 오픈소스 사용자스크립트**입니다.

## 왜 '사이트 복제'가 아니라 사용자스크립트인가?

원본 사이트의 공개 소스 저장소 및 재배포 라이선스를 확인하지 못한 상태에서 HTML/JS/이미지/게임 데이터를 그대로 복제하지 않습니다. 대신 원본 페이지를 사용자가 직접 방문한 상태에서 브라우저가 표시하는 문자열만 한국어로 치환합니다.

장점:

- 원본 사이트의 데이터 업데이트를 그대로 이용
- 원본 코드/이미지/데이터를 저장소에 재배포하지 않음
- 설치와 제거가 간단함
- 번역 사전만 커뮤니티가 공동 관리 가능

## 설치

1. Tampermonkey 등 사용자스크립트 관리자를 설치합니다.
2. [사용자스크립트 설치](https://raw.githubusercontent.com/legendrlabs/hi3-silvermu-ko/main/src/hi3-ko.user.js)를 눌러 설치합니다.
3. `https://silvermu.top/database/hi3.html`을 새로고침합니다.

GitHub Pages를 활성화한 뒤에는 `https://legendrlabs.github.io/hi3-silvermu-ko/`를 커뮤니티 배포용 설치 페이지로 사용할 수 있습니다.

## 현재 번역 범위

초기 버전은 페이지에서 확인된 핵심 UI와 자주 쓰이는 데이터베이스 필드명을 번역합니다.

- 数据库 → 데이터베이스
- 游戏资料库 → 게임 자료실
- 正式服 → 정식 서버
- 测试服 → 테스트 서버
- 搜索名称… → 이름 검색…
- 详情 → 상세 정보
- 越新的越靠前展示 → 최신 데이터부터 표시

동적으로 추가되는 DOM도 `MutationObserver`로 감지해 번역합니다.

## 번역 원칙

1. 한국 서비스 공식 명칭이 있으면 공식 명칭을 우선합니다.
2. 확인되지 않은 캐릭터/무기/성흔 고유명사는 추측 번역하지 않습니다.
3. 번역이 없으면 중국어 원문을 그대로 표시합니다.
4. 번역 PR에는 가능하면 공식 한국어 표기의 근거를 남깁니다.

## 기여

번역 추가는 `src/hi3-ko.user.js`의 `EXACT` 사전에 한 줄을 추가하는 방식으로 시작할 수 있습니다.

```js
['중국어 원문', '한국어 번역'],
```

문맥에 따라 같은 중국어가 다른 뜻이 되는 경우 단순 전역 치환을 추가하지 말고 Issue를 먼저 열어 주세요.

## 배포

GitHub 저장소를 Public으로 만들고 **Settings → Pages → Deploy from a branch → `main` / `/docs`**로 설정하면 간단한 안내 페이지와 설치 파일을 공개할 수 있습니다.

## 라이선스 및 권리 안내

이 저장소의 자체 작성 코드와 문서는 MIT License로 배포합니다.

- silvermu.top의 원본 코드, 이미지 및 데이터는 이 저장소에 포함하지 않습니다.
- 붕괴3rd 관련 상표, 캐릭터, 이미지 및 게임 데이터의 권리는 각 권리자에게 있습니다.
- 본 프로젝트는 비공식 팬 번역 프로젝트이며 silvermu.top, HoYoverse 또는 miHoYo와 제휴·승인 관계가 없습니다.

원본 사이트 운영자가 번역 레이어의 배포 중단을 요청하는 경우 해당 요청을 검토하고 필요한 조치를 취합니다.

## 링크

- 원본 데이터베이스: https://silvermu.top/database/hi3.html
- 프로젝트 저장소: https://github.com/legendrlabs/hi3-silvermu-ko
- 이슈/번역 제안: https://github.com/legendrlabs/hi3-silvermu-ko/issues
