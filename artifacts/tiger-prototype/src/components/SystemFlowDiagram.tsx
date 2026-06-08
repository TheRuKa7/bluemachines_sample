/**
 * SystemFlowDiagram.tsx — Centre panel: SVG data-flow diagram.
 *
 * Renders the 10 system nodes (Card Core, CRM, eKYC, VKYC, Activation,
 * Blue Machines Agent, Notification, Inside Sales, Compliance, Analytics)
 * arranged in three columns:
 *   DATA SOURCES | ORCHESTRATION | OUTPUT SYSTEMS
 *
 * For each stage the following visual changes are applied:
 *   - Active system nodes are highlighted with their theme colour and opacity=1.
 *   - Inactive nodes are dimmed to opacity=0.3.
 *   - Active connections render as animated dashed paths with coloured arrowheads.
 *   - Inactive connections render as hairlines at opacity=0.12.
 *   - When failureMode is true, affected system nodes get an additional red dashed
 *     border and a red "!" badge, and a failure summary strip appears below the SVG.
 *
 * Layout constants (W, H, NODE_W, NODE_H, AGENT_W, AGENT_H) match the coordinate
 * system used in SYSTEMS node positions defined in model.ts. Do not change them
 * independently — the two systems must remain in sync.
 *
 * Connection grouping: multiple arrows between the same pair of nodes are bundled
 * and offset vertically so they don't overlap (quadratic Bézier midpoint offset).
 *
 * Active connection details are listed below the SVG in HTML (full labels, readable type).
 */
import { useMemo } from "react";
import { SYSTEMS, STAGES, type StageId, type SystemId, type ArrowType } from "@/data/model";

interface SystemFlowDiagramProps {
  selectedStage: StageId;
  failureMode: boolean;
}

/* ─────────────────────────────────────────────────────────────────────────────
   Colour palettes
   ───────────────────────────────────────────────────────────────────────────── */

/** Arrow colours by operation type (READ / WRITE / NOTIFY / ESCALATE). */
const ARROW_COLORS: Record<ArrowType, string> = {
  READ: "#3b82f6",
  WRITE: "#22c55e",
  NOTIFY: "#f59e0b",
  ESCALATE: "#ef4444",
};

/** Colour for each system node's border, background tint, and text. */
const SYSTEM_COLORS: Record<SystemId, string> = {
  card_core: "#3b82f6",
  crm: "#8b5cf6",
  ekyc: "#22c55e",
  vkyc: "#10b981",
  activation: "#a855f7",
  bm_agent: "#f59e0b",
  notification: "#f59e0b",
  inside_sales: "#ef4444",
  compliance: "#f97316",
  analytics: "#06b6d4",
};

/* ─────────────────────────────────────────────────────────────────────────────
   SVG canvas dimensions — must match node positions in model.ts SYSTEMS array.
   ───────────────────────────────────────────────────────────────────────────── */
const W = 600;   // viewBox width
const H = 500;   // viewBox height
const NODE_W = 140;  // standard node width
const NODE_H = 40;   // standard node height
const AGENT_W = 160; // Blue Machines Agent node width (wider, centre column)
const AGENT_H = 52;  // Blue Machines Agent node height

/* ─────────────────────────────────────────────────────────────────────────────
   Geometry helpers
   ───────────────────────────────────────────────────────────────────────────── */

/** Returns the geometric centre of a system node. */
function getNodeCenter(id: SystemId) {
  const node = SYSTEMS.find((s) => s.id === id)!;
  return { x: node.x + node.w / 2, y: node.y + node.h / 2 };
}

/**
 * Returns the left or right midpoint of a node's edge, used as the arrow endpoint.
 * When `side="auto"`, picks whichever edge faces the other node (right if the
 * source is to the left of the target, left otherwise).
 */
function getEdgePoint(id: SystemId, side: "left" | "right" | "auto", otherX: number) {
  const node = SYSTEMS.find((s) => s.id === id)!;
  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  if (side === "auto") {
    side = cx < otherX ? "right" : "left";
  }
  if (side === "right") return { x: node.x + node.w, y: cy };
  return { x: node.x, y: cy };
}

/* ─────────────────────────────────────────────────────────────────────────────
   Sub-components
   ───────────────────────────────────────────────────────────────────────────── */

/**
 * Renders a single directed arrow (quadratic Bézier) between two system nodes.
 *
 * Multiple arrows on the same node-pair are spread apart using a vertical midpoint
 * offset (`index` / `total`) to prevent overlapping paths.
 *
 * An SVG <marker> arrowhead is defined per-path using a unique ID so each arrow
 * gets its own correctly-coloured head regardless of rendering order.
 *
 * Active arrows are animated via the `.flow-animated` CSS class (defined in index.css)
 * and render with a dashed stroke to indicate live data flow. Inactive arrows are
 * solid hairlines at low opacity.
 */
function connectionKey(from: SystemId, to: SystemId, type: ArrowType, label: string) {
  return `${from}|${to}|${type}|${label}`;
}

function ArrowPath({
  from,
  to,
  type,
  active,
  index,
  total,
}: {
  from: SystemId;
  to: SystemId;
  type: ArrowType;
  active: boolean;
  index: number;
  total: number;
}) {
  const fromNode = SYSTEMS.find((s) => s.id === from)!;
  const toNode = SYSTEMS.find((s) => s.id === to)!;
  const fromCx = fromNode.x + fromNode.w / 2;
  const toCx = toNode.x + toNode.w / 2;

  const fromPt = getEdgePoint(from, "auto", toCx);
  const toPt = getEdgePoint(to, "auto", fromCx);

  const color = ARROW_COLORS[type];
  const opacity = active ? 1 : 0.2;

  /* Spread parallel arrows so badges do not stack on the same point. */
  const offset = total > 1 ? (index - (total - 1) / 2) * 16 : 0;
  const midX = (fromPt.x + toPt.x) / 2;
  const midY = (fromPt.y + toPt.y) / 2 + offset;

  const path = `M ${fromPt.x} ${fromPt.y} Q ${midX} ${midY} ${toPt.x} ${toPt.y}`;

  return (
    <g style={{ opacity, transition: "opacity 0.3s ease" }}>
      <defs>
        {/* Unique marker ID prevents colour bleed between arrows of different types. */}
        <marker
          id={`arrow-${from}-${to}-${type}`}
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L6,3 z" fill={color} />
        </marker>
      </defs>
      <path
        d={path}
        stroke={color}
        strokeWidth={active ? 2 : 1}
        fill="none"
        markerEnd={`url(#arrow-${from}-${to}-${type})`}
        className={active ? "flow-animated" : ""}
        strokeDasharray={active ? "6 4" : "none"}
      />
    </g>
  );
}

/** Numbered marker drawn above nodes so it stays visible on the curve. */
function ArrowBadge({
  from,
  to,
  type,
  index,
  total,
  badgeNumber,
}: {
  from: SystemId;
  to: SystemId;
  type: ArrowType;
  index: number;
  total: number;
  badgeNumber: number;
}) {
  const fromNode = SYSTEMS.find((s) => s.id === from)!;
  const toNode = SYSTEMS.find((s) => s.id === to)!;
  const fromCx = fromNode.x + fromNode.w / 2;
  const toCx = toNode.x + toNode.w / 2;
  const fromPt = getEdgePoint(from, "auto", toCx);
  const toPt = getEdgePoint(to, "auto", fromCx);
  const offset = total > 1 ? (index - (total - 1) / 2) * 16 : 0;
  const midX = (fromPt.x + toPt.x) / 2;
  const midY = (fromPt.y + toPt.y) / 2 + offset;
  const color = ARROW_COLORS[type];

  return (
    <g>
      <circle cx={midX} cy={midY} r={12} fill="hsl(0 0% 100%)" stroke={color} strokeWidth={2.5} />
      <text
        x={midX}
        y={midY}
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={12}
        fontWeight="700"
        fill={color}
        fontFamily="system-ui, sans-serif"
      >
        {badgeNumber}
      </text>
    </g>
  );
}

/**
 * Renders a single system node as an SVG group containing:
 *   - Background rect (coloured at 12% opacity when active, transparent when inactive)
 *   - Primary label text (splits on " / " to show a two-line label for compound names)
 *   - "VOICE AGENT" sub-label for the Blue Machines Agent node
 *   - Dashed red overlay rect when the node is in failure mode
 *   - Red "!" badge at the top-right corner when the node is both active and failed
 *   - Soft glow rect (the extra slightly-larger rect around the agent node)
 */
function SystemBlock({
  node,
  active,
  isAgent,
  failed,
  stageColor,
}: {
  node: (typeof SYSTEMS)[0];
  active: boolean;
  isAgent: boolean;
  failed: boolean;
  stageColor: string;
}) {
  const color = SYSTEM_COLORS[node.id];
  const opacity = active ? 1 : 0.5;

  return (
    <g style={{ opacity, transition: "opacity 0.3s ease" }}>
      {/* Main node rectangle */}
      <rect
        x={node.x}
        y={node.y}
        width={node.w}
        height={node.h}
        rx={4}
        fill={active ? `${color}12` : "transparent"}
        stroke={active ? color : "hsl(214 32% 82%)"}
        strokeWidth={isAgent ? 2 : 1}
        style={{ transition: "all 0.3s ease" }}
      />
      {/* Red dashed overlay for failed nodes (only visible when active + failed) */}
      {failed && active && (
        <rect
          x={node.x}
          y={node.y}
          width={node.w}
          height={node.h}
          rx={4}
          fill="transparent"
          stroke="#ef4444"
          strokeWidth={1.5}
          strokeDasharray="4 3"
          opacity={0.6}
        />
      )}
      {/* Soft glow halo behind the central Blue Machines Agent node */}
      {isAgent && active && (
        <rect
          x={node.x - 2}
          y={node.y - 2}
          width={node.w + 4}
          height={node.h + 4}
          rx={6}
          fill="transparent"
          stroke={color}
          strokeWidth={1}
          opacity={0.25}
        />
      )}
      {/* Primary label — short name for legibility at diagram scale */}
      <text
        x={node.x + node.w / 2}
        y={node.y + node.h / 2 - (isAgent ? 6 : 0)}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={isAgent ? 13 : 11}
        fontWeight={isAgent ? "700" : "600"}
        fill={active ? color : "hsl(215 16% 35%)"}
        fontFamily="system-ui, sans-serif"
        style={{ transition: "all 0.3s ease" }}
      >
        {node.shortLabel}
      </text>
      {/* "Voice agent" sub-label beneath the BM agent node */}
      {isAgent && (
        <text
          x={node.x + node.w / 2}
          y={node.y + node.h / 2 + 11}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={9}
          fill={active ? `${color}99` : "hsl(215 16% 45%)"}
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.4"
        >
          Voice agent
        </text>
      )}
      {/* Failure badge — small red "!" circle in the top-right corner of the node */}
      {failed && active && (
        <g>
          <circle cx={node.x + node.w - 8} cy={node.y + 8} r={5} fill="#ef4444" opacity={0.9} />
          <text x={node.x + node.w - 8} y={node.y + 8} textAnchor="middle" dominantBaseline="middle" fontSize={7} fill="white" fontWeight="bold">!</text>
        </g>
      )}
    </g>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main export
   ───────────────────────────────────────────────────────────────────────────── */

export function SystemFlowDiagram({ selectedStage, failureMode }: SystemFlowDiagramProps) {
  const stage = STAGES.find((s) => s.id === selectedStage)!;

  /**
   * Group connections by their "from→to" pair so parallel arrows (e.g. two writes
   * from bm_agent to crm) can be rendered with sequential index offsets.
   * Recalculated only when the stage changes.
   */
  const connectionGroups = useMemo(() => {
    const groups: Record<string, typeof stage.connections> = {};
    for (const conn of stage.connections) {
      const key = `${conn.from}→${conn.to}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(conn);
    }
    return groups;
  }, [stage]);

  /** System IDs that are in failure mode for this stage (empty array in normal mode). */
  const failedSystems = failureMode ? stage.failureMode.affectedSystems : [];

  const activeConnections = stage.connections.filter(
    (conn) =>
      stage.activeSystems.includes(conn.from) && stage.activeSystems.includes(conn.to),
  );

  const connectionNumbers = useMemo(() => {
    const map = new Map<string, number>();
    activeConnections.forEach((conn, i) => {
      map.set(connectionKey(conn.from, conn.to, conn.type, conn.label), i + 1);
    });
    return map;
  }, [activeConnections]);

  const systemLabel = (id: SystemId) => SYSTEMS.find((s) => s.id === id)?.shortLabel ?? id;

  return (
    <div className="flex h-full w-full flex-col">
      <div className="mb-3 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-foreground">Data flow</h2>
          <p className="text-xs text-muted-foreground">{stage.label}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="list" aria-label="Arrow legend">
          {(["READ", "WRITE", "NOTIFY", "ESCALATE"] as ArrowType[]).map((type) => (
            <div key={type} className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-1" role="listitem">
              <div className="h-1 w-5 rounded" style={{ background: ARROW_COLORS[type] }} aria-hidden />
              <span className="font-mono text-xs font-semibold" style={{ color: ARROW_COLORS[type] }}>{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SVG keeps aspect ratio so labels stay legible when the panel resizes */}
      <div className="min-h-[280px] shrink-0 overflow-x-auto overscroll-x-contain touch-pan-x sm:min-h-[320px]">
        <div className="mx-auto w-full min-w-[560px] max-w-3xl" style={{ aspectRatio: `${W} / ${H}` }}>
          <svg viewBox={`0 0 ${W} ${H}`} className="h-full w-full" role="img" aria-label={`Data flow for ${stage.label}`}>
            {/* Column header labels */}
            <text x={30 + NODE_W / 2} y={20} textAnchor="middle" fontSize={10} fontWeight="600" fill="hsl(215 16% 42%)" fontFamily="system-ui, sans-serif" letterSpacing="0.08em">DATA SOURCES</text>
            <text x={236 + AGENT_W / 2} y={20} textAnchor="middle" fontSize={10} fontWeight="600" fill="hsl(215 16% 42%)" fontFamily="system-ui, sans-serif" letterSpacing="0.08em">ORCHESTRATION</text>
            <text x={424 + NODE_W / 2} y={20} textAnchor="middle" fontSize={10} fontWeight="600" fill="hsl(215 16% 42%)" fontFamily="system-ui, sans-serif" letterSpacing="0.08em">OUTPUTS</text>

            <line x1={200} y1={26} x2={200} y2={H - 16} stroke="hsl(214 32% 86%)" strokeWidth={1.5} strokeDasharray="5 4" />
            <line x1={410} y1={26} x2={410} y2={H - 16} stroke="hsl(214 32% 86%)" strokeWidth={1.5} strokeDasharray="5 4" />

            {Object.entries(connectionGroups).map(([key, conns]) =>
              conns.map((conn, i) => {
                const isActive =
                  stage.activeSystems.includes(conn.from) && stage.activeSystems.includes(conn.to);
                return (
                  <ArrowPath
                    key={`${key}-${i}`}
                    from={conn.from}
                    to={conn.to}
                    type={conn.type}
                    active={isActive}
                    index={i}
                    total={conns.length}
                  />
                );
              }),
            )}

            {SYSTEMS.map((node) => (
              <SystemBlock
                key={node.id}
                node={node}
                active={stage.activeSystems.includes(node.id)}
                isAgent={node.id === "bm_agent"}
                failed={failedSystems.includes(node.id)}
                stageColor={stage.color}
              />
            ))}

            {Object.entries(connectionGroups).flatMap(([key, conns]) =>
              conns.flatMap((conn, i) => {
                const isActive =
                  stage.activeSystems.includes(conn.from) && stage.activeSystems.includes(conn.to);
                const badgeNumber = isActive
                  ? connectionNumbers.get(connectionKey(conn.from, conn.to, conn.type, conn.label))
                  : undefined;
                if (!isActive || badgeNumber == null) return [];
                return [
                  <ArrowBadge
                    key={`badge-${key}-${i}`}
                    from={conn.from}
                    to={conn.to}
                    type={conn.type}
                    index={i}
                    total={conns.length}
                    badgeNumber={badgeNumber}
                  />,
                ];
              }),
            )}
          </svg>
        </div>
      </div>

      <div className="mt-3 shrink-0 border-t border-border pt-3">
        <h3 className="text-sm font-medium text-foreground">What moves this stage</h3>
        <p className="mb-2 text-xs text-muted-foreground">
          Numbered circles on arrows match the list below. Color = READ / WRITE / NOTIFY / ESCALATE.
        </p>
        <ol className="grid list-none gap-2 sm:grid-cols-2">
          {activeConnections.map((conn, i) => {
            const n = i + 1;
            const color = ARROW_COLORS[conn.type];
            return (
              <li
                key={`${conn.from}-${conn.to}-${conn.type}-${i}`}
                className="flex items-start gap-2.5 rounded-md border border-border/60 bg-muted/30 px-3 py-2.5"
              >
                <span
                  className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-white text-xs font-bold"
                  style={{ borderColor: color, color }}
                  aria-hidden
                >
                  {n}
                </span>
                <div className="min-w-0">
                  <span
                    className="mb-1 inline-block rounded px-1.5 py-0.5 font-mono text-xs font-bold"
                    style={{ color, background: `${color}18` }}
                  >
                    {conn.type}
                  </span>
                  <p className="text-sm leading-snug text-foreground">
                    <span className="font-medium">{systemLabel(conn.from)}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span className="font-medium">{systemLabel(conn.to)}</span>
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{conn.label}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {/* ── Failure mode summary strip ──────────────────────────────────── */}
      {/* Renders below the SVG when failure mode is active, listing which
          systems are offline and what the agent's degraded behaviour is. */}
      {failureMode && (
        <div className="mt-2 shrink-0">
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
            <div className="h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
            <p className="text-xs text-red-700">
              <span className="font-semibold">Degraded:</span>{" "}
              {stage.failureMode.affectedSystems.length > 0
                ? `${stage.failureMode.affectedSystems.map((id) => SYSTEMS.find((s) => s.id === id)?.shortLabel).join(", ")} offline`
                : "No offline systems for this stage"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
