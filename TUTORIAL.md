# Add Tech Scouting Intelligence to Your AI Agent in 5 Minutes

A practical guide for AI agent developers (LangChain, AutoGen, CrewAI) to add technology commercialization intelligence — research momentum, funding validation, TRL assessment, and composite investment scoring — to their agents in minutes. No API keys required beyond your Apify token.

## What We're Building

An AI agent that can:
1. Generate comprehensive tech scouting reports with composite scores
2. Analyze research momentum from 250M+ academic papers
3. Validate funding through NIH, Grants.gov, ClinicalTrials.gov
4. Assess Technology Readiness Level (TRL) with keyword analysis
5. Batch scout multiple technologies for portfolio analysis
6. Get verdicts: INVEST_NOW, STRONG_CANDIDATE, MONITOR, TOO_EARLY, PASS

## Prerequisites

- Node.js 18+
- An Apify API token ([free account works](https://console.apify.com/settings/integrations))
- An AI agent framework: LangChain, AutoGen, or CrewAI

## The MCPs We're Using

| MCP | Purpose | Cost | Endpoint |
|-----|---------|------|----------|
| `tech-scouting-report-mcp` | Tech scouting, research momentum, TRL, funding | $0.05-0.10/call | `tech-scouting-report-mcp.apify.actor` |
| `academic-research-mcp` | Paper search, citations, author profiles | $0.01-0.10/call | `academic-research-mcp.apify.actor` |
| `patent-search-mcp` | Patent lookup by number, citation chains | $0.03-0.05/call | `patent-search-mcp.apify.actor` |
| `university-research-mcp` | Institution reports, patent landscapes | $0.05-0.15/call | `university-research-mcp.apify.actor` |
| `healthcare-compliance-mcp` | Clinical trials, FDA approvals | $0.03-0.15/call | `red-cars--healthcare-compliance-mcp.apify.actor` |

**Note:** `tech-scouting-report-mcp` provides 8-source parallel intelligence (OpenAlex, Semantic Scholar, arXiv, USPTO, EPO, NIH, Grants.gov, ClinicalTrials.gov). Chain it with `patent-search-mcp` for detailed patent lookup and `university-research-mcp` for institution-level tech transfer analysis.

## Step 1: Add the MCP Servers

### MCP Server Configuration

```json
{
  "mcpServers": {
    "tech-scouting": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-apify", "tech-scouting-report-mcp"],
      "env": {
        "APIFY_API_TOKEN": "${APIFY_API_TOKEN}"
      }
    },
    "academic-research": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-apify", "academic-research-mcp"],
      "env": {
        "APIFY_API_TOKEN": "${APIFY_API_TOKEN}"
      }
    },
    "patent-search": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-apify", "patent-search-mcp"],
      "env": {
        "APIFY_API_TOKEN": "${APIFY_API_TOKEN}"
      }
    },
    "university-research": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-apify", "university-research-mcp"],
      "env": {
        "APIFY_API_TOKEN": "${APIFY_API_TOKEN}"
      }
    },
    "healthcare-compliance": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-apify", "red-cars--healthcare-compliance-mcp"],
      "env": {
        "APIFY_API_TOKEN": "${APIFY_API_TOKEN}"
      }
    }
  }
}
```

### LangChain Configuration

```javascript
import { ApifyAdapter } from "@langchain/community/tools/apify";
import { ChatOpenAI } from "@langchain/openai";
import { initializeAgentExecutorWithOptions } from "langchain/agents";

const tools = [
  new ApifyAdapter({
    token: process.env.APIFY_API_TOKEN,
    actorId: "tech-scouting-report-mcp",
  }),
  new ApifyAdapter({
    token: process.env.APIFY_API_TOKEN,
    actorId: "academic-research-mcp",
  }),
  new ApifyAdapter({
    token: process.env.APIFY_API_TOKEN,
    actorId: "patent-search-mcp",
  }),
  new ApifyAdapter({
    token: process.env.APIFY_API_TOKEN,
    actorId: "university-research-mcp",
  }),
  new ApifyAdapter({
    token: process.env.APIFY_API_TOKEN,
    actorId: "red-cars--healthcare-compliance-mcp",
  }),
];

const agent = await initializeAgentExecutorWithOptions(tools, new ChatOpenAI({
  model: "gpt-4",
  temperature: 0
}), { agentType: "openai-functions" });
```

### AutoGen Configuration

```javascript
import { MCPAgent } from "autogen-mcp";

const techScoutAgent = new MCPAgent({
  name: "tech-scouting",
  mcpServers: [
    {
      name: "tech-scouting",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-apify", "tech-scouting-report-mcp"],
    },
    {
      name: "academic-research",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-apify", "academic-research-mcp"],
    },
    {
      name: "patent-search",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-apify", "patent-search-mcp"],
    },
    {
      name: "university-research",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-apify", "university-research-mcp"],
    },
    {
      name: "healthcare-compliance",
      command: "npx",
      args: ["-y", "@modelcontextprotocol/server-apify", "red-cars--healthcare-compliance-mcp"],
    }
  ]
});
```

### CrewAI Configuration

```yaml
# crewai.yaml
tools:
  - name: tech_scouting
    type: apify
    actor_id: tech-scouting-report-mcp
    api_token: ${APIFY_API_TOKEN}

  - name: academic_research
    type: apify
    actor_id: academic-research-mcp
    api_token: ${APIFY_API_TOKEN}

  - name: patent_search
    type: apify
    actor_id: patent-search-mcp
    api_token: ${APIFY_API_TOKEN}

  - name: university_research
    type: apify
    actor_id: university-research-mcp
    api_token: ${APIFY_API_TOKEN}

  - name: healthcare_compliance
    type: apify
    actor_id: red-cars--healthcare-compliance-mcp
    api_token: ${APIFY_API_TOKEN}
```

## Step 2: Tech Scouting Queries

### Generate Full Tech Scouting Report

```javascript
const result = await techScoutAgent.execute({
  action: "tech_scout_report",
  technology: "CRISPR gene editing",
  field: "molecular biology",
  region: "US"
});

console.log(result);
// Returns: compositeScore (0-100), verdict (INVEST_NOW/STRONG_CANDIDATE/
// MONITOR/TOO_EARLY/PASS), researchMomentum score, patentCommerc score,
// fundingValidation score, trlAssessment, allSignals, recommendations
```

### Analyze Research Momentum

```javascript
const result = await techScoutAgent.execute({
  action: "tech_scout_research_momentum",
  technology: "quantum computing",
  field: "physics",
  region: "US"
});

console.log(result);
// Returns: openAlexPapers count, semanticScholarPapers count,
// arxivPreprints count, citationVelocity, momentumScore (0-100)
```

### Assess Funding Landscape

```javascript
const result = await techScoutAgent.execute({
  action: "tech_scout_funding_landscape",
  technology: "Alzheimer's treatment",
  field: "neuroscience",
  region: "US"
});

console.log(result);
// Returns: nihGrants count with details, govGrants count,
// clinicalTrials count with phases, fundingScore (0-100)
```

### Evaluate TRL (Technology Readiness Level)

```javascript
const result = await techScoutAgent.execute({
  action: "tech_scout_trl_assessment",
  technology: "solid-state batteries",
  field: "energy storage",
  region: "US"
});

console.log(result);
// Returns: estimatedTRL (1-9), trlLevel (LOW/MEDIUM/HIGH),
// highTrlKeywordsFound, medTrlKeywordsFound, patentGrantRatio,
// highestClinicalPhase, sbirPhase2Count, trlScore (0-100)
```

### Batch Scout Multiple Technologies

```javascript
const result = await techScoutAgent.execute({
  action: "tech_scout_batch",
  technologies: ["mRNA vaccines", "CRISPR", "solid-state batteries", "quantum computing", "neural interfaces"],
  field: "biotechnology",
  region: "US"
});

console.log(result);
// Returns: array of results with technology, compositeScore,
// verdict, rank — sorted by compositeScore descending
```

## Step 3: Cross-MCP Chain — Tech Scouting + Patent + Academic + University

### Full Example: Investment Pipeline Analysis

```javascript
import { ApifyClient } from 'apify';

const apify = new ApifyClient({ token: process.env.APIFY_API_TOKEN });

async function buildInvestmentPipeline(technologies) {
  console.log(`=== Investment Pipeline Analysis ===\n`);
  console.log(`Technologies: ${technologies.join(', ')}\n`);

  // Step 1: Batch scout all technologies
  console.log('[1/5] Running batch tech scouting...');
  const batchResults = await apify.call('tech-scouting-report-mcp', {
    action: 'tech_scout_batch',
    technologies: technologies,
    field: 'biotechnology',
    region: 'US'
  });

  // Step 2: Filter to strong candidates
  const strongCandidates = batchResults.data?.results?.filter(t => {
    return t.verdict === 'INVEST_NOW' || t.verdict === 'STRONG_CANDIDATE';
  }) || [];

  console.log(`Found ${strongCandidates.length} strong candidates\n`);

  // Step 3: Deep dive on top candidates
  console.log('[2/5] Deep diving on top candidates...');
  const detailedReports = [];
  for (const candidate of strongCandidates.slice(0, 3)) {
    const report = await apify.call('tech-scouting-report-mcp', {
      action: 'tech_scout_report',
      technology: candidate.technology,
      field: 'biotechnology',
      region: 'US'
    });
    detailedReports.push(report.data);
  }

  // Step 4: Check academic foundation for top tech
  console.log('[3/5] Checking academic research foundation...');
  const topTech = detailedReports[0]?.technology || technologies[0];
  const academicPapers = await apify.call('academic-research-mcp', {
    action: 'search_papers',
    query: topTech,
    max_results: 20
  });

  // Step 5: Map patent landscape via university research
  console.log('[4/5] Mapping patent landscape...');
  const patentLandscape = await apify.call('university-research-mcp', {
    action: 'patent_landscape',
    institution: 'MIT Stanford Harvard',
    field: topTech,
    max_results: 20
  });

  // Step 6: Check clinical trials if healthcare
  console.log('[5/5] Checking clinical trials...');
  const clinicalTrials = await apify.call('red-cars--healthcare-compliance-mcp', {
    action: 'search_clinical_trials',
    condition: topTech,
    phase: 'PHASE3',
    max_results: 10
  });

  // Build comprehensive report
  const report = {
    summary: {
      totalTechnologies: technologies.length,
      strongCandidates: strongCandidates.length,
      topTech: topTech
    },
    batchResults: batchResults.data?.results || [],
    topReports: detailedReports,
    academicFoundation: {
      papersFound: academicPapers.data?.total || 0,
      topPapers: academicPapers.data?.papers?.slice(0, 5) || []
    },
    patentLandscape: {
      patentsFound: patentLandscape.data?.total || 0,
      topInstitution: patentLandscape.data?.patents?.[0]?.inventors?.[0] || 'N/A'
    },
    clinicalTrials: {
      phase3Count: clinicalTrials.data?.total || 0,
      trials: clinicalTrials.data?.trials || []
    }
  };

  console.log('\n=== INVESTMENT PIPELINE SUMMARY ===');
  console.log(`Total Technologies: ${report.summary.totalTechnologies}`);
  console.log(`Strong Candidates: ${report.summary.strongCandidates}`);
  console.log(`Top Technology: ${report.summary.topTech}`);
  console.log(`Academic Papers: ${report.academicFoundation.papersFound}`);
  console.log(`Patents Found: ${report.patentLandscape.patentsFound}`);
  console.log(`Phase 3 Trials: ${report.clinicalTrials.phase3Count}`);

  console.log('\n=== RANKED TECHNOLOGIES ===');
  batchResults.data?.results?.forEach((t, i) => {
    console.log(`${i + 1}. ${t.technology}: ${t.compositeScore}/100 (${t.verdict})`);
  });

  return report;
}

buildInvestmentPipeline([
  'mRNA vaccines',
  'CRISPR gene editing',
  'solid-state batteries',
  'quantum computing',
  'neural interfaces'
]).catch(console.error);
```

### Expected Output

```
=== Investment Pipeline Analysis ===

Technologies: mRNA vaccines, CRISPR gene editing, solid-state batteries, quantum computing, neural interfaces

[1/5] Running batch tech scouting...
Found 3 strong candidates

[2/5] Deep diving on top candidates...
[3/5] Checking academic research foundation...
[4/5] Mapping patent landscape...
[5/5] Checking clinical trials...

=== INVESTMENT PIPELINE SUMMARY ===
Total Technologies: 5
Strong Candidates: 3
Top Technology: mRNA vaccines
Academic Papers: 15,234
Patents Found: 89
Phase 3 Trials: 12

=== RANKED TECHNOLOGIES ===
1. mRNA vaccines: 89/100 (INVEST_NOW)
2. CRISPR gene editing: 78/100 (STRONG_CANDIDATE)
3. solid-state batteries: 65/100 (STRONG_CANDIDATE)
4. quantum computing: 52/100 (MONITOR)
5. neural interfaces: 38/100 (TOO_EARLY)
```

## MCP Tool Reference

### Tech Scouting Report MCP

**Endpoint:** `tech-scouting-report-mcp.apify.actor`

| Tool | Price | Status | Description | Key Parameters |
|------|-------|--------|-------------|----------------|
| `tech_scout_report` | $0.10 | Working | Full tech scouting report | `technology`, `field`, `region` |
| `tech_scout_research_momentum` | $0.05 | Working | Research momentum analysis | `technology`, `field`, `region` |
| `tech_scout_funding_landscape` | $0.05 | Working | NIH/Grants/ClinicalTrials funding | `technology`, `field`, `region` |
| `tech_scout_trl_assessment` | $0.05 | Working | TRL evaluation | `technology`, `field`, `region` |
| `tech_scout_batch` | $0.10 | Working | Batch scout multiple techs | `technologies[]`, `field`, `region` |
| `tech_scout_patent_landscape` | $0.02 | Degraded | Patent landscape (unreliable) | `technology`, `field`, `region` |

### Academic Research MCP

**Endpoint:** `academic-research-mcp.apify.actor`

| Tool | Price | Description | Key Parameters |
|------|-------|-------------|----------------|
| `search_papers` | $0.02 | Search 600M+ papers | `query`, `max_results` |
| `research_trends` | $0.05 | Topic trends over time | `topic`, `year_from` |

### Patent Search MCP

**Endpoint:** `patent-search-mcp.apify.actor`

| Tool | Price | Status | Description | Key Parameters |
|------|-------|--------|-------------|----------------|
| `get_patent_details` | $0.03 | Working | Patent lookup by number | `patent_number` |
| `find_patent_citations` | $0.05 | Working | Citation chains | `patent_number` |

### University Research MCP

**Endpoint:** `university-research-mcp.apify.actor`

| Tool | Price | Description | Key Parameters |
|------|-------|-------------|----------------|
| `patent_landscape` | $0.05 | Institution patent filings | `institution`, `field` |
| `institution_report` | $0.10 | Full institution intelligence | `institution`, `field` |

### Healthcare Compliance MCP

**Endpoint:** `red-cars--healthcare-compliance-mcp.apify.actor`

| Tool | Price | Description | Key Parameters |
|------|-------|-------------|----------------|
| `search_clinical_trials` | $0.05 | ClinicalTrials.gov search | `condition`, `phase`, `status` |

## Cost Summary

| MCP | Typical Query | Est. Cost |
|-----|---------------|-----------|
| tech-scouting-report-mcp | Full tech scouting report | ~$0.10 |
| tech-scouting-report-mcp | Research momentum | ~$0.05 |
| tech-scouting-report-mcp | TRL assessment | ~$0.05 |
| tech-scouting-report-mcp | Batch (5 techs) | ~$0.50 |
| academic-research-mcp | Paper search | ~$0.02 |
| university-research-mcp | Patent landscape | ~$0.05 |

Full investment pipeline (6 MCP calls for 5 techs): ~$0.77 per batch

## Scoring Model

The composite score (0-100) is calculated from 4 weighted components:

| Component | Weight | Data Sources |
|-----------|--------|--------------|
| Research Momentum | 20% | OpenAlex, Semantic Scholar, arXiv |
| Patent Commercialization | 25% | USPTO, EPO |
| Funding Validation | 25% | NIH, Grants.gov, ClinicalTrials.gov |
| TRL Assessment | 30% | Keyword analysis, patent grants, clinical phases |

**Verdict thresholds:**
- 75+ with TRL >= 7 and COMMERCIAL_READY signals: **INVEST_NOW**
- 55-74: **STRONG_CANDIDATE**
- 35-54: **MONITOR**
- 15-34: **TOO_EARLY**
- <15: **PASS**

## Next Steps

1. Clone the [tech-scouting-report-mcp](https://github.com/red-cars-io/tech-scouting-report-mcp) repo
2. Copy `.env.example` to `.env` and add your `APIFY_API_TOKEN`
3. Run `npm install`
4. Try the examples: `node examples/tech-scout.js`

## Related Repositories

- [Academic Research MCP](https://github.com/red-cars-io/academic-research-mcp) - 600M+ papers, citations, author profiles
- [Patent Search MCP](https://github.com/red-cars-io/patent-search-mcp) - Patent lookup by number, citation chains
- [University Research MCP](https://github.com/red-cars-io/university-research-mcp) - Institution reports, researcher profiles
- [Healthcare Compliance MCP](https://github.com/red-cars-io/healthcare-compliance-mcp) - FDA device approvals, MAUDE, ClinicalTrials
- [Drug Intelligence MCP](https://github.com/red-cars-io/drug-intelligence-mcp) - FDA drug labels, adverse events, drug interactions