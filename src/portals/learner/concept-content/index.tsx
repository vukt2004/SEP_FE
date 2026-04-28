// Bài học React theo ContentKey chuẩn hóa — phải khớp seed SeedingExtension (9 concept: variables, operators,
// execution-order, if-else, comparison, for-loop, while-loop, problem-analysis, basic-algorithm).
import type { ReactNode } from "react";
import { ConceptContentIfElse } from "./ConceptContentIfElse";
import { ConceptContentVariables } from "./ConceptContentVariables";
import { ConceptContentOperations } from "./ConceptContentOperations";
import { ConceptContentExecutionOrder } from "./ConceptContentExecutionOrder";
import { ConceptContentForLoop } from "./ConceptContentForLoop";
import { ConceptContentProblemSolving } from "./ConceptContentProblemSolving";
import { ConceptContentBasicAlgorithm } from "./ConceptContentBasicAlgorithm";
import { ConceptContentComparison } from "./ConceptContentComparison";
import { ConceptContentWhileLoop } from "./ConceptContentWhileLoop";

export type ConceptContentKey =
  | "if-else"
  | "variables"
  | "operations"
  | "execution-order"
  | "for-loop"
  | "while-loop"
  | "comparison"
  | "basic-algorithm"
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
    case "while-loop":
      return <ConceptContentWhileLoop />;
    case "comparison":
      return <ConceptContentComparison />;
    case "basic-algorithm":
      return <ConceptContentBasicAlgorithm />;
    case "problem-solving":
      return <ConceptContentProblemSolving />;
    default:
      return null;
  }
}

