import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { SimulationResult } from '@/lib/types';
import { toStringId } from '@/lib/utils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ConvergencePlotProps {
  simulationResult: SimulationResult;
  nodeLabels: Record<string, string>; // Map of node IDs to labels
}

// Helper to convert timeSeries (array of objects) to node-major format
function convertTimeSeriesArrayToData(timeSeries: Array<Record<string, number>>): Record<string, number[]> {
  if (!Array.isArray(timeSeries) || timeSeries.length === 0) return {};
  const nodeIds = Object.keys(timeSeries[0]);
  const timeSeriesData: Record<string, number[]> = {};
  nodeIds.forEach(nodeId => {
    timeSeriesData[nodeId] = timeSeries.map(iter => iter[nodeId]);
  });
  return timeSeriesData;
}

// Helper to ensure timeSeries is in node-major format
function ensureNodeMajorFormat(timeSeries: any): Record<string, number[]> {
  // If it's already in node-major format (object of arrays), return as is
  if (timeSeries && typeof timeSeries === 'object' && !Array.isArray(timeSeries)) {
    return timeSeries;
  }
  // If it's in iteration-major format (array of objects), convert it
  return convertTimeSeriesArrayToData(timeSeries);
}

export default function ConvergencePlot({ simulationResult, nodeLabels }: ConvergencePlotProps) {
  // Extract time series data and iterations
  const { timeSeries, iterations } = simulationResult;
  
  // Convert time series to node-major format if needed
  const timeSeriesData = ensureNodeMajorFormat(timeSeries);
  
  // Log data for debugging
  console.log('ConvergencePlot data:', {
    originalTimeSeries: timeSeries,
    convertedTimeSeries: timeSeriesData,
    iterations,
    nodeLabels
  });
  
  // Generate labels for x-axis (iterations)
  const labels = Array.from({ length: iterations + 1 }, (_, i) => `${i}`);
  
  // Generate datasets for each node
  const datasets = Object.entries(timeSeriesData).map(([nodeId, values], index) => {
    // Use nodeLabels for legend and tooltips
    const label = nodeLabels[nodeId] || `Node ${nodeId}`;
    // Colors from theme
    const colors = [
      'rgba(168, 85, 247, 1)', // purple
      'rgba(0, 196, 255, 1)',  // teal
      'rgba(239, 68, 68, 1)',  // red
      'rgba(59, 130, 246, 1)', // blue
      'rgba(234, 179, 8, 1)',  // yellow
    ];
    const colorIndex = index % colors.length;
    return {
      label,
      data: values as number[],
      borderColor: colors[colorIndex],
      backgroundColor: colors[colorIndex].replace('1)', '0.2)'),
      tension: 0.3,
    };
  });
  
  const data: ChartData<'line'> = {
    labels,
    datasets,
  };
  
  return (
    <div className="h-[400px] w-full">
      <Line data={data} options={{
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right' as const,
            labels: {
              padding: 20,
              usePointStyle: true,
              pointStyle: 'circle',
            },
          },
          title: {
            display: true,
            text: 'Convergence Plot',
            padding: 20,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return `${label}: ${value.toFixed(3)}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Node Value',
              padding: 20,
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            }
          },
          x: {
            title: {
              display: true,
              text: 'Iteration',
              padding: 20,
            },
            grid: {
              color: 'rgba(255, 255, 255, 0.1)',
            }
          },
        },
        elements: {
          line: {
            borderWidth: 2,
          },
          point: {
            hoverRadius: 6,
          }
        },
      }} />
    </div>
  );
}
