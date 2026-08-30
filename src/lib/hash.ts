/* Merge key/value pairs into the URL hash (#year=2004) without adding
   history entries. Pass null to remove a key. Static-export safe. */
export function mergeHash(updates: Record<string, string | null>) {
  if (typeof window === "undefined") return;
  const params = Object.fromEntries(
    window.location.hash
      .slice(1)
      .split("&")
      .filter(Boolean)
      .map((kv) => kv.split("=") as [string, string])
  );
  for (const [k, v] of Object.entries(updates)) {
    if (v === null) delete params[k];
    else params[k] = v;
  }
  const h = Object.entries(params)
    .map(([k, v]) => `${k}=${v}`)
    .join("&");
  window.history.replaceState(
    null,
    "",
    h ? `#${h}` : window.location.pathname + window.location.search
  );
}
