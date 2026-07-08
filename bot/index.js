// 메신저봇R 진입 스크립트 (Rhino, ES5).
// 폰의 메신저봇R에 이 bot/ 폴더를 통째로 넣고 index.js를 메인 스크립트로 지정한다.
//
// 현재 동작: "!채용" 메시지에 반응해서 collector가 만든 jobs.json(raw URL)의 최신 공고를 보여준다.
//           또한 POLL_MS 주기로 신규 공고를 TARGET_ROOM에 자동 푸시한다.

var config = require("./config");
var api = require("./modules/api");
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

  // "!채용"으로 시작하는 메시지에만 반응. 그 외 일반 대화는 무시.
  if (text.indexOf(config.CMD_PREFIX) !== 0) {
    return;
  }

  // "!채용" 뒤 인자로 동작 분기. 예: "!채용 신입", "!채용경력", "!채용 도움말".
  var arg = text.substring(config.CMD_PREFIX.length);

  // 도움말.
  if (arg.indexOf("도움말") >= 0 || arg.indexOf("사용법") >= 0) {
    replier.reply(format.helpText());
    return;
  }

  var mode = "";
  var title = "📋 인기 채용공고";
  if (arg.indexOf("신입") >= 0) {
    mode = "신입"; title = "🌱 신입 채용공고";
  } else if (arg.indexOf("경력") >= 0) {
    mode = "경력"; title = "💼 경력 채용공고";
  }

  // collector가 만든 jobs.json(raw URL)을 읽어 공고를 응답한다.
  var data = api.fetchJobs(config.JOBS_URL);
  if (!data) {
    replier.reply(format.formatLoadError());
    return;
  }
  var jobs = format.filterByCareer(data.jobs, mode);
  // 최대 LIST_MAX개까지 PAGE_SIZE개씩 나눠 여러 메시지로 전송.
  var pages = format.formatListPaged(jobs, config.LIST_MAX, config.PAGE_SIZE, title, format.HINT);
  for (var i = 0; i < pages.length; i++) {
    replier.reply(pages[i]);
  }
}
