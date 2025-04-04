import { useEffect, useState } from "react";

export function LoadingScreen() {
  const [nodes, setNodes] = useState<{ x: number; y: number; radius: number; color: string; direction: number; speed: number }[]>([]);
  const [connections, setConnections] = useState<{ source: number; target: number }[]>([]);
  
  useEffect(() => {
    // Generate 8-10 random nodes with different colors
    const colors = ["#8b5cf6", "#06b6d4", "#10b981", "#3b82f6"];
    const nodeCount = Math.floor(Math.random() * 3) + 8; // 8-10 nodes
    const newNodes = Array.from({ length: nodeCount }).map((_, i) => ({
      x: Math.random() * 0.8 + 0.1, // Position between 10-90% of container
      y: Math.random() * 0.8 + 0.1,
      radius: Math.random() * 15 + 10, // Random size between 10-25px
      color: colors[Math.floor(Math.random() * colors.length)],
      direction: Math.random() * Math.PI * 2, // Random direction
      speed: (Math.random() * 0.3 + 0.1) / 100, // Very slow random speed
    }));
    
    // Create connections between nodes
    const newConnections: { source: number; target: number }[] = [];
    // Connect center node to all others
    const centerNodeIndex = 0;
    for (let i = 1; i < newNodes.length; i++) {
      newConnections.push({ source: centerNodeIndex, target: i });
    }
    
    // Add some random connections between other nodes
    const connectionCount = Math.floor(Math.random() * nodeCount);
    for (let i = 0; i < connectionCount; i++) {
      const source = Math.floor(Math.random() * nodeCount);
      let target = Math.floor(Math.random() * nodeCount);
      if (source !== target) {
        newConnections.push({ source, target });
      }
    }
    
    setNodes(newNodes);
    setConnections(newConnections);
    
    // Animation loop for nodes moving slowly
    const interval = setInterval(() => {
      setNodes(prevNodes => 
        prevNodes.map(node => ({
          ...node,
          x: node.x + Math.cos(node.direction) * node.speed,
          y: node.y + Math.sin(node.direction) * node.speed,
          // Bounce off edges
          direction: 
            (node.x <= 0.1 || node.x >= 0.9) ? 
              Math.PI - node.direction : 
              (node.y <= 0.1 || node.y >= 0.9) ? 
                -node.direction : node.direction
        }))
      );
    }, 50);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="relative w-full h-full max-w-lg max-h-lg">
        {/* Connections */}
        <svg className="absolute inset-0 w-full h-full">
          {connections.map((conn, i) => {
            const source = nodes[conn.source];
            const target = nodes[conn.target];
            if (!source || !target) return null;
            
            return (
              <line 
                key={`line-${i}`}
                x1={`${source.x * 100}%`} 
                y1={`${source.y * 100}%`} 
                x2={`${target.x * 100}%`} 
                y2={`${target.y * 100}%`}
                stroke={`${source.color}40`} // Transparent stroke
                strokeWidth="2"
                className="animate-pulse"
              />
            );
          })}
        </svg>
        
        {/* Nodes */}
        {nodes.map((node, i) => (
          <div 
            key={`node-${i}`}
            className="absolute rounded-full animate-pulse"
            style={{
              left: `${node.x * 100}%`,
              top: `${node.y * 100}%`,
              width: `${node.radius * 2}px`,
              height: `${node.radius * 2}px`,
              backgroundColor: `${node.color}90`, // Semi-transparent
              transform: 'translate(-50%, -50%)',
              boxShadow: `0 0 15px ${node.color}90`,
            }}
          />
        ))}
      </div>
      
      <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2">
        <div className="relative h-2 w-32 bg-gray-700/50 rounded overflow-hidden flex items-center">
          <div className="absolute h-full bg-primary animate-loading-bar" />
        </div>
      </div>
    </div>
  );
}