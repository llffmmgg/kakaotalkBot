// raw jobs.json을 HTTP GET으로 가져온다 (Rhino + java.net.URL, ES5).
// 봇에서 직접 채용 사이트를 크롤링하지 않는다 — 오직 collector가 만든 jobs.json만 읽는다.

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
    return data; // { updated_at, jobs: [...] }
  } catch (e) {
    return null;
  }
}

module.exports = { fetchJobs: fetchJobs };
