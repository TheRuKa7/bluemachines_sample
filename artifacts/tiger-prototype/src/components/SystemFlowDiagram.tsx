import { useMemo } from "react";
import { SYSTEMS, STAGES, type StageId, type SystemId, type ArrowType } from "@/data/model";

interface SystemFlowDiagramProps {
  selectedStage: StageId;
  failureMode: boolean;
}

const ARROW_COLORS: Record<ArrowType, string> = {
  READ: "#3b82f6",
  WRITE: "#22c55e",
  NOTIFY: "#f59e0b",
  ESCALATE: "#ef4444",
};

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

const W = 600;
const H = 500;
const NODE_W = 140;
const NODE_H = 40;
const AGENT_W = 160;
const AGENT_H = 52;

function getNodeCenter(id: SystemId) {
  const node = SYSTEMS.find((s) => s.id === id)!;
  return { x: node.x + node.w / 2, y: node.y + node.h / 2 };
}

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

  const offset = total > 1 ? (index - (total - 1) / 2) * 8 : 0;
  const midX = (fromPt.x + toPt.x) / 2;
  const midY = (fromPt.y + toPt.y) / 2 + offset;

  const path = `M ${fromPt.x} ${fromPt.y} Q ${midX} ${midY} ${toPt.x} ${toPt.y}`;

  const labelX = midX;
  const labelY = midY - 4;

  return (
    <g style={{ opacity, transition: "opacity 0.3s ease" }}>
      <defs>
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
      {active && (
        <text x={labelX} y={labelY} textAnchor="middle" fontSize="7.5" fill={color} opacity={0.9} fontFamily="monospace">
          {type}
        </text>
      )}
    </g>
  );
}

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
      <rect
        x={node.x}
        y={node.y}
        width={node.w}
        height={node.h}
        rx={4}
        fill={active ? `${color}12` : "transparent"}
        stroke={active ? color : "hsl(215 20% 22%)"}
        strokeWidth={isAgent ? 2 : 1}
        style={{ transition: "all 0.3s ease" }}
      />
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
      {failed && active && (
        <g>
          <circle cx={node.x + node.w - 8} cy={node.y + 8} r={5} fill="#ef4444" opacity={0.9} />
          <text x={node.x + node.w - 8} y={node.y + 8} textAnchor="middle" dominantBaseline="middle" fontSize={7} fill="white" fontWeight="bold">!</text>
        </g>
      )}
    </g>
  );
}

export function SystemFlowDiagram({ selectedStage, failureMode }: SystemFlowDiagramProps) {
  const stage = STAGES.find((s) => s.id === selectedStage)!;

  const connectionGroups = useMemo(() => {
    const groups: Record<string, typeof stage.connections> = {};
    for (const conn of stage.connections) {
      const key = `${conn.from}→${conn.to}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(conn);
    }
    return groups;
  }, [stage]);

  const failedSystems = failureMode ? stage.failureMode.affectedSystems : [];

  return (
    <div className="w-full h-full flex flex-col">
      <div className="flex items-center justify-between mb-3 flex-shrink-0 px-1">
        <div>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">System Interaction Flow</span>
          <span className="text-[10px] text-muted-foreground ml-2">— {stage.label}</span>
        </div>
        <div className="flex items-center gap-3">
          {(["READ", "WRITE", "NOTIFY", "ESCALATE"] as ArrowType[]).map((type) => (
            <div key={type} className="flex items-center gap-1">
              <div className="w-6 h-0.5" style={{ background: ARROW_COLORS[type] }} />
              <span className="text-[9px] font-mono" style={{ color: ARROW_COLORS[type] }}>{type}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center min-h-0">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          style={{ maxHeight: "420px" }}
        >
          <defs>
            <filter id="glow">
              <feGaussianBlur stdDeviation="2" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Column labels */}
          <text x={30 + NODE_W / 2} y={18} textAnchor="middle" fontSize={8} fill="hsl(215 16% 38%)" fontFamily="system-ui" letterSpacing="1">DATA SOURCES</text>
          <text x={236 + AGENT_W / 2} y={18} textAnchor="middle" fontSize={8} fill="hsl(215 16% 38%)" fontFamily="system-ui" letterSpacing="1">ORCHESTRATION</text>
          <text x={424 + NODE_W / 2} y={18} textAnchor="middle" fontSize={8} fill="hsl(215 16% 38%)" fontFamily="system-ui" letterSpacing="1">OUTPUT SYSTEMS</text>

          {/* Grid lines */}
          <line x1={200} y1={22} x2={200} y2={H - 20} stroke="hsl(215 20% 16%)" strokeWidth={1} strokeDasharray="4 4" />
          <line x1={410} y1={22} x2={410} y2={H - 20} stroke="hsl(215 20% 16%)" strokeWidth={1} strokeDasharray="4 4" />

          {/* Connections */}
          {Object.entries(connectionGroups).map(([key, conns]) =>
            conns.map((conn, i) => (
              <ArrowPath
                key={`${key}-${i}`}
                from={conn.from}
                to={conn.to}
                type={conn.type}
                active={stage.activeSystems.includes(conn.from) && stage.activeSystems.includes(conn.to)}
                label={conn.label}
                index={i}
                total={conns.length}
              />
            ))
          )}

          {/* System nodes */}
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

          {/* Active connection labels tooltip strip */}
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
                  {`${conn.from === "bm_agent" ? "→" : "←"} ${conn.label.slice(0, 42)}${conn.label.length > 42 ? "…" : ""}`}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {failureMode && (
        <div className="flex-shrink-0 mt-2 px-1">
          <div className="rounded border border-red-800/40 bg-red-950/20 px-3 py-1.5 flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <p className="text-[10px] text-red-400">
              <span className="font-semibold">Degraded:</span>{" "}
              {stage.failureMode.affectedSystems.length > 0
                ? `${stage.failureMode.affectedSystems.map(id => SYSTEMS.find(s => s.id === id)?.shortLabel).join(", ")} offline — agent enters fallback mode`
                : "All systems nominal — no failure systems for this stage"}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
