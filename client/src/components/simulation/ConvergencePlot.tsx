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

export default function ConvergencePlot({ simulationResult, nodeLabels }: ConvergencePlotProps) {
  // Extract time series data
  const { timeSeriesData, iterations } = simulationResult;
  
  // Generate labels for x-axis (iterations)
  const labels = Array.from({ length: iterations + 1 }, (_, i) => `${i}`);
  
  // Generate datasets for each node
  const datasets = Object.entries(timeSeriesData).map(([nodeId, values], index) => {
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
      label: nodeLabels[nodeId] || `Node ${nodeId}`,
      data: values,
      borderColor: colors[colorIndex],
      backgroundColor: colors[colorIndex].replace('1)', '0.2)'),
      tension: 0.3,
    };
  });
  
  const data: ChartData<'line'> = {
    labels,
    datasets,
  };
  
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      y: {
        beginAtZero: true,
        max: 1,
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
      x: {
        title: {
          display: true,
          text: 'Iterations',
          color: 'rgba(255, 255, 255, 0.8)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.8)',
        },
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
      },
    },
    plugins: {
      legend: {
        position: 'top',
        labels: {
          color: 'rgba(255, 255, 255, 0.8)',
          boxWidth: 12,
          font: {
            family: 'Montserrat',
          },
        },
      },
      title: {
        display: true,
        text: 'Convergence Plot',
        color: 'rgba(255, 255, 255, 0.9)',
        font: {
          family: 'Montserrat',
          size: 14,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        titleFont: {
          family: 'Montserrat',
        },
        bodyFont: {
          family: 'Montserrat',
        },
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += context.parsed.y.toFixed(3);
            }
            return label;
          }
        }
      },
    },
    animation: {
      duration: 1000,
    },
  };
  
  return (
    <div className="h-64 w-full">
      <Line data={data} options={options} />
    </div>
  );
}
