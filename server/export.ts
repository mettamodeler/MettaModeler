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
    weight?: number;
    [key: string]: any;
  };
  [key: string]: any;
}

// Type guards
function isReactFlowNode(node: any): node is ReactFlowNode {
  return 'data' in node && typeof node.data === 'object';
}

function isReactFlowEdge(edge: any): edge is ReactFlowEdge {
  return 'data' in edge && typeof edge.data === 'object';
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

// Normalize data for export
function normalizeDataForExport(data: any, type: ExportType): any {
  const normalizedData = JSON.parse(JSON.stringify(data));
  
  if (type === ExportType.MODEL) {
    // Transform nodes
    normalizedData.nodes = data.nodes?.map((node: any) => {
      if (isReactFlowNode(node)) {
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
      return node;
    });
    
    // Transform edges
    normalizedData.edges = data.edges?.map((edge: any) => {
      if (isReactFlowEdge(edge)) {
        return {
          id: edge.id,
          source: edge.source,
          target: edge.target,
          weight: edge.data?.weight || 0
        };
      }
      return edge;
    });
    
    // Include analysis data if available
    if (data.analysis) {
      normalizedData.analysis = data.analysis;
    }
  }
  
  return normalizedData;
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
    const normalizedData = normalizeDataForExport(data, options.type);
    
    switch (options.format) {
      case ExportFormat.JSON:
        return {
          buffer: Buffer.from(JSON.stringify(normalizedData, null, 2)),
          fileName: `${fileName}.json`,
          mimeType: 'application/json'
        };
      
      case ExportFormat.EXCEL:
        return this.generateExcelExport(normalizedData, fileName, options.type);
      
      case ExportFormat.CSV:
        return this.generateCSVExport(normalizedData, fileName, options.type);
      
      case ExportFormat.JUPYTER:
        return this.generateJupyterExport(normalizedData, fileName, options.type, options.modelId, options.scenarioId, options.comparisonScenarioId);
      
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
    try {
      console.log('Sending formatted data to Python service for Excel export');
      
      // Call the Python service to generate the Excel file
      const response = await fetch(`${PYTHON_SIM_URL}/api/export/excel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
          type,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json() as { message?: string };
        console.error('Python service error response:', errorData);
        throw new Error(`Failed to generate Excel file: ${errorData.message || response.statusText}`);
      }
      
      const excelBuffer = await response.buffer();
      
      return {
        buffer: excelBuffer,
        fileName: `${fileName}.xlsx`,
        mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      };
    } catch (error) {
      console.error('Failed to generate Excel file:', error);
      throw new Error(`Failed to generate Excel file: ${(error as Error).message}`);
    }
  }

  /**
   * Generate a CSV export
   */
  private async generateCSVExport(data: any, fileName: string, type: ExportType): Promise<{ 
    buffer: Buffer;
    fileName: string;
    mimeType: string;
  }> {
    try {
      // Convert data to CSV format
      const csvData = await parser.json2csv(data);
      
      return {
        buffer: Buffer.from(csvData),
        fileName: `${fileName}.csv`,
        mimeType: 'text/csv'
      };
    } catch (error) {
      console.error('Failed to generate CSV file:', error);
      throw new Error(`Failed to generate CSV file: ${(error as Error).message}`);
    }
  }

  /**
   * Generate a Jupyter Notebook export
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
      console.log('Sending formatted data to Python service for Jupyter export');
      
      // Call the Python service to generate the notebook
      const response = await fetch(`${PYTHON_SIM_URL}/api/export/notebook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data,
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
   * Generate a filename based on export options
   */
  private generateFileName(options: ExportOptions): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    return `${options.type}_export_${timestamp}`;
  }
}

export const exportService = new ExportService();