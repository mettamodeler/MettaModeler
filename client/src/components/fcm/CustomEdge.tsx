import { useCallback, useMemo } from 'react';
import { 
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  getSmoothStepPath,
  getStraightPath,
  MarkerType,
} from 'reactflow';
import { Slider } from '@/components/ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface CustomEdgeData {
  weight: number;
  onChange?: (id: string, weight: number) => void;
  isBidirectional?: boolean;
  isReversePair?: boolean;
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
  const { weight, onChange, isBidirectional, isReversePair } = data || { weight: 0 };

  // Check if this is a self-loop (edge to the same node)
  const isSelfLoop = source === target;
  
  // Calculate edge path based on whether it's a self-loop or not
  const [edgePath, labelX, labelY] = useMemo(() => {
    if (isSelfLoop) {
      // For self-loops, create a custom curved path that goes out and loops back
      const offset = 80; // Increased offset from the node
      
      // Determine the direction of the loop based on the source position
      let startX = sourceX;
      let startY = sourceY;
      let endX = sourceX;
      let endY = sourceY;
      let controlX1, controlY1, controlX2, controlY2;
      
      // Adjust for different source positions to make the best loop path
      if (sourcePosition === 'top') {
        // Loop above the node
        startX = sourceX - 15;
        endX = sourceX + 15;
        controlX1 = sourceX - 40;
        controlY1 = sourceY - offset;
        controlX2 = sourceX + 40;
        controlY2 = sourceY - offset;
      } else if (sourcePosition === 'bottom') {
        // Loop below the node
        startX = sourceX + 15;
        endX = sourceX - 15;
        controlX1 = sourceX + 40;
        controlY1 = sourceY + offset;
        controlX2 = sourceX - 40;
        controlY2 = sourceY + offset;
      } else if (sourcePosition === 'left') {
        // Loop to the left of the node
        startY = sourceY - 15;
        endY = sourceY + 15;
        controlX1 = sourceX - offset;
        controlY1 = sourceY - 40;
        controlX2 = sourceX - offset;
        controlY2 = sourceY + 40;
      } else {
        // Loop to the right of the node
        startY = sourceY + 15;
        endY = sourceY - 15;
        controlX1 = sourceX + offset;
        controlY1 = sourceY + 40;
        controlX2 = sourceX + offset;
        controlY2 = sourceY - 40;
      }
      
      // Create a cubic bezier curve for smoother self-loops
      // M = move to, C = cubic bezier curve
      const path = `M ${startX},${startY} C ${controlX1},${controlY1} ${controlX2},${controlY2} ${endX},${endY}`;
      
      // Calculate the label position at the peak of the loop
      const labelPosX = (controlX1 + controlX2) / 2;
      const labelPosY = (controlY1 + controlY2) / 2;
      
      return [path, labelPosX, labelPosY];
    } else if (isBidirectional) {
      // For bidirectional edges, we need to create offset paths
      
      // The offset determines how far the edge is curved away from the direct line
      // We use different offset values for each direction to create separation
      const offset = isReversePair ? 15 : -15;
      
      // For bidirectional edges, we'll create a custom bezier path with offset
      // This creates a more natural curve with good separation
      
      // Calculate a direction vector between source and target
      const dx = targetX - sourceX;
      const dy = targetY - sourceY;
      
      // Normalize and scale by the offset to get offset vector
      const distance = Math.sqrt(dx * dx + dy * dy);
      const offsetX = -dy * offset / distance;
      const offsetY = dx * offset / distance;
      
      // Apply the offset to both source and target points
      const sX = sourceX + offsetX;
      const sY = sourceY + offsetY;
      const tX = targetX + offsetX;
      const tY = targetY + offsetY;
      
      // Use bezier path with the offset points
      return getBezierPath({
        sourceX: sX,
        sourceY: sY,
        sourcePosition,
        targetX: tX,
        targetY: tY,
        targetPosition,
        curvature: 0.25,
      });
    } else {
      // For standard edges, use bezier path with slight curvature for elegance
      return getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
        curvature: 0.25, // Slightly more curvature for better visibility
      });
    }
  }, [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, isSelfLoop, isBidirectional, isReversePair]);

  const isPositive = weight >= 0;
  const edgeColor = isPositive 
    ? 'rgba(239, 68, 68, 0.8)' // red for positive
    : 'rgba(59, 130, 246, 0.8)'; // blue for negative

  // Calculate stroke width based on weight magnitude
  // Scale between 1 and 5 for visual clarity
  const weightMagnitude = Math.abs(weight);
  const strokeWidth = Math.max(1, Math.min(5, weightMagnitude * 4 + 1));
  
  // Create a wider but invisible path for easier edge selection
  const pathStyles = {
    stroke: edgeColor,
    strokeWidth,
    // Omit strokeLinecap to avoid TypeScript error
    filter: selected 
      ? `drop-shadow(0 0 5px ${edgeColor})` 
      : `drop-shadow(0 0 3px ${edgeColor})`,
  };
  
  // Style for the selection hit area (wider, transparent)
  const selectionPathStyles = {
    stroke: 'transparent',
    strokeWidth: Math.max(10, strokeWidth + 8), // Much wider for easier selection
    cursor: 'pointer'
  };

  // Style for arrow marker that matches edge thickness
  const arrowStyle = {
    // Omit strokeWidth to avoid TypeScript error
    fill: edgeColor,
    stroke: edgeColor
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
      {/* Invisible wider path for easier selection */}
      <path
        id={`${id}-hitarea`}
        className="react-flow__edge-hitarea"
        d={edgePath}
        style={selectionPathStyles}
      />
      {/* Visible edge path */}
      <path
        id={id}
        className="react-flow__edge-path"
        d={edgePath}
        style={pathStyles}
        markerEnd={`url(#${id}-arrow)`}
      />
      <defs>
        <marker
          id={`${id}-arrow`}
          markerWidth="28"
          markerHeight="28"
          viewBox="-10 -10 20 20"
          orient="auto"
          refX="0"
          refY="0"
        >
          <polyline
            style={arrowStyle}
            points="-5,-4 0,0 -5,4 -5,-4"
          />
        </marker>
      </defs>
    </>
  );
}