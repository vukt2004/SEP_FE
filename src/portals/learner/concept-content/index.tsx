import type { ReactNode } from "react";
import { ConceptContentIfElse } from "./ConceptContentIfElse";
import { ConceptContentVariables } from "./ConceptContentVariables";
import { ConceptContentOperations } from "./ConceptContentOperations";
import { ConceptContentExecutionOrder } from "./ConceptContentExecutionOrder";
import { ConceptContentForLoop } from "./ConceptContentForLoop";
import { ConceptContentProblemSolving } from "./ConceptContentProblemSolving";

export type ConceptContentKey =
  | "if-else"
  | "variables"
  | "operations"
  | "execution-order"
  | "for-loop"
  | "problem-solving";

export function getConceptContentComponent(key: string | null | undefined): ReactNode | null {
  switch (key) {
    case "if-else":
      return <ConceptContentIfElse />;
    case "variables":
      return <ConceptContentVariables />;
    case "operations":
      return <ConceptContentOperations />;
    case "execution-order":
      return <ConceptContentExecutionOrder />;
    case "for-loop":
      return <ConceptContentForLoop />;
    case "problem-solving":
      return <ConceptContentProblemSolving />;
    default:
      return null;
  }
}

