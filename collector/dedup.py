"""기존 jobs.json과 신규 수집분을 병합 — id 기준 dedup + 마감 공고 제거.

collector는 멱등해야 한다: 같은 입력 재실행 시 중복을 추가하지 않는다(CLAUDE.md).
"""

from datetime import datetime, timezone, timedelta

KST = timezone(timedelta(hours=9))


def _today_kst():
    return datetime.now(KST).strftime("%Y-%m-%d")


def is_expired(job, today=None):
    """deadline이 오늘 이전이면 만료. deadline 없으면 만료로 보지 않음."""
    deadline = job.get("deadline")
    if not deadline:
        return False
    today = today or _today_kst()
    return deadline < today


def merge(existing_jobs, new_jobs, today=None):
    """기존 + 신규를 id 기준으로 병합하고 만료 공고를 제거.

    - 같은 id가 있으면 신규(new) 값으로 갱신한다.
    - posted_at 최신순으로 정렬해 반환.
    """
    today = today or _today_kst()
    by_id = {}

    for job in existing_jobs:
        jid = job.get("id")
        if jid:
            by_id[jid] = job
    for job in new_jobs:  # 신규가 기존을 덮어씀(최신 정보 우선)
        jid = job.get("id")
        if jid:
            by_id[jid] = job

    merged = [j for j in by_id.values() if not is_expired(j, today)]
    merged.sort(key=lambda j: (j.get("posted_at") or ""), reverse=True)
    return merged
