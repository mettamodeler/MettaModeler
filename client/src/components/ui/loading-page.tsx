import { AnimatedLoader } from "./animated-loader";

export function LoadingPage() {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center p-4 z-50">
      <div className="w-64 h-64">
        <AnimatedLoader />
      </div>
    </div>
  );
}