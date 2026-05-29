#!/usr/bin/env python3
"""채용공고 수집 진입점.

사람인 API fetch → 정규화 → 기존 jobs.json과 병합(dedup) → data/jobs.json 쓰기.
GitHub Actions cron에서 실행되며, 변경이 있을 때만 git-auto-commit-action이 커밋한다.

사용:
    SARAMIN_ACCESS_KEY=... python collector/crawl.py
    python collector/crawl.py --max-pages 3
"""

import argparse
import json
import sys
from datetime import datetime, timezone, timedelta
from pathlib import Path

import saramin
import normalize
import dedup

KST = timezone(timedelta(hours=9))
ROOT = Path(__file__).resolve().parent.parent
DATA_FILE = ROOT / "data" / "jobs.json"


def load_existing(path):
    if not path.exists():
        return []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (ValueError, OSError):
        return []
    return data.get("jobs", []) if isinstance(data, dict) else []


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


def main(argv=None):
    parser = argparse.ArgumentParser(description="사람인 채용공고 수집기")
    parser.add_argument("--max-pages", type=int, default=5,
                        help="페이지네이션 최대 페이지 수 (기본 5)")
    parser.add_argument("--output", default=str(DATA_FILE),
                        help="출력 jobs.json 경로")
    args = parser.parse_args(argv)
    out_path = Path(args.output)

    access_key = saramin.get_access_key()
    if not access_key:
        # access-key는 사용자 선행조건(GitHub Secret). 없으면 수집 불가 →
        # 기존 jobs.json을 건드리지 않고 명확히 알리며 비정상 종료.
        print("ERROR: SARAMIN_ACCESS_KEY 환경변수가 없습니다. "
              "사람인 오픈API access-key를 발급받아 환경변수/Secret으로 주입하세요.",
              file=sys.stderr)
        return 2

    try:
        raw = saramin.fetch_it_jobs(access_key, max_pages=args.max_pages)
    except saramin.SaraminError as exc:
        print(f"ERROR: 사람인 API 호출 실패: {exc}", file=sys.stderr)
        return 1

    new_jobs = normalize.normalize_all(raw)
    existing = load_existing(out_path)
    merged = dedup.merge(existing, new_jobs)
    write_jobs(out_path, merged)

    print(f"수집 완료: raw {len(raw)}건 → 정규화 {len(new_jobs)}건 → "
          f"병합 후 {len(merged)}건 (기존 {len(existing)}건). → {out_path}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
