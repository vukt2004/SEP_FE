import type { ChapterData } from "../landing.types";
import ArrivalScene from "../scenes/ArrivalScene";
import CompetitionScene from "../scenes/CompetitionScene";
import LearningScene from "../scenes/LearningScene";

type ChapterSceneByIdProps = {
  id: ChapterData["id"];
};

export default function ChapterSceneById({ id }: ChapterSceneByIdProps) {
  if (id === "arrival") return <ArrivalScene />;
  if (id === "learning") return <LearningScene />;
  return <CompetitionScene />;
}
