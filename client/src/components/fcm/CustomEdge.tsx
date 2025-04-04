import { useCallback, useState } from 'react';
import { 
  EdgeProps,
  getBezierPath,
  EdgeLabelRenderer,
} from 'reactflow';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CustomEdgeData {
  weight: number;
  onChange?: (id: string, weight: number) => void;
  isBidirectional?: boolean;
  isReversePair?: boolean;
  isHighlighted?: boolean;
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
}: EdgeProps<CustomEdgeData>) {
  const { weight = 0, onChange, isBidirectional, isReversePair, isHighlighted } = data || {};
  const [isHovered, setIsHovered] = useState(false);

  const isPositive = weight >= 0;
  const edgeColor = isPositive 
    ? 'rgba(239, 68, 68, 0.8)' // red for positive
    : 'rgba(59, 130, 246, 0.8)'; // blue for negative

  // Calculate stroke width based on weight magnitude
  const weightMagnitude = Math.abs(weight);
  const strokeWidth = Math.max(1, Math.min(5, weightMagnitude * 4 + 1));

  // Increase stroke width when hovered or highlighted
  const effectiveStrokeWidth = isHovered || isHighlighted || selected 
    ? strokeWidth + 1.5
    : strokeWidth;
  
  // Simple, natural curve with a reasonable default
  // Use different curvature for bidirectional edges
  let curvature = 0.25; // Default gentle curve
  
  // For bidirectional pairs, offset the curves differently
  if (isBidirectional) {
    curvature = isReversePair ? 0.4 : 0.2;
  }
  
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature,
  });

  const handleWeightChange = useCallback(
    (value: number[]) => {
      if (onChange) {
        const newWeight = value[0];
        onChange(id, newWeight);
      }
    },
    [id, onChange]
  );

  // Determine if any highlighting effects should be applied
  const shouldHighlight = isHovered || isHighlighted || selected;
  const highlightFilter = shouldHighlight 
    ? `drop-shadow(0 0 5px ${edgeColor})` 
    : undefined;

  return (
    <>
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={{
          stroke: edgeColor,
          strokeWidth: effectiveStrokeWidth,
          strokeLinejoin: 'round',
          filter: highlightFilter,
          transition: 'stroke-width 0.2s, filter 0.2s',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        markerEnd={isPositive ? `url(#arrowhead-positive)` : `url(#arrowhead-negative)`}
      />

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
                className={`w-6 h-6 rounded-full bg-background/80 cursor-pointer hover:bg-background flex items-center justify-center border border-border ${shouldHighlight ? 'ring-1 ring-white shadow-glow-sm' : ''}`}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
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
    </>
  );
}