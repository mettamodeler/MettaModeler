import { useMemo } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface PublicScenario {
  id: number;
  name: string;
  description?: string | null;
  results?: any;
  simulationParams?: any;
  updatedAt?: string | null;
}

interface PublicModelPayload {
  id: number;
  name: string;
  description?: string | null;
  nodes: Array<{ id: string; label: string; value: number; type: string }>;
  edges: Array<{ id: string; source: string; target: string; weight: number }>;
  publicSlug: string;
  scenarios: PublicScenario[];
}

export default function PublicModelPage() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug;

  const { data, isLoading, error } = useQuery<PublicModelPayload>({
    queryKey: [`/api/public/models/${slug}`],
    enabled: !!slug,
  });

  const topScenarioRows = useMemo(() => {
    if (!data?.scenarios) return [];
    return data.scenarios.slice(0, 5);
  }, [data?.scenarios]);

  const formatScenarioSummary = (scenario: PublicScenario) => {
    const finalStateCount = scenario.results?.finalState ? Object.keys(scenario.results.finalState).length : 0;
    const converged = scenario.results?.converged;
    return `${converged === true ? "Converged" : converged === false ? "Not converged" : "Status unknown"} · ${finalStateCount} nodes in final state`;
  };

  if (isLoading) {
    return <div className="p-8">Loading public model...</div>;
  }

  if (error || !data) {
    return <div className="p-8">Public model is unavailable.</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between rounded border border-border/60 bg-card p-3">
          <div className="text-sm text-muted-foreground">Public link: /public/models/{data.publicSlug}</div>
          <a href={`/public/models/${data.publicSlug}`} target="_blank" rel="noreferrer">
            <Button variant="outline" size="sm">Open In New Tab</Button>
          </a>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>{data.name}</CardTitle>
            <CardDescription>{data.description || "Public read-only model view"}</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Nodes</div>
              <div className="text-xl font-semibold">{data.nodes.length}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Edges</div>
              <div className="text-xl font-semibold">{data.edges.length}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Public scenarios</div>
              <div className="text-xl font-semibold">{data.scenarios.length}</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Scenario Outcomes</CardTitle>
            <CardDescription>Selected scenario results shared by the model owner</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {topScenarioRows.length === 0 ? (
              <div className="text-sm text-muted-foreground">No scenario outcomes are publicly selected yet.</div>
            ) : (
              topScenarioRows.map((scenario) => (
                <div key={scenario.id} className="border rounded p-3 hover:border-primary/60 transition-colors">
                  <div className="font-medium">{scenario.name}</div>
                  <div className="text-xs text-muted-foreground">{scenario.description || "No description"}</div>
                  <div className="text-xs mt-1">{formatScenarioSummary(scenario)}</div>
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer text-primary hover:underline">View raw result details</summary>
                    <pre className="mt-2 text-xs overflow-auto bg-muted p-2 rounded max-h-64">
                      {JSON.stringify(scenario.results || {}, null, 2)}
                    </pre>
                  </details>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
