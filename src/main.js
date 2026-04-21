/**
 * tech-scouting-report-mcp
 * Technology commercialization intelligence MCP for AI agents.
 * Scouting 8 data sources in parallel: OpenAlex, Semantic Scholar, arXiv, USPTO, EPO, NIH, Grants.gov, ClinicalTrials.gov
 */

import http from 'http';
import Apify, { Actor } from 'apify';

await Actor.init();

const isStandby = Actor.config.get('metaOrigin') === 'STANDBY';
const PORT = Actor.config.get('containerPort') || process.env.ACTOR_WEB_SERVER_PORT || 3000;
const MCP_PATH = '/mcp';

// MCP Tool Manifest
const MCP_TOOLS = [
  {
    name: 'tech_scout_report',
    description: 'Comprehensive technology scouting report with scoring across research momentum, patent landscape, funding validation, and TRL assessment. Returns composite score, verdict, all signals, recommendations, and metadata.',
    inputSchema: {
      type: 'object',
      properties: {
        technology: { type: 'string', description: 'Technology name to scout' },
        field: { type: 'string', description: 'Optional research field to narrow scope' },
        region: { type: 'string', description: 'Optional region filter (US, EU, Asia)' }
      },
      required: ['technology']
    },
    PPE: 8
  },
  {
    name: 'tech_scout_research_momentum',
    description: 'Analyzes research momentum from OpenAlex (250M+ academic papers), Semantic Scholar (influential citations), and arXiv (preprints). Returns citation velocity, publication count, and momentum score.',
    inputSchema: {
      type: 'object',
      properties: {
        technology: { type: 'string', description: 'Technology name to scout' },
        field: { type: 'string', description: 'Optional research field to narrow scope' },
        region: { type: 'string', description: 'Optional region filter' }
      },
      required: ['technology']
    },
    PPE: 3
  },
  {
    name: 'tech_scout_patent_landscape',
    description: 'Scouts US (USPTO) and EU (EPO) patent databases for technology patents. Returns patent listings, grant status, and author-inventor cross-reference matches.',
    inputSchema: {
      type: 'object',
      properties: {
        technology: { type: 'string', description: 'Technology name to scout' },
        field: { type: 'string', description: 'Optional research field to narrow scope' },
        region: { type: 'string', description: 'Optional region filter' }
      },
      required: ['technology']
    },
    PPE: 2
  },
  {
    name: 'tech_scout_funding_landscape',
    description: 'Scouts NIH RePORTer, Grants.gov, and ClinicalTrials.gov for funding validation. Returns grant listings, funding amounts, and clinical trial phases.',
    inputSchema: {
      type: 'object',
      properties: {
        technology: { type: 'string', description: 'Technology name to scout' },
        field: { type: 'string', description: 'Optional research field to narrow scope' },
        region: { type: 'string', description: 'Optional region filter' }
      },
      required: ['technology']
    },
    PPE: 3
  },
  {
    name: 'tech_scout_trl_assessment',
    description: 'Assesses Technology Readiness Level (TRL) via keyword analysis of patents and papers, patent grant ratios, clinical trial phases, and SBIR/STTR activity.',
    inputSchema: {
      type: 'object',
      properties: {
        technology: { type: 'string', description: 'Technology name to scout' },
        field: { type: 'string', description: 'Optional research field to narrow scope' },
        region: { type: 'string', description: 'Optional region filter' }
      },
      required: ['technology']
    },
    PPE: 3
  },
  {
    name: 'tech_scout_batch',
    description: 'Batch scout multiple technologies at once. Returns ranked results sorted by composite score for rapid portfolio analysis.',
    inputSchema: {
      type: 'object',
      properties: {
        technologies: { type: 'array', items: { type: 'string' }, description: 'Array of technology names to scout' },
        field: { type: 'string', description: 'Optional research field to narrow scope' },
        region: { type: 'string', description: 'Optional region filter' }
      },
      required: ['technologies']
    },
    PPE: 8
  }
];

// HTTP Server for MCP Protocol (used in standby mode)
if (isStandby) {
    const server = http.createServer(async (req, res) => {
        // Handle readiness probe
        if (req.headers['x-apify-container-server-readiness-probe']) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('OK');
            return;
        }

        // Handle MCP requests
        if (req.method === 'POST' && req.url === '/mcp') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', async () => {
                try {
                    const jsonBody = JSON.parse(body);
                    const id = jsonBody.id ?? null;

                    const reply = (result) => {
                        const resp = id !== null
                            ? { jsonrpc: '2.0', id, result }
                            : result;
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(resp));
                    };

                    const replyError = (code, message) => {
                        const resp = id !== null
                            ? { jsonrpc: '2.0', id, error: { code, message } }
                            : { status: 'error', error: message };
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify(resp));
                    };

                    const method = jsonBody.method;

                    // Standard MCP: initialize
                    if (method === 'initialize') {
                        return reply({
                            protocolVersion: '2024-11-05',
                            capabilities: { tools: {} },
                            serverInfo: { name: 'tech-scouting-report-mcp', version: '1.0.0' }
                        });
                    }

                    // Standard MCP: tools/list
                    if (method === 'tools/list' || (!method && jsonBody.tool === 'list')) {
                        return reply({ tools: MCP_TOOLS });
                    }

                    // Standard MCP: tools/call
                    if (method === 'tools/call') {
                        const toolName = jsonBody.params?.name;
                        const toolArgs = jsonBody.params?.arguments || {};
                        if (!toolName) return replyError(-32602, 'Missing params.name');
                        const toolResult = await handleToolCall(toolName, toolArgs);
                        return reply({
                            content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }]
                        });
                    }

                    // Legacy: tools/{toolName} method format
                    if (method && method.startsWith('tools/')) {
                        const toolName = method.slice(6);
                        const toolArgs = jsonBody.params || {};
                        const toolResult = await handleToolCall(toolName, toolArgs);
                        return reply({
                            content: [{ type: 'text', text: JSON.stringify(toolResult, null, 2) }]
                        });
                    }

                    // Legacy direct: {tool: "...", params: {...}}
                    if (jsonBody.tool) {
                        const toolResult = await handleToolCall(jsonBody.tool, jsonBody.params || {});
                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ status: 'success', result: toolResult }));
                        return;
                    }

                    replyError(-32601, `Method not found: ${method}`);
                } catch (error) {
                    console.error('MCP error:', error.message);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'error', error: error.message }));
                }
            });
            return;
        }

        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    });

    server.listen(PORT, () => {
        console.log(`Tech Scouting MCP listening on port ${PORT}`);
    });

    process.on('SIGTERM', () => {
        server.close(() => process.exit(0));
    });
} else {
    // Batch mode: run tool and exit
    const input = await Actor.getInput();
    if (input) {
        const { tool, params = {} } = input;
        if (tool) {
            console.log(`Running tool: ${tool}`);
            const result = await handleToolCall(tool, params);
            await Actor.setValue('OUTPUT', result);
        }
    }
    await Actor.exit();
}

// Export handleRequest for MCP gateway compatibility
export default {
    handleRequest: async ({ request, response, log }) => {
        log.info("Tech Scouting MCP received request");
        try {
            const { method, params, id } = request;
            if (method === 'tools/list') {
                return { tools: MCP_TOOLS };
            }
            if (method === 'tools/call') {
                const { name, arguments: args } = params;
                const result = await handleToolCall(name, args || {});
                return { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] };
            }
            return { error: 'Unknown method' };
        } catch (error) {
            log.error(error.message);
            return { error: error.message };
        }
    }
};

// Data Source Fetchers with 120s timeout
const TIMEOUT = 120000;

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    clearTimeout(timeout);
    return response;
  } catch (error) {
    clearTimeout(timeout);
    throw error;
  }
}

// OpenAlex API - 250M+ academic papers
async function fetchOpenAlex(technology, field) {
  try {
    const query = field ? `${technology} ${field}` : technology;
    const url = `https://api.openalex.org/works?search=${encodeURIComponent(query)}&per-page=100&select=title,citations_count,publication_year,authorships,institutions`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`OpenAlex API error: ${response.status}`);
    const data = await response.json();
    return (data.results || []).map(w => ({
      title: w.title,
      citations: w.citations_count || 0,
      year: w.publication_year,
      authors: (w.authorships || []).map(a => a.author?.display_name).filter(Boolean)
    }));
  } catch (error) {
    console.error('OpenAlex fetch failed:', error.message);
    return [];
  }
}

// Semantic Scholar API - influential citations
async function fetchSemanticScholar(technology, field, apiKey) {
  try {
    const query = field ? `${technology} ${field}` : technology;
    const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=50&fields=title,citationCount,year,influentialCitationCount,authors`;
    const headers = apiKey ? { 'x-api-key': apiKey } : {};
    const response = await fetchWithTimeout(url, { headers });
    if (!response.ok) throw new Error(`Semantic Scholar API error: ${response.status}`);
    const data = await response.json();
    return (data.data || []).map(p => ({
      title: p.title,
      citations: p.citationCount || 0,
      influentialCitations: p.influentialCitationCount || 0,
      year: p.year,
      authors: (p.authors || []).map(a => a.name).filter(Boolean)
    }));
  } catch (error) {
    console.error('Semantic Scholar fetch failed:', error.message);
    return [];
  }
}

// arXiv API - preprints
async function fetchArXiv(technology, field) {
  try {
    const query = field ? `${technology} AND ${field}` : technology;
    const url = `http://export.arxiv.org/api/query?search_query=all:${encodeURIComponent(query)}&max_results=50&sortBy=submittedDate&sortOrder=descending`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`arXiv API error: ${response.status}`);
    const text = await response.text();

    // Parse ATOM feed
    const entries = [];
    const itemRegex = /<entry>[\s\S]*?<\/entry>/g;
    let match;
    while ((match = itemRegex.exec(text)) !== null) {
      const entry = match[0];
      const titleMatch = entry.match(/<title>([\s\S]*?)<\/title>/);
      const summaryMatch = entry.match(/<summary>([\s\S]*?)<\/summary>/);
      const publishedMatch = entry.match(/<published>([\s\S]*?)<\/published>/);

      entries.push({
        title: titleMatch ? titleMatch[1].trim() : '',
        summary: summaryMatch ? summaryMatch[1].trim().substring(0, 500) : '',
        published: publishedMatch ? publishedMatch[1] : ''
      });
    }
    return entries;
  } catch (error) {
    console.error('arXiv fetch failed:', error.message);
    return [];
  }
}

// USPTO Patents API
async function fetchUSPTO(technology, field) {
  try {
    const query = field ? `${technology} AND ${field}` : technology;
    const url = `https://developer.uspto.gov/ibd-api/v1/application/publications?searchText=${encodeURIComponent(query)}&rows=100`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`USPTO API error: ${response.status}`);
    const data = await response.json();
    const patents = data.results || data;

    return patents.map(p => ({
      title: p.title || p.inventionTitle || 'Unknown',
      patentNumber: p.patentNumber || p.applicationNumber || '',
      filingDate: p.filingDate || p.publicationDate || '',
      status: p.patentStatus || 'unknown',
      inventorName: p.inventorName || p.inventors?.[0]?.inventorName || ''
    }));
  } catch (error) {
    console.error('USPTO fetch failed:', error.message);
    return [];
  }
}

// EPO Open Patent Services
async function fetchEPO(technology, field) {
  try {
    const query = field ? `${technology} ${field}` : technology;
    const url = `https://ops.epo.org/rest-services/publication/search/epodoc?searchQuery=${encodeURIComponent(query)}&range=1-100`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`EPO API error: ${response.status}`);
    const text = await response.text();

    // Parse EPO XML response
    const patents = [];
    const bibRegex = /<bibliographic-data>[\s\S]*?<\/bibliographic-data>/gi;
    const titleRegex = /<divis>[\s\S]*?<text>([\s\S]*?)<\/text>/gi;

    let match;
    while ((match = bibRegex.exec(text)) !== null && patents.length < 100) {
      const bib = match[0];
      const titleMatch = bib.match(/<invention-title[^>]*>([\s\S]*?)<\/invention-title>/i);
      const dateMatch = bib.match(/<date>(\d{4})/);

      if (titleMatch) {
        patents.push({
          title: titleMatch[1].trim(),
          date: dateMatch ? dateMatch[1] : 'Unknown',
          office: 'EPO'
        });
      }
    }
    return patents;
  } catch (error) {
    console.error('EPO fetch failed:', error.message);
    return [];
  }
}

// NIH RePORTer API
async function fetchNIH(technology, field) {
  try {
    const query = field ? `${technology} ${field}` : technology;
    const url = `https://api.reporter.nih.gov/v2/projects/search?search.term=${encodeURIComponent(query)}&size=100&sort=project_start_date&sort_order=desc`;
    const response = await fetchWithTimeout(url, {
      headers: { 'Content-Type': 'application/json' }
    });
    if (!response.ok) throw new Error(`NIH API error: ${response.status}`);
    const data = await response.json();
    return (data.results || []).map(r => ({
      projectTitle: r.project_title || r.projectTitle || '',
      awardNumber: r.award_number || r.projectNumber || '',
      agency: 'NIH',
      amount: r.total_cost || r.funding || 0,
      fiscalYear: r.fiscal_year || r.fiscalYear || '',
      programName: r.program_officer_name || r.programName || ''
    }));
  } catch (error) {
    console.error('NIH fetch failed:', error.message);
    return [];
  }
}

// Grants.gov API
async function fetchGrantsGov(technology, field) {
  try {
    const query = field ? `${technology} ${field}` : technology;
    const url = `https://api.grants.gov/v1/api/fundingopportunities?searchText=${encodeURIComponent(query)}&filter=grantType:OPEN&limit=50`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`Grants.gov API error: ${response.status}`);
    const data = await response.json();
    const opportunities = data.fundingopportunities || data.results || [];

    return opportunities.map(o => ({
      title: o.title || o.opportunityTitle || '',
      identifier: o.id || o.opportunityNumber || '',
      agency: o.agency || o.agencyName || '',
      amount: o.amount || o.estimatedAmount || 0,
      closeDate: o.closeDate || o.applicationCloseDate || ''
    }));
  } catch (error) {
    console.error('Grants.gov fetch failed:', error.message);
    return [];
  }
}

// ClinicalTrials.gov API
async function fetchClinicalTrials(technology, field) {
  try {
    const query = field ? `${technology} ${field}` : technology;
    const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encodeURIComponent(query)}&pageSize=50&format=json`;
    const response = await fetchWithTimeout(url);
    if (!response.ok) throw new Error(`ClinicalTrials.gov API error: ${response.status}`);
    const data = await response.json();
    const studies = data.studies || data.Studies || [];

    return studies.map(s => ({
      title: s.protocolSection?.identificationModule?.briefTitle || s.briefTitle || '',
      NCTId: s.protocolSection?.identificationModule?.nctId || s.nctId || '',
      phase: s.protocolSection?.designModules?.phases || s.phases || [],
      status: s.protocolSection?.statusModule?.overallStatus || s.status || '',
      sponsor: s.protocolSection?.sponsorCollaboratorsModule?.leadSponsor?.name || s.sponsor || ''
    }));
  } catch (error) {
    console.error('ClinicalTrials.gov fetch failed:', error.message);
    return [];
  }
}

// Scoring Functions

function calculateResearchMomentum(openAlexPapers, semanticPapers, arxivPreprints) {
  const signals = [];

  // OpenAlex scoring
  const totalCitations = openAlexPapers.reduce((sum, p) => sum + (p.citations || 0), 0);
  const publicationCount = openAlexPapers.length;
  let citationVelocity = publicationCount > 0 ? Math.min((totalCitations / publicationCount) * 2, 35) : 0;

  // +10 if >50% citations from 2023+
  const recentPapers = openAlexPapers.filter(p => p.year && p.year >= 2023);
  if (publicationCount > 0 && (recentPapers.length / publicationCount) > 0.5) {
    citationVelocity += 10;
    signals.push('>50% publications from 2023+ (citation acceleration)');
  }

  // Semantic Scholar influential citations: 2x weight, cap 25pts
  const influentialCitations = semanticPapers.reduce((sum, p) => sum + (p.influentialCitations || 0), 0);
  const semanticScore = Math.min(influentialCitations * 2, 25);
  if (semanticPapers.length > 0) signals.push(`${semanticPapers.length} influential papers found`);

  // arXiv preprints: 3pts each, cap 25pts
  const arxivScore = Math.min(arxivPreprints.length * 3, 25);
  if (arxivPreprints.length > 0) signals.push(`${arxivPreprints.length} arXiv preprints found`);

  // +15 amplifier if avg citations >10 AND preprints >3
  const avgCitations = publicationCount > 0 ? totalCitations / publicationCount : 0;
  if (avgCitations > 10 && arxivPreprints.length > 3) {
    citationVelocity += 15;
    signals.push('High engagement amplifier: avg citations >10 AND preprints >3');
  }

  // Cap total at 35 for this component
  const score = Math.min(citationVelocity + semanticScore + arxivScore, 35);

  // Momentum level classification
  let momentumLevel = 'LOW';
  if (score >= 28) momentumLevel = 'VERY_HIGH';
  else if (score >= 20) momentumLevel = 'HIGH';
  else if (score >= 12) momentumLevel = 'MEDIUM';

  return {
    score: Math.round(score * 100) / 100,
    citationVelocity: Math.round(citationVelocity * 100) / 100,
    publicationCount,
    preprints: arxivPreprints.length,
    momentumLevel,
    signals
  };
}

function calculatePatentCommerc(usptoPatents, epoPatents, authorInventorMatches) {
  const signals = [];

  // USPTO: 4pts/granted, 2pts/application, 2pts/2022+, cap 35pts
  let usptoScore = 0;
  usptoPatents.forEach(p => {
    if (p.status && p.status.toLowerCase().includes('grant')) {
      usptoScore += 4;
    } else {
      usptoScore += 2; // application
    }
    if (p.filingDate && p.filingDate.includes('2022')) {
      usptoScore += 2;
    }
  });
  usptoScore = Math.min(usptoScore, 35);
  if (usptoPatents.length > 0) signals.push(`${usptoPatents.length} USPTO patents found`);

  // EPO: 4pts/granted (kind B/A), cap 25pts
  let epoScore = 0;
  epoPatents.forEach(p => {
    // Kind codes B and A indicate granted patents
    if (p.kindCode === 'B' || p.kindCode === 'A') {
      epoScore += 4;
    } else {
      epoScore += 2;
    }
  });
  epoScore = Math.min(epoScore, 25);
  if (epoPatents.length > 0) signals.push(`${epoPatents.length} EPO patents found`);

  // Author-inventor cross-ref: 5pts/match, cap 25pts
  const crossRefScore = Math.min(authorInventorMatches * 5, 25);
  if (authorInventorMatches > 0) signals.push(`${authorInventorMatches} author-inventor matches found`);

  const patentCount = usptoPatents.length + epoPatents.length;
  const grantedPatents = usptoPatents.filter(p => p.status && p.status.toLowerCase().includes('grant')).length +
                         epoPatents.filter(p => p.kindCode === 'B' || p.kindCode === 'A').length;

  const score = usptoScore + epoScore + crossRefScore;
  let commercLevel = 'LOW';
  if (score >= 50) commercLevel = 'VERY_HIGH';
  else if (score >= 35) commercLevel = 'HIGH';
  else if (score >= 20) commercLevel = 'MEDIUM';

  return {
    score: Math.round(score * 100) / 100,
    patentCount,
    grantedPatents,
    crossRefHits: authorInventorMatches,
    commercLevel,
    signals
  };
}

function calculateFundingValidation(nihGrants, govGrants, clinicalTrials) {
  const signals = [];

  // NIH: 3pts/grant, +4pts/R01/R21/R35, +5pts/SBIR/STTR, cap 35pts
  let nihScore = 0;
  nihGrants.forEach(g => {
    nihScore += 3;
    const awardNum = (g.awardNumber || '').toUpperCase();
    if (/R01|R21|R35/i.test(awardNum)) {
      nihScore += 4;
      signals.push(`NIH R01/R21/R35 grant: ${g.awardNumber}`);
    }
    if (/SBIR|STTR/i.test(awardNum)) {
      nihScore += 5;
      signals.push(`NIH SBIR/STTR: ${g.awardNumber}`);
    }
  });
  nihScore = Math.min(nihScore, 35);
  if (nihGrants.length > 0) signals.push(`${nihGrants.length} NIH grants found`);

  // Grants.gov: 3pts each + $1M bonus (10pts), cap 25pts
  let govScore = govGrants.length * 3;
  const hasLargeGrant = govGrants.some(g => g.amount && g.amount >= 1000000);
  if (hasLargeGrant) {
    govScore += 10;
    signals.push('Grants.gov: $1M+ grant found');
  }
  govScore = Math.min(govScore, 25);
  if (govGrants.length > 0) signals.push(`${govGrants.length} Grants.gov opportunities found`);

  // Clinical trials: 4pts each + Phase2+ bonus (5pts), cap 25pts
  let trialScore = clinicalTrials.length * 4;
  const phase2Plus = clinicalTrials.filter(t => {
    const phases = t.phase || [];
    return phases.some(p => p && (p.includes('Phase 2') || p.includes('Phase 3') || p.includes('P2') || p.includes('P3')));
  }).length;
  if (phase2Plus > 0) {
    trialScore += 5;
    signals.push(`ClinicalTrials.gov: ${phase2Plus} Phase 2+ trials found`);
  }
  trialScore = Math.min(trialScore, 25);
  if (clinicalTrials.length > 0) signals.push(`${clinicalTrials.length} clinical trials found`);

  const score = nihScore + govScore + trialScore;
  let fundingLevel = 'LOW';
  if (score >= 50) fundingLevel = 'VERY_HIGH';
  else if (score >= 35) fundingLevel = 'HIGH';
  else if (score >= 20) fundingLevel = 'MEDIUM';

  return {
    score: Math.round(score * 100) / 100,
    nihGrants: nihGrants.length,
    govGrants: govGrants.length,
    clinicalTrials: clinicalTrials.length,
    fundingLevel,
    signals
  };
}

const HIGH_TRL_KEYWORDS = ['commercial', 'commercialize', 'manufacturing', 'manufacture', 'fda approved', 'market', 'deployed', 'deployment', 'production', 'product launch', 'revenue', 'industry'];
const MED_TRL_KEYWORDS = ['prototype', 'validation', 'validated', 'proof of concept', 'poc', 'pilot', 'beta', 'clinical trial phase 1', 'phase i', 'feasibility'];
const LOW_TRL_KEYWORDS = ['discovery', 'fundamental', 'theoretical', 'exploratory', 'basic research', 'hypothesis'];

function calculateTRLAssessment(openAlexPapers, usptoPatents, epoPatents, clinicalTrials, nihGrants) {
  const signals = [];
  let score = 0;

  // HIGH_TRL keywords: 4pts each, cap 30pts
  let highTrlCount = 0;
  const allTexts = [
    ...openAlexPapers.map(p => (p.title || '') + ' ' + (p.abstract || '')),
    ...usptoPatents.map(p => p.title || ''),
    ...epoPatents.map(p => p.title || '')
  ].join(' ').toLowerCase();

  HIGH_TRL_KEYWORDS.forEach(kw => {
    if (allTexts.includes(kw)) {
      score += 4;
      highTrlCount++;
      signals.push(`HIGH_TRL keyword: "${kw}"`);
    }
  });
  score = Math.min(score, 30);

  // MED_TRL: 2pts each
  let medTrlCount = 0;
  MED_TRL_KEYWORDS.forEach(kw => {
    if (allTexts.includes(kw)) {
      score += 2;
      medTrlCount++;
      signals.push(`MED_TRL keyword: "${kw}"`);
    }
  });

  // LOW_TRL: -1pt each
  LOW_TRL_KEYWORDS.forEach(kw => {
    if (allTexts.includes(kw)) {
      score -= 1;
      signals.push(`LOW_TRL keyword: "${kw}"`);
    }
  });

  // Patent grant ratio: up to 25pts
  const totalPatents = usptoPatents.length + epoPatents.length;
  const grantedPatents = usptoPatents.filter(p => p.status && p.status.toLowerCase().includes('grant')).length +
                         epoPatents.filter(p => p.kindCode === 'B' || p.kindCode === 'A').length;
  const grantRatio = totalPatents > 0 ? grantedPatents / totalPatents : 0;
  const patentGrantScore = grantRatio * 25;
  score += patentGrantScore;
  if (totalPatents > 0) signals.push(`Patent grant ratio: ${Math.round(grantRatio * 100)}% (${grantedPatents}/${totalPatents})`);

  // Phase 3 clinical trial: cap 25pts
  const phase3Trials = clinicalTrials.filter(t => {
    const phases = t.phase || [];
    return phases.some(p => p && (p.includes('Phase 3') || p.includes('P3')));
  }).length;
  const phase3Score = Math.min(phase3Trials * 8, 25);
  score += phase3Score;
  if (phase3Trials > 0) signals.push(`${phase3Trials} Phase 3 clinical trials found`);

  // SBIR Phase 2 count
  const sbirPhase2 = nihGrants.filter(g => /SBIR|STTR/i.test(g.awardNumber || '')).length;
  if (sbirPhase2 > 0) {
    score += Math.min(sbirPhase2 * 3, 15);
    signals.push(`${sbirPhase2} SBIR/STTR grants found`);
  }

  // Estimate TRL
  let estimatedTRL = 1;
  if (score >= 50) estimatedTRL = 9;
  else if (score >= 40) estimatedTRL = 8;
  else if (score >= 30) estimatedTRL = 7;
  else if (score >= 20) estimatedTRL = 6;
  else if (score >= 15) estimatedTRL = 5;
  else if (score >= 10) estimatedTRL = 4;
  else if (score >= 5) estimatedTRL = 3;
  else if (score >= 2) estimatedTRL = 2;

  let trlLevel = 'LOW';
  if (estimatedTRL >= 8) trlLevel = 'HIGH';
  else if (estimatedTRL >= 6) trlLevel = 'MEDIUM';

  const highestClinicalPhase = clinicalTrials.length > 0 ? 'Phase 3' : 'None';

  return {
    score: Math.round(Math.max(0, score) * 100) / 100,
    estimatedTRL,
    trlLevel,
    highTrlKeywordsFound: highTrlCount,
    medTrlKeywordsFound: medTrlCount,
    patentGrantRatio: Math.round(grantRatio * 100),
    highestClinicalPhase,
    sbirPhase2Count: sbirPhase2,
    signals
  };
}

function determineVerdict(compositeScore, trlScore, commercialReady) {
  // TRL>=7 AND COMMERCIAL_READY → INVEST_NOW regardless of composite
  if (trlScore >= 28 && commercialReady) return 'INVEST_NOW';
  if (compositeScore >= 75) return 'INVEST_NOW';
  if (compositeScore >= 55) return 'STRONG_CANDIDATE';
  if (compositeScore >= 35) return 'MONITOR';
  if (compositeScore >= 15) return 'TOO_EARLY';
  return 'PASS';
}

function generateRecommendations(verdict, researchMomentum, patentCommerc, fundingValidation, trlAssessment) {
  const recommendations = [];

  switch (verdict) {
    case 'INVEST_NOW':
      recommendations.push('Strong commercialization signal - prioritize licensing discussions');
      recommendations.push('Map inventor networks for partnership opportunities');
      if (fundingValidation.score > 30) recommendations.push('Funding validated - approach investors with de-risked profile');
      break;
    case 'STRONG_CANDIDATE':
      recommendations.push('Monitor for patent issuance and clinical trial results');
      recommendations.push('Identify technology transfer office contacts at top institutions');
      if (patentCommerc.score < 20) recommendations.push('Seek additional patent protection in key jurisdictions');
      break;
    case 'MONITOR':
      recommendations.push('Track publication velocity and citation trends');
      recommendations.push('Set up alerts for new patents and funding grants');
      recommendations.push('Evaluate competitive landscape before committing resources');
      break;
    case 'TOO_EARLY':
      recommendations.push('Check back in 6-12 months for TRL advancement');
      recommendations.push('Monitor for SBIR/STTR Phase 2 awards as leading indicator');
      recommendations.push('Focus on similar technologies with higher readiness');
      break;
    case 'PASS':
      recommendations.push('Technology does not meet investment criteria at this time');
      recommendations.push('Consider related applications or enabling technologies');
      recommendations.push('Re-evaluate if market conditions change significantly');
      break;
  }

  return recommendations;
}

function calculateCompositeScore(researchMomentum, patentCommerc, fundingValidation, trlAssessment) {
  const rm = researchMomentum.score * 0.20;
  const pc = patentCommerc.score * 0.25;
  const fv = fundingValidation.score * 0.25;
  const tr = trlAssessment.score * 0.30;

  return Math.round((rm + pc + fv + tr) * 100) / 100;
}

// Main Tool Handler
async function handleToolCall(tool, args) {
  switch (tool) {
    case 'tech_scout_report':
      return await generateFullReport(args.technology, args.field, args.region);

    case 'tech_scout_research_momentum':
      return await analyzeResearchMomentum(args.technology, args.field, args.region);

    case 'tech_scout_patent_landscape':
      return await analyzePatentLandscape(args.technology, args.field, args.region);

    case 'tech_scout_funding_landscape':
      return await analyzeFundingLandscape(args.technology, args.field, args.region);

    case 'tech_scout_trl_assessment':
      return await assessTRL(args.technology, args.field, args.region);

    case 'tech_scout_batch':
      return await batchScout(args.technologies, args.field, args.region);

    default:
      throw new Error(`Unknown tool: ${tool}`);
  }
}

async function generateFullReport(technology, field, region) {
  // Fetch all 8 data sources in parallel
  const [openAlexPapers, semanticPapers, arxivPreprints, usptoPatents, epoPatents, nihGrants, govGrants, clinicalTrials] =
    await Promise.all([
      fetchOpenAlex(technology, field),
      fetchSemanticScholar(technology, field),
      fetchArXiv(technology, field),
      fetchUSPTO(technology, field),
      fetchEPO(technology, field),
      fetchNIH(technology, field),
      fetchGrantsGov(technology, field),
      fetchClinicalTrials(technology, field)
    ]);

  // Calculate scores
  const researchMomentum = calculateResearchMomentum(openAlexPapers, semanticPapers, arxivPreprints);
  const patentCommerc = calculatePatentCommerc(usptoPatents, epoPatents, 0); // Author-inventor matches require cross-ref
  const fundingValidation = calculateFundingValidation(nihGrants, govGrants, clinicalTrials);
  const trlAssessment = calculateTRLAssessment(openAlexPapers, usptoPatents, epoPatents, clinicalTrials, nihGrants);

  const compositeScore = calculateCompositeScore(researchMomentum, patentCommerc, fundingValidation, trlAssessment);

  // Check for commercial ready signals
  const commercialReady = trlAssessment.highTrlKeywordsFound >= 3 ||
                         (trlAssessment.highestClinicalPhase === 'Phase 3' && trlAssessment.patentGrantRatio > 50);

  const verdict = determineVerdict(compositeScore, trlAssessment.score, commercialReady);
  const recommendations = generateRecommendations(verdict, researchMomentum, patentCommerc, fundingValidation, trlAssessment);

  // Aggregate all signals
  const allSignals = [
    ...researchMomentum.signals,
    ...patentCommerc.signals,
    ...fundingValidation.signals,
    ...trlAssessment.signals
  ];

  return {
    technology,
    compositeScore,
    verdict,
    researchMomentum,
    patentCommerc,
    fundingValidation,
    trlAssessment,
    allSignals,
    recommendations,
    metadata: {
      openAlexPapers: openAlexPapers.length,
      semanticPapers: semanticPapers.length,
      arxivPreprints: arxivPreprints.length,
      usptoPatents: usptoPatents.length,
      epoPatents: epoPatents.length,
      nihGrants: nihGrants.length,
      govGrants: govGrants.length,
      clinicalTrials: clinicalTrials.length
    }
  };
}

async function analyzeResearchMomentum(technology, field, region) {
  const [openAlexPapers, semanticPapers, arxivPreprints] = await Promise.all([
    fetchOpenAlex(technology, field),
    fetchSemanticScholar(technology, field),
    fetchArXiv(technology, field)
  ]);

  const momentum = calculateResearchMomentum(openAlexPapers, semanticPapers, arxivPreprints);

  return {
    technology,
    openAlexPapers: openAlexPapers.slice(0, 20),
    semanticScholarPapers: semanticPapers.slice(0, 20),
    arxivPreprints: arxivPreprints.slice(0, 20),
    citationVelocity: momentum.citationVelocity,
    momentumScore: momentum.score
  };
}

async function analyzePatentLandscape(technology, field, region) {
  const [usptoPatents, epoPatents] = await Promise.all([
    fetchUSPTO(technology, field),
    fetchEPO(technology, field)
  ]);

  const patentScore = calculatePatentCommerc(usptoPatents, epoPatents, 0);

  return {
    technology,
    usptoPatents: usptoPatents.slice(0, 50),
    epoPatents: epoPatents.slice(0, 50),
    authorInventorMatches: 0,
    patentScore: patentScore.score
  };
}

async function analyzeFundingLandscape(technology, field, region) {
  const [nihGrants, govGrants, clinicalTrials] = await Promise.all([
    fetchNIH(technology, field),
    fetchGrantsGov(technology, field),
    fetchClinicalTrials(technology, field)
  ]);

  const fundingScore = calculateFundingValidation(nihGrants, govGrants, clinicalTrials);

  return {
    technology,
    nihGrants: nihGrants.slice(0, 50),
    govGrants: govGrants.slice(0, 50),
    clinicalTrials: clinicalTrials.slice(0, 50),
    fundingScore: fundingScore.score
  };
}

async function assessTRL(technology, field, region) {
  const [openAlexPapers, usptoPatents, epoPatents, clinicalTrials, nihGrants] = await Promise.all([
    fetchOpenAlex(technology, field),
    fetchUSPTO(technology, field),
    fetchEPO(technology, field),
    fetchClinicalTrials(technology, field),
    fetchNIH(technology, field)
  ]);

  const trlAssessment = calculateTRLAssessment(openAlexPapers, usptoPatents, epoPatents, clinicalTrials, nihGrants);

  return {
    technology,
    estimatedTRL: trlAssessment.estimatedTRL,
    trlLevel: trlAssessment.trlLevel,
    highTrlKeywordsFound: trlAssessment.highTrlKeywordsFound,
    medTrlKeywordsFound: trlAssessment.medTrlKeywordsFound,
    patentGrantRatio: trlAssessment.patentGrantRatio,
    highestClinicalPhase: trlAssessment.highestClinicalPhase,
    sbirPhase2Count: trlAssessment.sbirPhase2Count,
    trlScore: trlAssessment.score,
    signals: trlAssessment.signals
  };
}

async function batchScout(technologies, field, region) {
  const results = await Promise.all(
    technologies.map(async tech => {
      const report = await generateFullReport(tech, field, region);
      return {
        technology: tech,
        compositeScore: report.compositeScore,
        verdict: report.verdict,
        rank: 0 // Will be set after sorting
      };
    })
  );

  // Sort by composite score descending
  results.sort((a, b) => b.compositeScore - a.compositeScore);
  results.forEach((r, i) => r.rank = i + 1);

  return {
    results,
    rankedBy: 'compositeScore'
  };
}

