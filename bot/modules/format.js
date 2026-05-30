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

function formatList(items) {
  if (!items || items.length === 0) {
    return "등록된 채용공고가 아직 없어요.";
  }
  return "📋 채용공고 " + items.length + "건\n\n" + joinJobs(items);
}

function formatNew(items) {
  return "🆕 새 채용공고 " + items.length + "건\n\n" + joinJobs(items);
}

function formatLoadError() {
  return "공고 데이터를 불러오지 못했어요. 잠시 후 다시 시도해주세요.";
}

module.exports = {
  formatJob: formatJob,
  formatList: formatList,
  formatNew: formatNew,
  formatLoadError: formatLoadError
};
