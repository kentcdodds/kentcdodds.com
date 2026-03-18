# Search relevance tuning

Worker: [`services/search-worker/src/search-results.ts`](../../services/search-worker/src/search-results.ts).

| Constant | Role |
|----------|------|
| `SEARCH_CONFIDENCE_MIN_BEST_SCORE` (`0.013`) | If the best fused RRF score is below this, return no results and `noCloseMatches: true`. |
| `SEARCH_CONFIDENCE_RELATIVE_RATIO` (`0.5`) | Keep only hits with `score >= maxScore * ratio` (then cap at `topK`). |
| `SEARCH_LOW_RANKING_MAX` (`35`) | Extra hits returned as `lowRankingResults` for the search page “Show low ranking results” control. |

Fused scores are on a small scale (~0.016 for a single-list #1, ~0.035 for strong dual-signal). Adjust in staging if results are over- or under-filtered.

Site cache key prefix: `search:kcd:v3:` (payload includes `noCloseMatches` and `lowRankingResults`).
