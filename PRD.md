# Tech Scouting Report MCP - Product Requirements Document

**Version:** 1.0.0
**Created:** 2026-04-21
**Status:** Production

---

## Overview

Tech Scouting Report MCP provides technology commercialization intelligence for AI agents. It aggregates 8 data sources in parallel to generate composite scores, verdicts, and recommendations for any technology.

**Target users:** AI agents performing investment screening, competitive intelligence, licensing evaluation, and technology portfolio analysis.

---

## Architecture

### System Design

```
Input: { technology, field?, region? }
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│              Promise.all Parallel Fetch (120s)              │
├─────────────┬─────────────┬─────────────┬──────────────────┤
│  OpenAlex   │ Semantic    │   arXiv     │     USPTO        │
│  250M+      │ Scholar     │  Preprints  │     Patents      │
│  papers     │ influential │             │                  │
├─────────────┼─────────────┼─────────────┼──────────────────┤
│    EPO      │    NIH      │ Grants.gov  │ ClinicalTrials   │
│  Patents    │  Grants     │             │     .gov         │
└─────────────┴─────────────┴─────────────┴──────────────────┘
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│                    Scoring Engine                           │
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │   Research    │  │    Patent     │  │    Funding    │  │
│  │   Momentum    │  │  Commerc.     │  │   Validation  │  │
│  │    (20%)      │  │    (25%)      │  │     (25%)     │  │
│  └───────────────┘  └───────────────┘  └───────────────┘  │
│                        ┌───────────────┐                   │
│                        │      TRL      │                   │
│                        │    (30%)      │                   │
│                        └───────────────┘                   │
└─────────────────────────────────────────────────────────────┘
       │
       ▼
Output: { compositeScore, verdict, signals, recommendations }
```

### Data Sources

| Source | Count/Volume | API Type | Auth Required | Timeout |
|--------|--------------|----------|---------------|---------|
| OpenAlex | 250M+ papers | REST JSON | No | 120s |
| Semantic Scholar | Influential citations | REST JSON | Optional API key | 120s |
| arXiv | Preprints | Atom XML | No | 120s |
| USPTO Patents | US patents | REST JSON | No | 120s |
| EPO Open Patent Services | EU patents | REST XML | No | 120s |
| NIH RePORTer | Federal grants | REST JSON | No | 120s |
| Grants.gov | Federal opportunities | REST JSON | No | 120s |
| ClinicalTrials.gov | Clinical trials | REST JSON | No | 120s |

**Total data sources:** 8
**Parallel fetch:** Yes (Promise.all)
**Graceful degradation:** Empty array on any single source failure

---

## Scoring Model

### Component Weights

| Component | Weight | Max Score |
|-----------|--------|-----------|
| Research Momentum | 20% | 35 |
| Patent Commercialization | 25% | 35 |
| Funding Validation | 25% | 35 |
| TRL Assessment | 30% | 35+ |

**Composite score range:** 0-100 (weighted sum of normalized components)

### Research Momentum (20%)

**Calculation:**
```
citationVelocity = (totalCitations / publicationCount) * 2
citationVelocity = min(citationVelocity, 35) // cap

// Boost for recent activity
if (recentPapers / totalPapers > 0.5) {
  citationVelocity += 10 // >50% from 2023+
}

// Semantic Scholar influential citations: 2x weight
semanticScore = min(influentialCitations * 2, 25)

// arXiv preprints
arxivScore = min(preprintCount * 3, 25)

// Amplifier bonus
if (avgCitations > 10 && preprints > 3) {
  citationVelocity += 15
}

researchMomentumScore = min(citationVelocity + semanticScore + arxivScore, 35)
```

**Signals generated:**
- "X publications from 2023+ (citation acceleration)"
- "X influential papers found"
- "X arXiv preprints found"
- "High engagement amplifier: avg citations >10 AND preprints >3"

**Momentum levels:** VERY_HIGH (28+), HIGH (20+), MEDIUM (12+), LOW

### Patent Commercialization (25%)

**Calculation:**
```
// USPTO scoring
usptoScore = 0
for each patent:
  if status includes "grant": usptoScore += 4
  else: usptoScore += 2 // application
  if filingDate includes "2022": usptoScore += 2

usptoScore = min(usptoScore, 35)

// EPO scoring
epoScore = 0
for each patent:
  if kindCode in ['B', 'A']: epoScore += 4 // granted
  else: epoScore += 2

epoScore = min(epoScore, 25)

// Author-inventor cross-ref
crossRefScore = min(matches * 5, 25)

patentCommercScore = usptoScore + epoScore + crossRefScore
```

**Signals generated:**
- "X USPTO patents found"
- "X EPO patents found"
- "X author-inventor matches found"

**Commercialization levels:** VERY_HIGH (50+), HIGH (35+), MEDIUM (20+), LOW

### Funding Validation (25%)

**Calculation:**
```
// NIH grants
nihScore = 0
for each grant:
  nihScore += 3
  if awardNumber matches R01|R21|R35: nihScore += 4
  if awardNumber matches SBIR|STTR: nihScore += 5

nihScore = min(nihScore, 35)

// Grants.gov
govScore = grants.length * 3
if any grant amount >= $1M: govScore += 10
govScore = min(govScore, 25)

// Clinical trials
trialScore = trials.length * 4
if any trial phase includes Phase 2 or Phase 3: trialScore += 5
trialScore = min(trialScore, 25)

fundingValidationScore = nihScore + govScore + trialScore
```

**Signals generated:**
- "NIH R01/R21/R35 grant: {awardNumber}"
- "NIH SBIR/STTR: {awardNumber}"
- "X NIH grants found"
- "Grants.gov: $1M+ grant found"
- "ClinicalTrials.gov: X Phase 2+ trials found"
- "X clinical trials found"

**Funding levels:** VERY_HIGH (50+), HIGH (35+), MEDIUM (20+), LOW

### TRL Assessment (30%)

**Keyword Analysis:**

HIGH_TRL keywords (4pts each, cap 30pts):
- commercial, commercialize, manufacturing, manufacture
- fda approved, market, deployed, deployment
- production, product launch, revenue, industry

MED_TRL keywords (2pts each):
- prototype, validation, validated, proof of concept
- poc, pilot, beta, clinical trial phase 1, phase i, feasibility

LOW_TRL keywords (-1pt each):
- discovery, fundamental, theoretical, exploratory, basic research, hypothesis

**Patent Grant Ratio:**
```
patentGrantRatioScore = (grantedPatents / totalPatents) * 25
```

**Phase 3 Clinical Bonus:**
```
phase3Score = min(phase3Count * 8, 25)
```

**SBIR/STTR Bonus:**
```
sbirScore = min(sbirPhase2Count * 3, 15)
```

**TRL Estimation:**
| Score Range | Estimated TRL |
|-------------|---------------|
| 50+ | 9 |
| 40-49 | 8 |
| 30-39 | 7 |
| 20-29 | 6 |
| 15-19 | 5 |
| 10-14 | 4 |
| 5-9 | 3 |
| 2-4 | 2 |
| <2 | 1 |

**TRL levels:** HIGH (8+), MEDIUM (6+), LOW

---

## Verdict Logic

### Standard Thresholds

| Composite Score | Verdict |
|-----------------|---------|
| 75+ | INVEST_NOW |
| 55-74 | STRONG_CANDIDATE |
| 35-54 | MONITOR |
| 15-34 | TOO_EARLY |
| <15 | PASS |

### Override Condition

**TRL>=7 AND COMMERCIAL_READY → INVEST_NOW**

Commercial Ready signals:
- 3+ HIGH_TRL keywords found, OR
- (Phase 3 clinical trial AND patent grant ratio > 50%)

This override ensures promising early-stage technologies with strong commercialization signals are flagged for investment attention.

---

## Tools Specification

### 1. tech_scout_report

**Input schema:**
```json
{
  "technology": { "type": "string", "description": "Technology name to scout" },
  "field": { "type": "string", "description": "Optional research field" },
  "region": { "type": "string", "description": "Optional region (US, EU, Asia)" }
}
```

**Output schema:**
```json
{
  "technology": "string",
  "compositeScore": 72.5,
  "verdict": "STRONG_CANDIDATE",
  "researchMomentum": {
    "score": 18.5,
    "citationVelocity": 12.3,
    "publicationCount": 234,
    "preprints": 15,
    "momentumLevel": "HIGH",
    "signals": ["string"]
  },
  "patentCommerc": {
    "score": 22.0,
    "patentCount": 45,
    "grantedPatents": 28,
    "crossRefHits": 3,
    "commercLevel": "HIGH",
    "signals": ["string"]
  },
  "fundingValidation": {
    "score": 15.0,
    "nihGrants": 12,
    "govGrants": 5,
    "clinicalTrials": 8,
    "fundingLevel": "MEDIUM",
    "signals": ["string"]
  },
  "trlAssessment": {
    "score": 17.0,
    "estimatedTRL": 6,
    "trlLevel": "MEDIUM",
    "highTrlKeywordsFound": 4,
    "medTrlKeywordsFound": 3,
    "patentGrantRatio": 62,
    "highestClinicalPhase": "Phase 2",
    "sbirPhase2Count": 2,
    "signals": ["string"]
  },
  "allSignals": ["string"],
  "recommendations": ["string"],
  "metadata": {
    "openAlexPapers": 234,
    "semanticPapers": 45,
    "arxivPreprints": 15,
    "usptoPatents": 32,
    "epoPatents": 13,
    "nihGrants": 12,
    "govGrants": 5,
    "clinicalTrials": 8
  }
}
```

**PPE:** 8

---

### 2. tech_scout_research_momentum

**Input:** `{ technology: string, field?: string, region?: string }`

**Output:**
```json
{
  "technology": "string",
  "openAlexPapers": [{"title": "string", "citations": number, "year": number, "authors": string[]}],
  "semanticScholarPapers": [{"title": "string", "citations": number, "influentialCitations": number, "year": number}],
  "arxivPreprints": [{"title": "string", "summary": "string", "published": "string"}],
  "citationVelocity": number,
  "momentumScore": number
}
```

**PPE:** 3

---

### 3. tech_scout_patent_landscape

**Input:** `{ technology: string, field?: string, region?: string }`

**Output:**
```json
{
  "technology": "string",
  "usptoPatents": [{"title": "string", "patentNumber": "string", "filingDate": "string", "status": "string"}],
  "epoPatents": [{"title": "string", "date": "string", "office": "string"}],
  "authorInventorMatches": number,
  "patentScore": number
}
```

**PPE:** 2

---

### 4. tech_scout_funding_landscape

**Input:** `{ technology: string, field?: string, region?: string }`

**Output:**
```json
{
  "technology": "string",
  "nihGrants": [{"projectTitle": "string", "awardNumber": "string", "amount": number, "fiscalYear": "string"}],
  "govGrants": [{"title": "string", "identifier": "string", "amount": number, "closeDate": "string"}],
  "clinicalTrials": [{"title": "string", "NCTId": "string", "phase": string[], "status": "string"}],
  "fundingScore": number
}
```

**PPE:** 3

---

### 5. tech_scout_trl_assessment

**Input:** `{ technology: string, field?: string, region?: string }`

**Output:**
```json
{
  "technology": "string",
  "estimatedTRL": number,
  "trlLevel": "string",
  "highTrlKeywordsFound": number,
  "medTrlKeywordsFound": number,
  "patentGrantRatio": number,
  "highestClinicalPhase": "string",
  "sbirPhase2Count": number,
  "trlScore": number,
  "signals": ["string"]
}
```

**PPE:** 3

---

### 6. tech_scout_batch

**Input:**
```json
{
  "technologies": ["string"],
  "field": "string",
  "region": "string"
}
```

**Output:**
```json
{
  "results": [
    {
      "technology": "string",
      "compositeScore": number,
      "verdict": "string",
      "rank": 1
    }
  ],
  "rankedBy": "compositeScore"
}
```

**PPE:** 8 per technology

---

## MCP Protocol

### Standby Mode

This actor implements Apify standby mode for efficient AI agent integration.

**Requirements:**
- `usesStandbyMode: true` in actor.json
- `webServerMCPPath: "/mcp"` in actor.json
- HTTP server on `CONTAINER_PORT` (default 3000)
- `handleRequest` export for direct invocation

### Endpoints

**Manifest:** `GET /mcp/manifest`
```json
{ "tools": [...] }
```

**Tool call:** `POST /mcp`
```json
{
  "tool": "tech_scout_report",
  "arguments": { "technology": "CRISPR" }
}
```

**Response:**
```json
{
  "success": true,
  "result": { ... }
}
```

**Error:**
```json
{
  "success": false,
  "error": "error message"
}
```

### Readiness Probe

**GET / ** → `200 OK`

---

## Pricing

| Tool | PPE | Notes |
|------|-----|-------|
| tech_scout_report | 8 | Full comprehensive report |
| tech_scout_research_momentum | 3 | Academic publications only |
| tech_scout_patent_landscape | 2 | Patents only |
| tech_scout_funding_landscape | 3 | Grants and trials |
| tech_scout_trl_assessment | 3 | TRL scoring only |
| tech_scout_batch | 8 | Per technology in batch |

**PPE = Platform Performance Units**, Apify's event-based pricing metric.

---

## API Key Requirements

| Source | Required | Notes |
|--------|----------|-------|
| OpenAlex | No | Free, no auth |
| Semantic Scholar | No | Works without key, higher limits with key |
| arXiv | No | Free, no auth |
| USPTO | No | Free, no auth |
| EPO | No | Free, no auth |
| NIH RePORTer | No | Free, no auth |
| Grants.gov | No | Free, no auth |
| ClinicalTrials.gov | No | Free, no auth |

**No required API keys** - all core data sources are free/public APIs.

---

## Error Handling

### Timeout Behavior
- 120 second timeout per data source
- Failed sources return empty array
- Partial results still scored (graceful degradation)

### HTTP Error Handling
- Non-200 responses throw error, caught and return empty array
- Log errors for debugging
- Never fail entire request due to single source failure

---

## Performance Targets

| Metric | Target |
|--------|--------|
| Total response time | < 150s (including all 8 sources) |
| Source timeout | 120s per source |
| Memory usage | < 512MB |
| Concurrent requests | 1 per actor instance |

---

## Cross-Sell Architecture

```
tech-scouting-report-mcp
    │
    ├── academic-research-mcp (deep paper analysis)
    ├── university-research-mcp (tech licensing)
    └── patent-search-mcp (FTO analysis)
```

**Cross-sell triggers:**
- High patent score → patent-search-mcp for detailed FTO
- High funding score → university-research-mcp for licensing
- Low TRL → academic-research-mcp for research tracking

---

## Recommendations Engine

### INVEST_NOW Recommendations
- "Strong commercialization signal - prioritize licensing discussions"
- "Map inventor networks for partnership opportunities"
- "Funding validated - approach investors with de-risked profile"

### STRONG_CANDIDATE Recommendations
- "Monitor for patent issuance and clinical trial results"
- "Identify technology transfer office contacts at top institutions"
- "Seek additional patent protection in key jurisdictions"

### MONITOR Recommendations
- "Track publication velocity and citation trends"
- "Set up alerts for new patents and funding grants"
- "Evaluate competitive landscape before committing resources"

### TOO_EARLY Recommendations
- "Check back in 6-12 months for TRL advancement"
- "Monitor for SBIR/STTR Phase 2 awards as leading indicator"
- "Focus on similar technologies with higher readiness"

### PASS Recommendations
- "Technology does not meet investment criteria at this time"
- "Consider related applications or enabling technologies"
- "Re-evaluate if market conditions change significantly"

---

## Data Freshness

| Source | Update Frequency |
|--------|------------------|
| OpenAlex | Weekly |
| Semantic Scholar | Rolling |
| arXiv | Daily |
| USPTO | Weekly |
| EPO | Weekly |
| NIH RePORTer | Daily |
| Grants.gov | Daily |
| ClinicalTrials.gov | Daily |

**Note:** All sources are public APIs; no caching layer implemented. Real-time queries ensure fresh data.

---

## Success Metrics

| Metric | Definition |
|--------|------------|
| Composite score accuracy | Correlation with actual commercialization success |
| Verdict precision | % of INVEST_NOW that receive follow-on investment |
| Source coverage | % of searches returning >0 results |
| Response time | P95 latency for full report generation |

---

## Future Enhancements

1. **Author-inventor cross-reference**: Implement name matching between academic papers and patent inventors
2. **Citation graph analysis**: Build citation networks to identify key researchers
3. **Market size estimation**: Integrate with market data APIs for commercial potential
4. **Competitive landscape**: Add competitor technology comparison
5. **Trend analysis**: Track technology score changes over time

---

## Appendix: Verdict Decision Tree

```
START
  │
  ▼
Is TRL >= 7 AND COMMERCIAL_READY?
  │
  ├─ YES → VERDICT = INVEST_NOW
  │
  └─ NO
       │
       ▼
    Composite Score >= 75?
       │
       ├─ YES → VERDICT = INVEST_NOW
       │
       └─ NO
            │
            ▼
          Score >= 55?
            │
            ├─ YES → VERDICT = STRONG_CANDIDATE
            │
            └─ NO
                 │
                 ▼
               Score >= 35?
                 │
                 ├─ YES → VERDICT = MONITOR
                 │
                 └─ NO
                      │
                      ▼
                    Score >= 15?
                      │
                      ├─ YES → VERDICT = TOO_EARLY
                      │
                      └─ NO → VERDICT = PASS
```
