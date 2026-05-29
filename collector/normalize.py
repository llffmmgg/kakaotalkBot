"""사람인 raw job dict → data/jobs.json 공통 스키마 변환.

스키마(docs/ARCHITECTURE.md):
  { id, title, company, region, career, employment, keywords, url, deadline, posted_at }

사람인 응답 구조는 가변적일 수 있으므로 모든 접근을 방어적으로(.get 체인) 처리한다.
"""

from datetime import datetime, timezone, timedelta

KST = timezone(timedelta(hours=9))


def _ts_to_date(value):
    """unix timestamp(초, 문자열/숫자) → 'YYYY-MM-DD' (KST). 실패 시 None."""
    if value in (None, "", "0"):
        return None
    try:
        ts = int(value)
    except (TypeError, ValueError):
        return None
    if ts <= 0:
        return None
    return datetime.fromtimestamp(ts, KST).strftime("%Y-%m-%d")


def _dig(d, *path, default=None):
    """중첩 dict를 안전하게 따라간다."""
    cur = d
    for key in path:
        if not isinstance(cur, dict):
            return default
        cur = cur.get(key)
    return cur if cur is not None else default


def _split_keywords(raw):
    if not raw:
        return []
    return [k.strip() for k in str(raw).split(",") if k.strip()]


def normalize_job(raw):
    """raw job dict 하나를 공통 스키마로. 변환 불가(필수값 없음)면 None."""
    job_id = raw.get("id")
    url = raw.get("url")
    title = _dig(raw, "position", "title")
    if not job_id or not title:
        return None

    return {
        "id": f"saramin-{job_id}",
        "title": str(title).strip(),
        "company": _dig(raw, "company", "detail", "name", default="").strip(),
        "region": _dig(raw, "position", "location", "name", default="").strip(),
        "career": _dig(raw, "position", "experience-level", "name", default="").strip(),
        "employment": _dig(raw, "position", "job-type", "name", default="").strip(),
        "keywords": _split_keywords(raw.get("keyword")),
        "url": url or "",
        "deadline": _ts_to_date(raw.get("expiration-timestamp")),
        "posted_at": _ts_to_date(raw.get("posting-timestamp")),
    }


def normalize_all(raw_jobs):
    """raw 리스트 → 정규화 리스트. 변환 실패 항목은 제외."""
    out = []
    for raw in raw_jobs:
        job = normalize_job(raw)
        if job is not None:
            out.append(job)
    return out
