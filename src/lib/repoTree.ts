import { isPathExcluded } from './repoFilter';
import { colorForFile, extOf, FOLDER_COLOR, ROOT_COLOR } from './repoColors';

export interface RepoGraphNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  size: number;          // bytes (folders = sum of contained file sizes)
  color: string;
  ext?: string;
}

export interface RepoGraphLink {
  source: string;
  target: string;
  type: 'gravity' | 'orbit';
}

export interface RepoGraph {
  nodes: RepoGraphNode[];
  links: RepoGraphLink[];
  branch: string;
  repo: string;
  truncated: boolean;
  nodeCount: number;
  linkCount: number;
}

interface GhTreeEntry { path: string; type: string; size?: number }

const ROOT = '/';

export function buildGraph(repo: string, branch: string, tree: GhTreeEntry[], truncated: boolean): RepoGraph {
  const nodes = new Map<string, RepoGraphNode>();
  const links: RepoGraphLink[] = [];

  nodes.set(ROOT, { id: ROOT, name: '/', type: 'folder', size: 0, color: ROOT_COLOR });

  for (const entry of tree) {
    if (!entry.path) continue;
    const isFile = entry.type === 'blob';
    const isFolder = entry.type === 'tree';
    if (!isFile && !isFolder) continue;
    if (isPathExcluded(entry.path, isFile, entry.size ?? 0)) continue;

    const segments = entry.path.split('/');
    const name = segments[segments.length - 1];
    const parentPath = segments.slice(0, -1).join('/') || ROOT;

    // Make sure every ancestor folder exists, even if GitHub elides empty ones.
    ensureAncestors(nodes, links, parentPath);

    if (isFolder) {
      if (!nodes.has(entry.path)) {
        nodes.set(entry.path, { id: entry.path, name, type: 'folder', size: 0, color: FOLDER_COLOR });
        links.push({ source: parentPath, target: entry.path, type: 'gravity' });
      }
    } else {
      const node: RepoGraphNode = {
        id: entry.path,
        name,
        type: 'file',
        size: entry.size ?? 0,
        color: colorForFile(name),
        ext: extOf(name),
      };
      nodes.set(entry.path, node);
      links.push({ source: parentPath, target: entry.path, type: 'orbit' });
    }
  }

  // Roll file sizes up into folders.
  for (const node of nodes.values()) {
    if (node.type !== 'file' || node.size === 0) continue;
    let p = parentOf(node.id);
    while (p !== null) {
      const f = nodes.get(p);
      if (f && f.type === 'folder') f.size += node.size;
      if (p === ROOT) break;
      p = parentOf(p);
    }
  }

  const nodeList = [...nodes.values()];
  return {
    nodes: nodeList,
    links,
    branch,
    repo,
    truncated,
    nodeCount: nodeList.length,
    linkCount: links.length,
  };
}

function ensureAncestors(nodes: Map<string, RepoGraphNode>, links: RepoGraphLink[], path: string) {
  if (path === ROOT) return;
  const segments = path.split('/');
  let acc = '';
  let prev = ROOT;
  for (const seg of segments) {
    acc = acc ? `${acc}/${seg}` : seg;
    if (!nodes.has(acc)) {
      nodes.set(acc, { id: acc, name: seg, type: 'folder', size: 0, color: FOLDER_COLOR });
      links.push({ source: prev, target: acc, type: 'gravity' });
    }
    prev = acc;
  }
}

function parentOf(path: string): string | null {
  if (path === ROOT) return null;
  const i = path.lastIndexOf('/');
  if (i === -1) return ROOT;
  return path.slice(0, i) || ROOT;
}
