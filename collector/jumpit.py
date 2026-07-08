"""점핏(Jumpit) 채용 공개 JSON 클라이언트.

엔드포인트: GET https://jumpit-api.saramin.co.kr/api/positions (JSON)
점핏은 개발자 채용 전문 플랫폼(사람인 운영)이라 전부 한국·개발 공고다.

주의: 이 주소는 사이트 내부용 JSON이다(공식 개방 API 아님). 키는 필요 없지만
      구조가 바뀌거나 차단될 수 있다 — 실패해도 collector 전체는 계속 진행된다.

requests만 사용한다 → GitHub Actions 서버리스에 적합.
정규화까지 이 모듈에서 처리해 공통 스키마(docs/ARCHITECTURE.md) dict 리스트로 반환한다.
"""

BASE_URL = "https://jumpit-api.saramin.co.kr/api/positions"
POSITION_URL = "https://jumpit.saramin.co.kr/position/{id}"
USER_AGENT = "Mozilla/5.0"


class JumpitError(RuntimeError):
    pass


def _career(raw):
    """minCareer/maxCareer/newcomer → 사람이 읽는 경력 문자열."""
    if raw.get("newcomer"):
        return "신입"
    lo = raw.get("minCareer")
    hi = raw.get("maxCareer")
    if lo and hi:
        return "{}~{}년".format(lo, hi)
    if lo:
        return "{}년 이상".format(lo)
    return "경력무관"


def _normalize(raw):
    """점핏 position dict 하나 → 공통 스키마. 필수값 없으면 None."""
    job_id = raw.get("id")
    title = raw.get("title")
    if not job_id or not title:
        return None
    locations = raw.get("locations") or []
    closed = raw.get("closedAt")
    return {
        "id": "jumpit-{}".format(job_id),
        "title": str(title).strip(),
        "company": (raw.get("companyName") or "").strip(),
        "region": ", ".join(locations) if locations else "",
        "career": _career(raw),
        "employment": "정규직",  # 점핏 공고는 대부분 정규직.
        "keywords": [str(t).lower() for t in (raw.get("techStacks") or [])],
        "url": POSITION_URL.format(id=job_id),
        "deadline": None if raw.get("alwaysOpen") else (str(closed)[:10] if closed else None),
        "posted_at": None,  # 목록 API가 등록일을 주지 않는다.
    }


def fetch_jobs(size=100, max_pages=20, timeout=15):
    """점핏 개발 공고 전체를 공통 스키마 리스트로 반환(페이지네이션)."""
    import requests

    collected = []
    for page in range(max_pages):
        # sort=popular: 점핏 인기순. "!채용"이 인기 공고 위주로 보이게 한다.
        params = {"sort": "popular", "highlight": "false", "page": page, "size": size}
        resp = requests.get(BASE_URL, params=params,
                            headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
                            timeout=timeout)
        if resp.status_code != 200:
            raise JumpitError("HTTP {}: {}".format(resp.status_code, resp.text[:200]))
        try:
            result = resp.json().get("result", {})
        except ValueError as exc:
            raise JumpitError("JSON 파싱 실패: {}".format(exc)) from exc

        positions = result.get("positions", []) or []
        for raw in positions:
            job = _normalize(raw)
            if job is not None:
                collected.append(job)

        total = int(result.get("totalCount", 0) or 0)
        if not positions or (page + 1) * size >= total:
            break

    return collected
