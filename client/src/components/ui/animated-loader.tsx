import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

// Helper function to parse HSL string
function parseHsl(hsl: string): { h: number; s: number; l: number } {
  // Remove any whitespace and split by spaces
  const values = hsl.trim().split(/\s+/);
  if (values.length !== 3) {
    throw new Error(`Invalid HSL format: ${hsl}`);
  }
  
  // Parse values
  const h = parseFloat(values[0]);
  const s = parseFloat(values[1]);
  const l = parseFloat(values[2]);
  
  if (isNaN(h) || isNaN(s) || isNaN(l)) {
    throw new Error(`Invalid HSL values: ${hsl}`);
  }
  
  return { h, s, l };
}

// Helper function to convert HSL to RGB
function hslToRgb(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return `rgb(${Math.round(255 * f(0))}, ${Math.round(255 * f(8))}, ${Math.round(255 * f(4))})`;
}

// Helper function to get theme color with fallback
function getThemeColor(varName: string, fallback: string): string {
  const root = typeof window !== 'undefined' ? document.documentElement : null;
  if (!root) return fallback;
  
  const hsl = getComputedStyle(root).getPropertyValue(`--${varName}`).trim();
  if (!hsl) return fallback;
  
  try {
    const { h, s, l } = parseHsl(hsl);
    return hslToRgb(h, s, l);
  } catch (e) {
    console.warn(`Failed to parse HSL color for ${varName}:`, hsl);
    return fallback;
  }
}

// Helper function to convert RGB to RGBA
function rgbToRgba(rgb: string, alpha: number): string {
  return rgb.replace('rgb', 'rgba').replace(')', `, ${alpha})`);
}

export function AnimatedLoader({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = canvas.clientWidth * window.devicePixelRatio;
      canvas.height = canvas.clientHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    // Initial setup
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);

    // Node and edge configuration
    const nodes: Node[] = [];
    const edges: Edge[] = [];
    const nodeCount = 6;
    const radius = Math.min(canvas.clientWidth, canvas.clientHeight) * 0.35;
    const centerX = canvas.clientWidth / 2;
    const centerY = canvas.clientHeight / 2;
    const nodeRadius = 8;

    // Use a consistent set of colors for both light and dark mode
    const themeColors = [
      getThemeColor('primary', '#A855F7'),
      getThemeColor('secondary', '#00C4FF'),
      getThemeColor('accent', '#10b981'),
      getThemeColor('edge-positive', '#60a5fa'),
    ];

    // Create nodes in a circle
    for (let i = 0; i < nodeCount; i++) {
      const angle = (i * 2 * Math.PI) / nodeCount;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      nodes.push({ 
        id: i, 
        x, 
        y, 
        targetX: x, 
        targetY: y, 
        radius: nodeRadius, 
        color: themeColors[Math.floor(Math.random() * themeColors.length)],
        originalColor: themeColors[Math.floor(Math.random() * themeColors.length)],
        pulseState: 0,
        pulseDirection: 1,
        pulseSpeed: 0.02 + (Math.random() * 0.02)
      });
    }

    // Create edges (connections between nodes)
    for (let i = 0; i < nodeCount; i++) {
      edges.push({ 
        source: i, 
        target: (i + 1) % nodeCount, 
        progress: 0, 
        speed: 0.005 + (Math.random() * 0.005),
        active: false,
        color: 'rgba(148, 163, 184, 0.5)',
        pulseOffset: Math.random() * 2 * Math.PI
      });
      
      // Add some cross-connections
      if (i % 2 === 0) {
        edges.push({ 
          source: i, 
          target: (i + 2) % nodeCount, 
          progress: 0, 
          speed: 0.006 + (Math.random() * 0.004),
          active: false,
          color: 'rgba(148, 163, 184, 0.3)',
          pulseOffset: Math.random() * 2 * Math.PI
        });
      }
    }

    // Animation variables
    let animationFrameId: number;
    let lastTime = 0;

    // Animation function
    const animate = (time: number) => {
      // Calculate delta time
      const deltaTime = time - lastTime;
      lastTime = time;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      
      // Draw and update edges
      edges.forEach(edge => {
        const sourceNode = nodes[edge.source];
        const targetNode = nodes[edge.target];
        
        // Update progress
        edge.progress += edge.speed * (deltaTime / 16.67);
        if (edge.progress > 1) {
          edge.progress = 0;
          edge.active = !edge.active;
        }
        
        // Draw edge
        ctx.beginPath();
        ctx.moveTo(sourceNode.x, sourceNode.y);
        
        // Calculate control points for curve
        const midX = (sourceNode.x + targetNode.x) / 2;
        const midY = (sourceNode.y + targetNode.y) / 2;
        const offset = 30; // Curve offset
        const perpX = -(targetNode.y - sourceNode.y);
        const perpY = targetNode.x - sourceNode.x;
        const len = Math.sqrt(perpX * perpX + perpY * perpY);
        const controlX = midX + (perpX / len) * offset;
        const controlY = midY + (perpY / len) * offset;
        
        ctx.quadraticCurveTo(controlX, controlY, targetNode.x, targetNode.y);
        
        // Set line style
        ctx.strokeStyle = edge.color;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Draw moving pulse along the edge
        const t = edge.progress;
        const pulseX = sourceNode.x * (1 - t) * (1 - t) + 2 * controlX * t * (1 - t) + targetNode.x * t * t;
        const pulseY = sourceNode.y * (1 - t) * (1 - t) + 2 * controlY * t * (1 - t) + targetNode.y * t * t;
        
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, 4, 0, Math.PI * 2);
        ctx.fillStyle = edge.active ? themeColors[Math.floor(Math.random() * themeColors.length)] : themeColors[Math.floor(Math.random() * themeColors.length)];
        ctx.fill();
      });
      
      // Draw and update nodes
      nodes.forEach(node => {
        // Update pulse
        node.pulseState += node.pulseDirection * node.pulseSpeed * (deltaTime / 16.67);
        if (node.pulseState > 1) {
          node.pulseState = 1;
          node.pulseDirection = -1;
        } else if (node.pulseState < 0) {
          node.pulseState = 0;
          node.pulseDirection = 1;
        }
        
        // Draw node
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * (1 + 0.2 * node.pulseState), 0, Math.PI * 2);
        ctx.fillStyle = node.color;
        ctx.fill();
        
        // Draw node glow
        const gradient = ctx.createRadialGradient(
          node.x, node.y, node.radius,
          node.x, node.y, node.radius * 2
        );
        
        gradient.addColorStop(0, rgbToRgba(node.color, 0.5));
        gradient.addColorStop(1, rgbToRgba(node.color, 0));
        
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * 2, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
      });
      
      // Request next frame
      animationFrameId = requestAnimationFrame(animate);
    };
    
    // Start animation
    animationFrameId = requestAnimationFrame(animate);
    
    // Cleanup function
    return () => {
      window.removeEventListener('resize', setCanvasSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div className={cn("flex flex-col items-center justify-center", className)}>
      <canvas 
        ref={canvasRef} 
        className="w-full h-full"
      />
      <p className="mt-4 text-lg font-medium text-primary animate-pulse">
        Loading...
      </p>
    </div>
  );
}

// Types
interface Node {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
  color: string;
  originalColor: string;
  pulseState: number;
  pulseDirection: number;
  pulseSpeed: number;
}

interface Edge {
  source: number;
  target: number;
  progress: number;
  speed: number;
  active: boolean;
  color: string;
  pulseOffset: number;
}