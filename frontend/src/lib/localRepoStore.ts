import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export interface LocalRepoFile {
  id: string;
  name: string;
  size: number;
  type: string;
  storagePath: string;
  downloadUrl: string;
  uploadedAt: string;
}

export interface LocalRepository {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  files: LocalRepoFile[];
}

export class LocalRepoError extends Error {
  constructor(
    message: string,
    public readonly status: number
  ) {
    super(message);
  }
}

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".pdf", ".docx", ".txt"]);
const storageRoot = path.resolve(
  process.env.PAKLAW_REPOSITORY_DIR ??
    path.join(process.cwd(), "local-data", "repositories")
);

let writeQueue: Promise<void> = Promise.resolve();

function assertId(value: string, label: string): string {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) {
    throw new LocalRepoError(`Invalid ${label}.`, 400);
  }
  return value;
}

function userDirectory(uid: string): string {
  return path.join(storageRoot, assertId(uid, "user ID"));
}

function indexPath(uid: string): string {
  return path.join(userDirectory(uid), "repositories.json");
}

function normalizeRepositories(value: unknown): LocalRepository[] {
  return Array.isArray(value) ? (value as LocalRepository[]) : [];
}

async function readRepositories(uid: string): Promise<LocalRepository[]> {
  try {
    const raw = await fs.readFile(indexPath(uid), "utf8");
    return normalizeRepositories(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function writeRepositories(
  uid: string,
  repositories: LocalRepository[]
): Promise<void> {
  const directory = userDirectory(uid);
  await fs.mkdir(directory, { recursive: true });

  const destination = indexPath(uid);
  const temporary = `${destination}.${randomUUID()}.tmp`;
  await fs.writeFile(temporary, JSON.stringify(repositories, null, 2), "utf8");
  await fs.rename(temporary, destination);
}

function withWriteLock<T>(operation: () => Promise<T>): Promise<T> {
  const result = writeQueue.then(operation, operation);
  writeQueue = result.then(
    () => undefined,
    () => undefined
  );
  return result;
}

function findRepository(
  repositories: LocalRepository[],
  repoId: string
): LocalRepository {
  const repository = repositories.find((repo) => repo.id === repoId);
  if (!repository) throw new LocalRepoError("Repository not found.", 404);
  return repository;
}

export async function listRepositories(uid: string): Promise<LocalRepository[]> {
  const repositories = await readRepositories(uid);
  return repositories.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function createRepository(
  uid: string,
  name: string,
  description: string
): Promise<LocalRepository> {
  return withWriteLock(async () => {
    const repositories = await readRepositories(uid);
    if (
      repositories.some(
        (repository) => repository.name.toLowerCase() === name.toLowerCase()
      )
    ) {
      throw new LocalRepoError("A repository with this name already exists.", 409);
    }

    const now = new Date().toISOString();
    const repository: LocalRepository = {
      id: randomUUID(),
      name,
      description,
      createdAt: now,
      updatedAt: now,
      files: [],
    };

    repositories.unshift(repository);
    await writeRepositories(uid, repositories);
    return repository;
  });
}

export async function updateRepository(
  uid: string,
  repoId: string,
  updates: { name?: string; description?: string }
): Promise<LocalRepository> {
  assertId(repoId, "repository ID");
  return withWriteLock(async () => {
    const repositories = await readRepositories(uid);
    const repository = findRepository(repositories, repoId);

    if (updates.name) repository.name = updates.name;
    if (typeof updates.description === "string") {
      repository.description = updates.description;
    }
    repository.updatedAt = new Date().toISOString();

    await writeRepositories(uid, repositories);
    return repository;
  });
}

export async function deleteRepository(
  uid: string,
  repoId: string
): Promise<void> {
  assertId(repoId, "repository ID");
  await withWriteLock(async () => {
    const repositories = await readRepositories(uid);
    findRepository(repositories, repoId);
    await writeRepositories(
      uid,
      repositories.filter((repository) => repository.id !== repoId)
    );

    const filesDirectory = path.join(userDirectory(uid), "files", repoId);
    await fs.rm(filesDirectory, { recursive: true, force: true });
  });
}

export async function addRepositoryFile(
  uid: string,
  repoId: string,
  file: File
): Promise<LocalRepoFile> {
  assertId(repoId, "repository ID");
  const extension = path.extname(file.name).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(extension)) {
    throw new LocalRepoError("Only PDF, DOCX, and TXT files are allowed.", 415);
  }
  if (file.size <= 0) throw new LocalRepoError("The selected file is empty.", 422);
  if (file.size > MAX_FILE_SIZE) {
    throw new LocalRepoError("Files must be 25 MB or smaller.", 413);
  }

  return withWriteLock(async () => {
    const repositories = await readRepositories(uid);
    const repository = findRepository(repositories, repoId);
    const fileId = randomUUID();
    const relativePath = path.posix.join(
      assertId(uid, "user ID"),
      "files",
      repoId,
      `${fileId}${extension}`
    );
    const destination = path.join(storageRoot, ...relativePath.split("/"));
    await fs.mkdir(path.dirname(destination), { recursive: true });
    await fs.writeFile(destination, Buffer.from(await file.arrayBuffer()));

    const uploadedAt = new Date().toISOString();
    const record: LocalRepoFile = {
      id: fileId,
      name: path.basename(file.name),
      size: file.size,
      type: file.type || "application/octet-stream",
      storagePath: relativePath,
      downloadUrl: `/api/repos/${repoId}/files/${fileId}/download`,
      uploadedAt,
    };

    repository.files.push(record);
    repository.updatedAt = uploadedAt;
    try {
      await writeRepositories(uid, repositories);
    } catch (error) {
      await fs.rm(destination, { force: true });
      throw error;
    }
    return record;
  });
}

export async function deleteRepositoryFile(
  uid: string,
  repoId: string,
  fileId: string
): Promise<void> {
  assertId(repoId, "repository ID");
  assertId(fileId, "file ID");
  await withWriteLock(async () => {
    const repositories = await readRepositories(uid);
    const repository = findRepository(repositories, repoId);
    const file = repository.files.find((item) => item.id === fileId);
    if (!file) throw new LocalRepoError("File not found.", 404);

    const absolutePath = resolveStoredFile(file.storagePath);
    repository.files = repository.files.filter((item) => item.id !== fileId);
    repository.updatedAt = new Date().toISOString();
    await writeRepositories(uid, repositories);
    await fs.rm(absolutePath, { force: true });
  });
}

function resolveStoredFile(storagePath: string): string {
  const resolved = path.resolve(storageRoot, ...storagePath.split("/"));
  const relative = path.relative(storageRoot, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new LocalRepoError("Invalid stored file path.", 400);
  }
  return resolved;
}

export async function getRepositoryFile(
  uid: string,
  repoId: string,
  fileId: string
): Promise<{ record: LocalRepoFile; absolutePath: string }> {
  assertId(repoId, "repository ID");
  assertId(fileId, "file ID");
  const repositories = await readRepositories(uid);
  const repository = findRepository(repositories, repoId);
  const record = repository.files.find((file) => file.id === fileId);
  if (!record) throw new LocalRepoError("File not found.", 404);
  return { record, absolutePath: resolveStoredFile(record.storagePath) };
}
