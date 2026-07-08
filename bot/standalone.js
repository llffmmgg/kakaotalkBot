// =====================================================================
// 메신저봇R 단일 파일 봇 (Rhino / ES5) — 복붙용.
// bot/index.js + modules/* 를 한 파일로 합친 버전.
// 메신저봇R에서 새 봇을 만들고 이 전체를 붙여넣은 뒤, 아래 CONFIG만 수정하세요.
//
// 동작:
//   - "!채용" 입력 → data/jobs.json(raw URL)의 최신 공고를 최대 LIST_LIMIT건 응답.
//   - 하루 2번(PUSH_HOURS: 오전 9시·오후 6시) 신규 공고만 최대 MAX_PUSH건 자동 푸시.
//   데이터는 collector(GitHub Actions)가 만든 jobs.json만 읽는다. 봇은 크롤링하지 않는다.
// =====================================================================

// ---------------------- CONFIG (여기만 수정) ----------------------
var CONFIG = {
  // 본인 GitHub repo의 raw jobs.json URL.
  JOBS_URL: "https://raw.githubusercontent.com/llffmmgg/kakaotalkBot/main/data/jobs.json",

  // 자동 푸시할 오픈채팅방 이름 — 메신저봇R에 표시되는 room 이름과 정확히 일치해야 함.
  TARGET_ROOM: "정보처리기사·SQLD·ADsP 합격방｜기출·CBT·질문 공부방",

  POLL_MS: 10 * 60 * 1000, // 자동 푸시 확인 주기 (10분마다 '지금 보낼 시간인지' 검사)
  PUSH_HOURS: [9, 18],     // 자동 푸시 시각(폰 시간, 24시간). 하루 2번: 오전 9시·오후 6시
  MAX_PUSH: 10,            // 한 번에 자동 푸시할 최대 신규 공고 수
  LIST_LIMIT: 15,          // "!채용" 응답에 보여줄 최대 공고 수(전체 건수는 함께 표시)
  CMD_PREFIX: "!채용"
};

// ---------------------- api: jobs.json fetch ----------------------
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

function formatList(items, limit) {
  if (!items || items.length === 0) {
    return "등록된 채용공고가 아직 없어요.";
  }
  var total = items.length;
  var shown = items;
  var note = "";
  if (limit && total > limit) {
    shown = items.slice(0, limit);
    note = "\n\n…외 " + (total - limit) + "건 더 있어요. (최신 " + limit + "건만 표시)";
  }
  return "📋 채용공고 " + total + "건\n\n" + joinJobs(shown) + note;
}

function formatNew(items) {
  return "🆕 새 채용공고 " + items.length + "건\n\n" + joinJobs(items);
}

// ---------------------- push (자동 알림, 하루 2번) ----------------------
var DB_KEY = "pushedIds";      // 이미 푸시한 공고 id 집합
var SLOT_KEY = "lastPushSlot"; // 마지막으로 푸시를 완료한 시간대(중복 방지)

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

// 지금이 PUSH_HOURS에 해당하는 푸시 시각이면 그 시간대 식별 문자열을, 아니면 null.
function currentPushSlot() {
  var d = new Date();
  var h = d.getHours();
  for (var i = 0; i < CONFIG.PUSH_HOURS.length; i++) {
    if (h === CONFIG.PUSH_HOURS[i]) {
      return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() + "-" + h;
    }
  }
  return null;
}

function getDoneSlot() {
  try {
    var raw = DataBase.getDataBase(SLOT_KEY);
    return raw ? String(raw) : "";
  } catch (e) { return ""; }
}

function setDoneSlot(slot) {
  try { DataBase.setDataBase(SLOT_KEY, slot); } catch (e) {}
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

  // 지금이 푸시 시각이 아니면 아무것도 보내지 않는다(신규는 다음 시각에 함께 나감).
  var slot = currentPushSlot();
  if (slot === null) { return; }
  if (getDoneSlot() === slot) { return; } // 이번 시간대에 이미 보냄.

  var pushed = toSet(pushedArr);

  var fresh = [];
  for (var j = 0; j < jobs.length; j++) {
    if (jobs[j].id && !pushed[jobs[j].id]) { fresh.push(jobs[j]); }
  }

  // pushed를 현재 존재하는 id로 프루닝(만료 공고 id 정리).
  var keep = {};
  for (var k = 0; k < currentIds.length; k++) {
    if (pushed[currentIds[k]]) { keep[currentIds[k]] = true; }
  }

  if (fresh.length === 0) {
    savePushed(Object.keys(keep));
    setDoneSlot(slot);
    return;
  }

  var toSend = fresh.slice(0, CONFIG.MAX_PUSH);
  var ok = Api.replyRoom(CONFIG.TARGET_ROOM, formatNew(toSend));
  // 전송 성공 시에만 완료 처리 → 실패(방 못 찾음 등)면 다음 폴링에서 재시도.
  if (ok === true) {
    for (var m = 0; m < toSend.length; m++) { keep[toSend[m].id] = true; }
    setDoneSlot(slot);
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

  var data = fetchJobs(CONFIG.JOBS_URL);
  replier.reply(data ? formatList(data.jobs, CONFIG.LIST_LIMIT)
                     : "공고 데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
}

// 자동 푸시 타이머 등록 (앱이 켜져 있는 동안만 동작).
if (typeof setInterval !== "undefined") {
  setInterval(function () { poll(); }, CONFIG.POLL_MS);
}
