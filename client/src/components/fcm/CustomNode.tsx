import { useCallback, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
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
  
  // Handle styles for better visibility
  const handleStyle = {
    width: '10px',
    height: '10px',
    background: 'rgba(255, 255, 255, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.8)',
    borderRadius: '50%',
    transition: 'all 0.2s ease',
    opacity: 0.3, // Start with low opacity
  };
  
  // Handle hover style
  const handleHoverStyle = {
    ...handleStyle,
    opacity: 1,
    transform: 'scale(1.2)',
    boxShadow: '0 0 5px rgba(255, 255, 255, 0.8)',
  };
  
  return (
    <div 
      className={`node rounded-lg p-3 min-w-[150px] text-center ${selected ? 'ring-2 ring-secondary' : ''}`} 
      style={{ backgroundColor: getNodeColor() }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Add handles on all sides to allow connections from any direction */}
      <Handle 
        type="target" 
        position={Position.Top} 
        style={isHovered || selected ? handleHoverStyle : handleStyle} 
        className="handle-top"
      />
      <Handle 
        type="target" 
        position={Position.Left} 
        style={isHovered || selected ? handleHoverStyle : handleStyle}
        className="handle-left"
      />
      <Handle 
        type="target" 
        position={Position.Right} 
        style={isHovered || selected ? handleHoverStyle : handleStyle}
        className="handle-right"
      />
      <Handle 
        type="target" 
        position={Position.Bottom} 
        style={isHovered || selected ? handleHoverStyle : handleStyle}
        className="handle-bottom"
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
      
      <Handle 
        type="source" 
        position={Position.Top} 
        style={isHovered || selected ? handleHoverStyle : handleStyle}
        className="handle-top"
      />
      <Handle 
        type="source" 
        position={Position.Left} 
        style={isHovered || selected ? handleHoverStyle : handleStyle}
        className="handle-left"
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        style={isHovered || selected ? handleHoverStyle : handleStyle}
        className="handle-right"
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        style={isHovered || selected ? handleHoverStyle : handleStyle}
        className="handle-bottom"
      />
    </div>
  );
}
