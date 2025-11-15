// Utility to map scenario DB row to camelCase API object
export function toCamelScenario(row: any) {
  // Prefer camelCase (from Drizzle .returning()), fallback to snake_case (from .select())
  const get = (camel: string, snake: string, fallback: any = undefined) => {
    const value = row[camel] !== undefined ? row[camel] : (row[snake] !== undefined ? row[snake] : fallback);
    // Ensure arrays are properly handled
    return Array.isArray(value) ? value : (value || fallback);
  };

  return {
    id: row.id,
    name: row.name,
    modelId: get('modelId', 'model_id'),
    description: row.description,
    initialValues: get('initialValues', 'initial_values', {}),
    results: row.results,
    simulationParams: get('simulationParams', 'simulation_params'),
    clampedNodes: get('clampedNodes', 'clamped_nodes', []),
    nodes: row.nodes || [],
    createdAt: get('createdAt', 'created_at')
      ? new Date(get('createdAt', 'created_at')).toISOString()
      : "",
    updatedAt: get('updatedAt', 'updated_at')
      ? new Date(get('updatedAt', 'updated_at')).toISOString()
      : "",
    // Add more fields as needed in the future
  };
} 