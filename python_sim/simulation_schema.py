"""
simulation_schema.py

This module contains all Pydantic models used for validating API requests and responses.
It serves as the single source of truth for the structure of data exchanged between the frontend and backend.
Any changes to API payloads must be reflected here.
"""
from typing import List, Dict, Any, Optional, Union, Literal
from pydantic import BaseModel, Field, root_validator

class SimulationNode(BaseModel):
    id: str
    label: Optional[str] = None
    value: float
    type: Optional[str] = None

class SimulationEdge(BaseModel):
    source: str
    target: str
    weight: float

class SimulationInputSchema(BaseModel):
    # Required fields
    schemaVersion: Literal["1.0.0"] = "1.0.0"
    nodes: List[SimulationNode]
    edges: List[SimulationEdge]
    activation: Optional[str] = Field('sigmoid', description="Activation function")
    threshold: Optional[float] = Field(0.001, description="Convergence threshold")
    maxIterations: Optional[int] = Field(100, description="Maximum iterations")
    compareToBaseline: Optional[bool] = False
    # Current/legacy fields
    initialNodeValues: Optional[Dict[str, float]] = None
    clampedNodes: Optional[List[str]] = None
    interventionScenario: Optional[Dict[str, Any]] = None
    # Forward-compatible/experimental fields
    edgeRules: Optional[Any] = None
    promotedNodes: Optional[List[str]] = None
    activationFunction: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None
    modelInitialValues: Optional[Dict[str, float]] = Field(default=None, description="Initial values for baseline model")
    scenarioInitialValues: Optional[Dict[str, float]] = Field(default=None, description="Initial values for scenario")

    class Config:
        extra = "allow"  # Accept unknown fields

    def log_unknown_fields(self):
        known = set(self.__fields__.keys())
        unknown = set(self.__dict__.keys()) - known
        if unknown:
            print(f"[SimulationInputSchema] Unknown fields received: {unknown}")
            for field in unknown:
                print(f"  {field}: {getattr(self, field)}") 