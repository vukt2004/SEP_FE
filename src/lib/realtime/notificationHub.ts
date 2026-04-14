import * as signalR from "@microsoft/signalr";
import { tokenStorage } from "@/lib/storage/tokenStorage";

const HUB_PATH = "/hubs/notifications";

type Handler = (...args: unknown[]) => void;

class NotificationHubClient {
  private connection: signalR.HubConnection | null = null;
  private handlers: Map<string, Set<Handler>> = new Map();

  private emit(event: string, ...args: unknown[]) {
    const set = this.handlers.get(event);
    if (set) set.forEach((handler) => handler(...args));
  }

  private getBaseUrl(): string {
    const base = import.meta.env.VITE_API_BASE_URL;
    if (base && typeof base === "string") return base.replace(/\/$/, "");
    return "";
  }

  async connect(): Promise<void> {
    if (this.connection?.state === signalR.HubConnectionState.Connected) return;
    if (this.connection?.state === signalR.HubConnectionState.Connecting) {
      return new Promise((resolve) => {
        const check = () => {
          if (this.connection?.state === signalR.HubConnectionState.Connected) resolve();
          else setTimeout(check, 100);
        };
        check();
      });
    }

    const baseUrl = this.getBaseUrl();
    const url = baseUrl ? `${baseUrl}${HUB_PATH}` : HUB_PATH;

    this.connection = new signalR.HubConnectionBuilder()
      .withUrl(url, { accessTokenFactory: () => tokenStorage.getLearnerToken() ?? "" })
      .withAutomaticReconnect([0, 2000, 5000, 10000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    const events = [
      "ReceiveNotification",
      "UnreadCountChanged",
      "NotificationReadStatusChanged",
      "AllNotificationsRead",
      "Error",
    ] as const;

    for (const event of events) {
      this.connection.on(event, (...args: unknown[]) => {
        this.emit(event, ...args);
      });
    }

    this.connection.onreconnected((connectionId?: string) => {
      this.emit("Reconnected", connectionId);
    });

    await this.connection.start();
  }

  async disconnect(): Promise<void> {
    if (!this.connection) return;
    await this.connection.stop();
    this.connection = null;
    this.handlers.clear();
  }

  on(event: string, handler: Handler): () => void {
    if (!this.handlers.has(event)) this.handlers.set(event, new Set());
    this.handlers.get(event)!.add(handler);
    return () => this.handlers.get(event)?.delete(handler);
  }
}

export const notificationHub = new NotificationHubClient();
