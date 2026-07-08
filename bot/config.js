// 봇 설정. 메신저봇R(Rhino, ES5)에서 require로 로드된다.
// 운영 전 JOBS_URL과 TARGET_ROOM을 본인 환경에 맞게 반드시 교체할 것.

module.exports = {
  // 본인 GitHub repo의 raw jobs.json URL (Actions가 커밋하는 파일).
  JOBS_URL: "https://raw.githubusercontent.com/llffmmgg/kakaotalkBot/main/data/jobs.json",

  // 자동 푸시를 보낼 오픈채팅방 이름(메신저봇R의 room 값과 정확히 일치해야 함).
  TARGET_ROOM: "정보처리기사·SQLD·ADsP 합격방｜기출·CBT·질문 공부방",

  POLL_MS: 10 * 60 * 1000, // 자동 푸시 확인 주기 (10분마다 '지금 보낼 시간인지' 검사)
  PUSH_HOURS: [9, 18],     // 자동 푸시를 보낼 시각(폰 시간 기준, 24시간). 하루 2번: 오전 9시·오후 6시
  MAX_PUSH: 10,            // 한 번에 자동 푸시할 최대 신규 공고 수
  LIST_MAX: 30,            // "!채용" 응답에 보여줄 최대 공고 수(전체 건수는 함께 표시)
  PAGE_SIZE: 15,           // 메시지 한 개당 공고 수 → 30개면 15개씩 메시지 2개로 나눠 전송

  CMD_PREFIX: "!채용"     // 봇 호출 명령어
};
