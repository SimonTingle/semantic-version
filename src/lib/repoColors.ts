// File-extension → hex colour map for the 3D lens.

const EXT_COLORS: Record<string, string> = {
  '.ts': '#3178c6', '.tsx': '#3178c6',
  '.js': '#f7df1e', '.jsx': '#f7df1e', '.mjs': '#f7df1e', '.cjs': '#f7df1e', '.json': '#f7df1e',
  '.py': '#3776ab',
  '.html': '#e34c26',
  '.css': '#563d7c',
  '.scss': '#c6538c', '.sass': '#c6538c',
  '.yml': '#cb171e', '.yaml': '#cb171e',
  '.png': '#ec407a', '.jpg': '#ec407a', '.jpeg': '#ec407a', '.svg': '#ec407a',
  '.gif': '#ec407a', '.webp': '#ec407a', '.ico': '#ec407a',
  '.md': '#9b85ff', '.mdx': '#9b85ff',
  '.go': '#00add8',
  '.rs': '#dea584',
  '.rb': '#cc342d',
  '.java': '#b07219',
  '.kt': '#a97bff', '.kts': '#a97bff',
  '.swift': '#f05138',
  '.sh': '#89e051', '.bash': '#89e051', '.zsh': '#89e051',
  '.sql': '#e38c00',
};

const NAME_COLORS: Record<string, string> = {
  Dockerfile: '#0db7ed',
  '.dockerignore': '#0db7ed',
};

export const FOLDER_COLOR = '#ffffff';
export const ROOT_COLOR = '#ffffe0';
export const UNKNOWN_COLOR = '#cccccc';

export function colorForFile(filename: string): string {
  if (NAME_COLORS[filename]) return NAME_COLORS[filename];
  const dot = filename.lastIndexOf('.');
  if (dot <= 0) return UNKNOWN_COLOR;
  const ext = filename.slice(dot).toLowerCase();
  return EXT_COLORS[ext] ?? UNKNOWN_COLOR;
}

export function extOf(filename: string): string | undefined {
  const dot = filename.lastIndexOf('.');
  if (dot <= 0) return undefined;
  return filename.slice(dot).toLowerCase();
}
