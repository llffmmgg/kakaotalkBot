// 봇 설정. 메신저봇R(Rhino, ES5)에서 require로 로드된다.
// 운영 전 JOBS_URL과 TARGET_ROOM을 본인 환경에 맞게 반드시 교체할 것.

module.exports = {
  // 본인 GitHub repo의 raw jobs.json URL (Actions가 커밋하는 파일).
  JOBS_URL: "https://raw.githubusercontent.com/llffmmgg/kakaotalkBot/main/data/jobs.json",

  // 자동 푸시를 보낼 오픈채팅방 이름(메신저봇R의 room 값과 정확히 일치해야 함).
  TARGET_ROOM: "정보처리기사·SQLD·ADsP 합격방｜기출·CBT·질문 공부방",

  POLL_MS: 5 * 60 * 1000, // 자동 푸시 폴링 주기 (5분)
  MAX_RESULTS: 5,         // 검색 결과로 보여줄 최대 공고 수
  MAX_PUSH: 5,            // 한 번에 자동 푸시할 최대 신규 공고 수

  CMD_PREFIX: "!채용"     // 검색 명령 접두사
};
