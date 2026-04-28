# Usability Implementation Plan
## Step-by-Step Guide for Adding First-Time User Help

This document provides specific implementation steps for each usability improvement.

---

## Phase 1: Quick Wins (Tooltips & Help Text)

### 1.1 Create Reusable Info Tooltip Component

**File:** `client/src/components/ui/info-tooltip.tsx`

```tsx
import { InfoIcon } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './tooltip';

interface InfoTooltipProps {
  content: string;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

export function InfoTooltip({ content, side = 'top' }: InfoTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <InfoIcon className="w-4 h-4 text-muted-foreground hover:text-foreground cursor-help" />
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-xs">
          <p>{content}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
```

### 1.2 Add Tooltips to FCM Editor

**File:** `client/src/components/fcm/FCMEditor.tsx`

**Add to node type selector:**
```tsx
<div className="flex items-center gap-2">
  <Label>Node Type</Label>
  <InfoTooltip content="Driver: External factor that influences the system. Regular: Standard concept. Outcome: Final result or goal." />
</div>
```

**Add to edge weight input:**
```tsx
<div className="flex items-center gap-2">
  <Label>Edge Weight</Label>
  <InfoTooltip content="Positive values (0 to 1) mean the source increases the target. Negative values (-1 to 0) mean it decreases. Zero means no effect." />
</div>
```

### 1.3 Add Help Text to Scenario Manager

**File:** `client/src/components/scenario/ScenarioManager.tsx`

**Add explanation section:**
```tsx
<div className="mb-4 p-4 bg-muted/50 rounded-lg">
  <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
    What is a Scenario?
    <InfoTooltip content="Scenarios let you test 'what-if' conditions by changing initial node values and running simulations to see how the system responds." />
  </h3>
  <p className="text-sm text-muted-foreground">
    Create different scenarios to compare outcomes. For example: "What if rainfall increases by 20%?"
  </p>
</div>
```

**Add to clamped nodes section:**
```tsx
<div className="flex items-center gap-2 mb-2">
  <Label>Clamped Nodes</Label>
  <InfoTooltip content="Clamped nodes stay fixed at their initial value during simulation. Use this to model external interventions or constraints that don't change." />
</div>
```

---

## Phase 2: Welcome Modal & Onboarding

### 2.1 Create Welcome Modal Component

**File:** `client/src/components/onboarding/WelcomeModal.tsx`

```tsx
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';

export function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem('metta-welcome-seen');
    if (!hasSeenWelcome) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('metta-welcome-seen', 'true');
    }
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Welcome to MettaModeler</DialogTitle>
          <DialogDescription>
            Build, simulate, and analyze Fuzzy Cognitive Maps
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <h3 className="font-semibold mb-2">What are Fuzzy Cognitive Maps?</h3>
            <p className="text-sm text-muted-foreground">
              FCMs are graphical models that show how concepts influence each other. 
              They're perfect for modeling complex systems, understanding causal relationships, 
              and exploring "what-if" scenarios.
            </p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Getting Started</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
              <li>Create a <strong>Project</strong> to organize your work</li>
              <li>Add a <strong>Model</strong> to build your FCM graph</li>
              <li>Create <strong>Scenarios</strong> to test different conditions</li>
              <li>Run <strong>Simulations</strong> to see how the system evolves</li>
            </ol>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox 
              id="dont-show" 
              checked={dontShowAgain}
              onCheckedChange={(checked) => setDontShowAgain(checked as boolean)}
            />
            <label htmlFor="dont-show" className="text-sm">
              Don't show this again
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Skip Tutorial
          </Button>
          <Button onClick={() => {
            handleClose();
            // Trigger tutorial overlay
            localStorage.setItem('metta-start-tutorial', 'true');
            window.location.reload();
          }}>
            Start Tutorial
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Add to App.tsx:**
```tsx
import { WelcomeModal } from '@/components/onboarding/WelcomeModal';

function App() {
  return (
    <>
      <WelcomeModal />
      {/* rest of app */}
    </>
  );
}
```

---

## Phase 3: Interactive Tutorial Overlay

### 3.1 Create Tutorial Overlay Component

**File:** `client/src/components/onboarding/TutorialOverlay.tsx`

```tsx
import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

interface TutorialStep {
  id: string;
  title: string;
  content: string;
  targetSelector?: string; // CSS selector to highlight
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const FCM_EDITOR_STEPS: TutorialStep[] = [
  {
    id: 'add-node',
    title: 'Add Your First Node',
    content: 'Click the "Add Node" button to create a concept in your model. Nodes represent ideas, factors, or outcomes.',
    targetSelector: '[data-tutorial="add-node"]',
    position: 'bottom'
  },
  {
    id: 'connect-nodes',
    title: 'Connect Nodes',
    content: 'Drag from one node to another to create a connection. This shows how concepts influence each other.',
    position: 'top'
  },
  {
    id: 'edit-node',
    title: 'Edit Node Properties',
    content: 'Double-click a node to edit its name, type, and initial value. Node types: Driver (external), Regular (standard), Outcome (goal).',
    position: 'right'
  },
  {
    id: 'set-weight',
    title: 'Set Edge Weights',
    content: 'Click an edge to adjust its weight. Positive values (0-1) mean increase, negative (-1-0) mean decrease.',
    position: 'top'
  },
  {
    id: 'save',
    title: 'Save Your Model',
    content: 'Always save your changes! Your model is automatically saved, but you can manually save anytime.',
    targetSelector: '[data-tutorial="save"]',
    position: 'bottom'
  }
];

export function TutorialOverlay() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const highlightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const shouldStart = localStorage.getItem('metta-start-tutorial') === 'true';
    if (shouldStart) {
      setIsActive(true);
      localStorage.removeItem('metta-start-tutorial');
    }
  }, []);

  useEffect(() => {
    if (!isActive || currentStep >= FCM_EDITOR_STEPS.length) return;

    const step = FCM_EDITOR_STEPS[currentStep];
    if (step.targetSelector) {
      const element = document.querySelector(step.targetSelector);
      if (element) {
        // Highlight element
        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Position tooltip near element
        const rect = element.getBoundingClientRect();
        if (highlightRef.current) {
          highlightRef.current.style.top = `${rect.top}px`;
          highlightRef.current.style.left = `${rect.left}px`;
          highlightRef.current.style.width = `${rect.width}px`;
          highlightRef.current.style.height = `${rect.height}px`;
        }
      }
    }
  }, [currentStep, isActive]);

  if (!isActive || currentStep >= FCM_EDITOR_STEPS.length) {
    if (currentStep >= FCM_EDITOR_STEPS.length) {
      localStorage.setItem('metta-tutorial-completed', 'true');
    }
    return null;
  }

  const step = FCM_EDITOR_STEPS[currentStep];
  const progress = ((currentStep + 1) / FCM_EDITOR_STEPS.length) * 100;

  return (
    <>
      {/* Highlight overlay */}
      <div
        ref={highlightRef}
        className="fixed border-4 border-primary rounded-lg pointer-events-none z-50 transition-all"
        style={{ display: step.targetSelector ? 'block' : 'none' }}
      />
      
      {/* Dark overlay */}
      <div className="fixed inset-0 bg-black/50 z-40" />

      {/* Tutorial dialog */}
      <Dialog open={true} onOpenChange={() => {}}>
        <DialogContent className="z-50 max-w-md">
          <div className="space-y-4">
            <div>
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-semibold">{step.title}</h3>
                <span className="text-sm text-muted-foreground">
                  {currentStep + 1} / {FCM_EDITOR_STEPS.length}
                </span>
              </div>
              <Progress value={progress} className="mb-4" />
              <p className="text-sm text-muted-foreground">{step.content}</p>
            </div>

            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={() => {
                  setIsActive(false);
                  localStorage.setItem('metta-tutorial-skipped', 'true');
                }}
              >
                Skip Tutorial
              </Button>
              <div className="flex gap-2">
                {currentStep > 0 && (
                  <Button variant="outline" onClick={() => setCurrentStep(currentStep - 1)}>
                    Previous
                  </Button>
                )}
                <Button onClick={() => setCurrentStep(currentStep + 1)}>
                  {currentStep === FCM_EDITOR_STEPS.length - 1 ? 'Finish' : 'Next'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
```

**Add data attributes to FCM Editor:**
```tsx
<Button data-tutorial="add-node" onClick={handleAddNode}>
  Add Node
</Button>

<Button data-tutorial="save" onClick={handleSave}>
  Save
</Button>
```

---

## Phase 4: Empty State Components

### 4.1 Create Empty State Component

**File:** `client/src/components/ui/empty-state.tsx`

```tsx
import { Button } from './button';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  helpText?: string;
}

export function EmptyState({ icon: Icon, title, description, action, helpText }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center">
      <Icon className="w-16 h-16 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground max-w-md mb-4">{description}</p>
      {helpText && (
        <p className="text-xs text-muted-foreground max-w-md mb-4">{helpText}</p>
      )}
      {action && (
        <Button onClick={action.onClick}>{action.label}</Button>
      )}
    </div>
  );
}
```

**Use in Home page:**
```tsx
import { EmptyState } from '@/components/ui/empty-state';
import { FolderPlus } from 'lucide-react';

{projects.length === 0 && (
  <EmptyState
    icon={FolderPlus}
    title="No Projects Yet"
    description="Projects help you organize your FCM models by topic or research area."
    helpText="For example, you might create projects for 'Climate Research', 'Social Systems', or 'Healthcare Modeling'."
    action={{
      label: "Create Your First Project",
      onClick: () => setIsCreatingProject(true)
    }}
  />
)}
```

**Use in Model Editor:**
```tsx
{model.nodes.length === 0 && (
  <EmptyState
    icon={Network}
    title="Empty Model"
    description="Start building your FCM by adding nodes and connecting them."
    helpText="Tip: Start with 3-5 key concepts, then add connections to show how they influence each other."
    action={{
      label: "Add Your First Node",
      onClick: handleAddNode
    }}
  />
)}
```

---

## Phase 5: Help Panel Component

### 5.1 Create Collapsible Help Panel

**File:** `client/src/components/help/HelpPanel.tsx`

```tsx
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { HelpCircle, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface HelpContent {
  [key: string]: {
    title: string;
    sections: Array<{
      heading: string;
      content: string;
    }>;
  };
}

const HELP_CONTENT: HelpContent = {
  editor: {
    title: 'FCM Editor Help',
    sections: [
      {
        heading: 'Adding Nodes',
        content: 'Click "Add Node" to create a new concept. Double-click to edit its properties.'
      },
      {
        heading: 'Connecting Nodes',
        content: 'Drag from one node to another to create an edge showing influence.'
      },
      {
        heading: 'Node Types',
        content: 'Driver: External factors. Regular: Standard concepts. Outcome: Goals or results.'
      },
      {
        heading: 'Edge Weights',
        content: 'Positive (0-1): Increases target. Negative (-1-0): Decreases target. Zero: No effect.'
      }
    ]
  },
  scenarios: {
    title: 'Scenarios Help',
    sections: [
      {
        heading: 'What are Scenarios?',
        content: 'Scenarios let you test different conditions by changing initial node values.'
      },
      {
        heading: 'Initial Values',
        content: 'Set the starting state (0-1) for each node in this scenario.'
      },
      {
        heading: 'Clamped Nodes',
        content: 'Nodes that stay fixed during simulation. Use for external constraints.'
      },
      {
        heading: 'Simulation Parameters',
        content: 'Activation: How nodes respond. Threshold: Convergence precision. Max Iterations: Simulation limit.'
      }
    ]
  },
  analysis: {
    title: 'Analysis Help',
    sections: [
      {
        heading: 'Network Metrics',
        content: 'These metrics help you understand your model\'s structure and identify key nodes.'
      },
      {
        heading: 'Centrality Measures',
        content: 'Degree: Number of connections. Betweenness: Bridge nodes. Closeness: Quick influence.'
      },
      {
        heading: 'Adjacency Matrix',
        content: 'Shows all connections. Rows = source nodes, Columns = target nodes.'
      }
    ]
  }
};

export function HelpPanel({ context = 'editor' }: { context?: string }) {
  const [open, setOpen] = useState(false);
  const content = HELP_CONTENT[context] || HELP_CONTENT.editor;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="fixed bottom-4 right-4 z-50">
          <HelpCircle className="w-5 h-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-96">
        <SheetHeader>
          <SheetTitle>{content.title}</SheetTitle>
        </SheetHeader>
        <div className="mt-6 space-y-4">
          {content.sections.map((section, i) => (
            <div key={i}>
              <h3 className="font-semibold mb-2">{section.heading}</h3>
              <p className="text-sm text-muted-foreground">{section.content}</p>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

---

## Phase 6: Results Interpreter

### 6.1 Create Results Interpretation Component

**File:** `client/src/components/scenario/ResultsInterpreter.tsx`

```tsx
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { InfoIcon, TrendingUp, TrendingDown } from 'lucide-react';

interface ResultsInterpreterProps {
  results: {
    finalState: Record<string, number>;
    timeSeries: Record<string, number[]>;
    iterations: number;
  };
  nodes: Array<{ id: string; label: string }>;
}

export function ResultsInterpreter({ results, nodes }: ResultsInterpreterProps) {
  const finalState = results.finalState;
  const nodeEntries = Object.entries(finalState)
    .map(([id, value]) => ({
      id,
      label: nodes.find(n => n.id === id)?.label || id,
      value
    }))
    .sort((a, b) => b.value - a.value);

  const highest = nodeEntries[0];
  const lowest = nodeEntries[nodeEntries.length - 1];
  const converged = results.iterations < 20; // Assuming max 20 iterations

  return (
    <div className="space-y-4">
      <Alert>
        <InfoIcon className="h-4 w-4" />
        <AlertTitle>Understanding Your Results</AlertTitle>
        <AlertDescription>
          {converged 
            ? `Simulation converged after ${results.iterations} iterations, meaning the system reached a stable state.`
            : `Simulation reached maximum iterations. The system may still be changing.`}
        </AlertDescription>
      </Alert>

      <div>
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          Highest Final Value
        </h3>
        <p className="text-sm">
          <strong>{highest.label}</strong> reached the highest value ({highest.value.toFixed(3)}), 
          indicating it's the most activated outcome in this scenario.
        </p>
      </div>

      <div>
        <h3 className="font-semibold mb-2 flex items-center gap-2">
          <TrendingDown className="w-4 h-4" />
          Lowest Final Value
        </h3>
        <p className="text-sm">
          <strong>{lowest.label}</strong> has the lowest value ({lowest.value.toFixed(3)}), 
          suggesting minimal activation in this scenario.
        </p>
      </div>

      <div>
        <h3 className="font-semibold mb-2">What This Means</h3>
        <p className="text-sm text-muted-foreground">
          These results show how your system responds to the initial conditions you set. 
          Compare different scenarios to see how changes affect outcomes.
        </p>
      </div>
    </div>
  );
}
```

---

## Implementation Checklist

### Week 1: Foundation
- [ ] Create `InfoTooltip` component
- [ ] Create `EmptyState` component
- [ ] Add tooltips to all icons and buttons
- [ ] Add help text to complex sections

### Week 2: Onboarding
- [ ] Create `WelcomeModal` component
- [ ] Create `TutorialOverlay` component
- [ ] Add data attributes to tutorial targets
- [ ] Test onboarding flow

### Week 3: Contextual Help
- [ ] Create `HelpPanel` component
- [ ] Add help content for each context
- [ ] Integrate help panel into main views
- [ ] Create `ResultsInterpreter` component

### Week 4: Polish & Testing
- [ ] Test with first-time users
- [ ] Refine content based on feedback
- [ ] Add analytics to track help usage
- [ ] Document help system

---

## Content Creation Checklist

- [ ] Write FCM introduction (2-3 paragraphs)
- [ ] Write node types explanation
- [ ] Write edge weights guide
- [ ] Write scenario tutorial
- [ ] Write simulation parameters guide
- [ ] Write results interpretation guide
- [ ] Write analysis metrics glossary
- [ ] Create example FCM diagram
- [ ] Create workflow diagram

---

## Notes

- All help content should be accessible (keyboard, screen readers)
- Consider i18n if planning multiple languages
- Track which help sections are most viewed
- Allow users to provide feedback on help content
- Keep help content concise and actionable


