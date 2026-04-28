import { useMemo, useState } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import AppHeader from "@/components/layout/AppHeader";
import Sidebar from "@/components/layout/Sidebar";
import { FCMModel } from "@/lib/types";

interface MappingRow {
  id: number;
  canonicalNodeKey: string;
  canonicalNodeLabel: string;
  sourceModelId: number;
  sourceNodeId: string;
}

interface MetaModelPayload {
  name: string;
  description: string;
  nodes: any[];
  edges: any[];
}

export default function MetaModelBuilderPage() {
  const { toast } = useToast();
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;
  const [canonicalNodeKey, setCanonicalNodeKey] = useState("");
  const [canonicalNodeLabel, setCanonicalNodeLabel] = useState("");
  const [sourceModelId, setSourceModelId] = useState("");
  const [sourceNodeId, setSourceNodeId] = useState("");
  const [preview, setPreview] = useState<MetaModelPayload | null>(null);

  const { data: mappings = [], refetch } = useQuery<MappingRow[]>({
    queryKey: [`/api/projects/${projectId}/mappings`],
    enabled: !!projectId,
  });
  const { data: models = [] } = useQuery<FCMModel[]>({
    queryKey: ['/api/models'],
  });

  const groupedMappings = useMemo(() => {
    const grouped = new Map<string, MappingRow[]>();
    for (const mapping of mappings) {
      const key = `${mapping.canonicalNodeKey}::${mapping.canonicalNodeLabel}`;
      const existing = grouped.get(key) || [];
      existing.push(mapping);
      grouped.set(key, existing);
    }
    return Array.from(grouped.entries());
  }, [mappings]);
  const modelsInProject = useMemo(
    () => models.filter((model) => String(model.projectId) === projectId),
    [models, projectId]
  );

  const addMapping = async () => {
    if (!projectId || !canonicalNodeKey || !canonicalNodeLabel || !sourceModelId || !sourceNodeId) return;
    try {
      await apiRequest("POST", `/api/projects/${projectId}/mappings`, {
        canonicalNodeKey,
        canonicalNodeLabel,
        sourceModelId: Number(sourceModelId),
        sourceNodeId,
      });
      setCanonicalNodeKey("");
      setCanonicalNodeLabel("");
      setSourceModelId("");
      setSourceNodeId("");
      await refetch();
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to add mapping" });
    }
  };

  const loadPreview = async () => {
    if (!projectId) return;
    try {
      const payload = await apiRequest<MetaModelPayload>("GET", `/api/projects/${projectId}/meta-model`);
      setPreview(payload);
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to generate meta-model preview" });
    }
  };

  const saveMetaModel = async () => {
    if (!projectId) return;
    try {
      const payload = preview || (await apiRequest<MetaModelPayload>("GET", `/api/projects/${projectId}/meta-model`));
      await apiRequest("POST", `/api/projects/${projectId}/meta-models`, payload);
      toast({ title: "Meta-model saved" });
    } catch (error) {
      toast({ variant: "destructive", title: "Failed to save meta-model" });
    }
  };

  return (
    <div className="flex flex-col h-screen">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar currentProjectId={projectId || null} />
        <div className="flex-1 overflow-auto p-6 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Mapping Table</CardTitle>
              <CardDescription>Map source model nodes into canonical node identities</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <Input placeholder="Canonical key" value={canonicalNodeKey} onChange={(e) => setCanonicalNodeKey(e.target.value)} />
              <Input placeholder="Canonical label" value={canonicalNodeLabel} onChange={(e) => setCanonicalNodeLabel(e.target.value)} />
              <select
                value={sourceModelId}
                onChange={(e) => setSourceModelId(e.target.value)}
                className="w-full p-2 rounded bg-white/10 border border-white/10"
              >
                <option value="">Select source model</option>
                {modelsInProject.map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} (#{model.id})
                  </option>
                ))}
              </select>
              <Input placeholder="Source node ID" value={sourceNodeId} onChange={(e) => setSourceNodeId(e.target.value)} />
              <Button onClick={addMapping}>Add Mapping</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Current Mappings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {groupedMappings.length === 0 ? (
                <div className="text-sm text-muted-foreground">No mappings yet.</div>
              ) : (
                groupedMappings.map(([groupKey, rows]) => (
                  <div key={groupKey} className="border rounded p-3">
                    <div className="font-medium">{rows[0].canonicalNodeLabel} ({rows[0].canonicalNodeKey})</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {rows.map((row) => `model:${row.sourceModelId}/node:${row.sourceNodeId}`).join(", ")}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Meta-Model Preview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Button onClick={loadPreview}>Generate Preview</Button>
                <Button variant="secondary" onClick={saveMetaModel}>Save As Model</Button>
              </div>
              {preview ? (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">
                    {preview.nodes.length} canonical nodes, {preview.edges.length} aggregated edges
                  </div>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-80">{JSON.stringify(preview, null, 2)}</pre>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No preview generated yet.</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
