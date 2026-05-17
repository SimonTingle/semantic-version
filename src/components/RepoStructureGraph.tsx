'use client';
import { useEffect, useMemo, useRef } from 'react';
import dynamic from 'next/dynamic';
import * as THREE from 'three';
import type { RepoGraph, RepoGraphNode, RepoGraphLink } from '@/lib/repoTree';

// react-force-graph-3d ships permissive types (all fields optional). We import
// it dynamically (SSR-disabled), then cast the prop callbacks at the boundary.
const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

interface ForceGraphHandle {
  d3Force: (name: string, force?: unknown) => unknown;
  cameraPosition: (pos: { x: number; y: number; z: number }, look: { x: number; y: number; z: number }, ms: number) => void;
  zoomToFit: (ms?: number, padding?: number) => void;
}

interface Props { graph: RepoGraph }

type LooseNode = Partial<RepoGraphNode> & { x?: number; y?: number; z?: number };
type LooseLink = Partial<RepoGraphLink>;

export default function RepoStructureGraph({ graph }: Props) {
  // react-force-graph mutates link source/target into node refs; clone defensively.
  const data = useMemo(() => ({
    nodes: graph.nodes.map((n) => ({ ...n })),
    links: graph.links.map((l) => ({ ...l })),
  }), [graph]);

  const ref = useRef<ForceGraphHandle | null>(null);
  const hotMeshes = useRef<Map<string, THREE.Mesh>>(new Map());

  // Clear stale mesh refs when graph data changes; nodeThreeObject repopulates below.
  useEffect(() => {
    hotMeshes.current.clear();
  }, [data]);

  // Pulse emissiveIntensity each frame for hot nodes.
  useEffect(() => {
    let rafId: number;
    function animate() {
      const t = Date.now();
      for (const [, mesh] of hotMeshes.current) {
        const mat = mesh.material as THREE.MeshLambertMaterial;
        const heat = (mesh.userData as { heat: number }).heat;
        const speed = 400 + (1 - heat) * 600;
        mat.emissiveIntensity = heat * (0.5 + 0.5 * Math.sin(t / speed));
      }
      rafId = requestAnimationFrame(animate);
    }
    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [data]);

  useEffect(() => {
    const fg = ref.current;
    if (!fg) return;
    const charge = fg.d3Force('charge') as { strength?: (fn: (n: LooseNode) => number) => unknown } | null;
    if (charge?.strength) charge.strength((n) => (n.type === 'folder' ? -350 : -40));
    const linkForce = fg.d3Force('link') as { distance?: (fn: (l: LooseLink) => number) => unknown } | null;
    if (linkForce?.distance) linkForce.distance((l) => (l.type === 'gravity' ? 120 : 40));
    // Strengthen the built-in center force so all nodes stay near the origin.
    const center = fg.d3Force('center') as { strength?: (v: number) => unknown } | null;
    if (center?.strength) center.strength(1);
  }, [data]);

  function handleEngineStop() {
    ref.current?.zoomToFit(400, 80);
  }

  return (
    <ForceGraph3D
      ref={ref as never}
      graphData={data as never}
      backgroundColor="#000005"
      showNavInfo={false}
      warmupTicks={60}
      nodeLabel={((raw: unknown) => {
        const n = raw as RepoGraphNode;
        return n.type === 'folder' ? `📁 ${n.id}` : `${n.name} • ${(n.size / 1024).toFixed(1)} KB`;
      }) as never}
      linkColor={((raw: unknown) => ((raw as RepoGraphLink).type === 'gravity' ? '#666666' : '#333333')) as never}
      linkWidth={((raw: unknown) => ((raw as RepoGraphLink).type === 'gravity' ? 1.5 : 0.5)) as never}
      linkOpacity={0.4}
      onEngineStop={handleEngineStop as never}
      nodeThreeObject={((raw: unknown) => {
        const n = raw as RepoGraphNode;
        const kb = Math.max(0.01, n.size / 1024);
        const radius = n.type === 'folder'
          ? Math.max(6, 10 + Math.pow(kb, 0.25) * 2)
          : Math.max(2, Math.min(25, Math.pow(kb, 0.3) * 1.5));
        const geom = new THREE.SphereGeometry(radius, 16, 12);
        const mat = new THREE.MeshLambertMaterial({ color: n.color });
        if (n.heat !== undefined && n.heat > 0) {
          mat.emissive.set(0xffdd88);
          mat.emissiveIntensity = 0;
        }
        const mesh = new THREE.Mesh(geom, mat);
        if (n.heat !== undefined && n.heat > 0) {
          mesh.userData = { heat: n.heat };
          hotMeshes.current.set(n.id, mesh);
        }
        return mesh;
      }) as never}
      onNodeClick={((raw: unknown) => {
        const fg = ref.current;
        if (!fg) return;
        const node = raw as LooseNode;
        const dist = 80;
        const x = node.x ?? 0, y = node.y ?? 0, z = node.z ?? 0;
        const r = Math.hypot(x, y, z) || 1;
        const ratio = 1 + dist / r;
        fg.cameraPosition({ x: x * ratio, y: y * ratio, z: z * ratio }, { x, y, z }, 1500);
      }) as never}
    />
  );
}
