export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <header className="border-b border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-slate-800" />
            <div className="leading-tight">
              <p className="text-sm text-slate-300">SEP</p>
              <p className="text-base font-semibold">Real-time Event</p>
            </div>
          </div>

          <nav className="hidden items-center gap-6 md:flex">
            <a className="text-sm text-slate-300 hover:text-white" href="#">
              Features
            </a>
            <a className="text-sm text-slate-300 hover:text-white" href="#">
              Docs
            </a>
            <a className="text-sm text-slate-300 hover:text-white" href="#">
              Status
            </a>
          </nav>

          <button className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200">
            Get Started
          </button>
        </div>
      </header>

      {/* Hero */}
      <main className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 md:grid-cols-2 md:items-center">
          <div>
            <p className="inline-flex items-center rounded-full border border-slate-800 bg-slate-900/40 px-3 py-1 text-xs text-slate-300">
              Tailwind check • Vite + React + TS
            </p>

            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">
              Home Page demo để kiểm tra Tailwind
            </h1>

            <p className="mt-4 text-base leading-7 text-slate-300">
              Nếu bạn thấy layout có spacing rõ ràng, button hover hoạt động, grid responsive theo
              màn hình và typography đẹp thì Tailwind đã chạy OK.
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button className="rounded-xl bg-indigo-500 px-5 py-3 text-sm font-semibold text-white hover:bg-indigo-400">
                Create room
              </button>
              <button className="rounded-xl border border-slate-800 bg-slate-900/30 px-5 py-3 text-sm font-semibold text-slate-100 hover:bg-slate-900">
                Join event
              </button>
            </div>

            <div className="mt-8 flex items-center gap-6 text-sm text-slate-300">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                SignalR ready
              </div>
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-sky-400" />
                Realtime UI
              </div>
            </div>
          </div>

          {/* Preview card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6 shadow">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Live Room Preview</p>
              <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-slate-200">
                connected
              </span>
            </div>

            <div className="mt-6 grid gap-3">
              {["Alice joined", "Bob joined", "New message received"].map((t) => (
                <div
                  key={t}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/40 px-4 py-3"
                >
                  <p className="text-sm text-slate-200">{t}</p>
                  <span className="text-xs text-slate-400">now</span>
                </div>
              ))}
            </div>

            <div className="mt-6 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <p className="text-xs text-slate-400">Try typing…</p>
              <div className="mt-2 flex gap-2">
                <input
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Message"
                />
                <button className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-slate-200">
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Feature cards */}
        <section className="mt-12">
          <h2 className="text-xl font-semibold">Quick checks</h2>
          <p className="mt-2 text-sm text-slate-300">
            Các card dưới đây giúp bạn nhìn thấy rõ border/hover/grid của Tailwind.
          </p>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                title: "Responsive grid",
                desc: "Resize trình duyệt để thấy layout đổi cột.",
              },
              {
                title: "Hover states",
                desc: "Di chuột vào card và button để kiểm tra hover.",
              },
              {
                title: "Focus ring",
                desc: "Click input để thấy focus:ring hoạt động.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-slate-800 bg-slate-900/30 p-5 hover:bg-slate-900/50"
              >
                <p className="text-base font-semibold">{item.title}</p>
                <p className="mt-2 text-sm text-slate-300">{item.desc}</p>
                <div className="mt-4 h-1 w-16 rounded-full bg-indigo-500" />
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-14 border-t border-slate-800 pt-6 text-sm text-slate-400">
          © {new Date().getFullYear()} SEP_FE • Tailwind check page
        </footer>
      </main>
    </div>
  );
}
