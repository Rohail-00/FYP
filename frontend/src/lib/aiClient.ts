const AI_API_BASE =
  process.env.NEXT_PUBLIC_AI_API_URL?.replace(/\/$/, "") ??
  "http://127.0.0.1:8001";

export interface SearchResult {
  id: string;
  title: string;
  file: string;
  pageStart: number;
  pageEnd: number;
  text: string;
  score: number;
}

export interface RepoSearchFile {
  id: string;
  name: string;
  type: string;
  downloadUrl: string;
}

export interface RepoSearchResponse {
  results: SearchResult[];
  indexedFileCount: number;
  chunkCount: number;
  failures: Array<{ name: string; error: string }>;
}

export interface AnalysisDecision {
  resultType: "contradiction" | "possible_conflict" | "consistent_or_related" | "uncertain";
  confidence: number;
  semanticOverlap: number;
  reasons: string[];
  expertSignals?: {
    numericMismatch: boolean;
    negationMismatch: boolean;
    dateMismatch: boolean;
    semanticOverlap: number;
    retrievalScore: number;
  };
  draftFeatures: Record<string, unknown>;
  activeFeatures: Record<string, unknown>;
}

export interface AnalysisComparison {
  candidate: SearchResult;
  decision: AnalysisDecision;
}

export interface AnalysisResult {
  summary: {
    resultType: string;
    confidence: number;
    candidateCount: number;
    contradictionCount: number;
    possibleConflictCount: number;
    routedExperts: string[];
    evaluationMatrix: string;
    knowledgeBase?: string;
    retrievalSource?: string;
  };
  draft: string;
  comparisons: AnalysisComparison[];
  part2Pipeline?: {
    routerMode: string;
    modelRegistry: Record<string, string>;
    expertTrace: Array<{
      name: string;
      model: string;
      status: string;
      evidence: string[];
      output: string;
    }>;
    aggregation: {
      strategy: string;
      debateSummary: string;
    };
  };
  preservedResults: {
    contradictions: AnalysisComparison[];
    consistentOrRelated: AnalysisComparison[];
    uncertain: AnalysisComparison[];
  };
  repositorySearch?: {
    indexedFileCount: number | null;
    chunkCount: number;
    failures: Array<{ name: string; error: string }>;
  };
}

async function readJson<T>(response: Response): Promise<T> {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data?.error ?? "PakLaw AI request failed.");
  }
  return data as T;
}

export async function searchLaws(query: string, topK = 8): Promise<SearchResult[]> {
  const params = new URLSearchParams({ q: query, topK: String(topK) });
  const response = await fetch(`${AI_API_BASE}/search?${params.toString()}`);
  const data = await readJson<{ results: SearchResult[] }>(response);
  return data.results;
}

export async function searchRepositoryFiles(
  query: string,
  files: RepoSearchFile[],
  topK = 8
): Promise<RepoSearchResponse> {
  const response = await fetch(`${AI_API_BASE}/search-repo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, files, topK }),
  });
  return readJson<RepoSearchResponse>(response);
}

export async function analyzeDraft(draft: string, topK = 5): Promise<AnalysisResult> {
  const response = await fetch(`${AI_API_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draft, topK }),
  });
  return readJson<AnalysisResult>(response);
}

export async function analyzeRepositoryDraft(
  draft: string,
  files: RepoSearchFile[],
  scopeLabel: string,
  topK = 5
): Promise<AnalysisResult> {
  const response = await fetch(`${AI_API_BASE}/analyze-repo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ draft, files, scopeLabel, topK }),
  });
  return readJson<AnalysisResult>(response);
}
