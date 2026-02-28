// src/app/router/router.ui.tsx
export function AppLoader() {
  return <div style={{ padding: 24 }}>Loading…</div>;
}

export function NotFoundPage() {
  return <div style={{ padding: 24 }}>404 - Not Found</div>;
}

export function RouteErrorPage() {
  return <div style={{ padding: 24 }}>Something went wrong.</div>;
}
