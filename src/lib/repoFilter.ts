// Path exclusion rules for the 3D repo lens — keeps the graph readable by stripping noise.

const EXCLUDED_FOLDERS = new Set([
  'node_modules', 'venv', '.venv', '__pycache__', 'dist', 'build', 'out',
  'target', '.cache', 'vendor', 'tmp', 'temp',
]);

const EXCLUDED_FILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml', 'poetry.lock',
  'Cargo.lock', 'Gemfile.lock', 'composer.lock', '.DS_Store', 'Thumbs.db',
]);

const EXCLUDED_EXTENSIONS = new Set([
  '.log', '.tsbuildinfo', '.pyc', '.pyo', '.class', '.o', '.so', '.dll', '.exe',
  '.map',
]);

const MAX_FILE_BYTES = 10 * 1024 * 1024;

export function isPathExcluded(path: string, isFile: boolean, size = 0): boolean {
  if (isFile && size > MAX_FILE_BYTES) return true;

  const segments = path.split('/');
  for (const seg of segments) {
    if (seg.startsWith('.')) return true;
    if (!isFile || seg !== segments[segments.length - 1]) {
      if (EXCLUDED_FOLDERS.has(seg)) return true;
    }
  }

  if (isFile) {
    const filename = segments[segments.length - 1];
    if (EXCLUDED_FILES.has(filename)) return true;
    const dot = filename.lastIndexOf('.');
    if (dot > 0) {
      const ext = filename.slice(dot).toLowerCase();
      if (EXCLUDED_EXTENSIONS.has(ext)) return true;
    }
  }

  return false;
}
