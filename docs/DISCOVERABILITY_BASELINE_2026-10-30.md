# SG Academic Discoverability — Baseline and Ownership Handoff

**Recorded:** 2026-10-30 (India time)  
**Scope:** https://sunilgargusai.github.io/sunilgar-portfolio/  
**Purpose:** establish an evidence-based baseline for conventional search visibility, answer-engine discoverability, and generative-AI citations.

## 1. Public retrieval baseline (verified live from a separately connected Windows computer)

| Requested URL | HTTP status | Observed content type | Notes |
| --- | --- | --- | --- |
| `/` (portfolio homepage) | 200 | text/html | Public homepage |
| `/sitemap.xml` | 200 | application/xml | Lists homepage + two VELE research pages |
| `/research/vertex-eccentricity-labeled-energy.html` | 200 | text/html | Mathematical definition and worked example |
| `/research/vele-power-grid-screening.html` | 200 | text/html | Power-grid methods, source-linked evidence, limitations |
| `/research/research-pages.css` | 200 | text/css | Shared research explainer styles |
| Host-root `https://sunilgargusai.github.io/robots.txt` | 404 | text/html | Google treats robots.txt 404 as no robots-based crawl restriction, not as a block |
| Project-level `/sunilgar-portfolio/robots.txt` | 200 | text/plain | Not the host-root robots policy |

Requests were plain public GET requests; no cookies, privileged Google/Bing account data, or authentication were used.

**What these checks do not establish:** Google/Bing crawling, page indexing, presence in AI responses, or any number of search impressions/clicks. No search-index data should be represented as zero merely because it is unavailable.

## 2. Page readiness

- All three HTML pages have unique page titles, meta descriptions and canonical URLs.
- Sitemap references the three URLs and carries `2026-10-30` modification dates.
- Research pages include factual content, mathematical definitions or methodology, sources, and explicit limitations.
- Site pages link internally from the main portfolio to the VELE explainers and from one explainer to the other.
- Existing Google Analytics measurement ID `G-XNCM06C1HV` is present in the homepage.
- This change adds **the same existing GA4 tag** to both explainer pages. It does not create a new GA4 property, establish data collection retroactively, or establish Google Search Console ownership.
- GitHub Actions static discoverability validation is available in `.github/workflows/discoverability-check.yml`.

## 3. Google Search Console — ownership action required in Google UI

1. Sign in to [Google Search Console](https://search.google.com/search-console) with the Google account controlling the website's existing Google Analytics property.
2. If the site is not already listed, create a **URL-prefix** property exactly:

   `https://sunilgargusai.github.io/sunilgar-portfolio/`

   This is a GitHub Pages project path; it is not the registrable domain and does not require control of github.io DNS.
3. Choose **Google Analytics** verification first, since `gtag.js` is in the homepage `<head>`. It works only if the signed-in Google account has the required **Edit** access to the matching Google Analytics property.
4. If that verification does not succeed, use the **HTML tag** verification method and supply its exact `google-site-verification` meta tag to the repository maintainer for insertion in `index.html`. Avoid guessing or inventing a verification token.
5. Under **Indexing → Sitemaps**, submit `sitemap.xml` for the URL-prefix property (or the full sitemap URL if the UI expects that).
6. In **URL Inspection**, inspect each of the three sitemap URLs; record *indexed / not indexed*, *last crawl*, *user-declared canonical*, *Google-selected canonical*, and any reason for exclusion. When appropriate, request indexing for the two new pages. Google does not guarantee indexing and its reports may be delayed.
7. Under **Performance**, capture a baseline for 28 days: impressions, clicks, CTR, average position and pages/queries. If **Generative AI** reporting appears, separately record its impressions by page. The separate report might not appear when the site has insufficient generative-AI impressions.

## 4. Bing Webmaster Tools — after Google verification

1. Sign in to [Bing Webmaster Tools](https://www.bing.com/webmasters).
2. Use **Import from Google Search Console** for the URL-prefix property. This can verify the site in Bing using the authorized Google property, avoiding another verification token.
3. Confirm the imported sitemap. Review sitemap status, indexing, crawl errors and submitted URLs.
4. Under **AI Performance**, record total citations, cited pages, grounding queries and the date window if any data is available. AI citations are not equivalent to scholarly citations or website clicks.

## 5. First-party metrics status (as of this record)

| Metric | Baseline |
| --- | --- |
| Public HTTP readiness | Verified: 5 of 5 public assets return HTTP 200 |
| Sitemap | Verified live: 3 listed URLs |
| Google ownership verification | **Unverified / account action required** |
| Google sitemap submission status | **Not observed** |
| Google indexed URLs | **Unknown — property data required** |
| Google Search impressions/clicks | **Unknown — property data required** |
| Google Generative AI impressions | **Unknown — property data required** |
| Bing ownership, indexing and citations | **Unknown — property data required** |
| GA4 current traffic | **Unknown — account data required** |

**Interpretation rule:** `unknown` / `not observed` is not zero. Use a dated export from an authenticated owner property to replace these fields.

## 6. Verification sources

- [Google URL-prefix properties](https://support.google.com/webmasters/answer/34592)
- [Google ownership verification](https://support.google.com/webmasters/answer/9008080)
- [Google sitemap submission](https://support.google.com/webmasters/answer/7451001)
- [Google URL inspection and indexing requests](https://support.google.com/webmasters/answer/9012289)
- [Google Generative AI performance](https://support.google.com/webmasters/answer/16984139)
- [Google robots.txt HTTP handling](https://developers.google.com/crawling/docs/robots-txt/robots-txt-spec)
- [Bing site verification and Search Console import](https://www2.bing.com/webmasters/help/add-and-verify-site-12184f8b)
- [Bing AI Performance](https://www.bing.com/webmasters/help/ai-performance-9f8e7d6c)

---

Recorded for research reproducibility, not as an assertion of indexing or generated-answer placement.
