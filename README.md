# Tech Scouting Report MCP

**Technology commercialization intelligence for AI agents.**

Scout 8 data sources in parallel to evaluate research momentum, patent landscape, funding validation, and Technology Readiness Level (TRL). Get a composite score and investment verdict for any technology in seconds.

---

## Hero

```ascii
┌─────────────────────────────────────────────────────────────────┐
│  TECH SCOUTING REPORT MCP                                       │
│                                                                 │
│  8 Data Sources  │  Parallel Fetch  │  Composite Scoring       │
│                                                                 │
│  OpenAlex: 250M+ papers    USPTO Patents                       │
│  Semantic Scholar           EPO Patents                         │
│  arXiv Preprints           NIH/Grants.gov                       │
│                            ClinicalTrials.gov                   │
└─────────────────────────────────────────────────────────────────┘
```

## Quick Start

```json
{
  "tool": "tech_scout_report",
  "arguments": {
    "technology": "CRISPR gene editing",
    "field": "molecular biology",
    "region": "US"
  }
}
```

---

## Tools

### 1. tech_scout_report

Comprehensive technology scouting report with full scoring breakdown.

**When to call:** You need a complete investment assessment for a technology.

**Example AI prompt:** *"Run a tech scouting report on mRNA therapeutics for my investment pipeline."*

**Input:**
```json
{
  "technology": "string",    // Required: Technology name
  "field": "string",        // Optional: Research field
  "region": "string"        // Optional: US, EU, Asia
}
```

**Output:**
```json
{
  "compositeScore": 72.5,
  "verdict": "STRONG_CANDIDATE",
  "researchMomentum": { "score": 18.5, "citationVelocity": 12.3, ... },
  "patentCommerc": { "score": 22.0, "patentCount": 45, ... },
  "fundingValidation": { "score": 15.0, "nihGrants": 12, ... },
  "trlAssessment": { "estimatedTRL": 7, "trlLevel": "MEDIUM", ... },
  "allSignals": ["HIGH_TRL keyword: commercial", "45 USPTO patents found", ...],
  "recommendations": ["Prioritize licensing discussions", ...],
  "metadata": { "openAlexPapers": 234, "semanticPapers": 45, ... }
}
```

**PPE:** 8

---

### 2. tech_scout_research_momentum

Analyzes research momentum from academic publications and preprints.

**When to call:** You want to understand citation velocity and publication trends.

**Example AI prompt:** *"What's the research momentum for quantum computing?"*

**Input:** `{ technology: string, field?: string, region?: string }`

**Output:**
```json
{
  "technology": "quantum computing",
  "openAlexPapers": [...],
  "semanticScholarPapers": [...],
  "arxivPreprints": [...],
  "citationVelocity": 15.2,
  "momentumScore": 32.5
}
```

**PPE:** 3

---

### 3. tech_scout_patent_landscape

Scouts USPTO and EPO patent databases for technology patents.

**When to call:** You need to understand the patent landscape and freedom to operate.

**Example AI prompt:** *"Map the patent landscape for solid-state batteries."*

**Input:** `{ technology: string, field?: string, region?: string }`

**Output:**
```json
{
  "technology": "solid-state batteries",
  "usptoPatents": [...],
  "epoPatents": [...],
  "authorInventorMatches": 0,
  "patentScore": 28.5
}
```

**PPE:** 2

---

### 4. tech_scout_funding_landscape

Scouts NIH RePORTer, Grants.gov, and ClinicalTrials.gov for funding validation.

**When to call:** You want to validate that funding supports technology development.

**Example AI prompt:** *"What's the funding landscape for Alzheimer's drug development?"*

**Input:** `{ technology: string, field?: string, region?: string }`

**Output:**
```json
{
  "technology": "Alzheimer's treatment",
  "nihGrants": [...],
  "govGrants": [...],
  "clinicalTrials": [...],
  "fundingScore": 45.0
}
```

**PPE:** 3

---

### 5. tech_scout_trl_assessment

Assesses Technology Readiness Level via keyword analysis and milestone tracking.

**When to call:** You need to evaluate the maturity of a technology for commercialization.

**Example AI prompt:** *"What's the TRL for autonomous vehicle sensor fusion?"*

**Input:** `{ technology: string, field?: string, region?: string }`

**Output:**
```json
{
  "technology": "autonomous vehicles",
  "estimatedTRL": 7,
  "trlLevel": "MEDIUM",
  "highTrlKeywordsFound": 5,
  "medTrlKeywordsFound": 3,
  "patentGrantRatio": 62,
  "highestClinicalPhase": "None",
  "sbirPhase2Count": 4,
  "trlScore": 42.5,
  "signals": [...]
}
```

**PPE:** 3

---

### 6. tech_scout_batch

Batch scout multiple technologies for rapid portfolio analysis.

**When to call:** You need to compare multiple technologies at once.

**Example AI prompt:** *"Rank these 5 technologies by investment potential: mRNA vaccines, CRISPR, solid-state batteries, quantum computing, neural interfaces."*

**Input:**
```json
{
  "technologies": ["mRNA vaccines", "CRISPR", "solid-state batteries", "quantum computing", "neural interfaces"],
  "field": "biotechnology",
  "region": "US"
}
```

**Output:**
```json
{
  "results": [
    { "technology": "mRNA vaccines", "compositeScore": 78.5, "verdict": "INVEST_NOW", "rank": 1 },
    { "technology": "CRISPR", "compositeScore": 72.0, "verdict": "STRONG_CANDIDATE", "rank": 2 },
    ...
  ],
  "rankedBy": "compositeScore"
}
```

**PPE:** 8 per technology

---

## Scoring Model

### Weighted Composite Score

| Component | Weight | Data Sources |
|-----------|--------|--------------|
| Research Momentum | 20% | OpenAlex, Semantic Scholar, arXiv |
| Patent Commercialization | 25% | USPTO, EPO |
| Funding Validation | 25% | NIH, Grants.gov, ClinicalTrials.gov |
| TRL Assessment | 30% | Keyword analysis, patent grants, clinical phases |

### Research Momentum (20%)

- Citation velocity: `(totalCitations / publicationCount) * 2`, capped at 35pts
- +10 pts if >50% publications from 2023+
- Semantic Scholar influential citations: 2x weight, capped at 25pts
- arXiv preprints: 3pts each, capped at 25pts
- +15 amplifier if avg citations >10 AND preprints >3

### Patent Commercialization (25%)

- USPTO: 4pts/granted, 2pts/application, +2pts if filed 2022+, capped at 35pts
- EPO: 4pts/granted (kind B/A), capped at 25pts
- Author-inventor cross-ref: 5pts/match, capped at 25pts

### Funding Validation (25%)

- NIH: 3pts/grant, +4pts for R01/R21/R35, +5pts for SBIR/STTR, capped at 35pts
- Grants.gov: 3pts each, +$1M bonus (10pts), capped at 25pts
- Clinical trials: 4pts each, +5pts Phase 2+ bonus, capped at 25pts

### TRL Assessment (30%)

- HIGH_TRL keywords (commercial, manufacturing, FDA approved, market, deployed): 4pts each, capped at 30pts
- MED_TRL keywords (prototype, validation, proof of concept): 2pts each
- LOW_TRL keywords (discovery, fundamental, theoretical): -1pt each
- Patent grant ratio: up to 25pts
- Phase 3 clinical trials: capped at 25pts

---

## Verdict Logic

| Composite Score | OR Condition | Verdict |
|----------------|--------------|---------|
| 75+ | TRL>=7 AND COMMERCIAL_READY | **INVEST_NOW** |
| 55-74 | - | **STRONG_CANDIDATE** |
| 35-54 | - | **MONITOR** |
| 15-34 | - | **TOO_EARLY** |
| <15 | - | **PASS** |

**Commercial Ready signals:** 3+ HIGH_TRL keywords OR (Phase 3 clinical AND >50% patent grant ratio)

---

## Data Sources

| Source | Count | API Type |
|--------|-------|----------|
| OpenAlex | 250M+ papers | REST, no auth |
| Semantic Scholar | Influential citations | REST, optional API key |
| arXiv | Preprints | Atom feed, no auth |
| USPTO Patents | US patents | REST, no auth |
| EPO Open Patent Services | EU patents | REST, no auth |
| NIH RePORTer | Federal grants | REST, no auth |
| Grants.gov | Federal opportunities | REST, no auth |
| ClinicalTrials.gov | Clinical trials | REST, no auth |

---

## Pricing

| Action | PPE Cost |
|--------|----------|
| tech_scout_report | 8 |
| tech_scout_research_momentum | 3 |
| tech_scout_patent_landscape | 2 |
| tech_scout_funding_landscape | 3 |
| tech_scout_trl_assessment | 3 |
| tech_scout_batch | 8 per technology |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    tech-scouting-report-mcp                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   Input: { technology, field?, region? }                        │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │           Promise.all Parallel Fetch (120s timeout)     │  │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │  │
│   │  │OpenAlex │ │Semantic │ │ arXiv   │ │ USPTO   │      │  │
│   │  │ Papers  │ │ Scholar │ │Preprints│ │ Patents │      │  │
│   │  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │  │
│   │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │  │
│   │  │   EPO   │ │   NIH   │ │Grants   │ │Clinical │      │  │
│   │  │ Patents │ │ Grants  │ │  .gov   │ │ Trials  │      │  │
│   │  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   ┌─────────────────────────────────────────────────────────┐  │
│   │                    Scoring Engine                        │  │
│   │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐   │  │
│   │  │  Research    │  │    Patent    │  │   Funding    │   │  │
│   │  │  Momentum    │  │  Commerc.    │  │  Validation │   │  │
│   │  │   (20%)      │  │    (25%)     │  │    (25%)     │   │  │
│   │  └──────────────┘  └──────────────┘  └──────────────┘   │  │
│   │                     ┌──────────────┐                     │  │
│   │                     │     TRL      │                     │  │
│   │                     │   (30%)      │                     │  │
│   │                     └──────────────┘                     │  │
│   └─────────────────────────────────────────────────────────┘  │
│                                                                 │
│   Output: { compositeScore, verdict, signals, recommendations }│
└─────────────────────────────────────────────────────────────────┘
```

---

## Cross-Sells

### academic-research-mcp

For deep academic literature analysis with citation graphs and institutional networks.

**Use when:** You need detailed paper-by-paper analysis, citation tracking, and author network mapping.

```json
{
  "tool": "academic_search",
  "arguments": { "query": "CRISPR Cas9 applications", "max_results": 50 }
}
```

---

### university-research-mcp

For identifying university technologies available for licensing.

**Use when:** You want to find startups spun out of university research, available licenses, and TTO contacts.

```json
{
  "tool": "university_tech_search",
  "arguments": { "technology": "machine learning", "university": "MIT" }
}
```

---

### patent-search-mcp

For detailed patent search and analysis with claim parsing.

**Use when:** You need to do prior art search, patent invalidation analysis, or freedom-to-operate analysis.

```json
{
  "tool": "patent_search",
  "arguments": { "query": "neural network accelerator", "jurisdiction": "US" }
}
```

---

## Example AI Agent Workflows

### Investment Screening

```
1. tech_scout_batch for top 20 candidate technologies
2. Filter to STRONG_CANDIDATE or INVEST_NOW verdicts
3. tech_scout_report for deep dive on shortlisted tech
4. Cross-reference with patent-search-mcp for FTO analysis
```

### Competitive Intelligence

```
1. tech_scout_report on competitor technology
2. tech_scout_patent_landscape to map patent portfolio
3. tech_scout_funding_landscape to understand R&D spend
4. Track momentum changes over time
```

### Licensing Evaluation

```
1. tech_scout_trl_assessment for maturity signals
2. Identify NIH-funded research (tech_scout_funding_landscape)
3. Map inventor networks via academic-research-mcp
4. Cross-reference with university-research-mcp for available licenses
```

---

## MCP Protocol

This actor implements the MCP (Model Context Protocol) for AI agent integration.

**Endpoint:** `/mcp`

**Manifest:** `/mcp/manifest`

**Request format:**
```json
{
  "tool": "tech_scout_report",
  "arguments": { "technology": "CRISPR" }
}
```

**Response format:**
```json
{
  "success": true,
  "result": { ... }
}
```

---

## Deployment

This actor runs in **standby mode** on Apify, enabling efficient AI agent integration with pay-per-event pricing.

**Actor ID:** `tech-scouting-report-mcp`

**Pricing:** Event-based (PPE)

---

## Status

- **Created:** 2026-04-21
- **Data sources:** 8 (all free APIs, no API keys required for most)
- **API coverage:** OpenAlex, Semantic Scholar, arXiv, USPTO, EPO, NIH, Grants.gov, ClinicalTrials.gov
- **Scoring model:** Weighted composite with TRL override logic

---

## See Also

- [apifyforge.com](https://apifyforge.com) - Marketplace for AI agent tools
- [academic-research-mcp](../academic-research-mcp) - Deep academic literature analysis
- [university-research-mcp](../university-research-mcp) - University technology licensing
- [patent-search-mcp](../patent-search-mcp) - Patent search and analysis