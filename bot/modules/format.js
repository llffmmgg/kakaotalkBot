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
  var body = joinJobs(result.items);
  var msg = header + "\n\n" + body;
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

function formatLoadError() {
  return "공고 데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.";
}

module.exports = {
  formatJob: formatJob,
  formatSearch: formatSearch,
  formatNew: formatNew,
  formatHelp: formatHelp,
  formatLoadError: formatLoadError
};
