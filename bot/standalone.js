// =====================================================================
// 메신저봇R 단일 파일 봇 (Rhino / ES5) — 복붙용.
// bot/index.js + modules/* 를 한 파일로 합친 버전.
// 메신저봇R에서 새 봇을 만들고 이 전체를 붙여넣은 뒤, 아래 CONFIG만 수정하세요.
//
// 현재 동작: "!채용" 메시지에만 반응해서 아래 SAMPLE_JOBS(임시 샘플 공고)를 보여줍니다.
//           사람인 API(jobs.json)가 준비되면 response()의 표시 부분만 교체하면 됩니다.
// =====================================================================

// ---------------------- CONFIG (여기만 수정) ----------------------
var CONFIG = {
  // 본인 GitHub repo의 raw jobs.json URL (자동 푸시에서 사용. API 준비 후 사용).
  JOBS_URL: "https://raw.githubusercontent.com/llffmmgg/kakaotalkBot/main/data/jobs.json",

  // 자동 푸시할 오픈채팅방 이름 — 메신저봇R에 표시되는 room 이름과 정확히 일치해야 함.
  TARGET_ROOM: "정보처리기사·SQLD·ADsP 합격방｜기출·CBT·질문 공부방",

  POLL_MS: 5 * 60 * 1000, // 자동 푸시 폴링 주기 (5분)
  MAX_PUSH: 5,            // 한 번에 자동 푸시할 최대 신규 공고 수
  CMD_PREFIX: "!채용"
};

// ---------------------- 임시 하드코딩 채용공고 ----------------------
// 사람인 API 연동 전까지 "!채용" 응답으로 보여줄 공고.
// 출처: 원티드(wanted.co.kr), 2026-05-30 기준 실제 공고. 링크는 시간이 지나면 만료될 수 있음.
// API가 준비되면 이 배열 대신 jobs.json을 읽도록 response()를 바꾸면 됩니다.
var SAMPLE_JOBS = [
  {
    id: "wanted-22942",
    title: "프론트엔드 개발자",
    company: "원티드랩",
    region: "서울 송파구",
    career: "경력 3년↑",
    employment: "정규직",
    url: "https://www.wanted.co.kr/wd/22942"
  },
  {
    id: "wanted-72000",
    title: "프론트엔드 개발자",
    company: "한국투자증권",
    region: "서울 영등포구",
    career: "경력 5년↑",
    employment: "정규직",
    url: "https://www.wanted.co.kr/wd/72000"
  },
  {
    id: "wanted-165809",
    title: "프론트엔드 개발자 (React)",
    company: "테스트뱅크",
    region: "서울 강남구",
    career: "경력",
    employment: "정규직",
    url: "https://www.wanted.co.kr/wd/165809"
  },
  {
    id: "wanted-310787",
    title: "백엔드 개발자 (Java/Spring)",
    company: "휴넷",
    region: "서울 구로구",
    career: "경력",
    employment: "정규직",
    url: "https://www.wanted.co.kr/wd/310787"
  },
  {
    id: "wanted-323",
    title: "백엔드 개발자 (Node.js)",
    company: "직방",
    region: "서울 서초구",
    career: "경력 3년↑",
    employment: "정규직",
    url: "https://www.wanted.co.kr/wd/323"
  },
  {
    id: "wanted-350058",
    title: "백엔드 개발자 (Node.js/NestJS)",
    company: "퓨잇",
    region: "서울 강남구",
    career: "경력",
    employment: "정규직",
    url: "https://www.wanted.co.kr/wd/350058"
  }
];

// ---------------------- api: jobs.json fetch (자동 푸시에서 사용) ----------------------
function fetchJobs(url) {
  try {
    var conn = new java.net.URL(url).openConnection();
    conn.setRequestMethod("GET");
    conn.setConnectTimeout(10000);
    conn.setReadTimeout(15000);
    conn.setRequestProperty("Accept", "application/json");
    conn.connect();
    if (conn.getResponseCode() !== 200) {
      return null;
    }
    var reader = new java.io.BufferedReader(
      new java.io.InputStreamReader(conn.getInputStream(), "UTF-8")
    );
    var sb = new java.lang.StringBuilder();
    var line;
    while ((line = reader.readLine()) !== null) {
      sb.append(line);
    }
    reader.close();
    var data = JSON.parse(String(sb.toString()));
    if (!data || !data.jobs) {
      return null;
    }
    return data;
  } catch (e) {
    return null;
  }
}

// ---------------------- format ----------------------
function truncate(s, n) {
  s = String(s || "");
  return s.length <= n ? s : s.substring(0, n - 1) + "…";
}

function formatJob(job) {
  var lines = [];
  lines.push("📌 " + truncate(job.title, 40) + (job.company ? " — " + job.company : ""));
  var meta = [];
  if (job.region) { meta.push(job.region); }
  if (job.career) { meta.push(job.career); }
  if (job.employment) { meta.push(job.employment); }
  if (meta.length) { lines.push("📍 " + meta.join("  |  ")); }
  if (job.deadline) { lines.push("⏰ ~" + job.deadline); }
  if (job.url) { lines.push("🔗 " + job.url); }
  return lines.join("\n");
}

function joinJobs(items) {
  var blocks = [];
  for (var i = 0; i < items.length; i++) {
    blocks.push(formatJob(items[i]));
  }
  return blocks.join("\n\n");
}

function formatList(items) {
  if (!items || items.length === 0) {
    return "등록된 채용공고가 아직 없어요.";
  }
  return "📋 채용공고 " + items.length + "건\n\n" + joinJobs(items);
}

function formatNew(items) {
  return "🆕 새 채용공고 " + items.length + "건\n\n" + joinJobs(items);
}

// ---------------------- push (자동 알림) ----------------------
var DB_KEY = "pushedIds";

function loadPushed() {
  try {
    var raw = DataBase.getDataBase(DB_KEY);
    if (!raw) { return null; }
    var arr = JSON.parse(String(raw));
    return (arr && typeof arr.length === "number") ? arr : null;
  } catch (e) { return null; }
}

function savePushed(ids) {
  try { DataBase.setDataBase(DB_KEY, JSON.stringify(ids)); } catch (e) {}
}

function toSet(arr) {
  var s = {};
  for (var i = 0; i < arr.length; i++) { s[arr[i]] = true; }
  return s;
}

function poll() {
  var data = fetchJobs(CONFIG.JOBS_URL);
  if (!data || !data.jobs) { return; }
  var jobs = data.jobs;

  var currentIds = [];
  for (var i = 0; i < jobs.length; i++) {
    if (jobs[i].id) { currentIds.push(jobs[i].id); }
  }

  var pushedArr = loadPushed();
  if (pushedArr === null) {
    // 최초 실행: 현재 공고를 '이미 본 것'으로 시드 → 초기 대량 스팸 방지.
    savePushed(currentIds);
    return;
  }
  var pushed = toSet(pushedArr);

  var fresh = [];
  for (var j = 0; j < jobs.length; j++) {
    if (jobs[j].id && !pushed[jobs[j].id]) { fresh.push(jobs[j]); }
  }

  var keep = {};
  for (var k = 0; k < currentIds.length; k++) {
    if (pushed[currentIds[k]]) { keep[currentIds[k]] = true; }
  }

  if (fresh.length === 0) {
    savePushed(Object.keys(keep));
    return;
  }

  var toSend = fresh.slice(0, CONFIG.MAX_PUSH);
  var ok = Api.replyRoom(CONFIG.TARGET_ROOM, formatNew(toSend));
  if (ok === true) {
    for (var m = 0; m < toSend.length; m++) { keep[toSend[m].id] = true; }
  }
  savePushed(Object.keys(keep));
}

// ---------------------- 메신저봇R 진입점 ----------------------
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
  var text = String(msg || "").trim();

  // "!채용"으로 시작하는 메시지에만 반응. 그 외 일반 대화는 무시.
  if (text.indexOf(CONFIG.CMD_PREFIX) !== 0) {
    return;
  }

  // TODO: 사람인 API 연동 후 SAMPLE_JOBS 대신 아래 주석처럼 jobs.json을 읽어서 사용.
  //   var data = fetchJobs(CONFIG.JOBS_URL);
  //   replier.reply(data ? formatList(data.jobs) : "공고를 불러오지 못했어요.");
  replier.reply(formatList(SAMPLE_JOBS));
}

// 자동 푸시 타이머 등록 (앱이 켜져 있는 동안만 동작).
if (typeof setInterval !== "undefined") {
  setInterval(function () { poll(); }, CONFIG.POLL_MS);
}
