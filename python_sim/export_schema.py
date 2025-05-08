from simulation_schema import SimulationInputSchema
import json

if __name__ == "__main__":
    schema = SimulationInputSchema.schema_json(indent=2)
    with open("simulation_input.schema.json", "w") as f:
        f.write(schema)
    print("Exported simulation_input.schema.json") 