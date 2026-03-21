import { learnerLobbyApi } from "@/services/api/learner/lobby.api";

/** POST /lobby/rooms/:id/leave — đồng bộ RoomManager (có thể tạo phòng mới / join khác). */
export async function leaveLobbyRoom(roomId: string | null | undefined): Promise<void> {
  const id = roomId?.trim();
  if (!id) return;
  try {
    await learnerLobbyApi.leaveRoom(id);
  } catch {
    /* ignore — điều hướng vẫn tiếp tục */
  }
}
