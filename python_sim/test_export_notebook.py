import unittest

try:
    from python_sim.export import generate_notebook
    EXPORT_IMPORT_ERROR = None
except Exception as exc:  # pragma: no cover - dependency-gated skip path
    generate_notebook = None
    EXPORT_IMPORT_ERROR = exc


@unittest.skipIf(EXPORT_IMPORT_ERROR is not None, f"python_sim export deps unavailable: {EXPORT_IMPORT_ERROR}")
class NotebookExportRegressionTests(unittest.TestCase):
    def _cell_sources(self, notebook):
        return [cell.get("source", "") for cell in notebook.cells]

    def test_model_notebook_contains_core_helpers(self):
        payload = {
            "name": "Test model",
            "description": "Regression fixture",
            "nodes": [
                {"id": "n1", "label": "Demand", "type": "driver", "value": 0.7},
                {"id": "n2", "label": "Sales", "type": "output", "value": 0.4},
            ],
            "edges": [
                {"id": "e1", "source": "n1", "target": "n2", "weight": 0.8},
            ],
        }
        notebook = generate_notebook(payload, "model")
        sources = "\n\n".join(self._cell_sources(notebook))

        self.assertIn("Environment check", sources)
        self.assertIn("def simulate_fcm(nodes_df, edges_df, max_iterations=20):", sources)
        self.assertIn("nodes_df.to_csv('nodes_table.csv', index=False)", sources)

    def test_scenario_notebook_contains_delta_section(self):
        payload = {
            "name": "Scenario A",
            "maxIterations": 50,
            "threshold": 0.001,
            "nodes": [
                {"id": "n1", "label": "Demand", "type": "driver", "value": 0.7},
            ],
            "edges": [],
            "results": {"converged": True, "finalValues": {"n1": 0.9}},
            "baselineResults": {"finalValues": {"n1": 0.5}},
        }
        notebook = generate_notebook(payload, "scenario")
        sources = "\n\n".join(self._cell_sources(notebook))

        self.assertIn("## Scenario Analysis", sources)
        self.assertIn("scenario_delta_df = pd.DataFrame(rows).sort_values('delta', ascending=False)", sources)
        self.assertIn("scenario_deltas.csv", sources)

    def test_comparison_notebook_contains_comparison_dataframe(self):
        payload = {
            "scenario": {
                "results": {"finalValues": {"n1": 0.9, "n2": 0.4}},
                "nodes": [
                    {"id": "n1", "label": "Demand", "type": "driver", "value": 0.7},
                    {"id": "n2", "label": "Sales", "type": "output", "value": 0.4},
                ],
                "edges": [],
            },
            "baselineScenario": {
                "results": {"finalValues": {"n1": 0.6, "n2": 0.45}},
                "nodes": [
                    {"id": "n1", "label": "Demand", "type": "driver", "value": 0.7},
                    {"id": "n2", "label": "Sales", "type": "output", "value": 0.4},
                ],
                "edges": [],
            },
        }
        notebook = generate_notebook(payload, "comparison")
        sources = "\n\n".join(self._cell_sources(notebook))

        self.assertIn("## Comparison Analysis", sources)
        self.assertIn("comparison_df = pd.DataFrame(comparison_rows).sort_values('absDelta', ascending=False)", sources)
        self.assertIn("comparison_deltas.csv", sources)


if __name__ == "__main__":
    unittest.main()
