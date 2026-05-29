// =====================================================================
// 메신저봇R 단일 파일 봇 (Rhino / ES5) — 복붙용.
// bot/index.js + modules/* 를 한 파일로 합친 버전.
// 메신저봇R에서 새 봇을 만들고 이 전체를 붙여넣은 뒤, 아래 CONFIG만 수정하세요.
// =====================================================================

// ---------------------- CONFIG (여기만 수정) ----------------------
var CONFIG = {
  // 본인 GitHub repo의 raw jobs.json URL (이미 채워져 있음).
  JOBS_URL: "https://raw.githubusercontent.com/llffmmgg/kakaotalkBot/main/data/jobs.json",

  // 자동 푸시할 오픈채팅방 이름 — 메신저봇R에 표시되는 room 이름과 정확히 일치해야 함.
  TARGET_ROOM: "정보처리기사·SQLD·ADsP 합격방｜기출·CBT·질문 공부방",

  POLL_MS: 5 * 60 * 1000, // 자동 푸시 폴링 주기 (5분)
  MAX_RESULTS: 5,         // 검색 결과 표시 최대 건수
  MAX_PUSH: 5,            // 한 번에 자동 푸시할 최대 신규 공고 수
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

// ---------------------- search ----------------------
function parseQuery(argStr) {
  var q = { keyword: "", region: "", career: "", employment: "" };
  if (!argStr) {
    return q;
  }
  var parts = String(argStr).split(/\s+/);
  var kw = [];
  for (var i = 0; i < parts.length; i++) {
    var p = parts[i];
    if (!p) {
      continue;
    }
    var idx = p.indexOf(":");
    if (idx > 0) {
      var key = p.substring(0, idx);
      var val = p.substring(idx + 1);
      if (key === "지역") {
        q.region = val;
      } else if (key === "경력") {
        q.career = val;
      } else if (key === "형태") {
        q.employment = val;
      } else {
        kw.push(p);
      }
    } else {
      kw.push(p);
    }
  }
  q.keyword = kw.join(" ");
  return q;
}

function jobMatches(job, q) {
  if (q.keyword) {
    var kwField = job.keywords ? job.keywords.join(" ") : "";
    var hay = ((job.title || "") + " " + (job.company || "") + " " + kwField).toLowerCase();
    var terms = q.keyword.toLowerCase().split(/\s+/);
    for (var i = 0; i < terms.length; i++) {
      if (terms[i] && hay.indexOf(terms[i]) < 0) {
        return false;
      }
    }
  }
  if (q.region && (job.region || "").indexOf(q.region) < 0) { return false; }
  if (q.career && (job.career || "").indexOf(q.career) < 0) { return false; }
  if (q.employment && (job.employment || "").indexOf(q.employment) < 0) { return false; }
  return true;
}

function searchJobs(jobs, q, limit) {
  var out = [];
  for (var i = 0; i < jobs.length; i++) {
    if (jobMatches(jobs[i], q)) {
      out.push(jobs[i]);
    }
  }
  return { total: out.length, items: out.slice(0, limit) };
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

function describeQuery(q) {
  var parts = [];
  if (q.keyword) { parts.push(q.keyword); }
  if (q.region) { parts.push(q.region); }
  if (q.career) { parts.push(q.career); }
  if (q.employment) { parts.push(q.employment); }
  return parts.length ? parts.join(" · ") : "전체";
}

function formatSearch(q, result) {
  if (result.total === 0) {
    return "조건에 맞는 공고가 없어요. 키워드를 바꿔보세요.";
  }
  var header = "🔎 \"" + describeQuery(q) + "\" 검색 결과 (총 " +
    result.total + "건 중 " + result.items.length + "건)";
  var msg = header + "\n\n" + joinJobs(result.items);
  var rest = result.total - result.items.length;
  if (rest > 0) {
    msg += "\n\n… 외 " + rest + "건. 키워드를 좁혀보세요.";
  }
  return msg;
}

function formatNew(items) {
  return "🆕 새 채용공고 " + items.length + "건\n\n" + joinJobs(items);
}

function formatHelp() {
  return "사용법: !채용 [키워드] [지역:OO] [경력:신입|경력|무관] [형태:정규직|계약직]\n" +
    "예) !채용 백엔드 지역:서울 경력:신입\n" +
    "도움말: !채용도움";
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
  if (text.indexOf(CONFIG.CMD_PREFIX) !== 0) {
    return;
  }
  var argStr = text.substring(CONFIG.CMD_PREFIX.length).trim();
  if (argStr === "" || argStr === "도움") {
    replier.reply(formatHelp());
    return;
  }
  var data = fetchJobs(CONFIG.JOBS_URL);
  if (!data) {
    replier.reply("공고 데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.");
    return;
  }
  var q = parseQuery(argStr);
  var result = searchJobs(data.jobs, q, CONFIG.MAX_RESULTS);
  replier.reply(formatSearch(q, result));
}

// 자동 푸시 타이머 등록 (앱이 켜져 있는 동안만 동작).
if (typeof setInterval !== "undefined") {
  setInterval(function () { poll(); }, CONFIG.POLL_MS);
}
