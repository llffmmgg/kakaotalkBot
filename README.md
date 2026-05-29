# kakaotalkBot — 개발자/IT 채용공고 카카오톡 오픈채팅 봇

채용공고(사람인 공식 API)를 GitHub Actions로 수집해 `data/jobs.json`으로 커밋하고,
메신저봇R(안드로이드)이 그 JSON을 읽어 카카오톡 오픈채팅방에 **명령어 검색**과
**신규 공고 자동 푸시**를 제공한다. 서버 없이 무료로 동작한다.

자세한 기획·아키텍처·설계 결정은 `docs/`(PRD, ARCHITECTURE, ADR, UI_GUIDE) 참조.

## 구조
```
collector/   사람인 API 수집기 (Python, GitHub Actions에서 실행)
.github/workflows/crawl.yml   6시간마다 수집 → data/jobs.json 커밋
data/jobs.json                수집 결과 = 봇이 읽는 "API"
bot/         메신저봇R 스크립트 (폰으로 전송, Rhino/ES5)
docs/        기획·아키텍처 문서
```

## 데이터 흐름
```
GitHub Actions(cron) → 사람인 API → data/jobs.json 커밋
   → raw.githubusercontent.com/.../data/jobs.json
   → 메신저봇R(폰): 명령어 검색 + 신규 공고 자동 푸시 → 오픈채팅방
```

## 셋업 (사용자가 직접 해야 하는 선행조건)

### 1. 사람인 access-key 발급
- 사람인 오픈API(`https://oapi.saramin.co.kr`)에 앱 등록 후 access-key 발급.
- IT 직무 코드(`job_mid_cd`)는 [코드표](https://oapi.saramin.co.kr/guide/code-table5)에서 확인해
  필요 시 환경변수 `SARAMIN_IT_MID_CD`로 조정(기본값 `2` = IT개발·데이터, 확인 필요).

### 2. GitHub 레포 + Secret
- 이 디렉토리를 **public** GitHub repo로 push (public이어야 Actions 무료 + raw URL 공개).
- repo Settings → Secrets and variables → Actions → `SARAMIN_ACCESS_KEY` 추가.
- Actions 탭에서 "Collect job postings" 워크플로우를 `Run workflow`로 수동 실행해 첫 `data/jobs.json` 생성 확인.

### 3. 메신저봇R (전용 안드로이드 폰)
- 메신저봇R 설치 → 접근성 권한 부여 → 카카오톡 알림 접근 허용.
- `bot/` 폴더를 폰의 봇 스크립트로 등록(`index.js`가 메인).
- `bot/config.js`에서 다음을 본인 환경으로 교체:
  - `JOBS_URL` → 본인 repo의 raw jobs.json URL
  - `TARGET_ROOM` → 자동 푸시할 오픈채팅방 이름(메신저봇R의 room 값과 정확히 일치)
- 대상 오픈채팅방에 봇 폰이 입장하고, 누군가 메시지를 보낸 이력이 있어야 `Api.replyRoom`이 동작.
- 폰은 상시 전원/네트워크 유지.

## 사용법 (채팅방에서)
```
!채용 백엔드 지역:서울 경력:신입 형태:정규직
!채용도움
```
- 옵션: `지역:` `경력:` `형태:` / 나머지는 키워드. 콜론 옵션 없이 키워드만도 가능.

## 로컬 개발/검증
```
pip install -r collector/requirements.txt
SARAMIN_ACCESS_KEY=... python collector/crawl.py   # 실제 수집
python -m py_compile collector/*.py                # Python 문법 검사
node --check bot/index.js                          # 봇 JS 문법 검사
```
(access-key가 없으면 collector는 기존 `data/jobs.json`을 건드리지 않고 종료한다.)

## 운영 리스크 (알아두기)
- 메신저봇R은 카카오 비공식 수단 — 카카오톡 업데이트로 동작이 깨질 수 있고, 약관 리스크가 있다.
- 자동 푸시 타이머는 앱이 살아있는 동안만 동작 → 폰을 꺼두면 멈춘다.
- 사람인만 수집하므로 원티드/점핏 공고는 포함되지 않는다(후속 확장: 워크넷 공식 API 추가).
