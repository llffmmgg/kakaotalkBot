# 아키텍처

## 전체 흐름
```
[GitHub Actions cron] (6시간마다, 무료)
  → collector/crawl.py: 사람인 공식 API 호출 (requests, IT 직무 필터)
  → 신규 공고 dedup (기존 data/jobs.json id와 비교)
  → data/jobs.json 갱신 후 repo에 commit (git-auto-commit-action)
        │
        ▼
[raw.githubusercontent.com/<user>/kakaotalkBot/main/data/jobs.json]   ← 무료 정적 "API"
        │
        ▼
[메신저봇R (전용 안드로이드 폰, Rhino JS)]
  ① 명령어:  "!채용 백엔드 지역:서울 경력:신입" → jobs.json fetch → 필터 → replier.reply
  ② 자동푸시: setInterval 타이머로 jobs.json polling
             → DataBase에 저장된 lastPushedId 이후 신규분만 → Api.replyRoom(방, msg)
        │
        ▼
[카카오톡 오픈채팅방]
```

## 디렉토리 구조
```
kakaotalkBot/
├── .github/workflows/crawl.yml   # Actions cron: 수집 → data/jobs.json commit
├── collector/                    # Python 수집기 (GitHub Actions에서 실행)
│   ├── crawl.py                  # 진입점: fetch → normalize → dedup → write
│   ├── saramin.py                # 사람인 공식 API 클라이언트 (requests)
│   ├── normalize.py              # 사람인 응답 → jobs.json 스키마, IT 필터
│   ├── dedup.py                  # 기존 jobs.json과 병합/중복 제거
│   └── requirements.txt
├── data/jobs.json                # 수집 결과 = 봇이 읽는 "API" (커밋 대상)
├── bot/                          # 메신저봇R 스크립트 (폰으로 전송)
│   ├── index.js                  # response() 진입, 명령 라우팅, 타이머 등록
│   ├── config.js                 # 대상 방, jobs.json raw URL, polling 주기
│   └── modules/{api,search,format,push}.js
└── docs/                         # 기획·아키텍처·결정 기록
```

## 데이터 흐름 (계약: data/jobs.json)
```
사람인 API (JSON)
  → normalize.py 가 공통 스키마로 변환
  → dedup.py 가 기존 목록과 병합(id 기준 중복 제거, 마감 공고 롤링 제거)
  → data/jobs.json 으로 저장 → Actions가 커밋
  → 봇이 raw URL로 읽어 검색/푸시
```

### jobs.json 스키마
```json
{
  "updated_at": "2026-05-29T12:00:00+09:00",
  "jobs": [
    {
      "id": "saramin-<공고번호>",
      "title": "백엔드 개발자",
      "company": "회사명",
      "region": "서울 강남구",
      "career": "신입|경력|무관",
      "employment": "정규직|계약직|인턴|...",
      "keywords": ["python", "django"],
      "url": "https://www.saramin.co.kr/...",
      "deadline": "2026-06-30",
      "posted_at": "2026-05-28"
    }
  ]
}
```
- `id`는 사람인 공고 고유번호 기반(`saramin-<번호>`). dedup 키.
- collector는 `jobs` 배열을 id 기준으로 dedup하고, 마감(`deadline`) 지난 공고는 제거한다.

## 상태 관리
- **collector 상태**: 없음(stateless). 매 실행마다 기존 `data/jobs.json`을 읽어 병합 → 멱등.
- **봇 푸시 상태**: 메신저봇R의 `DataBase`에 방별 `lastPushedId` 저장. collector dedup과 독립적
  (폰이 재시작돼도 마지막으로 보낸 공고를 기억해 중복 푸시 방지).

## 핵심 제약 (코드에 반영)
- 봇은 Rhino(ES5)에서 돈다 → `Promise`/`async`·`class`·ESM 금지(CLAUDE.md 참조).
- `Api.replyRoom`은 봇이 해당 방의 세션을 가질 때만 동작 → 대상 방에 메시지 수신 이력이 있어야 함.
- 메신저봇R 타이머(setInterval)는 앱이 살아있는 동안만 동작 → 폰 상시 구동 전제.
