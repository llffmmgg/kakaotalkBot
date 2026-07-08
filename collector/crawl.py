#!/usr/bin/env python3
"""채용공고 수집 진입점.

Greenhouse/Lever 공개 API fetch → IT/개발 공고 필터 → 기존 jobs.json과 병합(dedup)
→ data/jobs.json 쓰기. GitHub Actions cron에서 실행되며, 변경이 있을 때만 커밋된다.

공개 API라 access-key가 필요 없다. 수집 대상 회사는 collector/companies.json에서 관리한다.

사용:
    python collector/crawl.py
    python collector/crawl.py --companies collector/companies.json
"""

import argparse
import json
import re
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

import greenhouse
import lever
import jumpit
import dedup

KST = timezone(timedelta(hours=9))
ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "jobs.json"
COMPANIES_FILE = Path(__file__).resolve().parent / "companies.json"

# 제목에 이 단어 중 하나라도 들어가면 IT/개발 공고로 본다(대소문자 무시).
# 한글/긴 영어 단어는 부분일치, 짧은 영어 약어는 단어 단위(\b)로 매칭한다.
# (예: 'ai'가 'campaign' 안에 들어가 오탐되는 것을 방지)
IT_SUBSTRINGS = [
    "개발", "엔지니어", "engineer", "developer", "backend", "frontend",
    "back-end", "front-end", "fullstack", "full-stack", "software",
    "데이터", "devops", "android", "머신러닝", "machine learning",
    "보안", "security", "플랫폼", "platform", "인프라", "서버", "웹",
]
IT_WORDS = ["ai", "ml", "qa", "sre", "ios", "data", "server", "web", "mobile", "infra"]
_IT_WORD_RE = re.compile(r"\b(" + "|".join(IT_WORDS) + r")\b", re.IGNORECASE)

# region(근무지)에 이 단어가 들어가면 한국 공고로 본다. 한국 오픈채팅 대상이므로 기본 적용.
KOREA_KEYWORDS = [
    "korea", "seoul", "한국", "서울", "대한민국", "pangyo", "판교", "성남", "경기",
]

FETCHERS = {
    "greenhouse": greenhouse.fetch_jobs,
    "lever": lever.fetch_jobs,
}


def load_existing(path):
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return []
    return data.get("jobs", []) if isinstance(data, dict) else []


def load_companies(path):
    """companies.json에서 [{provider, handle}, ...] 목록을 읽는다."""
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    return data.get("companies", []) if isinstance(data, dict) else []


def is_it_job(job):
    # 점핏은 개발 전용 플랫폼이라 기술스택(keywords)이 있으면 개발 공고로 본다.
    if job.get("keywords"):
        return True
    title = (job.get("title") or "").lower()
    if any(kw in title for kw in IT_SUBSTRINGS):
        return True
    return bool(_IT_WORD_RE.search(title))


def is_korea_job(job):
    # 점핏 공고는 전부 한국 채용이다(지역 문자열이 도시명이라 키워드로 다 못 잡음).
    if str(job.get("id") or "").startswith("jumpit-"):
        return True
    region = (job.get("region") or "").lower()
    return any(kw in region for kw in KOREA_KEYWORDS)


def write_jobs(path, jobs):
    path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "updated_at": datetime.now(KST).strftime("%Y-%m-%dT%H:%M:%S%z"),
        "jobs": jobs,
    }
    path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )


def collect(companies):
    """소스 목록을 돌며 공고를 모은다. 한 소스가 실패해도 나머지는 계속 진행.

    - jumpit: handle 없이 플랫폼 전체를 가져오는 단일 소스.
    - greenhouse/lever: 회사별 handle이 필요하다.
    """
    collected = []
    for entry in companies:
        provider = entry.get("provider")
        handle = entry.get("handle")
        label = provider if provider == "jumpit" else "{}:{}".format(provider, handle)

        try:
            if provider == "jumpit":
                jobs = jumpit.fetch_jobs()
            else:
                fetcher = FETCHERS.get(provider)
                if not fetcher or not handle:
                    print(f"경고: 잘못된 항목 건너뜀: {entry}", file=sys.stderr)
                    continue
                jobs = fetcher(handle)
        except Exception as exc:  # 개별 소스 실패는 치명적이지 않다.
            print(f"경고: {label} 수집 실패: {exc}", file=sys.stderr)
            continue
        # companies.json에 name이 있으면 한글 회사명으로 표시.
        display = entry.get("name")
        if display:
            for j in jobs:
                j["company"] = display
        print(f"  {label} → {len(jobs)}건")
        collected.extend(jobs)
    return collected


def main(argv=None):
    parser = argparse.ArgumentParser(description="Greenhouse/Lever 채용공고 수집기")
    parser.add_argument("--companies", default=str(COMPANIES_FILE),
                        help="수집 대상 회사 목록 JSON 경로")
    parser.add_argument("--output", default=str(DATA_FILE),
                        help="출력 jobs.json 경로")
    parser.add_argument("--no-filter", action="store_true",
                        help="IT/개발 필터 없이 모든 공고 수집")
    parser.add_argument("--all-regions", action="store_true",
                        help="한국 지역 필터를 끄고 전 세계 공고 수집")
    args = parser.parse_args(argv)
    out_path = Path(args.output)

    companies = load_companies(args.companies)
    if not companies:
        print("ERROR: companies.json에 수집 대상 회사가 없습니다.", file=sys.stderr)
        return 2

    raw = collect(companies)
    new_jobs = raw if args.no_filter else [j for j in raw if is_it_job(j)]
    if not args.all_regions:
        new_jobs = [j for j in new_jobs if is_korea_job(j)]

    existing = load_existing(out_path)
    merged = dedup.merge(existing, new_jobs)
    write_jobs(out_path, merged)

    print(f"수집 완료: 수집 {len(raw)}건 → 필터 후 {len(new_jobs)}건 → "
          f"병합 후 {len(merged)}건 (기존 {len(existing)}건). → {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
