// 메신저봇R 진입 스크립트 (Rhino, ES5).
// 폰의 메신저봇R에 이 bot/ 폴더를 통째로 넣고 index.js를 메인 스크립트로 지정한다.

var config = require("./config");
var api = require("./modules/api");
var search = require("./modules/search");
var format = require("./modules/format");
var push = require("./modules/push");

// 자동 푸시: 스크립트 로드 시 폴링 타이머 등록.
// 주의: 메신저봇R 타이머는 앱이 살아있는 동안만 동작한다(폰 상시 구동 전제).
if (typeof setInterval !== "undefined") {
  setInterval(function () {
    push.poll();
  }, config.POLL_MS);
}

// 카카오톡 메시지 수신 시 호출된다.
function response(room, msg, sender, isGroupChat, replier, imageDB, packageName) {
  var text = String(msg || "").trim();

  // "!채용"으로 시작하는 메시지만 처리.
  if (text.indexOf(config.CMD_PREFIX) !== 0) {
    return;
  }

  // 접두사 뒤 인자. "!채용도움" / "!채용 도움" / "!채용"(인자 없음) → 도움말.
  var argStr = text.substring(config.CMD_PREFIX.length).trim();
  if (argStr === "" || argStr === "도움") {
    replier.reply(format.formatHelp());
    return;
  }

  var data = api.fetchJobs(config.JOBS_URL);
  if (!data) {
    replier.reply(format.formatLoadError());
    return;
  }

  var q = search.parseQuery(argStr);
  var result = search.search(data.jobs, q, config.MAX_RESULTS);
  replier.reply(format.formatSearch(q, result));
}
