import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
  ChartData
} from 'chart.js';
import { SimulationResult, SimulationNode } from '@shared/schema';
import { isComparisonSimulationResult, ComparisonSimulationResult } from '@/lib/types';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface CompareConvergencePlotProps {
  simulationResult: SimulationResult | ComparisonSimulationResult;
  nodeLabels: Record<string, string>;
  nodeColors: Record<string, string>;
  visibleConcepts?: Record<string, boolean>;
}

export function CompareConvergencePlot({
  simulationResult,
  nodeLabels,
  nodeColors,
  visibleConcepts
}: CompareConvergencePlotProps) {
  if (!isComparisonSimulationResult(simulationResult)) {
    return null;
  }

  const { comparisonTimeSeries, baselineTimeSeries } = simulationResult;
  
  console.log('CompareConvergencePlot received data:');
  console.log('Baseline time series:', baselineTimeSeries);
  console.log('Comparison time series:', comparisonTimeSeries);
  
  // Calculate max iterations
  const maxIterations = Math.max(
    ...Object.values(comparisonTimeSeries).map(arr => arr?.length || 0),
    ...Object.values(baselineTimeSeries).map(arr => arr?.length || 0)
  );

  const datasets = useMemo(() => {
    if (!comparisonTimeSeries || Object.keys(comparisonTimeSeries).length === 0) {
      return [];
    }

    return Object.entries(nodeLabels)
      .filter(([nodeId]) => !visibleConcepts || visibleConcepts[nodeId])
      .flatMap(([nodeId, label]) => {
        const baselineData = baselineTimeSeries[nodeId] || [];
        const scenarioData = comparisonTimeSeries[nodeId] || [];

        console.log(`Node ${nodeId} (${label}) data:`, {
          baseline: baselineData,
          scenario: scenarioData
        });

        // Only add datasets if we have data for both baseline and scenario
        if (baselineData.length === 0 || scenarioData.length === 0) {
          return [];
        }

        return [
          {
            label: `${label} (Baseline)` ,
            data: baselineData,
            borderColor: '#8884d8', // grayish blue for baseline
            backgroundColor: '#8884d840',
            borderWidth: 2,
            pointRadius: 2,
            borderDash: [6, 4],
            tension: 0.3,
            order: 1,
          },
          {
            label: `${label} (Scenario)` ,
            data: scenarioData,
            borderColor: nodeColors[nodeId],
            backgroundColor: `${nodeColors[nodeId]}40`,
            borderWidth: 3,
            pointRadius: 3,
            borderDash: [],
            tension: 0.3,
            order: 2,
          }
        ];
      });
  }, [comparisonTimeSeries, baselineTimeSeries, nodeLabels, nodeColors, visibleConcepts]);

  // Create chart data
  const data: ChartData<'line'> = {
    labels: Array.from({ length: maxIterations }, (_, i) => i.toString()),
    datasets,
  };

  // Chart options
  const options: ChartOptions<'line'> = {
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
        text: 'Convergence Comparison',
        padding: 20,
      },
      tooltip: {
        enabled: true,
        mode: 'nearest',
        intersect: false,
        callbacks: {
          label: (context) => {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            const isBaseline = label.includes('(Baseline)');
            const nodeId = label.split(' (')[0];
            const initialValue = isBaseline 
              ? baselineTimeSeries[nodeId]?.[0] 
              : comparisonTimeSeries[nodeId]?.[0];
            const change = value - initialValue;
            return [
              `${label}: ${value.toFixed(3)}`,
              `Change from initial: ${change.toFixed(3)}`
            ];
          }
        },
        displayColors: true,
        backgroundColor: '#22223b',
        titleColor: '#fff',
        bodyColor: '#fff',
        borderColor: '#fff',
        borderWidth: 1,
      }
    },
    hover: {
      mode: 'nearest',
      intersect: false,
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
  };

  if (datasets.length === 0) {
    return (
      <div className="h-[400px] w-full flex items-center justify-center">
        <p className="text-gray-400">No convergence data available</p>
      </div>
    );
  }

  return (
    <div className="h-[400px] w-full">
      <Line data={data} options={options} />
    </div>
  );
} 