import GalaxyHomeLayout from "@/portals/learner/components/home/GalaxyHomeLayout";
import { mockStudentHome } from "../components/home/home.mock";

export default function HomePage() {
  return <GalaxyHomeLayout vm={mockStudentHome} />;
}
