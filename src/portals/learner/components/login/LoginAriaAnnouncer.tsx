import type { UiMessage } from "../../login/messages";

type Props = {
  message: UiMessage;
};

export default function LoginAriaAnnouncer({ message }: Props) {
  const role = message.type === "error" ? "alert" : "status";
  const live = message.type === "error" ? "assertive" : "polite";

  return (
    <div
      role={role}
      aria-live={live}
      aria-atomic="true"
      style={{
        position: "absolute",
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        border: 0,
      }}
    >
      {message.text}
    </div>
  );
}
