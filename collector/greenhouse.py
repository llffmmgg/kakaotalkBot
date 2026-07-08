"""Greenhouse 공개 채용 API 클라이언트.

엔드포인트: GET https://boards-api.greenhouse.io/v1/boards/{handle}/jobs?content=true (JSON)
공개 API라 access-key가 필요 없다. 많은 IT/스타트업이 Greenhouse를 쓴다.

requests만 사용한다 → GitHub Actions 서버리스에 적합.
정규화까지 이 모듈에서 처리해 공통 스키마(docs/ARCHITECTURE.md) dict 리스트로 반환한다.
"""

from datetime import datetime

BASE_URL = "https://boards-api.greenhouse.io/v1/boards/{handle}/jobs"


class GreenhouseError(RuntimeError):
    pass


def _iso_to_date(value):
    """'2026-05-28T12:00:00-04:00' 같은 ISO 문자열 → 'YYYY-MM-DD'. 실패 시 None."""
    if not value:
        return None
    try:
        # 'Z'는 fromisoformat이 못 읽으므로 +00:00으로 치환.
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).strftime("%Y-%m-%d")
    except (ValueError, TypeError):
        return str(value)[:10] or None


def _normalize(handle, raw):
    """Greenhouse job dict 하나 → 공통 스키마. 필수값 없으면 None."""
    job_id = raw.get("id")
    title = raw.get("title")
    if not job_id or not title:
        return None
    return {
        "id": "greenhouse-{}-{}".format(handle, job_id),
        "title": str(title).strip(),
        "company": handle,
        "region": (raw.get("location") or {}).get("name", "").strip(),
        "career": "",
        "employment": "",
        "keywords": [],
        "url": raw.get("absolute_url", ""),
        "deadline": None,  # Greenhouse는 마감일을 제공하지 않는다.
        "posted_at": _iso_to_date(raw.get("updated_at") or raw.get("first_published")),
    }


def fetch_jobs(handle, timeout=15):
    """한 회사(handle)의 전체 공고를 공통 스키마 리스트로 반환."""
    import requests  # lazy import (키 없이도 모듈 import 가능하게)

    url = BASE_URL.format(handle=handle)
    resp = requests.get(url, params={"content": "false"}, timeout=timeout)
    if resp.status_code != 200:
        raise GreenhouseError("HTTP {}: {}".format(resp.status_code, resp.text[:200]))
    try:
        payload = resp.json()
    except ValueError as exc:
        raise GreenhouseError("JSON 파싱 실패: {}".format(exc)) from exc

    out = []
    for raw in payload.get("jobs", []) or []:
        job = _normalize(handle, raw)
        if job is not None:
            out.append(job)
    return out
