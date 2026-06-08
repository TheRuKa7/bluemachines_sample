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
 * Bottom annotation strip: the first 4 active connection labels are listed as a
 * compact legend at the bottom-left of the SVG to aid reviewers in reading the diagram.
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
function ArrowPath({
  from,
  to,
  type,
  active,
  label,
  index,
  total,
}: {
  from: SystemId;
  to: SystemId;
  type: ArrowType;
  active: boolean;
  label: string;
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
  const opacity = active ? 1 : 0.12;

  /* Vertical offset so parallel arrows between the same pair don't overlap. */
  const offset = total > 1 ? (index - (total - 1) / 2) * 8 : 0;
  const midX = (fromPt.x + toPt.x) / 2;
  const midY = (fromPt.y + toPt.y) / 2 + offset;

  const path = `M ${fromPt.x} ${fromPt.y} Q ${midX} ${midY} ${toPt.x} ${toPt.y}`;

  /* Label text sits just above the midpoint of the arc. */
  const labelX = midX;
  const labelY = midY - 4;

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
        strokeWidth={active ? 1.5 : 1}
        fill="none"
        markerEnd={`url(#arrow-${from}-${to}-${type})`}
        className={active ? "flow-animated" : ""}
        strokeDasharray={active ? "6 4" : "none"}
      />
      {/* Operation-type label (READ / WRITE / etc.) shown only on active arrows */}
      {active && (
        <text x={labelX} y={labelY} textAnchor="middle" fontSize="7.5" fill={color} opacity={0.9} fontFamily="monospace">
          {type}
        </text>
      )}
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
  const opacity = active ? 1 : 0.3;

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
      {/* Primary label — splits " / " compound names onto two lines */}
      <text
        x={node.x + node.w / 2}
        y={node.y + node.h / 2 - (isAgent ? 7 : 0)}
        textAnchor="middle"
        dominantBaseline="middle"
        fontSize={isAgent ? 11 : 9.5}
        fontWeight={isAgent ? "700" : "500"}
        fill={active ? color : "hsl(215 16% 40%)"}
        fontFamily="system-ui, sans-serif"
        style={{ transition: "all 0.3s ease" }}
      >
        {node.label.split(" / ")[0]}
      </text>
      {/* Second line of the label for compound names (e.g. "CRM / Journey State" → "Journey State") */}
      {node.label.includes(" / ") && (
        <text
          x={node.x + node.w / 2}
          y={node.y + node.h / 2 + 9}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={8.5}
          fill={active ? `${color}90` : "hsl(215 16% 35%)"}
          fontFamily="system-ui, sans-serif"
        >
          {node.label.split(" / ")[1]}
        </text>
      )}
      {/* "VOICE AGENT" sub-label beneath the agent node label */}
      {isAgent && active && (
        <text
          x={node.x + node.w / 2}
          y={node.y + node.h / 2 + 12}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={8}
          fill={`${color}70`}
          fontFamily="system-ui, sans-serif"
          letterSpacing="0.5"
        >
          VOICE AGENT
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

  return (
    <div className="w-full h-full flex flex-col">
      <div className="mb-3 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium text-foreground">Data flow</h2>
          <p className="text-xs text-muted-foreground">{stage.label}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2" role="list" aria-label="Arrow legend">
          {(["READ", "WRITE", "NOTIFY", "ESCALATE"] as ArrowType[]).map((type) => (
            <div key={type} className="flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2 py-0.5" role="listitem">
              <div className="h-0.5 w-5 rounded" style={{ background: ARROW_COLORS[type] }} aria-hidden />
              <span className="font-mono text-[10px] font-medium" style={{ color: ARROW_COLORS[type] }}>{type}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── SVG canvas ─────────────────────────────────────────────────── */}
      <div className="flex-1 flex items-center justify-center min-h-0">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ maxHeight: "420px" }}
        >
          <defs>
            {/* Glow filter applied to the agent node for visual hierarchy */}
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Column header labels */}
          <text x={30 + NODE_W / 2} y={18} textAnchor="middle" fontSize={8} fill="hsl(215 16% 47%)" fontFamily="IBM Plex Sans, system-ui" letterSpacing="1">DATA SOURCES</text>
          <text x={236 + AGENT_W / 2} y={18} textAnchor="middle" fontSize={8} fill="hsl(215 16% 47%)" fontFamily="IBM Plex Sans, system-ui" letterSpacing="1">ORCHESTRATION</text>
          <text x={424 + NODE_W / 2} y={18} textAnchor="middle" fontSize={8} fill="hsl(215 16% 47%)" fontFamily="IBM Plex Sans, system-ui" letterSpacing="1">OUTPUT SYSTEMS</text>

          <line x1={200} y1={22} x2={200} y2={H - 20} stroke="hsl(214 32% 88%)" strokeWidth={1} strokeDasharray="4 4" />
          <line x1={410} y1={22} x2={410} y2={H - 20} stroke="hsl(214 32% 88%)" strokeWidth={1} strokeDasharray="4 4" />

          {/* ── Connection arrows ───────────────────────────────────────── */}
          {/* Render arrows before nodes so they appear beneath node blocks. */}
          {Object.entries(connectionGroups).map(([key, conns]) =>
            conns.map((conn, i) => (
              <ArrowPath
                key={`${key}-${i}`}
                from={conn.from}
                to={conn.to}
                type={conn.type}
                /* An arrow is "active" only when both endpoints are active this stage. */
                active={stage.activeSystems.includes(conn.from) && stage.activeSystems.includes(conn.to)}
                label={conn.label}
                index={i}
                total={conns.length}
              />
            ))
          )}

          {/* ── System node blocks ──────────────────────────────────────── */}
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

          {/* ── Bottom annotation strip ─────────────────────────────────── */}
          {/* Shows the label text of up to the first 4 active connections as
              a compact quick-read legend at the bottom-left of the diagram. */}
          {stage.connections.slice(0, 4).map((conn, i) => {
            const toNode = SYSTEMS.find((s) => s.id === conn.to)!;
            const isActive = stage.activeSystems.includes(conn.from) && stage.activeSystems.includes(conn.to);
            if (!isActive) return null;
            return (
              <g key={`label-${i}`} opacity={0.7}>
                <text
                  x={30}
                  y={H - 90 + i * 16}
                  fontSize={7.5}
                  fill={ARROW_COLORS[conn.type]}
                  fontFamily="monospace"
                >
                  {/* Prefix "→" for outgoing agent arrows, "←" for incoming reads */}
                  {`${conn.from === "bm_agent" ? "→" : "←"} ${conn.label.slice(0, 42)}${conn.label.length > 42 ? "…" : ""}`}
                </text>
              </g>
            );
          })}
        </svg>
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
