import React, { useEffect, useState } from "react";
import { FileJson2, Link as LinkIcon, Megaphone, Send, Sparkles } from "lucide-react";
import { cmsNotificationsApi } from "@/services/api/cms/notifications.api";
import { AlertToast } from "@/shared/components/AlertToast";

type FormState = {
  title: string;
  body: string;
  actionUrl: string;
  payloadJson: string;
};

const initialFormState: FormState = {
  title: "",
  body: "",
  actionUrl: "",
  payloadJson: "",
};

const quickTemplates = [
  {
    title: "Bảo trì hệ thống",
    body: "Nền tảng sẽ được bảo trì tối nay từ 23:00 đến 23:30. Vui lòng lưu lại tiến trình của bạn trước thời gian này.",
    actionUrl: "/status",
  },
  {
    title: "Sự kiện học tập mới",
    body: "Một sự kiện học tập mới đã bắt đầu. Tham gia ngay hôm nay để nhận thêm phần thưởng và leo hạng trên bảng xếp hạng tuần.",
    actionUrl: "/app/browse",
  },
  {
    title: "Cập nhật tính năng",
    body: "Chúng tôi đã phát hành bản cập nhật với thông báo nhanh hơn và quy trình CMS gọn gàng hơn cho quản trị viên.",
    actionUrl: "/cms/dashboard",
  },
] as const;

const SystemAnnouncementPage: React.FC = () => {
  const [form, setForm] = useState<FormState>(initialFormState);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "warning" | "error";
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3500);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const updateField = (key: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const applyTemplate = (template: (typeof quickTemplates)[number]) => {
    setForm((current) => ({
      ...current,
      title: template.title,
      body: template.body,
      actionUrl: template.actionUrl,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const title = form.title.trim();
    const body = form.body.trim();

    if (!title || !body) {
      setToast({ type: "warning", message: "Title and body are required." });
      return;
    }

    if (form.payloadJson.trim()) {
      try {
        JSON.parse(form.payloadJson);
      } catch {
        setToast({ type: "error", message: "Payload JSON must be valid JSON." });
        return;
      }
    }

    try {
      setSubmitting(true);
      const response = await cmsNotificationsApi.sendSystemAnnouncement({
        title,
        body,
        actionUrl: form.actionUrl.trim() || undefined,
        payloadJson: form.payloadJson.trim() || undefined,
      });

      if (!response.data.isSuccess || !response.data.data) {
        setToast({
          type: "error",
          message:
            response.data.message ??
            response.data.errors?.join(", ") ??
            "Failed to send announcement.",
        });
        return;
      }

      setToast({
        type: "success",
        message: response.data.message ?? "Announcement sent successfully.",
      });
      setForm(initialFormState);
    } catch (error) {
      console.error("Send system announcement failed:", error);
      setToast({ type: "error", message: "Failed to send announcement." });
    } finally {
      setSubmitting(false);
    }
  };

  const titleLength = form.title.trim().length;
  const bodyLength = form.body.trim().length;

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {toast ? (
        <AlertToast type={toast.type} message={toast.message} onClose={() => setToast(null)} />
      ) : null}

      <div className="mb-8 rounded-3xl border border-[var(--border)] bg-[linear-gradient(135deg,rgba(14,165,233,0.16),rgba(15,23,42,0.03))] p-6 shadow-sm">
        <div className="space-y-4">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--text)] md:text-4xl">
            Send one message to every active user
          </h1>
          <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--text-2)]">
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
              Target: All active users
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
              Type: SystemAnnouncement
            </span>
            <span className="rounded-full border border-[var(--border)] bg-[var(--surface)] px-3 py-1">
              SignalR realtime
            </span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm"
        >
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold text-[var(--text)]">Compose announcement</h2>
              <p className="mt-1 text-sm text-[var(--text-2)]">
                Keep it short, actionable, and easy to follow.
              </p>
            </div>
            <Sparkles className="mt-1 text-cyan-400" size={20} />
          </div>

          <div className="space-y-5">
            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--text)]">Title</span>
              <input
                value={form.title}
                onChange={(event) => updateField("title", event.target.value)}
                maxLength={120}
                placeholder="Example: Planned maintenance tonight"
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text)] outline-none transition focus:border-cyan-400"
              />
              <div className="text-xs text-[var(--text-2)]">{titleLength}/120 characters</div>
            </label>

            <label className="block space-y-2">
              <span className="text-sm font-medium text-[var(--text)]">Body</span>
              <textarea
                value={form.body}
                onChange={(event) => updateField("body", event.target.value)}
                rows={7}
                maxLength={1000}
                placeholder="Write the full message here..."
                className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text)] outline-none transition focus:border-cyan-400"
              />
              <div className="text-xs text-[var(--text-2)]">{bodyLength}/1000 characters</div>
            </label>

            <div className="grid gap-5 md:grid-cols-2">
              <label className="block space-y-2">
                <span className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                  <LinkIcon size={16} />
                  Action URL
                </span>
                <input
                  value={form.actionUrl}
                  onChange={(event) => updateField("actionUrl", event.target.value)}
                  placeholder="/cms/dashboard or /app/browse"
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text)] outline-none transition focus:border-cyan-400"
                />
              </label>

              <label className="block space-y-2">
                <span className="flex items-center gap-2 text-sm font-medium text-[var(--text)]">
                  <FileJson2 size={16} />
                  Payload JSON
                </span>
                <input
                  value={form.payloadJson}
                  onChange={(event) => updateField("payloadJson", event.target.value)}
                  placeholder='{"category":"maintenance"}'
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] px-4 py-3 text-[var(--text)] outline-none transition focus:border-cyan-400"
                />
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 border-t border-[var(--border)] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send size={16} />
              {submitting ? "Sending..." : "Send announcement"}
            </button>
          </div>
        </form>

        <aside className="space-y-6">
          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--text)]">Preview</h2>
            <div className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--surface-2)] p-5">
              <div className="flex items-start gap-4">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-cyan-500/15 text-cyan-300">
                  <Megaphone size={20} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-[var(--text)]">
                    {form.title.trim() || "Announcement title preview"}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[var(--text-2)]">
                    {form.body.trim() || "Your announcement body will appear here."}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--text-2)]">
                    <span className="rounded-full border border-[var(--border)] px-3 py-1">
                      SystemAnnouncement
                    </span>
                    <span className="rounded-full border border-[var(--border)] px-3 py-1">
                      All active users
                    </span>
                    {form.actionUrl.trim() ? (
                      <span className="rounded-full border border-[var(--border)] px-3 py-1">
                        Action: {form.actionUrl.trim()}
                      </span>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-[var(--border)] bg-[var(--surface)] p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-[var(--text)]">Quick templates</h2>
            <div className="mt-4 space-y-3">
              {quickTemplates.map((template) => (
                <button
                  key={template.title}
                  type="button"
                  onClick={() => applyTemplate(template)}
                  className="w-full rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-4 text-left transition hover:border-cyan-400 hover:bg-cyan-500/5"
                >
                  <div className="text-sm font-semibold text-[var(--text)]">{template.title}</div>
                  <div className="mt-1 text-sm text-[var(--text-2)]">{template.body}</div>
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
};

export default SystemAnnouncementPage;
