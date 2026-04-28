import { useParams } from "wouter";
import AppHeader from "@/components/layout/AppHeader";
import Sidebar from "@/components/layout/Sidebar";
import MetaModelBuilderContent from "@/components/aggregator/MetaModelBuilderContent";

export default function MetaModelBuilderPage() {
  const params = useParams<{ projectId: string }>();
  const projectId = params.projectId;

  return (
    <div className="flex flex-col h-screen min-h-0">
      <AppHeader />
      <div className="flex flex-1 overflow-hidden min-h-0">
        <Sidebar currentProjectId={projectId || null} />
        <div className="flex-1 min-h-0 overflow-hidden">
          {projectId ? (
            <MetaModelBuilderContent projectId={projectId} />
          ) : (
            <div className="p-6 text-sm text-muted-foreground">Project not found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
