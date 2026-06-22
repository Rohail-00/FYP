from __future__ import annotations

import base64
import binascii
import json
import math
import os
import re
import shutil
import subprocess
import tempfile
import urllib.request
import zipfile
from io import BytesIO
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any
from xml.etree import ElementTree

import joblib
import numpy as np
from pypdf import PdfReader
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from part2_pipeline import build_part2_trace

try:
    import dateparser
except ImportError:  # The backend still runs without optional Part 2 date parsing.
    dateparser = None


ROOT = Path(__file__).resolve().parents[1]
PDF_DIR = ROOT / "PDF-Files"
DATA_DIR = ROOT / "backend" / "data"
INDEX_PATH = DATA_DIR / "law_index.joblib"
BUILD_REPORT_PATH = DATA_DIR / "law_index_build_report.json"
LOCAL_REPOSITORY_DIR = Path(
    os.environ.get(
        "PAKLAW_REPOSITORY_DIR",
        str(ROOT / "frontend" / "local-data" / "repositories"),
    )
).resolve()

MAX_CHARS_PER_CHUNK = 1600
MIN_CHARS_PER_CHUNK = 250
MAX_INLINE_FILE_BYTES = 10 * 1024 * 1024
MAX_MULTI_FILE_CHUNKS_PER_FILE = 300
MAX_OCR_PAGES = 50
MIN_EMBEDDED_TEXT_CHARS = 20


@dataclass
class LawChunk:
    id: str
    title: str
    file: str
    page_start: int
    page_end: int
    text: str


def clean_text(text: str) -> str:
    text = text.replace("\ufeff", "")
    text = text.replace("\x00", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def split_into_chunks(text: str) -> list[str]:
    text = clean_text(text)
    if not text:
        return []

    paragraphs = [p.strip() for p in re.split(r"\n\s*\n", text) if p.strip()]
    chunks: list[str] = []
    current = ""

    for para in paragraphs:
        if len(para) > MAX_CHARS_PER_CHUNK:
            sentences = re.split(r"(?<=[.;:])\s+", para)
            for sentence in sentences:
                if len(current) + len(sentence) + 1 > MAX_CHARS_PER_CHUNK:
                    if len(current) >= MIN_CHARS_PER_CHUNK:
                        chunks.append(current.strip())
                    current = sentence
                else:
                    current = f"{current} {sentence}".strip()
            continue

        if len(current) + len(para) + 2 > MAX_CHARS_PER_CHUNK:
            if len(current) >= MIN_CHARS_PER_CHUNK:
                chunks.append(current.strip())
            current = para
        else:
            current = f"{current}\n\n{para}".strip()

    if len(current) >= MIN_CHARS_PER_CHUNK:
        chunks.append(current.strip())

    return chunks


def chunks_with_short_text_fallback(text: str) -> list[str]:
    chunks = split_into_chunks(text)
    cleaned = clean_text(text)
    if not chunks and cleaned:
        chunks = [cleaned]
    return chunks


def extract_pdf_chunks(pdf_path: Path) -> tuple[list[LawChunk], str | None]:
    chunks: list[LawChunk] = []
    try:
        reader = PdfReader(str(pdf_path))
        for page_index, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            for chunk_index, chunk in enumerate(chunks_with_short_text_fallback(text)):
                chunks.append(
                    LawChunk(
                        id=f"{pdf_path.stem}:{page_index + 1}:{chunk_index + 1}",
                        title=pdf_path.stem,
                        file=str(pdf_path.relative_to(ROOT)),
                        page_start=page_index + 1,
                        page_end=page_index + 1,
                        text=chunk,
                    )
                )
        return chunks, None
    except Exception as exc:  # pypdf can fail on malformed legacy PDFs
        return [], str(exc)


def extract_pdf_bytes_chunks(
    data: bytes,
    title: str,
    file_label: str,
) -> tuple[list[LawChunk], str | None]:
    chunks: list[LawChunk] = []
    try:
        reader = PdfReader(BytesIO(data))
        for page_index, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            for chunk_index, chunk in enumerate(chunks_with_short_text_fallback(text)):
                chunks.append(
                    LawChunk(
                        id=f"{title}:{page_index + 1}:{chunk_index + 1}",
                        title=title,
                        file=file_label,
                        page_start=page_index + 1,
                        page_end=page_index + 1,
                        text=chunk,
                    )
                )
        return chunks, None
    except Exception as exc:
        return [], str(exc)


def extract_docx_text(data: bytes) -> str:
    with zipfile.ZipFile(BytesIO(data)) as archive:
        xml = archive.read("word/document.xml")
    root = ElementTree.fromstring(xml)
    namespace = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    paragraphs: list[str] = []
    for paragraph in root.findall(".//w:p", namespace):
        parts = [
            node.text or ""
            for node in paragraph.findall(".//w:t", namespace)
        ]
        text = "".join(parts).strip()
        if text:
            paragraphs.append(text)
    return "\n\n".join(paragraphs)


def extract_document_bytes_chunks(
    data: bytes,
    name: str,
    file_type: str,
    file_label: str,
) -> tuple[list[LawChunk], str | None]:
    lower_name = name.lower()
    if "pdf" in file_type or lower_name.endswith(".pdf"):
        return extract_pdf_bytes_chunks(data, Path(name).stem, file_label)

    try:
        if lower_name.endswith(".docx") or "wordprocessingml" in file_type:
            text = extract_docx_text(data)
        elif lower_name.endswith(".txt") or file_type.startswith("text/"):
            text = data.decode("utf-8", errors="replace")
        else:
            return [], "Unsupported file type. Use PDF, DOCX, or TXT."
    except Exception as exc:
        return [], f"Could not extract text: {exc}"

    chunks = [
        LawChunk(
            id=f"{Path(name).stem}:1:{idx + 1}",
            title=Path(name).stem,
            file=file_label,
            page_start=1,
            page_end=1,
            text=chunk,
        )
        for idx, chunk in enumerate(chunks_with_short_text_fallback(text))
    ]
    if not chunks:
        return [], "No searchable text was found in the document."
    return chunks, None


def extract_uploaded_file_chunks(file_info: dict[str, Any]) -> tuple[list[LawChunk], str | None]:
    name = str(file_info.get("name") or "Repository document")
    download_url = str(file_info.get("downloadUrl") or "")
    storage_path = str(file_info.get("storagePath") or "")
    file_type = str(file_info.get("type") or "")
    file_label = str(file_info.get("file") or name)

    if storage_path:
        try:
            local_file = (LOCAL_REPOSITORY_DIR / Path(storage_path)).resolve()
            local_file.relative_to(LOCAL_REPOSITORY_DIR)
            data = local_file.read_bytes()
        except (OSError, ValueError) as exc:
            return [], f"Could not read local repository file: {exc}"
    elif download_url:
        try:
            request = urllib.request.Request(
                download_url,
                headers={"User-Agent": "PakLawAI repository search"},
            )
            with urllib.request.urlopen(request, timeout=45) as response:
                data = response.read()
        except Exception as exc:
            return [], f"Could not download file: {exc}"
    else:
        return [], "Missing storagePath or downloadUrl"

    return extract_document_bytes_chunks(data, name, file_type, file_label)


def extract_inline_file_chunks(
    file_info: dict[str, Any],
) -> tuple[list[LawChunk], str | None]:
    name = str(file_info.get("name") or "Uploaded document")
    file_type = str(file_info.get("type") or "")
    encoded = str(file_info.get("contentBase64") or "")
    if not encoded:
        return [], "Missing file content."

    if "," in encoded and encoded.lstrip().lower().startswith("data:"):
        encoded = encoded.split(",", 1)[1]

    try:
        data = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        return [], "The uploaded file content is not valid base64 data."

    if not data:
        return [], "The uploaded file is empty."
    if len(data) > MAX_INLINE_FILE_BYTES:
        return [], "The uploaded file exceeds the 10 MB limit."

    return extract_document_bytes_chunks(data, name, file_type, name)


def local_ocr_commands() -> tuple[str | None, str | None]:
    tesseract = os.environ.get("TESSERACT_CMD") or shutil.which("tesseract")
    pdftoppm = os.environ.get("PDFTOPPM_CMD") or shutil.which("pdftoppm")
    return tesseract, pdftoppm


def ocr_pdf_pages(
    data: bytes,
    page_numbers: list[int],
) -> tuple[dict[int, str], list[str]]:
    tesseract, pdftoppm = local_ocr_commands()
    if not tesseract or not pdftoppm:
        return {}, [
            "Local OCR is unavailable. Install Tesseract OCR and Poppler, or set "
            "TESSERACT_CMD and PDFTOPPM_CMD."
        ]

    language = os.environ.get("PAKLAW_OCR_LANGUAGE", "eng")
    selected_pages = page_numbers[:MAX_OCR_PAGES]
    warnings: list[str] = []
    if len(page_numbers) > MAX_OCR_PAGES:
        warnings.append(
            f"OCR was limited to the first {MAX_OCR_PAGES} image-only pages."
        )

    extracted: dict[int, str] = {}
    with tempfile.TemporaryDirectory(prefix="paklaw-ocr-") as temp_dir:
        temp = Path(temp_dir)
        pdf_path = temp / "input.pdf"
        pdf_path.write_bytes(data)

        for page_number in selected_pages:
            output_prefix = temp / f"page-{page_number}"
            try:
                subprocess.run(
                    [
                        pdftoppm,
                        "-f",
                        str(page_number),
                        "-l",
                        str(page_number),
                        "-r",
                        "200",
                        "-singlefile",
                        "-png",
                        str(pdf_path),
                        str(output_prefix),
                    ],
                    check=True,
                    capture_output=True,
                    timeout=120,
                )
                image_path = output_prefix.with_suffix(".png")
                completed = subprocess.run(
                    [
                        tesseract,
                        str(image_path),
                        "stdout",
                        "-l",
                        language,
                        "--psm",
                        "6",
                    ],
                    check=True,
                    capture_output=True,
                    timeout=120,
                )
                text = completed.stdout.decode("utf-8", errors="replace").strip()
                if text:
                    extracted[page_number] = text
            except (OSError, subprocess.SubprocessError) as exc:
                warnings.append(f"OCR failed on page {page_number}: {exc}")

    return extracted, warnings


def extract_pdf_input_chunks(
    data: bytes,
    name: str,
) -> tuple[list[LawChunk], str | None, dict[str, Any]]:
    chunks: list[LawChunk] = []
    metadata: dict[str, Any] = {
        "pageCount": 0,
        "textPageCount": 0,
        "ocrRequiredPages": [],
        "ocrAppliedPages": [],
        "ocrAvailable": all(local_ocr_commands()),
        "warnings": [],
    }

    try:
        reader = PdfReader(BytesIO(data))
        metadata["pageCount"] = len(reader.pages)
        embedded_text: dict[int, str] = {}
        image_only_pages: list[int] = []

        for page_index, page in enumerate(reader.pages):
            page_number = page_index + 1
            text = clean_text(page.extract_text() or "")
            if len(text) >= MIN_EMBEDDED_TEXT_CHARS:
                embedded_text[page_number] = text
            else:
                image_only_pages.append(page_number)

        metadata["textPageCount"] = len(embedded_text)
        metadata["ocrRequiredPages"] = image_only_pages
        ocr_text: dict[int, str] = {}
        if image_only_pages:
            ocr_text, warnings = ocr_pdf_pages(data, image_only_pages)
            metadata["ocrAppliedPages"] = sorted(ocr_text)
            metadata["warnings"].extend(warnings)

        title = Path(name).stem
        for page_number in range(1, metadata["pageCount"] + 1):
            text = embedded_text.get(page_number) or ocr_text.get(page_number, "")
            for chunk_index, chunk in enumerate(chunks_with_short_text_fallback(text)):
                chunks.append(
                    LawChunk(
                        id=f"{title}:{page_number}:{chunk_index + 1}",
                        title=title,
                        file=name,
                        page_start=page_number,
                        page_end=page_number,
                        text=chunk,
                    )
                )
    except Exception as exc:
        return [], f"Could not extract PDF text: {exc}", metadata

    if not chunks and metadata["ocrRequiredPages"]:
        return (
            [],
            "This PDF appears to contain scanned images rather than searchable text. "
            "Local OCR is required before it can be analyzed.",
            metadata,
        )
    if not chunks:
        return [], "No searchable text was found in the PDF.", metadata

    skipped = set(metadata["ocrRequiredPages"]) - set(metadata["ocrAppliedPages"])
    if skipped:
        metadata["warnings"].append(
            f"{len(skipped)} image-only page(s) could not be included without local OCR."
        )
    return chunks, None, metadata


def extract_inline_input_file(
    file_info: dict[str, Any],
) -> tuple[list[LawChunk], str | None, dict[str, Any]]:
    name = str(file_info.get("name") or "Uploaded document")
    file_type = str(file_info.get("type") or "")
    encoded = str(file_info.get("contentBase64") or "")
    metadata: dict[str, Any] = {
        "pageCount": None,
        "textPageCount": None,
        "ocrRequiredPages": [],
        "ocrAppliedPages": [],
        "ocrAvailable": all(local_ocr_commands()),
        "warnings": [],
    }
    if not encoded:
        return [], "Missing file content.", metadata
    if "," in encoded and encoded.lstrip().lower().startswith("data:"):
        encoded = encoded.split(",", 1)[1]

    try:
        data = base64.b64decode(encoded, validate=True)
    except (binascii.Error, ValueError):
        return [], "The uploaded file content is not valid base64 data.", metadata
    if not data:
        return [], "The uploaded file is empty.", metadata
    if len(data) > MAX_INLINE_FILE_BYTES:
        return [], "The uploaded file exceeds the 10 MB limit.", metadata

    if "pdf" in file_type or name.lower().endswith(".pdf"):
        return extract_pdf_input_chunks(data, name)

    chunks, error = extract_document_bytes_chunks(data, name, file_type, name)
    return chunks, error, metadata


def build_index(limit: int | None = None) -> dict[str, Any]:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    pdfs = sorted(PDF_DIR.glob("*.pdf"))
    if limit is not None:
        pdfs = pdfs[:limit]

    all_chunks: list[LawChunk] = []
    failures: list[dict[str, str]] = []

    for idx, pdf in enumerate(pdfs, start=1):
        chunks, error = extract_pdf_chunks(pdf)
        if error:
            failures.append({"file": str(pdf.relative_to(ROOT)), "error": error})
        all_chunks.extend(chunks)
        if idx % 50 == 0:
            print(f"indexed PDFs: {idx}/{len(pdfs)} chunks={len(all_chunks)}")

    if not all_chunks:
        raise RuntimeError("No searchable text could be extracted from PDF-Files.")

    texts = [f"{c.title}\n{c.text}" for c in all_chunks]
    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(1, 2),
        min_df=2,
        max_df=0.92,
        max_features=160_000,
        sublinear_tf=True,
    )
    matrix = vectorizer.fit_transform(texts)

    payload = {
        "vectorizer": vectorizer,
        "matrix": matrix,
        "chunks": [asdict(c) for c in all_chunks],
    }
    joblib.dump(payload, INDEX_PATH, compress=3)

    report = {
        "pdf_count": len(pdfs),
        "chunk_count": len(all_chunks),
        "failed_pdf_count": len(failures),
        "failures": failures,
        "index_path": str(INDEX_PATH),
    }
    BUILD_REPORT_PATH.write_text(json.dumps(report, indent=2), encoding="utf-8")
    return report


class LegalIndex:
    def __init__(self, index_path: Path = INDEX_PATH) -> None:
        if not index_path.exists():
            raise FileNotFoundError(
                f"Index not found at {index_path}. Run: python backend/build_index.py"
            )
        payload = joblib.load(index_path)
        self.vectorizer: TfidfVectorizer = payload["vectorizer"]
        self.matrix = payload["matrix"]
        self.chunks: list[dict[str, Any]] = payload["chunks"]

    def search(self, query: str, top_k: int = 8) -> list[dict[str, Any]]:
        query = query.strip()
        if not query:
            return []

        q_vec = self.vectorizer.transform([query])
        scores = cosine_similarity(q_vec, self.matrix).ravel()
        if scores.size == 0:
            return []

        top_k = max(1, min(top_k, 30, scores.size))
        best = np.argpartition(scores, -top_k)[-top_k:]
        best = best[np.argsort(scores[best])[::-1]]

        results: list[dict[str, Any]] = []
        for idx in best:
            score = float(scores[idx])
            if score <= 0:
                continue
            chunk = self.chunks[int(idx)]
            results.append(
                {
                    "id": chunk["id"],
                    "title": chunk["title"],
                    "file": chunk["file"],
                    "pageStart": chunk["page_start"],
                    "pageEnd": chunk["page_end"],
                    "text": chunk["text"],
                    "score": round(score, 4),
                }
            )
        return results


def search_chunks(
    chunks: list[LawChunk],
    query: str,
    top_k: int = 8,
) -> list[dict[str, Any]]:
    query = query.strip()
    if not query or not chunks:
        return []

    texts = [f"{chunk.title}\n{chunk.text}" for chunk in chunks]
    vectorizer = TfidfVectorizer(
        lowercase=True,
        stop_words="english",
        ngram_range=(1, 2),
        min_df=1,
        max_df=1.0,
        max_features=40_000,
        sublinear_tf=True,
    )
    try:
        matrix = vectorizer.fit_transform(texts)
    except ValueError:
        return []
    q_vec = vectorizer.transform([query])
    scores = cosine_similarity(q_vec, matrix).ravel()

    top_k = max(1, min(top_k, 30))
    best = np.argpartition(scores, -min(top_k, scores.size))[-min(top_k, scores.size):]
    best = best[np.argsort(scores[best])[::-1]]

    results: list[dict[str, Any]] = []
    for idx in best:
        score = float(scores[idx])
        if score <= 0:
            continue
        chunk = chunks[int(idx)]
        results.append(
            {
                "id": chunk.id,
                "title": chunk.title,
                "file": chunk.file,
                "pageStart": chunk.page_start,
                "pageEnd": chunk.page_end,
                "text": chunk.text,
                "score": round(score, 4),
            }
        )
    return results


def search_uploaded_repository(
    query: str,
    files: list[dict[str, Any]],
    top_k: int = 8,
) -> dict[str, Any]:
    all_chunks, failures = extract_repository_chunks(files)

    return {
        "results": search_chunks(all_chunks, query, top_k=top_k),
        "indexedFileCount": len(files) - len(failures),
        "chunkCount": len(all_chunks),
        "failures": failures,
    }


def extract_repository_chunks(
    files: list[dict[str, Any]],
) -> tuple[list[LawChunk], list[dict[str, str]]]:
    all_chunks: list[LawChunk] = []
    failures: list[dict[str, str]] = []

    for file_info in files:
        chunks, error = extract_uploaded_file_chunks(file_info)
        if error:
            failures.append(
                {
                    "name": str(file_info.get("name") or "Unknown file"),
                    "error": error,
                }
            )
        all_chunks.extend(chunks)

    return all_chunks, failures


def analyze_clause_against_chunks(
    draft: str,
    chunks: list[LawChunk],
    top_k: int = 5,
    scope_label: str = "Repository",
    failures: list[dict[str, str]] | None = None,
) -> dict[str, Any]:
    candidates = search_chunks(chunks, draft, top_k=top_k)
    result = build_analysis_result(
        draft=draft,
        candidates=candidates,
        knowledge_base=scope_label,
        retrieval_source="uploaded_repository",
    )
    result["repositorySearch"] = {
        "indexedFileCount": None,
        "chunkCount": len(chunks),
        "failures": failures or [],
    }
    return result


def analyze_uploaded_repository(
    draft: str,
    files: list[dict[str, Any]],
    top_k: int = 5,
    scope_label: str = "Selected Repository",
) -> dict[str, Any]:
    all_chunks, failures = extract_repository_chunks(files)
    result = analyze_clause_against_chunks(
        draft=draft,
        chunks=all_chunks,
        top_k=top_k,
        scope_label=scope_label,
        failures=failures,
    )
    result["repositorySearch"]["indexedFileCount"] = len(files) - len(failures)
    return result


def build_analysis_result(
    draft: str,
    candidates: list[dict[str, Any]],
    knowledge_base: str,
    retrieval_source: str,
) -> dict[str, Any]:
    comparisons: list[dict[str, Any]] = []

    for candidate in candidates:
        decision = compare_clause(draft, candidate["text"], candidate["score"])
        comparisons.append(
            {
                "candidate": candidate,
                "decision": decision,
            }
        )

    contradiction_count = sum(
        1 for item in comparisons if item["decision"]["resultType"] == "contradiction"
    )
    possible_count = sum(
        1 for item in comparisons if item["decision"]["resultType"] == "possible_conflict"
    )
    best_confidence = max(
        [item["decision"]["confidence"] for item in comparisons],
        default=0.0,
    )

    if contradiction_count:
        summary_type = "contradiction"
    elif possible_count:
        summary_type = "possible_conflict"
    elif comparisons:
        summary_type = "consistent_or_related"
    else:
        summary_type = "uncertain"

    draft_features = extract_features(draft)
    routed = draft_features["routedExperts"]
    if "Semantic Retrieval Expert" not in routed:
        routed.insert(0, "Semantic Retrieval Expert")

    return {
        "summary": {
            "resultType": summary_type,
            "confidence": round(best_confidence, 3),
            "candidateCount": len(comparisons),
            "contradictionCount": contradiction_count,
            "possibleConflictCount": possible_count,
            "routedExperts": routed,
            "evaluationMatrix": "numeric/date/negation exact checks + TF-IDF legal retrieval overlap",
            "knowledgeBase": knowledge_base,
            "retrievalSource": retrieval_source,
        },
        "draft": draft,
        "comparisons": comparisons,
        "part2Pipeline": build_part2_trace(draft_features, comparisons),
        "preservedResults": {
            "contradictions": [
                item for item in comparisons if item["decision"]["resultType"] == "contradiction"
            ],
            "consistentOrRelated": [
                item
                for item in comparisons
                if item["decision"]["resultType"] == "consistent_or_related"
            ],
            "uncertain": [
                item for item in comparisons if item["decision"]["resultType"] == "uncertain"
            ],
        },
    }


NUMBER_RE = re.compile(
    r"\b(?:(?:rs\.?|rupees?|pkr)\s*)?\d+(?:,\d{3})*(?:\.\d+)?\s*(?:%|percent|years?|months?|days?|million|billion|thousand|lakh|crore|rupees?)\b",
    re.I,
)
WORD_NUMBER_RE = re.compile(
    r"\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|hundred)\s+(years?|months?|days?|percent|rupees?)\b",
    re.I,
)
DATE_RE = re.compile(
    r"\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:18|19|20)\d{2}|(?:january|february|march|april|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4})\b",
    re.I,
)
NEGATION_RE = re.compile(r"\b(no|not|never|unless|without|except|prohibit(?:ed|s)?|shall not|must not)\b", re.I)
CONDITION_RE = re.compile(r"\b(if|where|when|provided that|unless|subject to|except|in case|notwithstanding)\b", re.I)
DEONTIC_RE = re.compile(r"\b(shall|must|may|required|prohibited|liable|punished|permission|duty|obligation)\b", re.I)

WORD_NUMBERS = {
    "one": "1",
    "two": "2",
    "three": "3",
    "four": "4",
    "five": "5",
    "six": "6",
    "seven": "7",
    "eight": "8",
    "nine": "9",
    "ten": "10",
    "eleven": "11",
    "twelve": "12",
    "thirteen": "13",
    "fourteen": "14",
    "fifteen": "15",
    "sixteen": "16",
    "seventeen": "17",
    "eighteen": "18",
    "nineteen": "19",
    "twenty": "20",
    "thirty": "30",
    "forty": "40",
    "fifty": "50",
    "hundred": "100",
}


def extract_features(text: str) -> dict[str, Any]:
    numbers = {m.group(0).strip().lower() for m in NUMBER_RE.finditer(text)}
    for match in WORD_NUMBER_RE.finditer(text):
        number_word, unit = match.groups()
        numbers.add(f"{WORD_NUMBERS[number_word.lower()]} {unit.lower()}")
    numbers = sorted(numbers)
    dates = sorted(set(m.group(0).strip() for m in DATE_RE.finditer(text)))
    normalized_dates = []
    if dateparser is not None:
        for value in dates:
            parsed = dateparser.parse(value)
            if parsed is not None:
                normalized_dates.append(parsed.date().isoformat())
    negations = sorted(set(m.group(0).strip().lower() for m in NEGATION_RE.finditer(text)))
    conditions = sorted(set(m.group(0).strip().lower() for m in CONDITION_RE.finditer(text)))
    deontic = sorted(set(m.group(0).strip().lower() for m in DEONTIC_RE.finditer(text)))

    experts = ["Semantic Retrieval Expert"]
    if numbers:
        experts.append("Numeric Expert")
    if dates:
        experts.append("Temporal Expert")
    if negations:
        experts.append("Negation Expert")
    if conditions:
        experts.append("Conditional Logic Expert")
    if deontic:
        experts.append("Deontic Expert")

    return {
        "numbers": numbers[:20],
        "dates": dates[:20],
        "normalizedDates": sorted(set(normalized_dates))[:20],
        "negations": negations,
        "conditions": conditions,
        "deonticTerms": deontic,
        "routedExperts": experts,
    }


def jaccard(a: set[str], b: set[str]) -> float:
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    return len(a & b) / len(a | b)


def token_set(text: str) -> set[str]:
    return {
        t
        for t in re.findall(r"[a-zA-Z][a-zA-Z]{2,}", text.lower())
        if t
        not in {
            "the",
            "and",
            "for",
            "that",
            "with",
            "shall",
            "this",
            "from",
            "are",
            "may",
        }
    }


def compare_clause(draft: str, active: str, retrieval_score: float) -> dict[str, Any]:
    draft_features = extract_features(draft)
    active_features = extract_features(active)

    draft_nums = set(draft_features["numbers"])
    active_nums = set(active_features["numbers"])
    draft_negs = set(draft_features["negations"])
    active_negs = set(active_features["negations"])
    draft_dates = set(draft_features["dates"])
    active_dates = set(active_features["dates"])

    semantic_overlap = jaccard(token_set(draft), token_set(active))
    number_mismatch = bool(draft_nums and active_nums and draft_nums != active_nums)
    negation_mismatch = bool(
        draft_negs != active_negs
        and (draft_negs or active_negs)
        and (bool(draft_negs and active_negs) or semantic_overlap > 0.22)
    )
    date_mismatch = bool(draft_dates and active_dates and draft_dates != active_dates)

    conflict_score = 0.0
    reasons: list[str] = []
    if number_mismatch:
        conflict_score += 0.34
        reasons.append("numeric values differ")
    if negation_mismatch:
        conflict_score += 0.26
        reasons.append("negation or exception scope differs")
    if date_mismatch:
        conflict_score += 0.18
        reasons.append("dates or years differ")
    if semantic_overlap > 0.18:
        conflict_score += min(0.22, semantic_overlap)
        reasons.append("same legal topic or obligation area")
    if retrieval_score > 0.12:
        conflict_score += min(0.18, retrieval_score)

    confidence = max(0.25, min(0.96, conflict_score))
    if number_mismatch or negation_mismatch:
        result_type = "contradiction"
    elif confidence >= 0.58:
        result_type = "possible_conflict"
    elif semantic_overlap >= 0.12:
        result_type = "consistent_or_related"
    else:
        result_type = "uncertain"

    return {
        "resultType": result_type,
        "confidence": round(confidence, 3),
        "semanticOverlap": round(semantic_overlap, 3),
        "reasons": reasons or ["low direct conflict evidence"],
        "expertSignals": {
            "numericMismatch": number_mismatch,
            "negationMismatch": negation_mismatch,
            "dateMismatch": date_mismatch,
            "semanticOverlap": round(semantic_overlap, 3),
            "retrievalScore": retrieval_score,
        },
        "draftFeatures": draft_features,
        "activeFeatures": active_features,
    }


def analyze_multiple_documents(
    files: list[dict[str, Any]],
    max_pairs: int = 30,
) -> dict[str, Any]:
    all_chunks: list[LawChunk] = []
    source_file_indexes: list[int] = []
    failures: list[dict[str, str]] = []
    truncated_files: list[str] = []
    indexed_files = 0

    for file_index, file_info in enumerate(files):
        chunks, error = extract_inline_file_chunks(file_info)
        name = str(file_info.get("name") or f"Document {file_index + 1}")
        if error:
            failures.append({"name": name, "error": error})
            continue

        indexed_files += 1
        if len(chunks) > MAX_MULTI_FILE_CHUNKS_PER_FILE:
            chunks = chunks[:MAX_MULTI_FILE_CHUNKS_PER_FILE]
            truncated_files.append(name)

        for chunk in chunks:
            chunk.id = f"multi:{file_index}:{chunk.id}"
            all_chunks.append(chunk)
            source_file_indexes.append(file_index)

    comparisons: list[dict[str, Any]] = []
    max_pairs = max(1, min(max_pairs, 50))

    if indexed_files >= 2 and len(all_chunks) >= 2:
        texts = [f"{chunk.title}\n{chunk.text}" for chunk in all_chunks]
        vectorizer = TfidfVectorizer(
            lowercase=True,
            stop_words="english",
            ngram_range=(1, 2),
            min_df=1,
            max_df=1.0,
            max_features=40_000,
            sublinear_tf=True,
        )
        try:
            matrix = vectorizer.fit_transform(texts)
            similarities = cosine_similarity(
                matrix,
                dense_output=False,
            ).tocsr()
        except ValueError:
            similarities = None

        ranked_pairs: list[tuple[float, int, int]] = []
        if similarities is not None:
            for left_index in range(similarities.shape[0]):
                row_start = similarities.indptr[left_index]
                row_end = similarities.indptr[left_index + 1]
                for right_index, raw_score in zip(
                    similarities.indices[row_start:row_end],
                    similarities.data[row_start:row_end],
                ):
                    right_index = int(right_index)
                    score = float(raw_score)
                    if right_index <= left_index or score < 0.05:
                        continue
                    if source_file_indexes[left_index] == source_file_indexes[right_index]:
                        continue
                    ranked_pairs.append((score, left_index, right_index))

        ranked_pairs.sort(key=lambda item: item[0], reverse=True)
        file_pair_counts: dict[tuple[int, int], int] = {}

        for score, left_index, right_index in ranked_pairs:
            file_pair = tuple(
                sorted(
                    (
                        source_file_indexes[left_index],
                        source_file_indexes[right_index],
                    )
                )
            )
            if file_pair_counts.get(file_pair, 0) >= 10:
                continue

            left = all_chunks[left_index]
            right = all_chunks[right_index]
            decision = compare_clause(left.text, right.text, score)
            comparisons.append(
                {
                    "sourceClause": {
                        "id": left.id,
                        "title": left.title,
                        "file": left.file,
                        "pageStart": left.page_start,
                        "pageEnd": left.page_end,
                        "text": left.text,
                        "score": round(score, 4),
                    },
                    "candidate": {
                        "id": f"pair:{left.id}:{right.id}",
                        "title": right.title,
                        "file": right.file,
                        "pageStart": right.page_start,
                        "pageEnd": right.page_end,
                        "text": right.text,
                        "score": round(score, 4),
                    },
                    "decision": decision,
                }
            )
            file_pair_counts[file_pair] = file_pair_counts.get(file_pair, 0) + 1
            if len(comparisons) >= max_pairs:
                break

    contradiction_count = sum(
        item["decision"]["resultType"] == "contradiction"
        for item in comparisons
    )
    possible_count = sum(
        item["decision"]["resultType"] == "possible_conflict"
        for item in comparisons
    )
    if contradiction_count:
        result_type = "contradiction"
    elif possible_count:
        result_type = "possible_conflict"
    elif comparisons:
        result_type = "consistent_or_related"
    else:
        result_type = "uncertain"

    routed_experts: list[str] = ["Semantic Retrieval Expert"]
    for comparison in comparisons:
        for key in ("draftFeatures", "activeFeatures"):
            for expert in comparison["decision"][key]["routedExperts"]:
                if expert not in routed_experts:
                    routed_experts.append(expert)

    combined_text = "\n".join(chunk.text for chunk in all_chunks[:20])
    combined_features = extract_features(combined_text)
    for expert in combined_features["routedExperts"]:
        if expert not in routed_experts:
            routed_experts.append(expert)

    best_confidence = max(
        (item["decision"]["confidence"] for item in comparisons),
        default=0.0,
    )
    result = {
        "summary": {
            "resultType": result_type,
            "confidence": round(best_confidence, 3),
            "candidateCount": len(comparisons),
            "contradictionCount": contradiction_count,
            "possibleConflictCount": possible_count,
            "routedExperts": routed_experts,
            "evaluationMatrix": "cross-file TF-IDF retrieval + numeric/date/negation exact checks",
            "knowledgeBase": f"{indexed_files} Uploaded Documents",
            "retrievalSource": "multi_file_pairwise",
        },
        "draft": f"Cross-file comparison of {indexed_files} uploaded documents",
        "comparisons": comparisons,
        "part2Pipeline": build_part2_trace(combined_features, comparisons),
        "preservedResults": {
            "contradictions": [
                item
                for item in comparisons
                if item["decision"]["resultType"] == "contradiction"
            ],
            "possibleConflicts": [
                item
                for item in comparisons
                if item["decision"]["resultType"] == "possible_conflict"
            ],
            "consistentOrRelated": [
                item
                for item in comparisons
                if item["decision"]["resultType"] == "consistent_or_related"
            ],
            "uncertain": [
                item
                for item in comparisons
                if item["decision"]["resultType"] == "uncertain"
            ],
        },
        "repositorySearch": {
            "indexedFileCount": indexed_files,
            "chunkCount": len(all_chunks),
            "failures": failures,
        },
        "multiFileAnalysis": {
            "requestedFileCount": len(files),
            "indexedFileCount": indexed_files,
            "chunkCount": len(all_chunks),
            "pairCount": len(comparisons),
            "truncatedFiles": truncated_files,
            "failures": failures,
        },
    }
    return result


def prepare_combined_input(
    typed_text: str,
    file_info: dict[str, Any] | None,
) -> tuple[str | None, str | None, dict[str, Any]]:
    typed_text = clean_text(typed_text)
    sections: list[str] = []
    if typed_text:
        sections.append(f"[USER TYPED TEXT]\n{typed_text}")

    extraction: dict[str, Any] = {
        "typedTextIncluded": bool(typed_text),
        "typedTextCharacters": len(typed_text),
        "fileIncluded": bool(file_info),
        "fileName": None,
        "fileType": None,
        "extractedCharacters": 0,
        "combinedCharacters": 0,
        "pageCount": None,
        "textPageCount": None,
        "ocrRequiredPages": [],
        "ocrAppliedPages": [],
        "ocrAvailable": all(local_ocr_commands()),
        "warnings": [],
    }

    if file_info:
        name = str(file_info.get("name") or "Uploaded document")
        file_type = str(file_info.get("type") or "")
        chunks, error, file_metadata = extract_inline_input_file(file_info)
        extraction.update(file_metadata)
        extraction["fileName"] = name
        extraction["fileType"] = file_type
        if error:
            return None, error, extraction

        extracted_text = "\n\n".join(chunk.text for chunk in chunks)
        extraction["extractedCharacters"] = len(extracted_text)
        sections.append(f"[UPLOADED DOCUMENT: {name}]\n{extracted_text}")

    if not sections:
        return None, "Type text, upload a document, or provide both.", extraction

    combined_text = "\n\n".join(sections)
    extraction["combinedCharacters"] = len(combined_text)
    return combined_text, None, extraction


def analyze_combined_input(
    index: LegalIndex,
    typed_text: str,
    file_info: dict[str, Any] | None,
    top_k: int = 5,
) -> tuple[dict[str, Any] | None, str | None, dict[str, Any]]:
    combined_text, error, extraction = prepare_combined_input(typed_text, file_info)
    if error or combined_text is None:
        return None, error, extraction

    result = analyze_clause(index, combined_text, top_k=top_k)
    result["inputExtraction"] = extraction
    return result, None, extraction


def analyze_combined_input_against_repository(
    typed_text: str,
    file_info: dict[str, Any] | None,
    repository_files: list[dict[str, Any]],
    scope_label: str,
    top_k: int = 5,
) -> tuple[dict[str, Any] | None, str | None, dict[str, Any]]:
    combined_text, error, extraction = prepare_combined_input(typed_text, file_info)
    if error or combined_text is None:
        return None, error, extraction

    result = analyze_uploaded_repository(
        combined_text,
        repository_files,
        top_k=top_k,
        scope_label=scope_label,
    )
    result["inputExtraction"] = extraction
    return result, None, extraction


def analyze_clause(index: LegalIndex, draft: str, top_k: int = 5) -> dict[str, Any]:
    candidates = index.search(draft, top_k=top_k)
    return build_analysis_result(
        draft=draft,
        candidates=candidates,
        knowledge_base="Pakistan Code PDF Index",
        retrieval_source="pakistan_code_index",
    )


def health_payload() -> dict[str, Any]:
    report = {}
    if BUILD_REPORT_PATH.exists():
        report = json.loads(BUILD_REPORT_PATH.read_text(encoding="utf-8"))
    return {
        "ok": INDEX_PATH.exists(),
        "indexPath": str(INDEX_PATH),
        "buildReport": report,
    }
