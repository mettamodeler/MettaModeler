import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FCMModel, FCMNode, FCMEdge } from '@/lib/types';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export function useFCM(modelId: string) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // Get model data
  const { data: model, isLoading, error } = useQuery<FCMModel>({
    queryKey: [`/api/models/${modelId}`],
  });
  
  // Update model
  const updateModelMutation = useMutation({
    mutationFn: async (updatedModel: FCMModel) => {
      await apiRequest('PUT', `/api/models/${modelId}`, updatedModel);
      return updatedModel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/models/${modelId}`] });
      queryClient.invalidateQueries({ queryKey: ['/api/models'] });
    },
    onError: (error) => {
      toast({
        variant: "destructive",
        title: "Failed to update model",
        description: error instanceof Error ? error.message : "Unknown error",
      });
    },
  });
  
  // Update model handler
  const updateModel = useCallback(
    (updatedModel: FCMModel) => {
      updateModelMutation.mutate(updatedModel);
    },
    [updateModelMutation]
  );
  
  // Add node
  const addNode = useCallback(
    (node: Omit<FCMNode, 'id'>) => {
      if (!model) return;
      
      const newNode: FCMNode = {
        ...node,
        id: `node-${Date.now()}`,
      };
      
      const updatedModel: FCMModel = {
        ...model,
        nodes: [...model.nodes, newNode],
      };
      
      updateModel(updatedModel);
      return newNode;
    },
    [model, updateModel]
  );
  
  // Update node
  const updateNode = useCallback(
    (nodeId: string, updates: Partial<FCMNode>) => {
      if (!model) return;
      
      const updatedNodes = model.nodes.map((node) =>
        node.id === nodeId ? { ...node, ...updates } : node
      );
      
      const updatedModel: FCMModel = {
        ...model,
        nodes: updatedNodes,
      };
      
      updateModel(updatedModel);
    },
    [model, updateModel]
  );
  
  // Remove node and its edges
  const removeNode = useCallback(
    (nodeId: string) => {
      if (!model) return;
      
      const updatedNodes = model.nodes.filter((node) => node.id !== nodeId);
      const updatedEdges = model.edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      );
      
      const updatedModel: FCMModel = {
        ...model,
        nodes: updatedNodes,
        edges: updatedEdges,
      };
      
      updateModel(updatedModel);
    },
    [model, updateModel]
  );
  
  // Add edge
  const addEdge = useCallback(
    (edge: Omit<FCMEdge, 'id'>) => {
      if (!model) return;
      
      const newEdge: FCMEdge = {
        ...edge,
        id: `edge-${Date.now()}`,
      };
      
      const updatedModel: FCMModel = {
        ...model,
        edges: [...model.edges, newEdge],
      };
      
      updateModel(updatedModel);
      return newEdge;
    },
    [model, updateModel]
  );
  
  // Update edge
  const updateEdge = useCallback(
    (edgeId: string, updates: Partial<FCMEdge>) => {
      if (!model) return;
      
      const updatedEdges = model.edges.map((edge) =>
        edge.id === edgeId ? { ...edge, ...updates } : edge
      );
      
      const updatedModel: FCMModel = {
        ...model,
        edges: updatedEdges,
      };
      
      updateModel(updatedModel);
    },
    [model, updateModel]
  );
  
  // Remove edge
  const removeEdge = useCallback(
    (edgeId: string) => {
      if (!model) return;
      
      const updatedEdges = model.edges.filter((edge) => edge.id !== edgeId);
      
      const updatedModel: FCMModel = {
        ...model,
        edges: updatedEdges,
      };
      
      updateModel(updatedModel);
    },
    [model, updateModel]
  );
  
  return {
    model,
    isLoading,
    error,
    updateModel,
    addNode,
    updateNode,
    removeNode,
    addEdge,
    updateEdge,
    removeEdge,
  };
}
