// 공고 → 카톡 메시지 문자열 (docs/UI_GUIDE.md 규칙, ES5).

function truncate(s, n) {
  s = String(s || "");
  if (s.length <= n) {
    return s;
  }
  return s.substring(0, n - 1) + "…";
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

// career 문자열로 신입/경력 판별.
// "신입"·"경력무관"은 신입 지원 가능, 그 외("3~5년" 등)는 경력.
function isEntryLevel(job) {
  var c = String(job.career || "");
  return c === "신입" || c.indexOf("무관") >= 0;
}

// mode: "신입" | "경력" | 그 외(전체). 필터된 배열 반환.
function filterByCareer(items, mode) {
  if (!items) { return []; }
  if (mode === "신입") {
    return items.filter(function (j) { return isEntryLevel(j); });
  }
  if (mode === "경력") {
    return items.filter(function (j) { return !isEntryLevel(j); });
  }
  return items;
}

function formatList(items, limit, title) {
  var head = title || "📋 채용공고";
  if (!items || items.length === 0) {
    return head + "가 아직 없어요.";
  }
  var total = items.length;
  var shown = items;
  var note = "";
  if (limit && total > limit) {
    shown = items.slice(0, limit);
    note = "\n\n…외 " + (total - limit) + "건 더 있어요. (최신 " + limit + "건만 표시)";
  }
  return head + " " + total + "건\n\n" + joinJobs(shown) + note;
}

// 목록을 여러 메시지(페이지)로 나눠 문자열 배열로 반환한다.
// maxTotal개까지만, pageSize개씩 쪼갠다. 마지막 페이지에 잔여 안내 + hint를 붙인다.
function formatListPaged(items, maxTotal, pageSize, title, hint) {
  var head = title || "📋 채용공고";
  if (!items || items.length === 0) {
    return [head + "가 아직 없어요."];
  }
  var total = items.length;
  var shown = items.slice(0, maxTotal);
  var pageCount = Math.ceil(shown.length / pageSize);
  var pages = [];
  for (var p = 0; p < pageCount; p++) {
    var slice = shown.slice(p * pageSize, (p + 1) * pageSize);
    var header = head + " " + total + "건" + (pageCount > 1 ? " (" + (p + 1) + "/" + pageCount + ")" : "");
    var body = header + "\n\n" + joinJobs(slice);
    if (p === pageCount - 1) {
      if (total > shown.length) {
        body += "\n\n…외 " + (total - shown.length) + "건 더 있어요. (상위 " + shown.length + "건만 표시)";
      }
      if (hint) { body += hint; }
    }
    pages.push(body);
  }
  return pages;
}

function formatNew(items) {
  return "🆕 새 채용공고 " + items.length + "건\n\n" + joinJobs(items);
}

function formatLoadError() {
  return "공고 데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.";
}

// 목록 하단에 붙일 사용법 힌트(신입/경력 필터 발견용).
var HINT = "\n\n💡 !채용 신입 · !채용 경력 · !채용 도움말";

function helpText() {
  return [
    "🤖 개발자 채용공고 봇",
    "",
    "• !채용 — 인기 공고",
    "• !채용 신입 — 신입 공고만",
    "• !채용 경력 — 경력 공고만",
    "",
    "매일 오전 9시·오후 6시에 새 공고를 자동으로 알려드려요.",
    "출처: 점핏(jumpit)"
  ].join("\n");
}

module.exports = {
  formatJob: formatJob,
  formatList: formatList,
  formatListPaged: formatListPaged,
  formatNew: formatNew,
  formatLoadError: formatLoadError,
  filterByCareer: filterByCareer,
  helpText: helpText,
  HINT: HINT
};
