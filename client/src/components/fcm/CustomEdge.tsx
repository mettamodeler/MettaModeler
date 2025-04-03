import { useCallback } from 'react';
import { 
  BaseEdge,
  EdgeLabelRenderer,
  EdgeProps,
  getBezierPath,
} from 'reactflow';

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
  
  const handleWeightChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        const newWeight = parseFloat(evt.target.value);
        // Clamp weight between -1 and 1
        const clampedWeight = Math.max(-1, Math.min(1, newWeight));
        onChange(id, clampedWeight);
      }
    },
    [id, onChange]
  );
  
  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        className={selected ? 'stroke-secondary/80' : 'stroke-secondary/50'}
        style={{
          filter: selected 
            ? 'drop-shadow(0 0 5px rgba(0, 196, 255, 0.8))' 
            : 'drop-shadow(0 0 3px rgba(0, 196, 255, 0.6))',
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="dark-glass px-1 text-xs shadow-glow-sm absolute transform -translate-x-1/2 -translate-y-1/2"
          style={{
            left: labelX,
            top: labelY,
          }}
        >
          <input
            type="number"
            step="0.1"
            min="-1"
            max="1"
            value={weight.toFixed(1)}
            onChange={handleWeightChange}
            className="bg-transparent border-none text-center w-16 focus:outline-none"
            onFocus={(e) => e.target.select()}
          />
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
