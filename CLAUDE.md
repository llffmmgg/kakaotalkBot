# 프로젝트: 개발자/IT 채용공고 카카오톡 오픈채팅 봇

채용공고(Greenhouse/Lever 공개 API)를 수집해 카카오톡 오픈채팅방에 ① 명령어 검색 응답과
② 신규 공고 자동 푸시로 제공한다. 서버 없이 GitHub Actions(무료)로 수집한다.
(사람인 공식 API는 access-key 발급 거절로 사용 중단 → 키가 필요 없는 공개 API로 전환.)

## 기술 스택
- **수집기 (`collector/`)**: Python 3.12 + `requests`. 소스: 점핏(`jumpit-api.saramin.co.kr`, 개발자 전용 플랫폼, 물량 주력)·Greenhouse(`boards-api.greenhouse.io`)·Lever(`api.lever.co`). 수집 대상은 `collector/companies.json`에서 관리. access-key 불필요. (점핏/원티드 JSON은 비공식 사이트 내부용 — 구조변경/차단 가능성 유의.)
- **자동화 (`.github/workflows/`)**: GitHub Actions cron (git scraping 패턴). 수집 결과를 `data/jobs.json`으로 커밋.
- **봇 (`bot/`)**: 메신저봇R (안드로이드, Rhino JS 엔진). 폰에서 구동.
- **데이터 계약**: `data/jobs.json` (collector가 쓰고, 봇이 raw URL로 읽음).

## 아키텍처 규칙
- CRITICAL: `bot/` 코드는 **Rhino(ES5) 호환 문법만** 사용한다. `Promise`/`async`·`await`/`class`/ESM `import`·`export` 금지 — Rhino 엔진이 지원하지 않아 폰에서 실행되지 않는다. `var`/`const`/`let`·화살표 함수·`require()`는 허용.
- CRITICAL: 봇은 `data/jobs.json`(raw URL)만 읽는다. **봇에서 직접 채용 사이트를 크롤링하지 마라.** 이유: 폰 부하·취약·차단 위험. 수집은 전적으로 collector(GitHub Actions) 책임.
- 현재 수집 소스(Greenhouse/Lever 공개 API)는 access-key가 필요 없다. 향후 키가 필요한 소스를 추가하면 비밀은 **GitHub Secrets로만** 주입하고 코드·repo에 커밋하지 마라.
- `collector/`(Python)와 `bot/`(JS)는 서로 import하지 않는다. 유일한 인터페이스는 `data/jobs.json` 스키마(docs/ARCHITECTURE.md 참조).
- collector는 **멱등**해야 한다. 같은 입력 재실행 시 중복 공고를 추가하지 않는다(id 기준 dedup).

## 개발 프로세스
- collector 로직(정규화·dedup)은 순수 함수로 분리해 테스트 가능하게 작성한다.
- 커밋 메시지는 conventional commits 형식 (feat:, fix:, docs:, refactor:, chore:).

## 명령어
```
python collector/crawl.py        # Greenhouse/Lever 수집 → data/jobs.json 생성/갱신 (한국 IT 공고만)
python -m py_compile collector/*.py   # Python 문법 검사
node --check bot/index.js        # 봇 JS 문법 검사
```
