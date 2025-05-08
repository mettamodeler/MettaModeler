export interface FCMNode {
  id: string;
  label: string;
  value: number;
  type?: 'driver' | 'regular';
  isDriver?: boolean;
}

export interface FCMEdge {
  source: string;
  target: string;
  weight: number;
} 