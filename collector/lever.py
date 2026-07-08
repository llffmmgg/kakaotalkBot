"""Lever 공개 채용 API 클라이언트.

엔드포인트: GET https://api.lever.co/v0/postings/{handle}?mode=json (JSON 배열)
공개 API라 access-key가 필요 없다. 많은 IT/스타트업이 Lever를 쓴다.

requests만 사용한다 → GitHub Actions 서버리스에 적합.
정규화까지 이 모듈에서 처리해 공통 스키마(docs/ARCHITECTURE.md) dict 리스트로 반환한다.
"""

from datetime import datetime, timezone, timedelta

KST = timezone(timedelta(hours=9))
BASE_URL = "https://api.lever.co/v0/postings/{handle}"


class LeverError(RuntimeError):
    pass


def _ms_to_date(value):
    """밀리초 timestamp → 'YYYY-MM-DD' (KST). 실패 시 None."""
    if not value:
        return None
    try:
        return datetime.fromtimestamp(int(value) / 1000, KST).strftime("%Y-%m-%d")
    except (TypeError, ValueError, OSError):
        return None


def _normalize(handle, raw):
    """Lever posting dict 하나 → 공통 스키마. 필수값 없으면 None."""
    job_id = raw.get("id")
    title = raw.get("text")
    if not job_id or not title:
        return None
    categories = raw.get("categories") or {}
    return {
        "id": "lever-{}-{}".format(handle, job_id),
        "title": str(title).strip(),
        "company": handle,
        "region": (categories.get("location") or "").strip(),
        "career": "",
        "employment": (categories.get("commitment") or "").strip(),
        "keywords": [t for t in ([categories.get("team")] if categories.get("team") else [])],
        "url": raw.get("hostedUrl", ""),
        "deadline": None,  # Lever는 마감일을 제공하지 않는다.
        "posted_at": _ms_to_date(raw.get("createdAt")),
    }


def fetch_jobs(handle, timeout=15):
    """한 회사(handle)의 전체 공고를 공통 스키마 리스트로 반환."""
    import requests  # lazy import

    url = BASE_URL.format(handle=handle)
    resp = requests.get(url, params={"mode": "json"}, timeout=timeout)
    if resp.status_code != 200:
        raise LeverError("HTTP {}: {}".format(resp.status_code, resp.text[:200]))
    try:
        payload = resp.json()
    except ValueError as exc:
        raise LeverError("JSON 파싱 실패: {}".format(exc)) from exc

    out = []
    for raw in payload if isinstance(payload, list) else []:
        job = _normalize(handle, raw)
        if job is not None:
            out.append(job)
    return out
