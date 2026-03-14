import { motion } from "framer-motion";

type RingProps = {
  size: number;
  top: string;
  left: string;
  color: string;
  duration: number;
};

export default function Ring({ size, top, left, color, duration }: RingProps) {
  return (
    <motion.div
      className="absolute rounded-full border"
      style={{ width: size, height: size, top, left, borderColor: color }}
      animate={{ rotate: 360 }}
      transition={{ repeat: Infinity, duration, ease: "linear" }}
    />
  );
}
