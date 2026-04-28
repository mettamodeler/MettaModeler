# MettaModeler Usability Audit
## First-Time User Experience Improvements

**Date:** January 2025  
**Focus:** Identifying where first-time users need explanations, tooltips, onboarding, and contextual help

---

## Executive Summary

MettaModeler is a sophisticated FCM (Fuzzy Cognitive Map) modeling tool that requires domain knowledge. First-time users need guidance on:
1. **What FCMs are** and how they work
2. **Core concepts**: nodes, edges, weights, scenarios, simulations
3. **Workflow**: Projects → Models → Scenarios → Analysis
4. **UI interactions**: How to use the editor, what controls do
5. **Interpretation**: What simulation results mean

---

## User Journey Analysis

### 1. **Landing / Home Page** (`client/src/pages/home.tsx`)

**Current State:**
- Shows projects and models in cards
- Basic descriptions in dialogs
- No onboarding or welcome message

**First-Time User Needs:**
- ❌ **What is an FCM?** - No explanation
- ❌ **What's the difference between a Project and Model?** - Minimal explanation
- ❌ **Getting started guide** - Missing
- ❌ **Empty state guidance** - No help when no projects exist

**Recommendations:**
1. **Welcome Modal/Onboarding** (first visit only)
   - Brief intro to FCMs
   - Quick tour: Projects → Models → Scenarios
   - Link to full tutorial/docs

2. **Empty State Enhancement**
   - When no projects: "Get started by creating your first project"
   - Include example use cases
   - "What is a Project?" tooltip

3. **Project/Model Cards**
   - Add info icons with tooltips explaining:
     - "Projects organize related models"
     - "Models are FCM graphs you can edit and simulate"

---

### 2. **Authentication Page** (`client/src/pages/auth-page.tsx`)

**Current State:**
- Basic login/register form
- No context about the application

**First-Time User Needs:**
- ❌ **What is MettaModeler?** - No intro
- ❌ **Why register?** - No value proposition
- ❌ **Example use cases** - Missing

**Recommendations:**
1. **Welcome Section** (above/beside auth form)
   - Brief app description
   - Example use cases (climate modeling, social systems, etc.)
   - Link to demo/tutorial

2. **Registration Benefits**
   - "Save your models and scenarios"
   - "Access from anywhere"
   - "Export your work"

---

### 3. **Model Editor** (`client/src/pages/ModelEditor.tsx`)

**Current State:**
- Three tabs: Editor, Scenarios, Analysis
- No explanation of what each tab does
- No guidance on workflow

**First-Time User Needs:**
- ❌ **What is the Model Editor?** - No explanation
- ❌ **Tab purposes** - Unclear what each tab does
- ❌ **Workflow guidance** - No suggested order

**Recommendations:**
1. **Tab Tooltips/Descriptions**
   - "Editor: Build your FCM graph by adding nodes and connections"
   - "Scenarios: Test different conditions and compare results"
   - "Analysis: View network properties and centrality measures"

2. **First-Time Empty State**
   - When model has no nodes: "Start by adding your first node"
   - Step-by-step hints: "1. Add nodes → 2. Connect them → 3. Set values"

3. **Progress Indicator**
   - Show completion status: "2/3 nodes added", "Ready to simulate"

---

### 4. **FCM Editor** (`client/src/components/fcm/FCMEditor.tsx`)

**Current State:**
- React Flow canvas with nodes and edges
- Controls for adding nodes
- No explanation of interactions

**First-Time User Needs:**
- ❌ **How to add nodes** - Not obvious
- ❌ **How to connect nodes** - No visual guide
- ❌ **Node types explained** - Driver, Regular, Outcome unclear
- ❌ **Edge weights** - What do -1 to +1 mean?
- ❌ **Node values** - What do 0-1 represent?
- ❌ **How to edit** - Double-click? Right-click? Not clear

**Recommendations:**
1. **Interactive Tutorial Overlay** (first time)
   - Step 1: "Click 'Add Node' to create your first node"
   - Step 2: "Drag from one node to another to create a connection"
   - Step 3: "Double-click a node to edit its properties"
   - Step 4: "Adjust edge weights to show influence strength"

2. **Persistent Help Panel** (collapsible)
   - Keyboard shortcuts
   - Quick reference: "Node types", "Edge weights", "Node values"
   - Link to full documentation

3. **Contextual Tooltips**
   - On hover over node types: "Driver: External factor that influences the system"
   - On hover over edge weight slider: "Positive = increases, Negative = decreases"
   - On hover over node value: "Initial state (0-1 scale)"

4. **Visual Indicators**
   - Color coding legend: "Blue = positive, Red = negative"
   - Node type icons with labels
   - Edge weight visualization guide

5. **Controls Explanation**
   - "Add Node" button tooltip: "Create a new concept in your model"
   - "Save" button: "Save your changes to the model"
   - MiniMap tooltip: "Overview of your entire model"

---

### 5. **Scenario Manager** (`client/src/components/scenario/ScenarioManager.tsx`)

**Current State:**
- Create/edit scenarios
- Set initial values
- Clamp nodes
- Run simulations
- Complex interface with many options

**First-Time User Needs:**
- ❌ **What is a scenario?** - No explanation
- ❌ **Initial values** - What do they represent?
- ❌ **Clamped nodes** - What does "clamp" mean?
- ❌ **Simulation parameters** - Activation, threshold, iterations unclear
- ❌ **When to use scenarios** - No guidance

**Recommendations:**
1. **Scenario Creation Dialog Enhancement**
   - Add explanation: "Scenarios let you test 'what-if' conditions"
   - Example: "What if rainfall increases by 20%?"
   - Link to tutorial

2. **Initial Values Section**
   - Header: "Set starting conditions for this scenario"
   - Tooltip: "These values represent the initial state before simulation"
   - Help text: "Values range from 0 (low) to 1 (high)"

3. **Clamped Nodes Explanation**
   - Info icon with tooltip: "Clamped nodes stay fixed at their initial value during simulation"
   - Example: "Use this to test external interventions"
   - Visual indicator on clamped nodes

4. **Simulation Parameters Panel**
   - Expandable help section
   - "Activation Function: How nodes respond to inputs"
   - "Threshold: Convergence criteria (lower = more precise)"
   - "Max Iterations: Maximum simulation steps"
   - Recommended defaults with explanation

5. **Workflow Guidance**
   - "Step 1: Set initial values → Step 2: (Optional) Clamp nodes → Step 3: Run simulation"

---

### 6. **Simulation Results** (`client/src/components/scenario/ScenarioComparison.tsx`)

**Current State:**
- Charts and tables showing results
- Technical terminology
- No interpretation guidance

**First-Time User Needs:**
- ❌ **What do results mean?** - No interpretation
- ❌ **Convergence plot** - What is convergence?
- ❌ **Final state values** - How to read them?
- ❌ **Time series** - What does it show?
- ❌ **Comparison** - How to interpret differences?

**Recommendations:**
1. **Results Interpretation Panel**
   - "Understanding Your Results" expandable section
   - "Convergence: When node values stabilize"
   - "Final State: Equilibrium values after simulation"
   - "Time Series: How values change over iterations"

2. **Chart Tooltips**
   - Enhanced tooltips with explanations
   - "This line shows how [node] value changes over time"
   - "Convergence reached at iteration X"

3. **Comparison Guidance**
   - "Baseline vs Scenario: Compare side-by-side"
   - Highlight significant differences
   - "What this means: [interpretation]"

4. **Export Help**
   - "Export to Excel for further analysis"
   - "Export to Jupyter for advanced modeling"

---

### 7. **Analysis Tab** (`client/src/components/simulation/SimulationPanel.tsx`)

**Current State:**
- Network analysis metrics
- Centrality measures
- Adjacency matrix
- Technical terminology

**First-Time User Needs:**
- ❌ **What is network analysis?** - No explanation
- ❌ **Centrality measures** - Unclear meaning
- ❌ **Adjacency matrix** - What is it?
- ❌ **How to use this information** - No guidance

**Recommendations:**
1. **Analysis Introduction**
   - "Network Analysis: Understanding your model's structure"
   - "These metrics help identify key nodes and relationships"

2. **Metric Explanations**
   - Degree Centrality: "Number of connections - shows well-connected nodes"
   - Betweenness: "Bridge nodes that connect different parts"
   - Closeness: "Nodes that can quickly influence others"
   - Each with visual examples

3. **Adjacency Matrix Guide**
   - "This matrix shows all connections in your model"
   - "Rows = source, Columns = target"
   - "Values = edge weights"

4. **Actionable Insights**
   - "Key Findings" section
   - "Most influential node: [name]"
   - "Critical path: [nodes]"

---

### 8. **Sidebar Navigation** (`client/src/components/layout/Sidebar.tsx`)

**Current State:**
- Project/model tree
- Create buttons
- Minimal labels

**First-Time User Needs:**
- ❌ **Icon meanings** - FolderPlus, FilePlus unclear
- ❌ **Hierarchy** - Projects contain models, not obvious
- ❌ **Navigation** - How to get back?

**Recommendations:**
1. **Icon Labels/Tooltips**
   - "Create Project" (not just icon)
   - "Create Model" (not just icon)
   - Hover tooltips on all icons

2. **Breadcrumb/Context**
   - Show current location
   - "You are here: Project > Model"

3. **Quick Actions Help**
   - "Tip: Right-click for more options" (if implemented)

---

## Implementation Priority

### **High Priority** (Critical for first-time users)
1. ✅ Welcome/Onboarding modal
2. ✅ FCM Editor tutorial overlay
3. ✅ Node/Edge tooltips and explanations
4. ✅ Scenario creation guidance
5. ✅ Results interpretation help

### **Medium Priority** (Improves understanding)
6. ✅ Tab descriptions
7. ✅ Empty state guidance
8. ✅ Simulation parameters explanations
9. ✅ Analysis metrics descriptions
10. ✅ Workflow hints

### **Low Priority** (Nice to have)
11. ✅ Advanced keyboard shortcuts guide
12. ✅ Video tutorials link
13. ✅ Example models library
14. ✅ Community forum link

---

## Implementation Strategy

### Phase 1: Quick Wins (Tooltips & Help Text)
- Add tooltips to all icons and buttons
- Add help text to complex sections
- Add info icons with explanations
- Estimated: 2-3 days

### Phase 2: Onboarding System
- Welcome modal component
- First-time user detection
- Interactive tutorial overlay
- Estimated: 1 week

### Phase 3: Contextual Help System
- Help panels (collapsible)
- Expandable explanations
- Inline guidance
- Estimated: 1 week

### Phase 4: Documentation Integration
- Link to full docs
- Example models
- Video tutorials
- Estimated: 3-5 days

---

## Component Recommendations

### New Components to Create

1. **`WelcomeModal.tsx`**
   - First-time user onboarding
   - Skip option
   - Progress tracking

2. **`TutorialOverlay.tsx`**
   - Step-by-step interactive guide
   - Highlights UI elements
   - Progress indicator

3. **`HelpPanel.tsx`**
   - Collapsible help sidebar
   - Context-aware content
   - Search functionality

4. **`InfoTooltip.tsx`**
   - Reusable info icon + tooltip
   - Consistent styling
   - Accessible

5. **`EmptyState.tsx`**
   - Guidance when no data
   - Action buttons
   - Examples

6. **`ResultsInterpreter.tsx`**
   - Explains simulation results
   - Highlights key findings
   - Actionable insights

---

## Content Needed

### Written Content
- [ ] FCM introduction (2-3 paragraphs)
- [ ] Node types explanation
- [ ] Edge weights guide
- [ ] Scenario creation tutorial
- [ ] Simulation parameters guide
- [ ] Results interpretation guide
- [ ] Analysis metrics glossary

### Visual Content
- [ ] FCM diagram example
- [ ] Node type icons with labels
- [ ] Edge weight visualization
- [ ] Workflow diagram
- [ ] Screenshot annotations

### Interactive Content
- [ ] Step-by-step tutorial
- [ ] Example models
- [ ] Video walkthroughs (optional)

---

## Accessibility Considerations

- All tooltips should be keyboard accessible
- Help content should be screen-reader friendly
- Tutorial should support keyboard navigation
- Info icons need proper ARIA labels

---

## Next Steps

1. **Review this audit** with stakeholders
2. **Prioritize features** based on user feedback
3. **Create content** for explanations
4. **Implement Phase 1** (quick wins)
5. **Test with real first-time users**
6. **Iterate based on feedback**

---

## Notes

- Consider A/B testing different onboarding approaches
- Track where users get stuck (analytics)
- Provide "Skip tutorial" option for experienced users
- Make help content searchable
- Consider in-app chat/support (future)


