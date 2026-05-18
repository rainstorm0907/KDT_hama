# -*- coding: utf-8 -*-
"""플랫폼별 상품명 공백 토큰으로 1차(L1)·2차(L2) 계층 클러스터링 후, 트리 노드를 CSV로 내보냅니다."""

import argparse
import itertools
import re
from collections import Counter, defaultdict
from datetime import datetime
from pathlib import Path

import pandas as pd


_RESULT_BASE = Path(__file__).resolve().parent
RESULT_DIR = Path(__file__).with_name("results")
DEFAULT_INPUT_PATH = RESULT_DIR / "latest_crawling_no_filter.csv"
DEFAULT_OUTPUT_DIR = RESULT_DIR / "clusters"
DEFAULT_TOKEN_BLACKLIST_PATH = _RESULT_BASE / "blacklist_tokens.csv"
DEFAULT_THRESHOLD = 0.35
DEFAULT_MIN_SHARED_TOKENS = 1
DEFAULT_THRESHOLD_L2 = 0.52
DEFAULT_MIN_SHARED_TOKENS_L2 = 2


def normalize_text(value):
    text = str(value).lower()
    text = re.sub(r"(?<=[a-z0-9])plus\b", " 플러스", text)
    text = re.sub(r"\bplus\b|[+＋]", " 플러스 ", text)
    text = re.sub(r"\bpro\b", " 프로 ", text)
    text = re.sub(r"\bmax\b", " 맥스 ", text)
    text = re.sub(r"\bultra\b", " 울트라 ", text)
    return re.sub(r"\s+", " ", text).strip()


def tokenize_by_space(value):
    """공백으로만 1차 분리하되, 토큰 양끝의 특수문자는 정리합니다."""
    text = normalize_text(value)
    tokens = []
    for token in text.split(" "):
        token = re.sub(r"^[^\w가-힣]+|[^\w가-힣]+$", "", token)
        if token:
            tokens.append(token)
    return tokens


def load_token_blacklist(csv_path):
    """blacklist_tokens.csv에서 토큰 집합을 읽습니다. 컬럼명 token을 우선 사용합니다."""
    path = Path(csv_path)
    if not path.exists():
        return frozenset()

    df = pd.read_csv(path, encoding="utf-8-sig")
    if df.empty or not len(df.columns):
        return frozenset()

    col = "token" if "token" in df.columns else df.columns[0]
    raw = df[col].dropna().astype(str).str.strip()
    raw = raw[raw != ""]
    raw = raw[~raw.str.startswith("#")]

    blacklist = set()
    for cell in raw:
        blacklist.update(tokenize_by_space(cell))
    return frozenset(blacklist)


def title_has_blacklisted_token(title, blacklist_tokens):
    """상품명을 클러스터링과 동일하게 토큰화했을 때 블랙리스트와 겹치면 True입니다."""
    if not blacklist_tokens:
        return False
    return not set(tokenize_by_space(title)).isdisjoint(blacklist_tokens)


def jaccard_similarity(left_tokens, right_tokens):
    if not left_tokens and not right_tokens:
        return 0.0

    intersection_count = len(left_tokens & right_tokens)
    union_count = len(left_tokens | right_tokens)
    return intersection_count / union_count if union_count else 0.0


class UnionFind:
    def __init__(self, size):
        self.parent = list(range(size))

    def find(self, value):
        while self.parent[value] != value:
            self.parent[value] = self.parent[self.parent[value]]
            value = self.parent[value]
        return value

    def union(self, left, right):
        left_root = self.find(left)
        right_root = self.find(right)
        if left_root == right_root:
            return
        if left_root < right_root:
            self.parent[right_root] = left_root
        else:
            self.parent[left_root] = right_root


def _group_rows_by_token_jaccard(token_sets, threshold, min_shared_tokens):
    """row 인덱스 0 .. n-1 을 공통 토큰 최소값 + Jaccard 임계값으로 묶습니다."""
    n = len(token_sets)
    if n == 0:
        return []
    if n == 1:
        return [[0]]

    union_find = UnionFind(n)

    token_to_rows = defaultdict(list)
    for row_idx, tokens in enumerate(token_sets):
        for token in tokens:
            token_to_rows[token].append(row_idx)

    checked_pairs = set()
    for candidate_rows in token_to_rows.values():
        for left_idx, right_idx in itertools.combinations(candidate_rows, 2):
            pair = (left_idx, right_idx) if left_idx < right_idx else (right_idx, left_idx)
            if pair in checked_pairs:
                continue
            checked_pairs.add(pair)

            shared_count = len(token_sets[left_idx] & token_sets[right_idx])
            if shared_count < min_shared_tokens:
                continue

            similarity = jaccard_similarity(token_sets[left_idx], token_sets[right_idx])
            if similarity >= threshold:
                union_find.union(left_idx, right_idx)

    root_to_rows = defaultdict(list)
    for row_idx in range(n):
        root_to_rows[union_find.find(row_idx)].append(row_idx)

    return sorted(root_to_rows.values(), key=lambda rows: min(rows))


def safe_name(value):
    return re.sub(r"[^0-9A-Za-z가-힣_-]+", "_", str(value)).strip("_") or "unknown"


def merge_unique(values, limit=None):
    unique_values = [str(value).strip() for value in values if str(value).strip()]
    unique_values = list(dict.fromkeys(unique_values))
    if limit is not None:
        unique_values = unique_values[:limit]
    return " | ".join(unique_values)


def choose_representative(names):
    candidates = [str(name).strip() for name in names if str(name).strip()]
    if not candidates:
        return ""
    return max(candidates, key=lambda name: (len(set(tokenize_by_space(name))), len(name)))


def ordered_cluster_tokens_from_lists(token_lists_slice):
    token_counter = Counter()
    for token_list in token_lists_slice:
        token_counter.update(token_list)
    return " ".join(token for token, _ in token_counter.most_common())


def build_clusters(
    platform_df,
    platform,
    threshold_l1,
    min_shared_l1,
    threshold_l2,
    min_shared_l2,
    run_second_stage=True,
):
    working_df = platform_df.reset_index(drop=True)
    names = working_df["name"].fillna("").tolist()
    token_sets = [set(tokenize_by_space(name)) for name in names]
    token_lists = [tokenize_by_space(name) for name in names]

    l1_groups = _group_rows_by_token_jaccard(token_sets, threshold_l1, min_shared_l1)
    p_slug = safe_name(platform)
    root_id = f"{p_slug}::__root"

    item_rows = []
    summary_rows = []
    tree_nodes = []

    tree_nodes.append(
        {
            "parent_node_id": "",
            "node_id": root_id,
            "platform": platform,
            "depth": 0,
            "item_count": len(working_df),
            "representative_name": "",
            "cluster_tokens": "",
            "matched_keywords": merge_unique(working_df["keyword"].fillna("")) if len(working_df) else "",
        }
    )

    for cluster_no, row_indices_l1 in enumerate(l1_groups, start=1):
        cluster_l1_id = f"{p_slug}_{cluster_no:03d}"
        cluster_l1_names = [names[i] for i in row_indices_l1]
        token_lists_l1 = [token_lists[i] for i in row_indices_l1]
        cluster_tokens_l1 = ordered_cluster_tokens_from_lists(token_lists_l1)
        rep_l1 = choose_representative(cluster_l1_names)

        tree_nodes.append(
            {
                "parent_node_id": root_id,
                "node_id": cluster_l1_id,
                "platform": platform,
                "depth": 1,
                "item_count": len(row_indices_l1),
                "representative_name": rep_l1,
                "cluster_tokens": cluster_tokens_l1,
                "matched_keywords": merge_unique(working_df.loc[row_indices_l1, "keyword"].fillna("")),
            }
        )

        if len(row_indices_l1) < 2 or not run_second_stage:
            l2_local_groups = [list(range(len(row_indices_l1)))]
        else:
            sub_token_sets = [token_sets[row_indices_l1[j]] for j in range(len(row_indices_l1))]
            l2_local_groups = _group_rows_by_token_jaccard(sub_token_sets, threshold_l2, min_shared_l2)

        for sub_no, local_rows in enumerate(l2_local_groups, start=1):
            cluster_l2_id = f"{cluster_l1_id}_s{sub_no:02d}"
            global_rows = [row_indices_l1[j] for j in local_rows]
            l2_names = [names[g] for g in global_rows]
            token_lists_l2 = [token_lists[g] for g in global_rows]
            cluster_tokens_l2 = ordered_cluster_tokens_from_lists(token_lists_l2)
            rep_l2 = choose_representative(l2_names)
            breadcrumbs = rep_l1 if rep_l2 == rep_l1 else f"{rep_l1} › {rep_l2}"

            tree_nodes.append(
                {
                    "parent_node_id": cluster_l1_id,
                    "node_id": cluster_l2_id,
                    "platform": platform,
                    "depth": 2,
                    "item_count": len(global_rows),
                    "representative_name": rep_l2,
                    "cluster_tokens": cluster_tokens_l2,
                    "matched_keywords": merge_unique(working_df.loc[global_rows, "keyword"].fillna("")),
                }
            )

            summary_rows.append(
                {
                    "platform": platform,
                    "cluster_id": cluster_l2_id,
                    "cluster_l1_id": cluster_l1_id,
                    "cluster_l2_id": cluster_l2_id,
                    "cluster_size": len(global_rows),
                    "representative_name_l1": rep_l1,
                    "representative_name_l2": rep_l2,
                    "representative_name": rep_l2,
                    "derived_product_name": rep_l2,
                    "breadcrumb_names": breadcrumbs,
                    "tree_path_ids": f"{root_id}/{cluster_l1_id}/{cluster_l2_id}",
                    "cluster_tokens_l1": cluster_tokens_l1,
                    "cluster_tokens_l2": cluster_tokens_l2,
                    "matched_keywords": merge_unique(working_df.loc[global_rows, "keyword"].fillna("")),
                    "sample_names": merge_unique(l2_names, limit=5),
                }
            )

            for g in global_rows:
                meta = summary_rows[-1]
                row = working_df.iloc[g].to_dict()
                row.update(
                    {
                        "token_text": " ".join(token_lists[g]),
                        "token_count": len(token_lists[g]),
                        "cluster_id": cluster_l2_id,
                        "cluster_l1_id": cluster_l1_id,
                        "cluster_l2_id": cluster_l2_id,
                        "cluster_size": meta["cluster_size"],
                        "representative_name_l1": rep_l1,
                        "representative_name_l2": rep_l2,
                        "representative_name": rep_l2,
                        "derived_product_name": rep_l2,
                        "breadcrumb_names": breadcrumbs,
                        "tree_path_ids": meta["tree_path_ids"],
                        "cluster_tokens_l1": cluster_tokens_l1,
                        "cluster_tokens_l2": cluster_tokens_l2,
                        "cluster_tokens": cluster_tokens_l2,
                    }
                )
                item_rows.append(row)

    return item_rows, summary_rows, tree_nodes


def stdout_preview_clustering(summary_df: pd.DataFrame, tree_df: pd.DataFrame, *, max_summary_rows=10, max_tree_rows=22):
    """터미널에서 결과 형태를 바로 확인할 수 있도록 간단한 텍스트 미리보기를 만듭니다."""
    chunks = []

    chunks.append("[L2 리프 요약 · 상위 {} 행]".format(max_summary_rows))
    if summary_df.empty:
        chunks.append("(데이터 없음)")
    else:
        sub = summary_df.head(max_summary_rows).copy()
        cols_out = [c for c in ("platform", "cluster_id", "cluster_size") if c in sub.columns]
        if "breadcrumb_names" in sub.columns:
            sub["_breadcrumb_preview"] = sub["breadcrumb_names"].astype(str).str.slice(0, 72)
            cols_out.append("_breadcrumb_preview")
        for name_col in ("derived_product_name", "representative_name"):
            if name_col in sub.columns and name_col not in cols_out:
                cols_out.append(name_col)
                break
        if "sample_names" in sub.columns:
            sub["_sample_preview"] = sub["sample_names"].astype(str).str.slice(0, 72)
            cols_out.append("_sample_preview")
        ren = {"_breadcrumb_preview": "breadcrumb_preview", "_sample_preview": "sample_preview"}
        chunks.append(sub[cols_out].rename(columns=ren).fillna("").to_string(index=False))

    chunks.append("")
    chunks.append("[트리 노드 · 깊이·노드ID 미리보기]")
    if tree_df.empty:
        chunks.append("(트리 없음)")
    else:
        view = tree_df.sort_values(["platform", "depth", "node_id"]).head(max_tree_rows)
        lines = []
        for _, row in view.iterrows():
            depth = int(row["depth"])
            pad = "  " * depth
            rep = str(row.get("representative_name", ""))[:60].replace("\n", " ")
            nid = row.get("node_id", "")
            ic = int(row["item_count"]) if pd.notna(row.get("item_count")) else 0
            lines.append(f"{pad}({depth}) {nid}  n={ic}  {rep}")
        chunks.append("\n".join(lines))
        if len(tree_df) > max_tree_rows:
            chunks.append(f"\n… 외 {len(tree_df) - max_tree_rows}개 노드 (CSV 참고)")

    return "\n".join(chunks)


def resolve_input_path(input_path):
    if input_path.exists():
        return input_path

    candidates = sorted(RESULT_DIR.glob("통합조회_전체_no_filter_*.csv"), key=lambda path: path.stat().st_mtime)
    if candidates:
        return candidates[-1]

    raise FileNotFoundError(
        f"입력 파일을 찾을 수 없습니다. 먼저 크롤링을 실행하거나 --input으로 CSV 경로를 지정하세요: {input_path}"
    )


def parse_args():
    parser = argparse.ArgumentParser(description="크롤링 결과를 플랫폼별 공백 토큰 기준으로 클러스터링합니다.")
    parser.add_argument("--input", type=Path, default=DEFAULT_INPUT_PATH, help="크롤링 결과 CSV 경로")
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR, help="클러스터링 결과 저장 폴더")
    parser.add_argument(
        "--threshold",
        type=float,
        default=DEFAULT_THRESHOLD,
        help="1차(L1·넓게 묶기) 클러스터 Jaccard 최소값",
    )
    parser.add_argument(
        "--min-shared-tokens",
        type=int,
        default=DEFAULT_MIN_SHARED_TOKENS,
        help="같은 1차(L1) 클러스터로 묶기 위한 최소 공통 토큰 수",
    )
    parser.add_argument(
        "--threshold-l2",
        type=float,
        default=DEFAULT_THRESHOLD_L2,
        help="2차(L2·좁게 재묶기) 클러스터 Jaccard 최소값",
    )
    parser.add_argument(
        "--min-shared-tokens-l2",
        type=int,
        default=DEFAULT_MIN_SHARED_TOKENS_L2,
        help="2차(L2) 클러스터링 시 최소 공통 토큰 수",
    )
    parser.add_argument(
        "--skip-second-cluster",
        action="store_true",
        help="2차 재클러스터링을 생략하고 L1 결과를 리프로 간주합니다.",
    )
    parser.add_argument(
        "--blacklist-tokens",
        type=Path,
        default=DEFAULT_TOKEN_BLACKLIST_PATH,
        help="제외할 토큰 목록 CSV(token 컬럼). 없으면 블랙리스트 적용 안 함",
    )
    parser.add_argument(
        "--no-preview",
        action="store_true",
        help="터미널 텍스트 미리보기(요약 표·트리) 출력 생략",
    )
    return parser.parse_args()


def run_clustering(
    input_path=DEFAULT_INPUT_PATH,
    output_dir=DEFAULT_OUTPUT_DIR,
    threshold=DEFAULT_THRESHOLD,
    min_shared_tokens=DEFAULT_MIN_SHARED_TOKENS,
    threshold_l2=DEFAULT_THRESHOLD_L2,
    min_shared_tokens_l2=DEFAULT_MIN_SHARED_TOKENS_L2,
    run_second_stage=True,
    token_blacklist_path=DEFAULT_TOKEN_BLACKLIST_PATH,
    print_stdout_preview=True,
    stdout_preview_max_summary=10,
    stdout_preview_max_tree=22,
):
    input_path = resolve_input_path(Path(input_path))
    output_dir = Path(output_dir)
    df = pd.read_csv(input_path, encoding="utf-8-sig")

    required_columns = {"platform", "name"}
    missing_columns = required_columns - set(df.columns)
    if missing_columns:
        raise ValueError(f"입력 CSV에 필수 컬럼이 없습니다: {', '.join(sorted(missing_columns))}")

    if "keyword" not in df.columns:
        df["keyword"] = ""

    token_blacklist = load_token_blacklist(token_blacklist_path) if token_blacklist_path else frozenset()
    if token_blacklist:
        before_drop = len(df)
        excluded = df["name"].fillna("").map(lambda n: title_has_blacklisted_token(n, token_blacklist))
        df = df.loc[~excluded].reset_index(drop=True)
        print(
            f"토큰 블랙리스트({token_blacklist_path}): 제외 전 {before_drop}건 중 "
            f"{int(excluded.sum())}건 제거, 클러스터링 입력 {len(df)}건"
        )

    item_rows = []
    summary_rows = []
    tree_rows = []
    for platform, platform_df in df.groupby("platform", dropna=False):
        platform_item_rows, platform_summary_rows, platform_tree_rows = build_clusters(
            platform_df=platform_df,
            platform=platform,
            threshold_l1=threshold,
            min_shared_l1=min_shared_tokens,
            threshold_l2=threshold_l2,
            min_shared_l2=min_shared_tokens_l2,
            run_second_stage=run_second_stage,
        )
        item_rows.extend(platform_item_rows)
        summary_rows.extend(platform_summary_rows)
        tree_rows.extend(platform_tree_rows)

    now = datetime.now().strftime("%Y%m%d_%H%M")
    output_dir.mkdir(parents=True, exist_ok=True)

    item_df = pd.DataFrame(item_rows)
    summary_df = pd.DataFrame(summary_rows)
    if not summary_df.empty:
        summary_df = summary_df.sort_values(["platform", "cluster_size"], ascending=[True, False])

    item_output_path = output_dir / f"token_cluster_items_{now}.csv"
    summary_output_path = output_dir / f"token_cluster_summary_{now}.csv"
    latest_item_path = output_dir / "latest_token_cluster_items.csv"
    latest_summary_path = output_dir / "latest_token_cluster_summary.csv"

    item_df.to_csv(item_output_path, index=False, encoding="utf-8-sig")
    summary_df.to_csv(summary_output_path, index=False, encoding="utf-8-sig")
    item_df.to_csv(latest_item_path, index=False, encoding="utf-8-sig")
    summary_df.to_csv(latest_summary_path, index=False, encoding="utf-8-sig")

    tree_df = pd.DataFrame(tree_rows)
    if not tree_df.empty:
        tree_df = tree_df.sort_values(["platform", "depth", "node_id"])

    tree_output_path = output_dir / f"token_cluster_tree_{now}.csv"
    latest_tree_path = output_dir / "latest_token_cluster_tree.csv"
    tree_df.to_csv(tree_output_path, index=False, encoding="utf-8-sig")
    tree_df.to_csv(latest_tree_path, index=False, encoding="utf-8-sig")

    print(f"입력 파일: {input_path}")
    print(f"상품별 클러스터 결과: {item_output_path}")
    print(f"클러스터 요약 결과: {summary_output_path}")
    print(f"트리 노드 결과: {tree_output_path}")

    print("\n플랫폼별 최종 클러스터(L2 리프) 수")
    if summary_df.empty:
        print("클러스터링할 데이터가 없습니다.")
    else:
        print(summary_df.groupby("platform")["cluster_id"].count())

    if print_stdout_preview:
        print("\n=== 결과 미리보기 (표 형태) ===")
        print(stdout_preview_clustering(summary_df, tree_df, max_summary_rows=stdout_preview_max_summary, max_tree_rows=stdout_preview_max_tree))

    return {
        "input_path": input_path,
        "item_output_path": item_output_path,
        "summary_output_path": summary_output_path,
        "latest_item_path": latest_item_path,
        "latest_summary_path": latest_summary_path,
        "tree_output_path": tree_output_path,
        "latest_tree_path": latest_tree_path,
    }


def main():
    args = parse_args()
    run_clustering(
        input_path=args.input,
        output_dir=args.output_dir,
        threshold=args.threshold,
        min_shared_tokens=args.min_shared_tokens,
        threshold_l2=args.threshold_l2,
        min_shared_tokens_l2=args.min_shared_tokens_l2,
        run_second_stage=not args.skip_second_cluster,
        token_blacklist_path=args.blacklist_tokens,
        print_stdout_preview=not args.no_preview,
    )


if __name__ == "__main__":
    main()
