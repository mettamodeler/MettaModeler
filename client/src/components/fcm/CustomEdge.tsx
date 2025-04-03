import { useCallback, useState } from 'react';
import { 
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
  MarkerType,
} from 'reactflow';
import { Slider } from '@/components/ui/slider';

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
  
  // Generate bezier path for the edge
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });
  
  // Determine edge color based on weight value
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
        // Get the first value from the slider array
        const newWeight = value[0];
        onChange(id, newWeight);
      }
    },
    [id, onChange]
  );
  
  const [isVisible, setIsVisible] = useState(false);
  
  return (
    <>
      <>
        <path
          id={id}
          className="react-flow__edge-path cursor-pointer"
          d={edgePath}
          style={edgeStyle}
          onClick={() => setIsVisible(!isVisible)}
          onMouseEnter={() => setIsVisible(true)}
          onMouseLeave={() => setIsVisible(false)}
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
      <EdgeLabelRenderer>
        {isVisible && (
          <div
            className="dark-glass p-2 rounded-md shadow-glow-sm absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col min-w-[160px] cursor-pointer animate-in zoom-in-95 duration-200"
            style={{
              left: labelX,
              top: labelY,
              padding: '12px',
              zIndex: 1000,
            }}
          >
            <div className="flex justify-between items-center mb-1 px-1">
              <span className="text-xs">{weight.toFixed(1)}</span>
              <span className={`text-xs ${isPositive ? 'text-red-500' : 'text-blue-500'}`}>
                {isPositive ? 'Positive' : 'Negative'}
              </span>
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
        )}
      </EdgeLabelRenderer>
    </>
  );
}
