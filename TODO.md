# TODO — kakaotalkBot 남은 작업

> 봇 코드는 완성·실기기 검증 완료. **사람인 access-key 승인**만 풀리면 나머지는 금방 끝남.

## 완료 ✅
- [x] harness 프레임워크를 이 스택에 맞게 재작성 (CLAUDE.md·docs·hooks·.gitignore)
- [x] 수집기 작성 (collector/: 사람인 API → jobs.json, normalize/dedup)
- [x] GitHub Actions 워크플로우 (.github/workflows/crawl.yml, 6h cron)
- [x] 메신저봇R 봇 (bot/: 명령어 검색 + 자동푸시, standalone.js)
- [x] public 레포 생성·push (github.com/llffmmgg/kakaotalkBot)
- [x] 실기기 명령어 검색 동작 확인 (`!채용 백엔드`)
- [x] 자동푸시 대상 방(TARGET_ROOM) 설정

## 남은 작업 ⏳ (순서대로)
- [ ] **0. (임시) 봇이 하드코딩된 실제 공고로 응답 중 → 사람인 API로 교체** ← 2026-05-30 추가
      - 현재: `!채용` 입력 시 `bot/modules/sample.js`(=standalone.js 인라인)의 원티드 실제 공고 6건을 응답(검색 기능은 제거됨)
      - 사람인 키 승인(아래 1번) 후: `response()`에서 `format.formatList(sample.SAMPLE_JOBS)` → `api.fetchJobs(JOBS_URL)` 읽도록 교체(코드에 TODO 주석 표시됨), sample.js 삭제
- [ ] **1. 사람인 access-key 승인 받기** ← 현재 블로커(승인 대기)
      - oapi.saramin.co.kr 이용신청 승인 후 [Application]>내 앱 목록에서 키 확인
      - 너무 지연되면 api@saramin.co.kr 문의
- [ ] **2. GitHub Secret 등록** (키 받은 뒤)
      - `gh secret set SARAMIN_ACCESS_KEY` (또는 repo Settings>Secrets>Actions 웹 추가)
- [ ] **3. Actions 수동 실행 → 실제 jobs.json 확인**
      - GitHub Actions 탭 > "Collect job postings" > Run workflow
      - data/jobs.json에 실제 IT 공고가 채워지는지 확인
- [ ] **4. 폰에 최신 standalone.js 재붙여넣기** (TARGET_ROOM 반영)
      - https://raw.githubusercontent.com/llffmmgg/kakaotalkBot/main/bot/standalone.js
      - 메신저봇R 봇 편집기에 전체 교체 후 저장/재컴파일
- [ ] **5. 자동 푸시 실작동 확인**
      - 새 공고 수집 시 TARGET_ROOM에 자동 전송되는지
      - 안 되면: 메신저봇R 로그의 room 값과 TARGET_ROOM 이름 일치 확인(특수문자 ·｜ 주의)

## 향후 확장 (선택)
- [ ] 워크넷 공식 API 추가로 공고 커버리지 보강 (서버리스 유지)
- [ ] 사람인 IT 직종코드(job_mid_cd) 실제값 확정 (현재 기본 "2")
