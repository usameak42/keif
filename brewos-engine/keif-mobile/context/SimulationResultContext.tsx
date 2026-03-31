import React, { createContext, useContext, useState } from "react";
import type { SimulationInput, SimulationOutput } from "../types/simulation";

interface SimulationResultContextValue {
  currentInput: SimulationInput | null;
  currentOutput: SimulationOutput | null;
  currentRunSaved: boolean;
  setCurrentInput: (input: SimulationInput | null) => void;
  setCurrentOutput: (output: SimulationOutput | null) => void;
  setCurrentRunSaved: (saved: boolean) => void;
}

const SimulationResultContext = createContext<SimulationResultContextValue | null>(null);

export function SimulationResultProvider({ children }: { children: React.ReactNode }) {
  const [currentInput, setCurrentInput] = useState<SimulationInput | null>(null);
  const [currentOutput, setCurrentOutput] = useState<SimulationOutput | null>(null);
  const [currentRunSaved, setCurrentRunSaved] = useState(false);

  return (
    <SimulationResultContext.Provider
      value={{
        currentInput,
        currentOutput,
        currentRunSaved,
        setCurrentInput,
        setCurrentOutput,
        setCurrentRunSaved,
      }}
    >
      {children}
    </SimulationResultContext.Provider>
  );
}

export function useSimulationResult(): SimulationResultContextValue {
  const context = useContext(SimulationResultContext);
  if (!context) {
    throw new Error("useSimulationResult must be used within a SimulationResultProvider");
  }
  return context;
}
