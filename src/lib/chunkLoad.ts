/**
 * Vite lazy routes reject with these messages when a hashed chunk 404s
 * after a new deploy. They are real errors: the root boundary reports them.
 */
const CHUNK_LOAD = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Loading(?: CSS)? chunk [\w-]+ failed|Unable to preload CSS|Failed to load chunk|ChunkLoadError/i;

export function isChunkLoadError(error: unknown): boolean {
  if (typeof error === 'string') return CHUNK_LOAD.test(error);
  if (!error || typeof error !== 'object') return false;
  const name = 'name' in error && typeof error.name === 'string' ? error.name : '';
  const message = 'message' in error && typeof error.message === 'string' ? error.message : '';
  return CHUNK_LOAD.test(name) || CHUNK_LOAD.test(message);
}
