import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  aggregationMethod?: "mean" | "median";
  nodes: any[];
  edges: any[];
  edgeMetadata?: Array<{
    edgeKey: string;
    aggregatedWeight: number;
    hasSignConflict: boolean;
    confidence: "high" | "medium" | "low";
    positiveCount: number;
    negativeCount: number;
    sampleSize: number;
  }>;
  lowConfidenceEdgeCount?: number;
  conflictEdgeCount?: number;
}

interface MappingSuggestionMember {
  modelId: number;
  modelName: string;
  nodeId: string;
  nodeLabel: string;
}

interface MappingSuggestion {
  canonicalNodeKey: string;
  canonicalNodeLabel: string;
  normalizedLabel: string;
  matchType: "exact" | "fuzzy";
  score: number;
  confidence: "high" | "medium" | "low";
  members: MappingSuggestionMember[];
}

interface MappingSuggestionsPayload {
  modelCount: number;
  suggestions: MappingSuggestion[];
}

interface MetaModelBuilderContentProps {
  projectId: string;
}

export default function MetaModelBuilderContent({ projectId }: MetaModelBuilderContentProps) {
  const { toast } = useToast();
  const [canonicalNodeKey, setCanonicalNodeKey] = useState("");
  const [canonicalNodeLabel, setCanonicalNodeLabel] = useState("");
  const [sourceModelId, setSourceModelId] = useState("");
  const [sourceNodeId, setSourceNodeId] = useState("");
  const [preview, setPreview] = useState<MetaModelPayload | null>(null);
  const [selectedModelIds, setSelectedModelIds] = useState<number[]>([]);
  const [aggregationMethod, setAggregationMethod] = useState<"mean" | "median">("mean");
  const [confidenceFilter, setConfidenceFilter] = useState<"all" | "high" | "medium" | "low">("all");
  const [matchTypeFilter, setMatchTypeFilter] = useState<"all" | "exact" | "fuzzy">("all");

  const { data: mappings = [], refetch } = useQuery<MappingRow[]>({
    queryKey: [`/api/projects/${projectId}/mappings`],
    enabled: !!projectId,
  });
  const { data: models = [] } = useQuery<FCMModel[]>({
    queryKey: ["/api/models"],
  });
  const selectedModelIdsQuery = useMemo(() => selectedModelIds.join(","), [selectedModelIds]);
  const {
    data: suggestionsPayload,
    refetch: refetchSuggestions,
    isFetching: suggestionsLoading,
  } = useQuery<MappingSuggestionsPayload>({
    queryKey: [`/api/projects/${projectId}/mapping-suggestions?modelIds=${selectedModelIdsQuery}`],
    enabled: !!projectId && selectedModelIds.length > 0,
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
    [models, projectId],
  );

  const visibleSuggestions = useMemo(() => {
    const suggestions = suggestionsPayload?.suggestions || [];
    return suggestions.filter((suggestion) => {
      const confidenceOk = confidenceFilter === "all" || suggestion.confidence === confidenceFilter;
      const matchTypeOk = matchTypeFilter === "all" || suggestion.matchType === matchTypeFilter;
      return confidenceOk && matchTypeOk;
    });
  }, [confidenceFilter, matchTypeFilter, suggestionsPayload?.suggestions]);

  const selectedSourceModel = useMemo(
    () => modelsInProject.find((model) => String(model.id) === sourceModelId),
    [modelsInProject, sourceModelId],
  );

  const sourceModelNodes = useMemo(
    () => (selectedSourceModel?.nodes || []).map((node) => ({ id: String(node.id), label: String(node.label || node.id) })),
    [selectedSourceModel],
  );

  const toggleModelSelection = (modelId: number) => {
    setSelectedModelIds((prev) =>
      prev.includes(modelId) ? prev.filter((id) => id !== modelId) : [...prev, modelId],
    );
  };

  const applySuggestion = async (suggestion: MappingSuggestion) => {
    try {
      for (const member of suggestion.members) {
        await apiRequest("POST", `/api/projects/${projectId}/mappings`, {
          canonicalNodeKey: suggestion.canonicalNodeKey,
          canonicalNodeLabel: suggestion.canonicalNodeLabel,
          sourceModelId: member.modelId,
          sourceNodeId: member.nodeId,
        });
      }
      await refetch();
      toast({ title: `Applied mapping for ${suggestion.canonicalNodeLabel}` });
    } catch {
      toast({ variant: "destructive", title: "Failed to apply suggestion" });
    }
  };

  const applyAllSuggestions = async () => {
    if (!suggestionsPayload?.suggestions?.length) return;
    try {
      for (const suggestion of suggestionsPayload.suggestions) {
        for (const member of suggestion.members) {
          await apiRequest("POST", `/api/projects/${projectId}/mappings`, {
            canonicalNodeKey: suggestion.canonicalNodeKey,
            canonicalNodeLabel: suggestion.canonicalNodeLabel,
            sourceModelId: member.modelId,
            sourceNodeId: member.nodeId,
          });
        }
      }
      await refetch();
      toast({ title: "Applied suggested mappings" });
    } catch {
      toast({ variant: "destructive", title: "Failed to apply all suggestions" });
    }
  };

  const addMapping = async () => {
    if (!canonicalNodeKey || !canonicalNodeLabel || !sourceModelId || !sourceNodeId) return;
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
    } catch {
      toast({ variant: "destructive", title: "Failed to add mapping" });
    }
  };

  const loadPreview = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (selectedModelIds.length > 0) queryParams.set("modelIds", selectedModelIds.join(","));
      queryParams.set("aggregationMethod", aggregationMethod);
      const query = queryParams.toString() ? `?${queryParams.toString()}` : "";
      const payload = await apiRequest<MetaModelPayload>(
        "GET",
        `/api/projects/${projectId}/meta-model${query}`,
      );
      setPreview(payload);
    } catch {
      toast({ variant: "destructive", title: "Failed to generate meta-model preview" });
    }
  };

  const saveMetaModel = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (selectedModelIds.length > 0) queryParams.set("modelIds", selectedModelIds.join(","));
      queryParams.set("aggregationMethod", aggregationMethod);
      const fetchQuery = queryParams.toString() ? `?${queryParams.toString()}` : "";
      const payload =
        preview ||
        (await apiRequest<MetaModelPayload>("GET", `/api/projects/${projectId}/meta-model${fetchQuery}`));
      await apiRequest("POST", `/api/projects/${projectId}/meta-models`, {
        ...payload,
        modelIds: selectedModelIds,
        aggregationMethod,
      });
      toast({ title: "Meta-model saved" });
    } catch {
      toast({ variant: "destructive", title: "Failed to save meta-model" });
    }
  };

  const formatMappedSource = (row: MappingRow): string => {
    const sourceModel = modelsInProject.find((model) => Number(model.id) === Number(row.sourceModelId));
    const sourceNode = sourceModel?.nodes?.find((node) => String(node.id) === String(row.sourceNodeId));
    const modelName = sourceModel?.name || `Model ${row.sourceModelId}`;
    const nodeLabel = sourceNode?.label || row.sourceNodeId;
    return `${modelName}: ${nodeLabel}`;
  };

  return (
    <div className="h-full overflow-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>How Mapping Works</CardTitle>
          <CardDescription>
            1) Select models, 2) apply automatic exact/fuzzy matches, 3) add or edit manual mappings, 4) preview and save the aggregated model.
          </CardDescription>
        </CardHeader>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>1. Select Models in Scope</CardTitle>
          <CardDescription>Choose the models that should participate in matching and aggregation.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {modelsInProject.length === 0 ? (
            <div className="text-sm text-muted-foreground">No models found in this project.</div>
          ) : (
            modelsInProject.map((model) => (
              <label key={model.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedModelIds.includes(Number(model.id))}
                  onChange={() => toggleModelSelection(Number(model.id))}
                />
                <span>{model.name}</span>
                <span className="text-muted-foreground">#{model.id}</span>
              </label>
            ))
          )}
          <div className="pt-2">
            <Button
              variant="secondary"
              onClick={() => refetchSuggestions()}
              disabled={selectedModelIds.length === 0}
            >
              {suggestionsLoading ? "Finding matches..." : "Find Suggested Matches"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>2. Edge Weight Aggregation Method</CardTitle>
          <CardDescription>
            Choose how matched edge weights are aggregated across selected models.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="aggregation-method"
              checked={aggregationMethod === "mean"}
              onChange={() => setAggregationMethod("mean")}
            />
            Mean
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="radio"
              name="aggregation-method"
              checked={aggregationMethod === "median"}
              onChange={() => setAggregationMethod("median")}
            />
            Median
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>3. Automatic Matches (Exact + Fuzzy)</CardTitle>
          <CardDescription>
            Exact matches use normalized labels; fuzzy matches use token + phrase similarity. Review then apply.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!suggestionsPayload || suggestionsPayload.suggestions.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No suggestions yet. Select at least two models and run suggestions.
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <select
                  value={confidenceFilter}
                  onChange={(e) =>
                    setConfidenceFilter(e.target.value as "all" | "high" | "medium" | "low")
                  }
                  className="p-2 rounded bg-white/10 border border-white/10 text-sm"
                >
                  <option value="all">All confidence</option>
                  <option value="high">High confidence</option>
                  <option value="medium">Medium confidence</option>
                  <option value="low">Low confidence</option>
                </select>
                <select
                  value={matchTypeFilter}
                  onChange={(e) =>
                    setMatchTypeFilter(e.target.value as "all" | "exact" | "fuzzy")
                  }
                  className="p-2 rounded bg-white/10 border border-white/10 text-sm"
                >
                  <option value="all">All match types</option>
                  <option value="exact">Exact only</option>
                  <option value="fuzzy">Fuzzy only</option>
                </select>
              </div>
              <div className="flex justify-between items-center">
                <div className="text-xs text-muted-foreground">
                  {visibleSuggestions.length} visible suggestions across {suggestionsPayload.modelCount}{" "}
                  selected models
                </div>
                <Button variant="outline" onClick={applyAllSuggestions}>
                  Apply All
                </Button>
              </div>
              {visibleSuggestions.map((suggestion) => (
                <div key={suggestion.normalizedLabel} className="border rounded p-3">
                  <div className="flex items-center justify-between">
                    <div className="font-medium">
                      {suggestion.canonicalNodeLabel} ({suggestion.canonicalNodeKey})
                    </div>
                    <Button size="sm" onClick={() => applySuggestion(suggestion)}>
                      Apply
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {suggestion.matchType.toUpperCase()} · Score: {suggestion.score.toFixed(3)} · Confidence:{" "}
                    {suggestion.confidence} · Matches: {suggestion.members.length}
                  </div>
                  <div className="text-xs mt-1">
                    {suggestion.members.map((member) => `${member.modelName}:${member.nodeLabel}`).join(", ")}
                  </div>
                </div>
              ))}
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>4. Manual Mapping</CardTitle>
          <CardDescription>Use this when automatic suggestions miss or need correction.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            placeholder="Canonical key"
            value={canonicalNodeKey}
            onChange={(e) => setCanonicalNodeKey(e.target.value)}
          />
          <Input
            placeholder="Canonical label"
            value={canonicalNodeLabel}
            onChange={(e) => setCanonicalNodeLabel(e.target.value)}
          />
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
          <select
            value={sourceNodeId}
            onChange={(e) => setSourceNodeId(e.target.value)}
            className="w-full p-2 rounded bg-white/10 border border-white/10"
            disabled={!sourceModelId}
          >
            <option value="">{sourceModelId ? "Select source node" : "Select model first"}</option>
            {sourceModelNodes.map((node) => (
              <option key={node.id} value={node.id}>
                {node.label} ({node.id})
              </option>
            ))}
          </select>
          <Button onClick={addMapping}>Add Mapping</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Current Canonical Mappings</CardTitle>
          <CardDescription>Canonical concepts and the source nodes currently mapped into each one.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {groupedMappings.length === 0 ? (
            <div className="text-sm text-muted-foreground">No mappings yet.</div>
          ) : (
            groupedMappings.map(([groupKey, rows]) => (
              <div key={groupKey} className="border rounded p-3">
                <div className="font-medium flex items-center justify-between gap-2">
                  <span>{rows[0].canonicalNodeLabel}</span>
                  <span className="text-xs text-muted-foreground">{rows.length} linked nodes</span>
                </div>
                <div className="text-xs text-muted-foreground mt-1">Key: {rows[0].canonicalNodeKey}</div>
                <div className="mt-2 space-y-1">
                  {rows.map((row) => (
                    <div key={row.id} className="text-sm rounded bg-muted/60 px-2 py-1">
                      {formatMappedSource(row)}
                    </div>
                  ))}
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
            <Button variant="secondary" onClick={saveMetaModel}>
              Save As Model
            </Button>
          </div>
          {preview ? (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                {preview.nodes.length} canonical nodes, {preview.edges.length} aggregated edges ·{" "}
                {preview.conflictEdgeCount || 0} conflict edges · {preview.lowConfidenceEdgeCount || 0}{" "}
                low-confidence edges
              </div>
              {preview.edgeMetadata && preview.edgeMetadata.length > 0 && (
                <div className="text-xs bg-muted p-3 rounded max-h-48 overflow-auto space-y-1">
                  {preview.edgeMetadata.slice(0, 8).map((edge) => (
                    <div key={edge.edgeKey}>
                      {edge.edgeKey}: {edge.aggregatedWeight.toFixed(3)} ({edge.confidence}
                      {edge.hasSignConflict ? ", conflict" : ""})
                    </div>
                  ))}
                  {preview.edgeMetadata.length > 8 && (
                    <div>... {preview.edgeMetadata.length - 8} more edges</div>
                  )}
                </div>
              )}
              <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-80">
                {JSON.stringify(preview, null, 2)}
              </pre>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">No preview generated yet.</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
