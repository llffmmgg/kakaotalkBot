"""사람인 공식 채용정보 검색 API 클라이언트.

엔드포인트: GET https://oapi.saramin.co.kr/job-search (JSON)
명세: https://oapi.saramin.co.kr/guide/job-search

requests만 사용한다(브라우저 불필요) → GitHub Actions 서버리스에 적합.
access-key는 환경변수 SARAMIN_ACCESS_KEY로 주입한다(코드/repo에 키 금지).
"""

import os

BASE_URL = "https://oapi.saramin.co.kr/job-search"

# 사람인 직무 중분류(job_mid_cd) "IT개발·데이터". 정확한 코드값은
# https://oapi.saramin.co.kr/guide/code-table5 로 확정할 것. 기본값은 환경변수로 override 가능.
DEFAULT_IT_MID_CODE = os.getenv("SARAMIN_IT_MID_CD", "2")

# count 최대 110 (명세). 페이지(start)는 0부터.
MAX_COUNT_PER_PAGE = 110


class SaraminError(RuntimeError):
    pass


def fetch_it_jobs(access_key, *, it_mid_cd=None, max_pages=5,
                  count=MAX_COUNT_PER_PAGE, sort="pd", timeout=15):
    """IT/개발 직무 공고를 페이지네이션하며 모아 raw job dict 리스트로 반환.

    각 원소는 사람인 응답의 jobs.job[] 항목(dict) 그대로다. 정규화는 normalize.py 담당.
    """
    if not access_key:
        raise SaraminError("SARAMIN_ACCESS_KEY가 비어 있습니다.")

    import requests  # 실제 fetch 시에만 필요(키 없이도 모듈 import 가능하게 lazy import)

    it_mid_cd = it_mid_cd or DEFAULT_IT_MID_CODE
    collected = []

    for start in range(max_pages):
        params = {
            "access-key": access_key,
            "job_mid_cd": it_mid_cd,
            "count": count,
            "start": start,
            "sort": sort,
            # 마감일/게시일/키워드를 응답에 포함시킨다.
            "fields": "posting-date,expiration-date,keyword-code,count",
        }
        resp = requests.get(BASE_URL, params=params, timeout=timeout)
        if resp.status_code != 200:
            raise SaraminError(f"HTTP {resp.status_code}: {resp.text[:300]}")

        try:
            payload = resp.json()
        except ValueError as exc:
            raise SaraminError(f"JSON 파싱 실패: {exc}") from exc

        jobs = payload.get("jobs", {})
        page_items = jobs.get("job", []) or []
        collected.extend(page_items)

        # 응답이 비었거나 마지막 페이지면 중단.
        total = int(jobs.get("total", 0) or 0)
        if not page_items or (start + 1) * count >= total:
            break

    return collected


def get_access_key():
    """환경변수에서 access-key를 읽는다. 없으면 None."""
    return os.getenv("SARAMIN_ACCESS_KEY")
