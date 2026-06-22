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
  storagePath: string;
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
  sourceClause?: SearchResult;
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
    possibleConflicts?: AnalysisComparison[];
    consistentOrRelated: AnalysisComparison[];
    uncertain: AnalysisComparison[];
  };
  repositorySearch?: {
    indexedFileCount: number | null;
    chunkCount: number;
    failures: Array<{ name: string; error: string }>;
  };
  multiFileAnalysis?: {
    requestedFileCount: number;
    indexedFileCount: number;
    chunkCount: number;
    pairCount: number;
    truncatedFiles: string[];
    failures: Array<{ name: string; error: string }>;
  };
  inputExtraction?: {
    typedTextIncluded: boolean;
    typedTextCharacters: number;
    fileIncluded: boolean;
    fileName: string | null;
    fileType: string | null;
    extractedCharacters: number;
    combinedCharacters: number;
    pageCount: number | null;
    textPageCount: number | null;
    ocrRequiredPages: number[];
    ocrAppliedPages: number[];
    ocrAvailable: boolean;
    warnings: string[];
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

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error(`Could not read ${file.name}.`));
        return;
      }
      resolve(result.includes(",") ? result.split(",", 2)[1] : result);
    };
    reader.readAsDataURL(file);
  });
}

export async function analyzeCheckInput(options: {
  text: string;
  file: File | null;
  topK?: number;
  repository?: {
    files: RepoSearchFile[];
    scopeLabel: string;
  };
}): Promise<AnalysisResult> {
  const encodedFile = options.file
    ? {
        name: options.file.name,
        type: options.file.type || "application/octet-stream",
        size: options.file.size,
        contentBase64: await fileToBase64(options.file),
      }
    : null;
  const repository = options.repository;
  const endpoint = repository ? "/analyze-input-repo" : "/analyze-input";
  const response = await fetch(`${AI_API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      text: options.text,
      file: encodedFile,
      topK: options.topK ?? 5,
      files: repository?.files,
      scopeLabel: repository?.scopeLabel,
    }),
  });
  return readJson<AnalysisResult>(response);
}

export async function analyzeMultipleFiles(
  files: File[],
  maxPairs = 30
): Promise<AnalysisResult> {
  const encodedFiles = await Promise.all(
    files.map(async (file) => ({
      name: file.name,
      type: file.type || "application/octet-stream",
      size: file.size,
      contentBase64: await fileToBase64(file),
    }))
  );

  const response = await fetch(`${AI_API_BASE}/analyze-multi`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ files: encodedFiles, maxPairs }),
  });
  return readJson<AnalysisResult>(response);
}
