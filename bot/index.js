// 메신저봇R 진입 스크립트 (Rhino, ES5).
// 폰의 메신저봇R에 이 bot/ 폴더를 통째로 넣고 index.js를 메인 스크립트로 지정한다.
//
// 현재 동작: "!채용" 메시지에만 반응해서 sample.js의 임시 샘플 공고를 보여준다.
//           사람인 API(jobs.json)가 준비되면 response()의 표시 부분만 교체하면 된다.

var config = require("./config");
var api = require("./modules/api");
var format = require("./modules/format");
var push = require("./modules/push");
var sample = require("./modules/sample");

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

  // TODO: 사람인 API 연동 후 SAMPLE_JOBS 대신 아래 주석처럼 jobs.json을 읽어서 사용.
  //   var data = api.fetchJobs(config.JOBS_URL);
  //   replier.reply(data ? format.formatList(data.jobs) : format.formatLoadError());
  replier.reply(format.formatList(sample.SAMPLE_JOBS));
}
