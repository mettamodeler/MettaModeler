import { useCallback, useState } from 'react';
import { Handle, Position, NodeProps, Connection } from 'reactflow';
import { NodeType } from '@/lib/types';

type CustomNodeData = {
  label: string;
  type: NodeType;
  value: number;
  color?: string;
  onChange?: (id: string, label: string) => void;
  onTypeChange?: (id: string, type: NodeType) => void;
};

export default function CustomNode({ id, data, selected }: NodeProps<CustomNodeData>) {
  const { label, type, value, color, onChange, onTypeChange } = data;
  const [isHovered, setIsHovered] = useState(false);
  
  const handleLabelChange = useCallback(
    (evt: React.ChangeEvent<HTMLInputElement>) => {
      if (onChange) {
        onChange(id, evt.target.value);
      }
    },
    [id, onChange]
  );
  
  const handleTypeChange = useCallback(
    (evt: React.ChangeEvent<HTMLSelectElement>) => {
      if (onTypeChange) {
        onTypeChange(id, evt.target.value as NodeType);
      }
    },
    [id, onTypeChange]
  );

  // Determine background color based on type or explicit color
  const getNodeColor = () => {
    if (color) return color;
    // Default colors
    if (type === 'driver') return '#00C4FF'; // teal
    if (type === 'outcome') return '#A855F7'; // purple
    return '#A855F7'; // purple for regular nodes
  };

  // This is a validation function to determine which connections are valid
  // We're allowing all connections for maximum flexibility
  const isValidConnection = useCallback((connection: Connection) => {
    return true;
  }, []);
  
  return (
    <div 
      className={`node rounded-lg p-3 min-w-[150px] text-center ${selected ? 'ring-2 ring-secondary' : ''}`} 
      style={{ backgroundColor: getNodeColor() }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 
        We're using all 4 positions for both source and target handles
        to allow maximum flexibility in connections.
        React Flow will automatically select the best connection point
        based on proximity when making connections.
      */}
      
      {/* TARGET HANDLES (Accept incoming connections) */}
      <Handle 
        id={`${id}-target-top`}
        type="target" 
        position={Position.Top} 
        isValidConnection={isValidConnection}
        className={`target-handle ${isHovered || selected ? 'visible' : ''}`}
      />
      <Handle 
        id={`${id}-target-right`}
        type="target" 
        position={Position.Right} 
        isValidConnection={isValidConnection}
        className={`target-handle ${isHovered || selected ? 'visible' : ''}`}
      />
      <Handle 
        id={`${id}-target-bottom`}
        type="target" 
        position={Position.Bottom} 
        isValidConnection={isValidConnection}
        className={`target-handle ${isHovered || selected ? 'visible' : ''}`}
      />
      <Handle 
        id={`${id}-target-left`}
        type="target" 
        position={Position.Left} 
        isValidConnection={isValidConnection}
        className={`target-handle ${isHovered || selected ? 'visible' : ''}`}
      />
      
      <input
        type="text"
        value={label}
        onChange={handleLabelChange}
        className="font-medium text-sm bg-transparent text-center w-full border-none focus:outline-none"
      />
      
      <div className="text-xs mt-1 bg-background/20 rounded-sm py-0.5 px-1 flex items-center justify-between">
        <select 
          value={type}
          onChange={handleTypeChange}
          className="bg-transparent border-none text-xs focus:outline-none cursor-pointer"
        >
          <option value="driver">driver</option>
          <option value="regular">regular</option>
          <option value="outcome">outcome</option>
        </select>
        <span className="ml-1">: {value.toFixed(1)}</span>
      </div>
      
      {/* SOURCE HANDLES (Start outgoing connections) */}
      <Handle 
        id={`${id}-source-top`}
        type="source" 
        position={Position.Top} 
        isValidConnection={isValidConnection}
        className={`source-handle ${isHovered || selected ? 'visible' : ''}`}
      />
      <Handle 
        id={`${id}-source-right`}
        type="source" 
        position={Position.Right} 
        isValidConnection={isValidConnection}
        className={`source-handle ${isHovered || selected ? 'visible' : ''}`}
      />
      <Handle 
        id={`${id}-source-bottom`}
        type="source" 
        position={Position.Bottom} 
        isValidConnection={isValidConnection}
        className={`source-handle ${isHovered || selected ? 'visible' : ''}`}
      />
      <Handle 
        id={`${id}-source-left`}
        type="source" 
        position={Position.Left} 
        isValidConnection={isValidConnection}
        className={`source-handle ${isHovered || selected ? 'visible' : ''}`}
      />
    </div>
  );
}
