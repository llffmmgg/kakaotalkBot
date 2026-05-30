// 임시 하드코딩 채용공고 (ES5). 사람인 API 연동 전까지 "!채용" 응답으로 사용.
// 출처: 원티드(wanted.co.kr), 2026-05-30 기준 실제 공고. 마감/링크는 시간이 지나면 만료될 수 있음.
// API가 준비되면 index.js에서 이 모듈 대신 api.fetchJobs(...).jobs를 쓰면 된다.

var SAMPLE_JOBS = [
  {
    id: "wanted-22942",
    title: "프론트엔드 개발자",
    company: "원티드랩",
    region: "서울 송파구",
    career: "경력 3년↑",
    employment: "정규직",
    url: "https://www.wanted.co.kr/wd/22942"
  },
  {
    id: "wanted-72000",
    title: "프론트엔드 개발자",
    company: "한국투자증권",
    region: "서울 영등포구",
    career: "경력 5년↑",
    employment: "정규직",
    url: "https://www.wanted.co.kr/wd/72000"
  },
  {
    id: "wanted-165809",
    title: "프론트엔드 개발자 (React)",
    company: "테스트뱅크",
    region: "서울 강남구",
    career: "경력",
    employment: "정규직",
    url: "https://www.wanted.co.kr/wd/165809"
  },
  {
    id: "wanted-310787",
    title: "백엔드 개발자 (Java/Spring)",
    company: "휴넷",
    region: "서울 구로구",
    career: "경력",
    employment: "정규직",
    url: "https://www.wanted.co.kr/wd/310787"
  },
  {
    id: "wanted-323",
    title: "백엔드 개발자 (Node.js)",
    company: "직방",
    region: "서울 서초구",
    career: "경력 3년↑",
    employment: "정규직",
    url: "https://www.wanted.co.kr/wd/323"
  },
  {
    id: "wanted-350058",
    title: "백엔드 개발자 (Node.js/NestJS)",
    company: "퓨잇",
    region: "서울 강남구",
    career: "경력",
    employment: "정규직",
    url: "https://www.wanted.co.kr/wd/350058"
  }
];

module.exports = { SAMPLE_JOBS: SAMPLE_JOBS };
