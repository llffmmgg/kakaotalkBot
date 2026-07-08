// 자동 푸시 (ES5). jobs.json을 주기적으로 polling해서 신규 공고만 대상 방에 전송.
// 방별이 아닌 단일 TARGET_ROOM 기준. 중복 방지를 위해 보낸 공고 id를 DataBase에 저장한다.

var config = require("../config");
var api = require("./api");
var format = require("./format");

var DB_KEY = "pushedIds";     // 이미 푸시한 공고 id 집합(JSON 배열 문자열)
var SLOT_KEY = "lastPushSlot"; // 마지막으로 푸시를 완료한 시간대(하루 2번 중복 방지)

// 지금이 config.PUSH_HOURS에 해당하는 푸시 시각이면 그 시간대 식별 문자열을,
// 아니면 null을 반환한다. 예: 오전 9시대면 "2026-7-8-9".
function currentPushSlot() {
  var d = new Date();
  var h = d.getHours();
  for (var i = 0; i < config.PUSH_HOURS.length; i++) {
    if (h === config.PUSH_HOURS[i]) {
      return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate() + "-" + h;
    }
  }
  return null;
}

function getDoneSlot() {
  try {
    var raw = DataBase.getDataBase(SLOT_KEY);
    return raw ? String(raw) : "";
  } catch (e) {
    return "";
  }
}

function setDoneSlot(slot) {
  try {
    DataBase.setDataBase(SLOT_KEY, slot);
  } catch (e) {
    // DataBase 사용 불가 시 조용히 무시.
  }
}

function loadPushed() {
  try {
    var raw = DataBase.getDataBase(DB_KEY);
    if (!raw) {
      return null; // 최초 실행 표시
    }
    var arr = JSON.parse(String(raw));
    return (arr && typeof arr.length === "number") ? arr : null;
  } catch (e) {
    return null;
  }
}

function savePushed(ids) {
  try {
    DataBase.setDataBase(DB_KEY, JSON.stringify(ids));
  } catch (e) {
    // DataBase 사용 불가 시 조용히 무시(다음 폴링에서 재시도).
  }
}

function toSet(arr) {
  var s = {};
  for (var i = 0; i < arr.length; i++) {
    s[arr[i]] = true;
  }
  return s;
}

function poll() {
  var data = api.fetchJobs(config.JOBS_URL);
  if (!data || !data.jobs) {
    return;
  }
  var jobs = data.jobs;

  var currentIds = [];
  for (var i = 0; i < jobs.length; i++) {
    if (jobs[i].id) {
      currentIds.push(jobs[i].id);
    }
  }

  var pushedArr = loadPushed();
  if (pushedArr === null) {
    // 최초 실행: 현재 공고를 '이미 본 것'으로 시드 → 초기 대량 스팸 방지. 푸시하지 않음.
    savePushed(currentIds);
    return;
  }

  // 지금이 푸시 시각(PUSH_HOURS)이 아니면 아무것도 보내지 않는다.
  // → 그 사이 올라온 신규 공고는 pushed에 추가되지 않고 쌓였다가 다음 푸시 시각에 함께 나간다.
  var slot = currentPushSlot();
  if (slot === null) {
    return;
  }
  // 이번 시간대에 이미 보냈으면 중복 방지(하루 2번 각 1회).
  if (getDoneSlot() === slot) {
    return;
  }

  var pushed = toSet(pushedArr);

  // 아직 안 보낸 신규 공고.
  var fresh = [];
  for (var j = 0; j < jobs.length; j++) {
    if (jobs[j].id && !pushed[jobs[j].id]) {
      fresh.push(jobs[j]);
    }
  }

  // pushed를 현재 존재하는 id로 프루닝(만료 공고 id 정리).
  var keep = {};
  for (var k = 0; k < currentIds.length; k++) {
    if (pushed[currentIds[k]]) {
      keep[currentIds[k]] = true;
    }
  }

  if (fresh.length === 0) {
    // 보낼 신규 공고가 없어도 이 시간대는 처리 완료로 표시(반복 검사 방지).
    savePushed(Object.keys(keep));
    setDoneSlot(slot);
    return;
  }

  var toSend = fresh.slice(0, config.MAX_PUSH);
  var ok = Api.replyRoom(config.TARGET_ROOM, format.formatNew(toSend));

  // 전송 성공(true: 방 세션 존재)한 경우에만 보낸 것으로 기록하고 이 시간대를 완료 처리.
  // 실패(방을 못 찾음 등) 시에는 완료 표시하지 않아 다음 폴링에서 재시도한다.
  if (ok === true) {
    for (var m = 0; m < toSend.length; m++) {
      keep[toSend[m].id] = true;
    }
    setDoneSlot(slot);
  }
  savePushed(Object.keys(keep));
}

module.exports = { poll: poll };
