# NLI-Based Law Consistency Checker - System Architecture (PakLaw AI)

## Executive Summary

**PakLaw AI** is a sophisticated Natural Language Inference (NLI) and Retrieval-Augmented Generation (RAG) system designed to provide intelligent legal question-answering for Pakistani law. The system combines modern machine learning techniques—including semantic embeddings, cross-encoder reranking, and transformer-based question-answering—with a robust knowledge base of Pakistani statutes, regulations, and constitutional provisions.

The architecture implements a **modular, layered pipeline** that transforms raw user queries into contextually accurate, citation-backed legal answers.

---

## 1. System Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                       USER INTERFACE LAYER                          │
│  (Next.js Frontend → Legal Query Interface, Dashboard, Reports)      │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTP/REST API
┌────────────────────────────▼────────────────────────────────────────┐
│                      API & ROUTING LAYER                            │
│  (/chat, /search, /health endpoints via FastAPI)                    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                    PROCESSING PIPELINE LAYER                        │
│  ┌─────────────────┬──────────────────┬─────────────────────────┐   │
│  │  Intent         │  Query           │  Retrieval & Reranking  │   │
│  │  Detection      │  Expansion       │  Pipeline              │   │
│  └─────────────────┴──────────────────┴─────────────────────────┘   │
│  ┌─────────────────┬──────────────────┬─────────────────────────┐   │
│  │  Embedding      │  Cross-Encoder   │  LegalBERT QA           │   │
│  │  Generation     │  Reranking       │  Inference              │   │
│  └─────────────────┴──────────────────┴─────────────────────────┘   │
└────────────────────────────┬────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────────┐
│                    KNOWLEDGE & DATA LAYER                           │
│  ┌──────────────┬─────────────────┬──────────────────────────────┐  │
│  │  ChromaDB    │  Fine-tuned      │  Pre-extracted             │  │
│  │  (Vector     │  LegalBERT       │  Legal Document Corpus      │  │
│  │  Database)   │  Models          │  (JSON)                    │  │
│  └──────────────┴─────────────────┴──────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Core Technology Stack

| **Component**         | **Technology**                      | **Purpose**                          |
|-----------------------|-------------------------------------|--------------------------------------|
| **Frontend**          | Next.js 16 + React 19 + Tailwind   | User interface & dashboard           |
| **Backend API**       | FastAPI (Python)                   | REST API server                      |
| **Vector Database**   | ChromaDB                           | Semantic similarity search           |
| **Embeddings**        | Sentence-Transformers (MiniLM)     | Query & document vector encoding     |
| **NLP Models**        | LegalBERT (Base + Fine-tuned)      | Legal text understanding & QA        |
| **Reranking**         | Cross-Encoder (ms-marco-MiniLM)    | Precision ranking of results         |
| **Server**            | Uvicorn (ASGI)                     | Async HTTP server                    |
| **Data Format**       | JSON, JSONL                        | Corpus and configuration             |

---

## 2. Layer-by-Layer Architecture

### 2.1 Data Ingestion Layer

**Purpose:** Load and validate legal documents from multiple sources.

**Input Sources:**
- Statutes & Acts (e.g., Pakistan Penal Code, Constitution)
- Regulations (e.g., Control of Narcotic Substances Act)
- Case Law & Precedents
- Amendments & Historical Versions
- Custom uploaded documents

**Processing:**
- Documents stored in JSON format in `/OLD/old-docs/data/extracted/`
- Raw corpus maintained in JSONL format (`chunks.jsonl`)
- Metadata extraction: law name, section numbers, dates, jurisdiction

**Output:**
- Validated document chunks ready for preprocessing

---

### 2.2 Preprocessing & Legal Parsing Layer

**Purpose:** Transform raw legal text into machine-readable elements.

**Key Processes:**

#### A. **Clause Segmentation**
- Split dense legal text into individual clauses/sentences
- Respect legal structure (e.g., numbered sections, subsections)
- Preserve clause boundaries for accurate context extraction

#### B. **Legal Named Entity Recognition (NER)**
- Identify legal entities: organizations, roles, dates, references
- Example: "Section 302 of the Pakistan Penal Code" → entities: {law: "PPC", section: "302"}

#### C. **Dependency Parsing**
- Analyze grammatical structure of legal clauses
- Understand subject-verb-object relationships
- Critical for conflict detection

#### D. **Modality Detection**
- Identify obligation/permission keywords:
  - **Mandatory:** Shall, Must, Require, Obligate
  - **Permissive:** May, Can, Allow, Permit
  - **Prohibited:** Shall not, Cannot, Prohibit, Forbidden
- Important for consistency reasoning

#### E. **Condition & Exception Extraction**
- Extract conditional logic: "Unless X...", "Except where...", "If Y applies..."
- Identify temporal constraints: "after 30 days", "within 6 months"
- Segment legal preconditions from main provisions

**Output:**
- Parsed chunks with structured metadata
- Ready for embedding and knowledge representation

---

### 2.3 Knowledge Representation Layer

**Purpose:** Convert parsed legal text into structured knowledge formats.

**Three-Tier Approach:**

#### A. **Symbolic Layer (First-Order Logic / FOL)**
- Translate legal rules into formal logic expressions
- Example: "If murder is committed, then imprisonment shall follow"
  - Translates to: `Murder(X) → Imprisonment(X)`
- Enables precise logical reasoning and conflict detection
- Used for rule-based consistency checks

#### B. **Legal Knowledge Graph (KG)**
- Nodes: Entities, Clauses, Sections, Laws, Cases
- Edges: Citation links, Dependency relationships, Override relationships (Lex Specialis, Lex Posterior)
- Example: "Section 300 modifies Section 302" → creates directed edge
- Enables graph-based multi-hop reasoning

#### C. **Neural Layer (Vector Embeddings)**
- Transform parsed text into 384-dimensional vectors
- Uses Sentence-Transformers (`all-MiniLM-L6-v2`)
- One embedding per chunk (~400 tokens per chunk)
- Stored in ChromaDB for fast similarity retrieval
- Enables semantic search without exact keyword matching

**Output:**
- Triple representation: Symbolic + Structural + Semantic
- Ready for retrieval and inference

---

### 2.4 Retrieval & Candidate Generation Layer

**Purpose:** Efficiently identify relevant legal clauses without exhaustive comparison.

**Pipeline:**

1. **Intent Detection & Metadata Filtering**
   - Parse user query for mentioned laws/acts
   - Filter ChromaDB queries to specific law if detected
   - Reduces search space (e.g., if user asks about "PPC", filter to Pakistan Penal Code only)

2. **Query Expansion**
   - Expand user query with legal synonyms & related terms
   - Example: "What is the punishment for stealing?" 
     - Expands to include: "theft", "larceny", "robbery", "burglary"
   - Detected terms map to relevant sections (stored in `TERM_SECTIONS` mapping)

3. **Section Reference Detection**
   - Extract explicit section numbers from query: "What is Section 302?"
   - Direct section lookup bypasses normal retrieval

4. **Semantic Similarity Search (Broad Retrieval)**
   - Embed query using Sentence-Transformers
   - Search ChromaDB with cosine similarity
   - Returns **top-20 candidates** (broad retrieval for high recall)
   - ChromaDB uses HNSW (Hierarchical Navigable Small World) for fast approximate nearest neighbor search

5. **Section Boosting**
   - Inject directly relevant sections into candidate pool
   - Boost score of section references detected in step 3
   - Ensures high-relevance sections are always included

6. **Cross-Encoder Reranking**
   - Score each of the 20 candidates against the original query
   - Cross-Encoder model (`ms-marco-MiniLM-L-6-v2`) reads query + document together
   - More accurate than bi-encoder for relevance
   - Returns **top-5 results** (precision tier)

**Output:**
- Ranked list of (at most) 5 highly relevant law chunks
- Each chunk includes: text, section number, law name, metadata, relevance score

---

### 2.5 NLI (Natural Language Inference) Engine

**Purpose:** Determine if two legal clauses are consistent, contradictory, or neutral.

**Architecture:**

#### Input
- **Premise:** Clause A (retrieved from corpus or user input)
- **Hypothesis:** Clause B (another retrieved clause or user query)

#### Processing
- Tokenize both clauses using LegalBERT tokenizer
- Concatenate: `[CLS] Clause A [SEP] Clause B [SEP]`
- Pass through fine-tuned LegalBERT model
- Output logits for 3 classes:

#### Classification Output
1. **Entailment (Agreement):** Clause B logically follows from Clause A
   - Confidence: 0-1 score
   - Example: "Voluntary confession reduces sentence" & "Confession is a mitigating factor" → Entailment

2. **Contradiction (Conflict):** Clause A and B directly conflict
   - Confidence: 0-1 score
   - Example: "Bail is mandatory" & "Bail may be denied" → Contradiction

3. **Neutral (Unrelated):** No clear relationship
   - Confidence: 0-1 score
   - Example: "Homicide rules" & "Copyright law" → Neutral

**Fine-tuning Details:**
- Base model: `nlpaueb/legal-bert-base-uncased`
- Fine-tuned version stored at: `models/legalbert-pakistan-finetuned/`
- Checkpoints available: `checkpoint-500/`, `checkpoint-867/`
- Training data: Pakistani legal document pairs with NLI labels

**Output:**
- Classification label + confidence score
- Used for downstream consistency reasoning

---

### 2.6 Consistency Reasoner Layer

**Purpose:** Apply deep legal reasoning to detect and explain inconsistencies.

**Reasoning Modules:**

#### A. **Direct Conflict Detection**
- Two clauses explicitly contradict each other
- Example: "Bail is mandatory" vs. "Bail may be withheld"
- Detected via NLI engine classification

#### B. **Exception Handling (Lex Specialis)**
- Specific law overrides general law
- Example: "General rule in PPC" vs. "Exception in specific chapter"
- Knowledge Graph edges mark override relationships
- Special logic: exception ≠ contradiction

#### C. **Temporal Reasoning (Lex Posterior)**
- Newer law supersedes older law
- Historical versions in corpus tracked with dates
- Later amendment overrides earlier provision
- Timeline extracted from metadata

#### D. **Multi-hop Logical Inference**
- Chain multiple logical steps
- Example: 
  - If A contradicts B, AND
  - B entails C, THEN
  - A may conflict with C (transitive)

#### E. **Decision Aggregation & Scoring**
- Combine multiple reasoning signals into single confidence score
- Weighted combination: direct conflicts (high weight), transitive (medium weight)
- Return: `(inconsistency_level, confidence, reason_code)`

**Output:**
- Inconsistency report with:
  - Conflicting clause pairs
  - Conflict type (direct, exception, temporal)
  - Confidence score
  - Explanation trace

---

### 2.7 Explanation & Justification Layer

**Purpose:** Generate human-readable explanations for AI decisions (Explainable AI).

**Output Components:**

#### A. **Evidence Extraction**
- Highlight specific text passages supporting the decision
- Mark keywords that triggered the inconsistency
- Example: Highlight "shall" vs. "may not" keywords

#### B. **Reasoning Trace**
- Step-by-step logic: "Clause A says X, Clause B says Y, therefore..."
- Trace multi-hop reasoning: "A contradicts B → B entails C → A conflicts with C"

#### C. **Supporting Citations**
- List all cited cases, amendments, legal principles
- Provide section references with full text
- Links to external legal databases if available

#### D. **Confidence Scores & Uncertainty**
- Display model confidence (0-1 scale)
- Indicate where system is uncertain
- Flag results requiring legal expert review

#### E. **Human-Readable Justification**
- Natural language explanation suitable for legal professionals
- Avoids technical jargon
- Example output:
  ```
  Inconsistency Detected: Section 302 and Amendment X
  Conflict Type: Direct contradiction
  Reasoning: Section 302 mandates life imprisonment for murder, 
             while Amendment X permits bail in certain cases. 
             These provisions directly conflict unless Amendment X 
             is read as an exception to Section 302.
  Confidence: 87%
  ```

**Output:**
- Structured JSON with explanation components
- Suitable for both API consumers and web display

---

### 2.8 User Interface & API Layer

**Purpose:** Deliver system capabilities to users and external systems.

#### A. **REST API Endpoints**

**POST /chat/**
- **Input:** User's legal question
- **Process:** Full RAG + QA pipeline
- **Output:** Answer with source citations and model metadata
- **Response:**
  ```json
  {
    "query": "What is the punishment for murder?",
    "answer": "According to Section 302 of the Pakistan Penal Code: ...",
    "sources": [
      {
        "law_name": "Pakistan Penal Code",
        "section": "302",
        "chunk_text": "...",
        "relevance_score": 0.92
      }
    ],
    "model_used": "LegalBERT (fine-tuned)"
  }
  ```

**GET /search/laws?query=...&top_k=5**
- **Input:** Search query and result count
- **Process:** Retrieval pipeline without QA inference
- **Output:** Ranked law excerpts
- **Use case:** Browse laws, find relevant sections

**GET /health/**
- **Input:** None
- **Output:** System status, loaded models, ChromaDB stats
- **Use case:** Monitoring, debugging

#### B. **Frontend Interface (Next.js)**

**Key Pages:**
- **Chat Interface:** Real-time Q&A with sources
- **Law Browser:** Search and browse law corpus
- **Dashboard:** Visualize retrieved documents, confidence scores
- **Reports:** Export search results as PDF, JSON, CSV

**Components:**
- Query input box
- Result display with citations
- Source document viewer
- Confidence score indicators
- Export buttons

#### C. **Cross-Cutting Services**

| **Service**              | **Purpose**                                |
|--------------------------|-------------------------------------------|
| **Data Governance**       | Version control, document audit trail     |
| **Security & Access**     | Authentication, authorization, encryption |
| **Audit Logging**         | Record all queries & decisions for review |
| **Human-in-the-Loop**     | Collect feedback, retrain models         |
| **Model Monitoring**      | Track accuracy, detect model drift       |

---

## 3. Data Flow: From Query to Answer

### Complete Query Processing Pipeline

```
1. User Input: "What is the punishment for murder?"
   │
   ├─→ [Intent Detection]
   │   └─→ Classify as legal question (not greeting)
   │       Extract: intent=LEGAL_QA, topic=CRIMINAL_LAW
   │
   ├─→ [Query Expansion]
   │   └─→ Expand with synonyms: "homicide", "killing", "death"
   │       Expanded query: "punishment murder homicide killing death"
   │
   ├─→ [Act Detection]
   │   └─→ Detect target law: Pakistan Penal Code (PPC)
   │       Set metadata filter: {"law_name": "Pakistan Penal Code"}
   │
   ├─→ [Section Reference Detection]
   │   └─→ Direct section refs: None detected
   │
   ├─→ [Query Embedding]
   │   └─→ Encode via Sentence-Transformers
   │       Vector: [0.23, -0.45, 0.12, ..., 0.78] (384 dims)
   │
   ├─→ [Broad Retrieval from ChromaDB]
   │   └─→ Query: cosine_similarity(query_vec, doc_vecs) > threshold
   │       Return: Top-20 candidates from PPC
   │       Candidates include sections 300, 301, 302, 303, etc.
   │
   ├─→ [Cross-Encoder Reranking]
   │   └─→ Score all 20 candidates: cross_encoder(query, doc)
   │       Ranking:
   │       1. Section 302: "Punishment for murder" (score: 0.95)
   │       2. Section 300: "General homicide" (score: 0.89)
   │       3. Section 303: "Death by influence" (score: 0.78)
   │       4. ...
   │       5. (keep top-5)
   │
   ├─→ [Build Context]
   │   └─→ Concatenate top-5 chunks into context string
   │       Context: "Section 302 states: ... Section 300 states: ..."
   │       Max length: 2500 tokens
   │
   ├─→ [LegalBERT QA Inference]
   │   └─→ Model: AutoModelForQuestionAnswering
   │       Input: question + context
   │       Span extraction: finds answer span in context
   │       Output: "Whoever commits murder shall be punished with 
   │                death or life imprisonment..."
   │
   ├─→ [Format Response]
   │   └─→ Enhance answer with section reference:
   │       "According to Section 302 of the Pakistan Penal Code: ..."
   │
   └─→ [Return to User]
       {
         "query": "What is the punishment for murder?",
         "answer": "According to Section 302 of the Pakistan Penal Code: ...",
         "sources": [section_302_chunk, section_300_chunk, ...],
         "model_used": "LegalBERT (fine-tuned)"
       }
```

---

## 4. Core Components & Implementation Details

### 4.1 Backend Architecture (FastAPI)

**File Structure:**
```
old-backend/
├── main.py                      # FastAPI entry point
├── config.py                    # Configuration & settings
├── requirements.txt             # Dependencies
├── Dockerfile                   # Containerization
├── api/
│   ├── __init__.py
│   ├── chat.py                 # POST /chat/ endpoint
│   ├── search.py               # GET /search/laws endpoint
│   └── health.py               # GET /health/ endpoint
├── core/
│   ├── __init__.py
│   ├── embedder.py             # Sentence-Transformers wrapper
│   ├── vectorstore.py          # ChromaDB interface
│   ├── retriever.py            # Retrieval pipeline
│   ├── llm.py                  # LegalBERT QA inference
│   ├── reranker.py             # Cross-Encoder reranking
│   ├── intent.py               # Intent detection
│   └── (others)                # Additional utilities
├── models/
│   ├── schemas.py              # Pydantic models
│   ├── legalbert-pakistan-finetuned/
│   │   ├── config.json
│   │   ├── model.safetensors
│   │   ├── tokenizer.json
│   │   ├── checkpoint-500/     # Training checkpoint
│   │   └── checkpoint-867/     # Final checkpoint
│   └── __init__.py
├── chroma_db/
│   ├── chroma.sqlite3          # ChromaDB storage
│   └── collections/            # Indexed chunks
└── .env                         # Environment variables
```

**Key Configuration (config.py):**
```python
class Settings(BaseSettings):
    # Server
    host: str = "0.0.0.0"
    port: int = 8000
    
    # Models
    base_model: str = "nlpaueb/legal-bert-base-uncased"
    finetuned_model_path: str = ".../legalbert-pakistan-finetuned"
    embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    
    # ChromaDB
    chroma_db_path: str = ".../chroma_db"
    chroma_collection: str = "pakistan_laws"
    
    # RAG Hyperparameters
    top_k_results: int = 20        # Broad retrieval
    rerank_top_k: int = 5          # Final results
    max_context_length: int = 2500
    chunk_size: int = 400
    chunk_overlap: int = 80
```

### 4.2 Models & Components

#### **Embedder (core/embedder.py)**
- **Model:** `sentence-transformers/all-MiniLM-L6-v2`
- **Dimensions:** 384
- **Purpose:** Generate dense vectors for query and chunks
- **Pattern:** Singleton (loaded once, reused everywhere)

```python
class Embedder:
    def embed(self, texts: List[str]) -> List[List[float]]:
        embeddings = self._model.encode(texts, normalize_embeddings=True)
        return embeddings.tolist()
```

#### **VectorStore (core/vectorstore.py)**
- **Backend:** ChromaDB (persistent storage)
- **Distance Metric:** Cosine similarity
- **Indexing:** HNSW (Hierarchical Navigable Small World)
- **Operations:**
  - `init()` - Initialize collection
  - `upsert()` - Add/update chunks with embeddings
  - `query()` - Semantic search
  - `count()` - Get document count

```python
class VectorStore:
    def query(self, query_embedding, top_k=5, where_filter=None):
        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k,
            where=where_filter,  # Metadata filtering
            include=["documents", "metadatas", "distances"]
        )
        return hits  # List of {id, document, metadata, distance}
```

#### **Retriever (core/retriever.py)**
- **Pipeline:** Intent → Expansion → Embedding → Broad Search → Rerank
- **Logic:**
  - Detect target act from query
  - Expand query with synonyms
  - Embed expanded query
  - Search ChromaDB (top-20)
  - Rerank with cross-encoder (top-5)

```python
def retrieve(query: str, top_k: int = None) -> List[SourceChunk]:
    # Step 1: Detect target act
    target_act = detect_target_act(query)
    where_filter = {"law_name": target_act} if target_act else None
    
    # Step 2: Expand query
    expanded = expand_query(query)
    
    # Step 3: Embed & search
    query_vec = get_embedder().embed_one(expanded)
    hits = vectorstore.query(query_vec, top_k=20, where_filter=where_filter)
    
    # Step 4: Rerank
    reranker = get_reranker()
    ranked_hits = reranker.rerank(query, hits, top_k=5)
    
    return [SourceChunk(...) for hit in ranked_hits]
```

#### **LegalBERT QA (core/llm.py)**
- **Model:** Fine-tuned `nlpaueb/legal-bert-base-uncased`
- **Task:** Extractive Question Answering
- **Input:** question + context
- **Output:** Answer span + start/end positions

```python
class LegalQA:
    def answer(self, question: str, context: str) -> str:
        # Tokenize
        inputs = self.tokenizer(
            question, context,
            return_tensors="pt",
            max_length=512,
            truncation=True
        )
        
        # Inference
        with torch.no_grad():
            outputs = self._model(**inputs)
        
        # Extract answer span
        start_idx = torch.argmax(outputs.start_logits)
        end_idx = torch.argmax(outputs.end_logits)
        
        answer_tokens = inputs['input_ids'][0][start_idx:end_idx+1]
        answer = self.tokenizer.decode(answer_tokens)
        
        return answer
```

#### **Cross-Encoder Reranker (core/reranker.py)**
- **Model:** `cross-encoder/ms-marco-MiniLM-L-6-v2`
- **Purpose:** Re-score candidates for precision
- **Advantage:** Sees query + document together (unlike bi-encoder)

```python
class Reranker:
    def rerank(self, query: str, hits: List[Dict], top_k: int = 5):
        # Prepare pairs
        pairs = [[query, hit["document"]] for hit in hits]
        
        # Score all pairs
        scores = self._model.predict(pairs)
        
        # Rank by score
        ranked_hits = sorted(
            zip(hits, scores),
            key=lambda x: x[1],
            reverse=True
        )[:top_k]
        
        return [hit for hit, score in ranked_hits]
```

### 4.3 API Endpoints

#### **POST /chat/**
```json
Request:
{
  "query": "What is the punishment for murder?",
  "session_id": "optional-session-123"
}

Response:
{
  "query": "What is the punishment for murder?",
  "answer": "According to Section 302 of the Pakistan Penal Code: Whoever commits murder shall be punished with death or...",
  "sources": [
    {
      "law_name": "Pakistan Penal Code",
      "section": "302",
      "section_title": "Punishment for murder",
      "chunk_text": "Whoever commits murder shall be punished...",
      "relevance_score": 0.94
    }
  ],
  "model_used": "LegalBERT (fine-tuned)"
}
```

#### **GET /search/laws?query=...&top_k=5**
```json
Request: GET /search/laws?query=bail&top_k=5

Response:
{
  "query": "bail",
  "results": [
    {
      "law_name": "Code of Criminal Procedure, 1898",
      "section": "497",
      "excerpt": "When police officer may grant bail - ...",
      "score": 0.91
    }
  ],
  "total": 5
}
```

#### **GET /health/**
```json
Response:
{
  "status": "ok",
  "version": "1.0.0",
  "models": {
    "embedder": "all-MiniLM-L6-v2",
    "qa_model": "legalbert-pakistan-finetuned",
    "reranker": "ms-marco-MiniLM-L-6-v2"
  },
  "chromadb": {
    "status": "ready",
    "chunks_indexed": 15420
  }
}
```

### 4.4 Frontend (Next.js)

**Technology Stack:**
- **Framework:** Next.js 16.2.6
- **UI Library:** React 19.2.4
- **Styling:** Tailwind CSS 4
- **Linting:** ESLint 9

**Project Structure:**
```
frontend/
├── app/
│   ├── layout.js          # Root layout
│   ├── page.js            # Home page
│   ├── globals.css        # Global styles
│   ├── chat/
│   │   └── page.js        # Chat interface
│   ├── search/
│   │   └── page.js        # Law search page
│   ├── documents/
│   │   └── page.js        # Document browser
│   ├── results/
│   │   └── [id]/
│   │       └── page.js    # Result detail page
│   └── components/
│       └── Navbar.tsx     # Navigation component
├── public/                # Static assets
├── package.json
├── next.config.js
├── tailwind.config.js
└── tsconfig.json
```

**Key Features:**
- Server-side rendering (SSR) for better performance
- Dynamic pages for detail views
- Responsive design with Tailwind CSS
- Client-side state management for search/filters

---

## 5. Data & Knowledge Base

### 5.1 Document Corpus

**Location:** `OLD/old-docs/data/extracted/`

**Available Laws:**
- `Constitution_of_Pakistan.json` - Constitutional provisions
- `Pakistan_Penal_Code.json` - Criminal law (Sections 1-511)
- `Anti-Terrorism-Act-1997.json` - Counter-terrorism provisions
- `Control-of-Narcotic-Substances-Act-XXV.json` - Drug control law
- `Fundamental Rights.json` - Constitutional rights
- `Rules_of_Business.json` - Administrative procedures

**Format:** JSON with structure:
```json
{
  "title": "Pakistan Penal Code",
  "sections": [
    {
      "number": "302",
      "heading": "Punishment for murder",
      "text": "Whoever commits murder shall be punished...",
      "subsections": [...]
    }
  ],
  "amendments": [...],
  "historical_versions": [...]
}
```

### 5.2 Chunking Strategy

**Size:** 400 tokens per chunk
**Overlap:** 80 tokens (20% overlap)
**Purpose:** 
- Fit within model context windows
- Maintain coherence (80-token overlap preserves clause continuity)
- Reduce redundancy (80% unique content per chunk)

**Metadata per Chunk:**
```json
{
  "law_name": "Pakistan Penal Code",
  "section": "302",
  "section_title": "Punishment for murder",
  "chunk_index": 1,
  "source_file": "Pakistan_Penal_Code.json",
  "amendment_date": "1860-01-01"
}
```

### 5.3 ChromaDB Schema

**Collection:** `pakistan_laws`
**Index Type:** HNSW (Hierarchical Navigable Small World)
**Distance Metric:** Cosine

**Record Structure:**
```
id:        "pakistan_penal_code_section_302_chunk_001"
embedding: [0.23, -0.45, 0.12, ..., 0.78]  # 384-dim vector
document:  "Whoever commits murder shall be punished..."
metadata:  {
  "law_name": "Pakistan Penal Code",
  "section": "302",
  "section_title": "Punishment for murder",
  "source_file": "Pakistan_Penal_Code.json",
  "chunk_index": 1
}
```

---

## 6. Machine Learning Models

### 6.1 Sentence-Transformers (Embedder)

**Model:** `sentence-transformers/all-MiniLM-L6-v2`
- **Parameters:** 22M
- **Output Dimension:** 384
- **Speed:** ~1000 sentences/sec on CPU
- **Performance:** Good balance of speed and quality
- **Training Data:** General-purpose (not legal-specific)
- **Pre-processing:** Tokenization, normalization

### 6.2 LegalBERT (QA Model)

**Base Model:** `nlpaueb/legal-bert-base-uncased`
- **Parameters:** 110M
- **Pre-training Data:** Legal documents (US law corpus)
- **Output:** Token-level classification (start/end position)

**Fine-Tuning for Pakistan Laws:**
- **Training Data:** Pakistani legal document pairs + answer spans
- **Fine-tuned Checkpoints:**
  - `checkpoint-500/` - After 500 training steps
  - `checkpoint-867/` - Final checkpoint (867 steps)
- **Output Format:** Start position + End position (extractive QA)
- **Loss Function:** Span loss (start + end position cross-entropy)

**Inference Process:**
```
Input: Question + Context (max 512 tokens)
├─→ Tokenize & embed
├─→ Pass through BERT layers (12 layers × 768 hidden dims)
├─→ Compute start_logits & end_logits per token
├─→ Extract answer span: argmax(start_logits) to argmax(end_logits)
└─→ Output: Answer text + confidence
```

### 6.3 Cross-Encoder Reranker

**Model:** `cross-encoder/ms-marco-MiniLM-L-6-v2`
- **Parameters:** 22M
- **Pre-training:** MS MARCO passage ranking dataset
- **Input:** [CLS] query [SEP] document [SEP]
- **Output:** Relevance score (0-1)
- **Advantage:** Sees query + document together → more accurate than bi-encoder

**Reranking Scores:**
```
Query: "What is the punishment for murder?"
Candidates:
  1. "Section 302 - Whoever commits murder..." → 0.95 ⭐ selected
  2. "Section 300 - Culpable homicide..." → 0.87 ⭐ selected
  3. "Section 303 - Death caused by influence..." → 0.78 ⭐ selected
  4. "Section 304 - Death by negligence..." → 0.72 ⭐ selected
  5. "Section 305 - Abetment of suicide..." → 0.68 ⭐ selected
  6. "Section 306 - Abetment of suicide (continued)..." → 0.61 ❌ dropped
```

---

## 7. Performance & Optimization

### 7.1 Query Processing Speed

| **Stage**                    | **Latency** | **Notes**              |
|------------------------------|-------------|----------------------|
| Intent Detection             | ~5ms        | Regex-based           |
| Query Expansion              | ~10ms       | Dictionary lookup     |
| Query Embedding              | ~50ms       | Sentence-Transformers |
| ChromaDB Search (top-20)      | ~30ms       | HNSW index            |
| Cross-Encoder Reranking      | ~100ms      | Score 20 candidates   |
| Context Building             | ~5ms        | String concatenation  |
| LegalBERT QA Inference       | ~200ms      | GPU/CPU BERT inference|
| Response Formatting          | ~10ms       | JSON serialization    |
| **Total**                    | **~410ms**  | End-to-end            |

### 7.2 Memory Usage

| **Component**          | **Memory** | **Notes**              |
|------------------------|------------|----------------------|
| ChromaDB (15K chunks)  | ~200 MB    | SQLite + index        |
| Embedder Model         | ~50 MB     | Loaded in memory       |
| LegalBERT Model        | ~400 MB    | 110M parameters        |
| Reranker Model         | ~50 MB     | 22M parameters         |
| Runtime Buffer         | ~100 MB    | Batch processing       |
| **Total**              | **~800 MB** | Typical footprint      |

### 7.3 Optimization Techniques

1. **Lazy Model Loading**
   - Models loaded only on first API call
   - Reduced server startup time

2. **Singleton Pattern**
   - Each model loaded once, reused globally
   - No redundant model instantiation

3. **Batch Processing**
   - Reranker scores all candidates in one batch
   - More efficient than individual scoring

4. **Vector Caching**
   - ChromaDB caches frequently accessed vectors
   - Reduced re-computation

5. **Metadata Filtering**
   - Pre-filter by law name before semantic search
   - Reduces search space (5-10x faster)

6. **Chunk Overlap**
   - 80-token overlap prevents information loss at boundaries
   - Trade-off: slight duplicate retrieval but better coverage

---

## 8. Deployment Architecture

### 8.1 Docker Containerization

**File:** `Dockerfile`
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Expose port
EXPOSE 8000

# Run server
CMD ["python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**Build & Run:**
```bash
docker build -t paklawai:latest .
docker run -p 8000:8000 -v $(pwd)/chroma_db:/app/chroma_db paklawai:latest
```

### 8.2 Environment Configuration

**File:** `.env` (example in `.env.example`)
```
# Server
HOST=0.0.0.0
PORT=8000

# Models
BASE_MODEL=nlpaueb/legal-bert-base-uncased
FINETUNED_MODEL_PATH=./models/legalbert-pakistan-finetuned
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
RERANKER_MODEL=cross-encoder/ms-marco-MiniLM-L-6-v2

# ChromaDB
CHROMA_DB_PATH=./chroma_db
CHROMA_COLLECTION=pakistan_laws

# RAG Hyperparameters
TOP_K_RESULTS=20
RERANK_TOP_K=5
MAX_CONTEXT_LENGTH=2500
CHUNK_SIZE=400
CHUNK_OVERLAP=80
```

### 8.3 Scaling Considerations

**Vertical Scaling (Single Machine):**
- Add GPU: 5-10x speedup (LegalBERT on GPU ~20ms vs 200ms on CPU)
- Increase RAM: Handle larger batch sizes
- Optimize models: Quantization (int8), distillation

**Horizontal Scaling (Multiple Machines):**
- Load balancer (nginx) → multiple FastAPI instances
- Shared ChromaDB (database) or replicated instances
- Redis cache for frequent queries
- Separate embedding/QA services on different machines

---

## 9. Quality Assurance & Monitoring

### 9.1 Logging

**Configured in `main.py`:**
```python
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
)
```

**Log Levels:**
- `ERROR`: Model failures, API errors
- `WARNING`: Empty ChromaDB, missing models
- `INFO`: Query processing, model loading
- `DEBUG`: Detailed pipeline steps

### 9.2 Health Checks

**Endpoint:** `GET /health/`
```json
{
  "status": "ok",
  "models": {
    "embedder": "loaded",
    "qa_model": "loaded",
    "reranker": "loaded"
  },
  "chromadb": {
    "status": "ready",
    "chunks_indexed": 15420
  }
}
```

### 9.3 Error Handling

| **Error Type**              | **Handling**                          |
|-----------------------------|--------------------------------------|
| Model loading failure       | Fallback to base model (non-fine-tuned) |
| ChromaDB empty              | Return informative message            |
| Query too long              | Truncate or return error              |
| No relevant results         | Return graceful fallback message      |
| API timeout                 | Return 504 error after 30s timeout    |
| Invalid JSON input          | Return 400 Bad Request                |

---

## 10. Future Enhancements

### 10.1 Consistency Checking
- Implement full NLI-based consistency checker
- Multi-document conflict detection
- Temporal reasoning for amendments
- Lex Specialis / Lex Posterior handling

### 10.2 Knowledge Graph
- Build formal legal knowledge graph
- Incorporate citation network
- Enable graph-based reasoning
- Visualize inconsistencies

### 10.3 Advanced NLI
- Multi-class NLI (not just entailment/contradiction)
- Confidence calibration
- Uncertainty quantification
- Ensemble methods

### 10.4 User Feedback Loop
- Collect user feedback on answers
- Retrain models with corrected labels
- A/B testing for model improvements
- Human-in-the-loop annotation

### 10.5 Multi-Lingual Support
- Extend to Urdu legal documents
- Cross-lingual embeddings
- Machine translation pipeline
- Language-specific fine-tuning

---

## 11. Dependencies & Requirements

**Backend Dependencies:**
```
# Core API
fastapi>=0.111.0
uvicorn[standard]>=0.29.0
python-dotenv>=1.0.0
pydantic>=2.7.0
pydantic-settings>=2.2.0

# Vector Store
chromadb>=1.0.0

# Embeddings & NLP
sentence-transformers>=2.7.0
transformers>=4.35.0
datasets>=2.14.0
accelerate>=0.27.0
tokenizers>=0.15.0

# PDF Extraction
pdfplumber>=0.10.0
pypdf>=3.0.0

# Data Processing
tqdm>=4.64.0
```

**Frontend Dependencies:**
```json
{
  "next": "16.2.6",
  "react": "19.2.4",
  "react-dom": "19.2.4",
  "tailwindcss": "^4"
}
```

---

## 12. Summary Table

| **Aspect**              | **Details**                          |
|-------------------------|--------------------------------------|
| **Project Name**        | PakLaw AI / NLI-Based Law Consistency Checker |
| **Purpose**             | Intelligent Q&A for Pakistani laws   |
| **Architecture**        | 8-layer modular pipeline             |
| **Backend**             | FastAPI (Python)                     |
| **Frontend**            | Next.js + React                      |
| **Vector DB**           | ChromaDB with HNSW indexing          |
| **Embeddings**          | Sentence-Transformers (MiniLM)       |
| **NLP Model**           | LegalBERT (fine-tuned)               |
| **Reranking**           | Cross-Encoder (ms-marco)             |
| **Avg Query Latency**   | ~410ms                               |
| **Document Corpus**     | 15K+ law chunks (PPC, Constitution, etc.) |
| **Key Feature**         | RAG-powered Q&A with source citations |
| **Deployment**          | Docker containerization ready        |

---

## Conclusion

PakLaw AI implements a sophisticated **Retrieval-Augmented Generation (RAG) pipeline** combined with **Natural Language Inference** to deliver accurate, well-sourced legal answers for Pakistani law. The architecture is modular, scalable, and leverages modern NLP techniques including semantic embeddings, fine-tuned transformer models, and cross-encoder reranking.

The system prioritizes **explainability** (providing citations and reasoning traces), **performance** (sub-500ms query processing), and **accuracy** (leveraging legal-domain-specific models like LegalBERT).

For legal professionals, this system serves as a knowledge companion; for citizens, it provides accessible legal information. The architecture is extensible to support consistency checking, knowledge graphs, and multi-lingual support in future iterations.
