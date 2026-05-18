'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
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
  const [hoveredNode, setHoveredNode] = useState<RepoGraphNode | null>(null);
  const mousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const tooltipRef = useRef<HTMLDivElement | null>(null);

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

  // Track mouse for tooltip positioning; reposition via ref to avoid re-renders.
  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    mousePos.current = { x: e.clientX, y: e.clientY };
    if (tooltipRef.current) {
      const el = tooltipRef.current;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      // Default: 16px to the right and below cursor; flip if it would overflow.
      let x = e.clientX + 16;
      let y = e.clientY + 16;
      if (x + w > vw - 8) x = e.clientX - w - 16;
      if (y + h > vh - 8) y = e.clientY - h - 16;
      el.style.left = `${Math.max(8, x)}px`;
      el.style.top = `${Math.max(8, y)}px`;
    }
  }

  return (
    <div className="relative w-full h-full" onMouseMove={handleMouseMove}>
      <ForceGraph3D
        ref={ref as never}
        graphData={data as never}
        backgroundColor="#000005"
        showNavInfo={false}
        warmupTicks={60}
        nodeLabel={(() => '') as never}
        linkColor={((raw: unknown) => ((raw as RepoGraphLink).type === 'gravity' ? '#666666' : '#333333')) as never}
        linkWidth={((raw: unknown) => ((raw as RepoGraphLink).type === 'gravity' ? 1.5 : 0.5)) as never}
        linkOpacity={0.4}
        onEngineStop={handleEngineStop as never}
        onNodeHover={((raw: unknown) => {
          setHoveredNode(raw ? (raw as RepoGraphNode) : null);
        }) as never}
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
      {hoveredNode && (
        <PipBoyTooltip
          node={hoveredNode}
          initialX={mousePos.current.x}
          initialY={mousePos.current.y}
          tooltipRef={tooltipRef}
        />
      )}
    </div>
  );
}

function PipBoyTooltip({
  node,
  initialX,
  initialY,
  tooltipRef,
}: {
  node: RepoGraphNode;
  initialX: number;
  initialY: number;
  tooltipRef: React.RefObject<HTMLDivElement | null>;
}) {
  const hasDiff = node.type === 'file' && node.diffExcerpt && node.diffExcerpt.length > 0;
  const kb = (node.size / 1024).toFixed(1);
  const diffLines = hasDiff ? node.diffExcerpt!.split('\n').filter((l) => l.length > 0) : [];
  const longDiff = diffLines.length > 8;

  return (
    <div
      ref={tooltipRef}
      className="pip-boy-tooltip"
      style={{
        position: 'fixed',
        left: `${initialX + 16}px`,
        top: `${initialY + 16}px`,
        zIndex: 50,
        width: '320px',
        maxHeight: '280px',
        pointerEvents: 'none',
        background: '#050f05',
        color: '#00ff41',
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: '11px',
        lineHeight: '1.35',
        border: '1px solid #00ff41',
        boxShadow: '0 0 8px rgba(0,255,65,0.4), inset 0 0 20px rgba(0,255,65,0.03)',
        borderRadius: '2px',
        overflow: 'hidden',
        textShadow: '0 0 2px rgba(0,255,65,0.6)',
      }}
    >
      <div style={{ padding: '6px 8px', borderBottom: '1px solid rgba(0,255,65,0.3)', display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
        <span style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {'>'} {node.type === 'folder' ? '[DIR] ' : ''}{node.name.toUpperCase()}
        </span>
        <span style={{ flexShrink: 0, opacity: 0.7 }}>
          {node.type === 'file' && node.additions !== undefined
            ? `+${node.additions} -${node.deletions ?? 0}`
            : `${kb} KB`}
        </span>
      </div>
      {node.type === 'file' && node.commitSha && (
        <div style={{ padding: '4px 8px', borderBottom: '1px solid rgba(0,255,65,0.2)', fontSize: '10px', opacity: 0.85 }}>
          <div style={{ color: '#88dd88' }}>
            SHA {node.commitSha} · {kb} KB
          </div>
          <div style={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <span style={{ display: 'inline-block', animation: node.commitMsg && node.commitMsg.length > 36 ? 'pipMarquee 12s linear infinite' : undefined, paddingLeft: node.commitMsg && node.commitMsg.length > 36 ? '100%' : 0 }}>
              {node.commitMsg ?? ''}
            </span>
          </div>
        </div>
      )}
      {hasDiff && (
        <div style={{ padding: '4px 8px', maxHeight: '180px', overflow: 'hidden', position: 'relative' }}>
          <div
            style={{
              animation: longDiff ? 'pipScroll 10s linear infinite' : undefined,
            }}
          >
            {diffLines.map((line, i) => {
              let color = '#44aa44';
              if (line.startsWith('@@')) color = '#888888';
              else if (line.startsWith('+')) color = '#00ff41';
              else if (line.startsWith('-')) color = '#ff6666';
              return (
                <div
                  key={i}
                  style={{ color, whiteSpace: 'pre', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {line.slice(0, 60)}
                </div>
              );
            })}
            {longDiff && diffLines.map((line, i) => {
              let color = '#44aa44';
              if (line.startsWith('@@')) color = '#888888';
              else if (line.startsWith('+')) color = '#00ff41';
              else if (line.startsWith('-')) color = '#ff6666';
              return (
                <div
                  key={`d-${i}`}
                  style={{ color, whiteSpace: 'pre', overflow: 'hidden', textOverflow: 'ellipsis' }}
                >
                  {line.slice(0, 60)}
                </div>
              );
            })}
          </div>
        </div>
      )}
      {!hasDiff && node.type === 'file' && (
        <div style={{ padding: '6px 8px', fontSize: '10px', opacity: 0.6 }}>
          {kb} KB · no recent changes
        </div>
      )}
      <style>{`
        @keyframes pipScroll {
          0%   { transform: translateY(0); }
          100% { transform: translateY(-50%); }
        }
        @keyframes pipMarquee {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
