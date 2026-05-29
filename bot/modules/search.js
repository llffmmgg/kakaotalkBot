// 명령어 파싱 + 공고 필터 (ES5).
// 명령 예: "백엔드 지역:서울 경력:신입 형태:정규직"
//   - 콜론(:)이 있는 토큰은 옵션(지역/경력/형태), 나머지는 키워드.

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

function matches(job, q) {
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
  if (q.region && (job.region || "").indexOf(q.region) < 0) {
    return false;
  }
  if (q.career && (job.career || "").indexOf(q.career) < 0) {
    return false;
  }
  if (q.employment && (job.employment || "").indexOf(q.employment) < 0) {
    return false;
  }
  return true;
}

function search(jobs, q, limit) {
  var out = [];
  for (var i = 0; i < jobs.length; i++) {
    if (matches(jobs[i], q)) {
      out.push(jobs[i]);
    }
  }
  return { total: out.length, items: out.slice(0, limit) };
}

module.exports = { parseQuery: parseQuery, matches: matches, search: search };
