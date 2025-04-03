import { useCallback, useState } from 'react';
import { 
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  MarkerType,
  Position,
} from 'reactflow';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CustomEdgeData {
  weight: number;
  onChange?: (id: string, weight: number) => void;
}

export default function CustomEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}: EdgeProps<CustomEdgeData>) {
  const { weight, onChange } = data || { weight: 0 };

  // Calculate if this is a self-loop or find bidirectional edges
  const isSelfLoop = source === target;
  const hasBidirectionalEdge = data?.edges?.some(e => 
    (e.source === target && e.target === source) || 
    (e.source === source && e.target === target && e.id !== id)
  );
  
  // Get offset from edge data or calculate it
  const offset = data?.offset || 0;
  
  // Calculate midpoint
  const midX = (sourceX + targetX) / 2;
  const midY = (sourceY + targetY) / 2;
  
  // Calculate perpendicular offset point
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const length = Math.sqrt(dx * dx + dy * dy);
  
  let controlPoint;
  if (isSelfLoop) {
    // Create a loop that comes out from the source handle direction
    const distance = 100;
    if (sourcePosition === Position.Left || sourcePosition === Position.Right) {
      controlPoint = {
        x: sourceX + (sourcePosition === Position.Left ? -distance : distance),
        y: sourceY
      };
    } else {
      controlPoint = {
        x: sourceX,
        y: sourceY + (sourcePosition === Position.Top ? -distance : distance)
      };
    }
  } else if (offset !== 0) {
    // Calculate midpoint based on handle positions for smoother curves
    const midpointOffsetX = (sourcePosition === Position.Left ? -20 : sourcePosition === Position.Right ? 20 : 0);
    const midpointOffsetY = (sourcePosition === Position.Top ? -20 : sourcePosition === Position.Bottom ? 20 : 0);
    const targetOffsetX = (targetPosition === Position.Left ? -20 : targetPosition === Position.Right ? 20 : 0);
    const targetOffsetY = (targetPosition === Position.Top ? -20 : targetPosition === Position.Bottom ? 20 : 0);
    
    controlPoint = {
      x: midX + midpointOffsetX + targetOffsetX + (-dy / length) * offset,
      y: midY + midpointOffsetY + targetOffsetY + (dx / length) * offset
    };
  }

  // Determine positions based on handle IDs
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition: sourcePosition || Position.Top,
    targetX,
    targetY,
    targetPosition: targetPosition || Position.Top,
    curvature: isSelfLoop ? 0.8 : offset !== 0 ? Math.abs(offset) * 0.2 : 0.2,
  });

  const isPositive = weight >= 0;
  const edgeColor = isPositive 
    ? 'rgba(239, 68, 68, 0.8)' // red for positive
    : 'rgba(59, 130, 246, 0.8)'; // blue for negative

  const edgeStyle = {
    stroke: edgeColor,
    strokeWidth: 2,
    filter: selected 
      ? `drop-shadow(0 0 5px ${edgeColor})` 
      : `drop-shadow(0 0 3px ${edgeColor})`,
  };

  const handleWeightChange = useCallback(
    (value: number[]) => {
      if (onChange) {
        const newWeight = value[0];
        onChange(id, newWeight);
      }
    },
    [id, onChange]
  );

  return (
    <>
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: 'translate(-50%, -50%)',
            left: labelX,
            top: labelY,
            zIndex: 1000,
            pointerEvents: 'all',
          }}
        >
          <Popover>
            <PopoverTrigger asChild>
              <div 
                className="w-6 h-6 rounded-full bg-background/80 cursor-pointer hover:bg-background flex items-center justify-center border border-border"
              >
                <span className="text-xs font-mono">{weight.toFixed(1)}</span>
              </div>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4 dark-glass">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-xs">{weight.toFixed(1)}</span>
                  <span className={`text-xs ${isPositive ? 'text-red-500' : 'text-blue-500'}`}>
                    {isPositive ? 'Positive' : 'Negative'}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onChange?.(id, 0); // Reset weight to trigger deletion
                      // setIsVisible(false); //Requires state management addition
                    }}
                    className="ml-2 p-1 hover:bg-red-500/20 rounded-sm"
                    title="Delete edge"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12"/>
                    </svg>
                  </button>
                </div>
                <Slider
                  value={[weight]}
                  min={-1}
                  max={1}
                  step={0.1}
                  onValueChange={handleWeightChange}
                  className={`${isPositive ? 'bg-red-950/30' : 'bg-blue-950/30'}`}
                />
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </EdgeLabelRenderer>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={edgeStyle}
        markerEnd={`url(#${id}-arrow)`}
      />
      <defs>
        <marker
          id={`${id}-arrow`}
          markerWidth="25"
          markerHeight="25"
          viewBox="-10 -10 20 20"
          orient="auto"
          refX="0"
          refY="0"
        >
          <polyline
            stroke={edgeColor}
            strokeWidth="1"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={edgeColor}
            points="-5,-4 0,0 -5,4 -5,-4"
          />
        </marker>
      </defs>
    </>
  );
}