import Excel from 'exceljs';
import { FCMModel, FCMNode, FCMEdge, Scenario, SimulationResult } from '@shared/schema';
import { Readable } from 'stream';
import archiver from 'archiver';
import fetch from 'node-fetch';
import * as parser from 'json-2-csv';
import fs from 'fs';
import path from 'path';

// No need for separate import as we installed @types/archiver

const PYTHON_SIM_URL = process.env.PYTHON_SIM_URL || 'http://localhost:5050';

// Type guards for ReactFlow vs Schema formats
interface ReactFlowNode {
  id: string;
  data: {
    label?: string;
    type?: string;
    value?: number;
    color?: string;
    [key: string]: any;
  };
  position?: {
    x: number;
    y: number;
  };
  [key: string]: any;
}

interface ReactFlowEdge {
  id: string;
  source: string;
  target: string;
  data: {
    weight?: number | null;
    [key: string]: any;
  };
  [key: string]: any;
}

function isReactFlowNode(node: any): node is ReactFlowNode {
  return node && typeof node === 'object' && 'data' in node;
}

function isReactFlowEdge(edge: any): edge is ReactFlowEdge {
  return edge && typeof edge === 'object' && 'data' in edge;
}

/**
 * Export formats supported by the application
 */
export enum ExportFormat {
  JSON = 'json',
  EXCEL = 'excel',
  CSV = 'csv',
  JUPYTER = 'jupyter',
}

/**
 * Export types supported by the application
 */
export enum ExportType {
  MODEL = 'model',
  SCENARIO = 'scenario',
  ANALYSIS = 'analysis',
  COMPARISON = 'comparison',
}

interface ExportOptions {
  format: ExportFormat;
  type: ExportType;
  modelId?: number;
  scenarioId?: number; 
  comparisonScenarioId?: number;
  fileName?: string;
}

/**
 * Utility class for handling exports in different formats
 */
export class ExportService {
  /**
   * Generate an export file based on options
   */
  async generateExport(data: any, options: ExportOptions): Promise<{ 
    buffer: Buffer | Readable;
    fileName: string;
    mimeType: string;
  }> {
    const fileName = options.fileName || this.generateFileName(options);
    
    switch (options.format) {
      case ExportFormat.JSON:
        return {
          buffer: Buffer.from(JSON.stringify(data, null, 2)),
          fileName: `${fileName}.json`,
          mimeType: 'application/json'
        };
      
      case ExportFormat.EXCEL:
        return this.generateExcelExport(data, fileName, options.type);
      
      case ExportFormat.CSV:
        return this.generateCSVExport(data, fileName, options.type);
      
      case ExportFormat.JUPYTER:
        return this.generateJupyterExport(data, fileName, options.type, options.modelId, options.scenarioId, options.comparisonScenarioId);
      
      default:
        throw new Error(`Export format '${options.format}' not supported`);
    }
  }

  /**
   * Generate an Excel export
   */
  private async generateExcelExport(data: any, fileName: string, type: ExportType): Promise<{ 
    buffer: Buffer;
    fileName: string;
    mimeType: string;
  }> {
    const workbook = new Excel.Workbook();
    
    if (type === ExportType.MODEL) {
      const model = data as FCMModel;
      
      // Create information sheet
      const infoSheet = workbook.addWorksheet('Model Info');
      infoSheet.columns = [
        { header: 'Property', key: 'property', width: 20 },
        { header: 'Value', key: 'value', width: 50 }
      ];
      
      infoSheet.addRows([
        { property: 'Name', value: model.name },
        { property: 'Description', value: model.description || '' },
        { property: 'Created', value: model.createdAt ? new Date(model.createdAt).toISOString() : '' },
        { property: 'Updated', value: model.updatedAt ? new Date(model.updatedAt).toISOString() : '' },
        { property: 'Node Count', value: model.nodes.length },
        { property: 'Edge Count', value: model.edges.length },
      ]);
      
      // Create nodes sheet
      const nodesSheet = workbook.addWorksheet('Nodes');
      nodesSheet.columns = [
        { header: 'ID', key: 'id', width: 30 },
        { header: 'Label', key: 'label', width: 30 },
        { header: 'Type', key: 'type', width: 15 },
        { header: 'Value', key: 'value', width: 15 },
        { header: 'Position X', key: 'positionX', width: 15 },
        { header: 'Position Y', key: 'positionY', width: 15 },
        { header: 'Color', key: 'color', width: 15 },
      ];
      
      // Format node data properly for Excel export handling both ReactFlow and FCMNode formats
      const formattedNodes = model.nodes.map(node => {
        // Handle both formats using our type guard
        if (isReactFlowNode(node)) {
          // ReactFlow format with data property
          const data = node.data || {};
          return {
            id: node.id,
            label: data.label || '',
            type: data.type || 'regular',
            value: data.value || 0,
            positionX: 'position' in node ? node.position?.x || 0 : 0,
            positionY: 'position' in node ? node.position?.y || 0 : 0,
            color: data.color || '',
          };
        } else {
          // Direct FCMNode format from schema
          return {
            id: node.id,
            label: node.label || '',
            type: node.type || 'regular',
            value: node.value || 0,
            positionX: node.positionX || 0,
            positionY: node.positionY || 0,
            color: node.color || '',
          };
        }
      });
      
      nodesSheet.addRows(formattedNodes);
      
      // Create edges sheet
      const edgesSheet = workbook.addWorksheet('Edges');
      edgesSheet.columns = [
        { header: 'ID', key: 'id', width: 30 },
        { header: 'Source', key: 'source', width: 30 },
        { header: 'Target', key: 'target', width: 30 },
        { header: 'Weight', key: 'weight', width: 15 },
      ];
      
      // Format edge data properly for Excel export handling both ReactFlow and FCMEdge formats
      const formattedEdges = model.edges.map(edge => {
        // Handle both formats using our type guard
        if (isReactFlowEdge(edge)) {
          // ReactFlow format with data property
          const data = edge.data || {};
          return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            weight: data.weight || 0,
          };
        } else {
          // Direct FCMEdge format from schema
          return {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            weight: edge.weight || 0,
          };
        }
      });
      
      edgesSheet.addRows(formattedEdges);
    } 
    else if (type === ExportType.SCENARIO) {
      const scenario = data as Scenario;
      
      // Create information sheet
      const infoSheet = workbook.addWorksheet('Scenario Info');
      infoSheet.columns = [
        { header: 'Property', key: 'property', width: 20 },
        { header: 'Value', key: 'value', width: 50 }
      ];
      
      infoSheet.addRows([
        { property: 'Name', value: scenario.name },
        { property: 'Model ID', value: scenario.modelId },
        { property: 'Created', value: scenario.createdAt ? new Date(scenario.createdAt).toISOString() : '' },
      ]);
      
      // Create initial values sheet
      if (scenario.initialValues) {
        const initialValuesSheet = workbook.addWorksheet('Initial Values');
        initialValuesSheet.columns = [
          { header: 'Node ID', key: 'nodeId', width: 30 },
          { header: 'Value', key: 'value', width: 15 },
        ];
        
        const rows = Object.entries(scenario.initialValues).map(([nodeId, value]) => ({
          nodeId,
          value,
        }));
        initialValuesSheet.addRows(rows);
      }
      
      // Create results sheet
      if (scenario.results) {
        // Final values
        const finalValuesSheet = workbook.addWorksheet('Final Values');
        finalValuesSheet.columns = [
          { header: 'Node ID', key: 'nodeId', width: 30 },
          { header: 'Value', key: 'value', width: 15 },
        ];
        
        const finalValueRows = Object.entries(scenario.results.finalValues).map(([nodeId, value]) => ({
          nodeId,
          value,
        }));
        finalValuesSheet.addRows(finalValueRows);
        
        // Time series data
        const timeSeriesSheet = workbook.addWorksheet('Time Series');
        
        // Create columns for each node
        const nodeIds = Object.keys(scenario.results.timeSeriesData);
        const iterationCount = nodeIds.length > 0 ? 
          scenario.results.timeSeriesData[nodeIds[0]].length : 0;
        
        // Add columns for each node
        timeSeriesSheet.columns = [
          { header: 'Iteration', key: 'iteration', width: 15 },
          ...nodeIds.map(nodeId => ({ header: nodeId, key: nodeId, width: 15 }))
        ];
        
        // Add rows for each iteration
        for (let i = 0; i < iterationCount; i++) {
          const row: any = { iteration: i };
          nodeIds.forEach((nodeId: string) => {
            if (scenario.results) {
              row[nodeId] = scenario.results.timeSeriesData[nodeId][i];
            }
          });
          timeSeriesSheet.addRow(row);
        }
        
        // Add simulation metadata
        const metadataSheet = workbook.addWorksheet('Simulation Metadata');
        metadataSheet.columns = [
          { header: 'Property', key: 'property', width: 20 },
          { header: 'Value', key: 'value', width: 15 },
        ];
        
        metadataSheet.addRows([
          { property: 'Iterations', value: scenario.results.iterations },
          { property: 'Converged', value: scenario.results.converged ? 'Yes' : 'No' },
        ]);
      }
    }
    else if (type === ExportType.ANALYSIS || type === ExportType.COMPARISON) {
      // For analysis data
      const analysisData = data;
      
      // Create information sheet
      const infoSheet = workbook.addWorksheet('Analysis Info');
      infoSheet.columns = [
        { header: 'Property', key: 'property', width: 20 },
        { header: 'Value', key: 'value', width: 50 }
      ];
      
      infoSheet.addRows([
        { property: 'Node Count', value: analysisData.nodeCount },
        { property: 'Edge Count', value: analysisData.edgeCount },
        { property: 'Density', value: analysisData.density },
        { property: 'Is Connected', value: analysisData.isConnected ? 'Yes' : 'No' },
        { property: 'Has Loop', value: analysisData.hasLoop ? 'Yes' : 'No' },
      ]);
      
      // Add centrality measures if available
      if (analysisData.centrality) {
        const centralitySheet = workbook.addWorksheet('Centrality Measures');
        centralitySheet.columns = [
          { header: 'Node ID', key: 'nodeId', width: 30 },
          { header: 'Degree', key: 'degree', width: 15 },
          { header: 'In Degree', key: 'inDegree', width: 15 },
          { header: 'Out Degree', key: 'outDegree', width: 15 },
          { header: 'Betweenness', key: 'betweenness', width: 15 },
          { header: 'Closeness', key: 'closeness', width: 15 },
        ];
        
        const nodeIds = analysisData.nodeIds || Object.keys(analysisData.centrality.degree || {});
        
        const rows = nodeIds.map((nodeId: string) => ({
          nodeId,
          degree: analysisData.centrality.degree?.[nodeId] ?? '',
          inDegree: analysisData.centrality.inDegree?.[nodeId] ?? '',
          outDegree: analysisData.centrality.outDegree?.[nodeId] ?? '',
          betweenness: analysisData.centrality.betweenness?.[nodeId] ?? '',
          closeness: analysisData.centrality.closeness?.[nodeId] ?? '',
        }));
        
        centralitySheet.addRows(rows);
      }
      
      // Add adjacency matrix if available
      if (analysisData.adjacencyMatrix && analysisData.nodeIds) {
        const matrixSheet = workbook.addWorksheet('Adjacency Matrix');
        
        // First column is node ID
        const columns = [{ header: 'Node ID', key: 'nodeId', width: 30 }];
        
        // Add a column for each node
        analysisData.nodeIds.forEach((nodeId: string) => {
          columns.push({ header: nodeId, key: nodeId, width: 15 });
        });
        
        matrixSheet.columns = columns;
        
        // Add rows for each node
        for (let i = 0; i < analysisData.nodeIds.length; i++) {
          const row: any = { nodeId: analysisData.nodeIds[i] };
          
          for (let j = 0; j < analysisData.nodeIds.length; j++) {
            row[analysisData.nodeIds[j]] = analysisData.adjacencyMatrix[i][j];
          }
          
          matrixSheet.addRow(row);
        }
      }
      
      // For comparison data
      if (type === ExportType.COMPARISON && analysisData.comparison) {
        const comparisonSheet = workbook.addWorksheet('Scenario Comparison');
        comparisonSheet.columns = [
          { header: 'Node ID', key: 'nodeId', width: 30 },
          { header: 'Baseline Value', key: 'baseline', width: 15 },
          { header: 'Comparison Value', key: 'comparison', width: 15 },
          { header: 'Delta', key: 'delta', width: 15 },
          { header: 'Node Type', key: 'type', width: 15 },
          { header: 'Node Name', key: 'name', width: 30 },
        ];
        
        comparisonSheet.addRows(analysisData.comparison);
      }
    }
    
    const buffer = await workbook.xlsx.writeBuffer() as Buffer;
    
    return {
      buffer,
      fileName: `${fileName}.xlsx`,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }

  /**
   * Generate a CSV export
   */
  private async generateCSVExport(data: any, fileName: string, type: ExportType): Promise<{ 
    buffer: Buffer;
    fileName: string;
    mimeType: string;
  }> {
    let csvData: string;
    
    if (type === ExportType.MODEL) {
      const model = data as FCMModel;
      
      // Create a structure to hold all data
      const exportData = {
        model: {
          id: model.id,
          name: model.name,
          description: model.description,
          createdAt: model.createdAt,
          updatedAt: model.updatedAt
        },
        nodes: model.nodes,
        edges: model.edges
      };
      
      csvData = JSON.stringify(exportData);
    } 
    else if (type === ExportType.SCENARIO) {
      const scenario = data as Scenario;
      csvData = JSON.stringify(scenario);
    }
    else if (type === ExportType.ANALYSIS || type === ExportType.COMPARISON) {
      csvData = JSON.stringify(data);
    }
    else {
      throw new Error(`Export type '${type}' not supported for CSV`);
    }
    
    // Since CSV export is a bit complex for nested data, we'll compress as JSON
    // and provide clear instructions in the README
    return {
      buffer: Buffer.from(csvData),
      fileName: `${fileName}.json`,
      mimeType: 'application/json'
    };
  }

  /**
   * Generate a Jupyter Notebook export via Python service
   */
  private async generateJupyterExport(
    data: any, 
    fileName: string, 
    type: ExportType,
    modelId?: number,
    scenarioId?: number,
    comparisonScenarioId?: number
  ): Promise<{ 
    buffer: Buffer;
    fileName: string;
    mimeType: string;
  }> {
    try {
      // Normalize data to ensure consistency for Python service
      let normalizedData = data;
      
      // Transform ReactFlow formatted data to a consistent format expected by the Python service
      if (type === ExportType.MODEL) {
        // Ensure data has the proper format for Python simulation and export
        console.log('Normalizing model data for export');
        
        // Make a deep copy first and preserve all metadata
        normalizedData = JSON.parse(JSON.stringify(data));
        
        // Transform the nodes and edges to ensure they're in the expected format
        normalizedData.nodes = data.nodes?.map((node: any) => {
          // Check if we have ReactFlow format or direct format
          if (isReactFlowNode(node)) {
            // Extract data from ReactFlow format
            return {
              id: node.id,
              label: node.data?.label || node.id,
              type: node.data?.type || 'regular',
              value: node.data?.value || 0,
              positionX: node.position?.x || 0,
              positionY: node.position?.y || 0,
              color: node.data?.color || ''
            };
          }
          return node; // Already in the correct format
        });
        
        normalizedData.edges = data.edges?.map((edge: any) => {
          // Check if we have ReactFlow format or direct format
          if (isReactFlowEdge(edge)) {
            // Extract data from ReactFlow format
            return {
              id: edge.id,
              source: edge.source,
              target: edge.target,
              weight: edge.data?.weight || 0
            };
          }
          return edge; // Already in the correct format
        });
        
        // Make sure analysis data is included if available
        if (data.analysis) {
          normalizedData.analysis = data.analysis;
        }
        
        // Log data structure
        console.log(`Normalized ${normalizedData.nodes.length} nodes and ${normalizedData.edges.length} edges`);
      }
      
      console.log('Sending formatted data to Python service for Jupyter export');
      
      // Call the Python service to generate the notebook
      const response = await fetch(`${PYTHON_SIM_URL}/api/export/notebook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: normalizedData,
          type,
          modelId,
          scenarioId,
          comparisonScenarioId
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json() as { message?: string };
        console.error('Python service error response:', errorData);
        throw new Error(`Failed to generate Jupyter Notebook: ${errorData.message || response.statusText}`);
      }
      
      const notebookBuffer = await response.buffer();
      
      return {
        buffer: notebookBuffer,
        fileName: `${fileName}.ipynb`,
        mimeType: 'application/x-ipynb+json'
      };
    } catch (error) {
      console.error('Failed to generate Jupyter Notebook:', error);
      throw new Error(`Failed to generate Jupyter Notebook: ${(error as Error).message}`);
    }
  }

  /**
   * Generate a file name based on export options
   */
  private generateFileName(options: ExportOptions): string {
    const timestamp = new Date().toISOString().replace(/:/g, '-').replace(/\..+/, '');
    
    switch (options.type) {
      case ExportType.MODEL:
        return `model_export_${options.modelId || 'unknown'}_${timestamp}`;
      case ExportType.SCENARIO:
        return `scenario_export_${options.scenarioId || 'unknown'}_${timestamp}`;
      case ExportType.ANALYSIS:
        return `analysis_export_${options.modelId || 'unknown'}_${timestamp}`;
      case ExportType.COMPARISON:
        return `comparison_export_${options.scenarioId}_vs_${options.comparisonScenarioId}_${timestamp}`;
      default:
        return `export_${timestamp}`;
    }
  }
}

export const exportService = new ExportService();