export type Block =
  | { id: string; type: "move" }
  | { id: string; type: "turnLeft" }
  | { id: string; type: "turnRight" }
  | {
      id: string;
      type: "repeat";
      times: number;
      children: Block[];
    }
  | {
      id: string;
      type: "ifObstacleAhead";
      children: Block[];
    };

export type BlockProgram = Block[];
