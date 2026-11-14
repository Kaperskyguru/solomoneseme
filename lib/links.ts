export function withRef(url: string): string {
  const u = new URL(url);
  u.searchParams.set("ref", "solomoneseme");
  u.searchParams.set("utm_source", "solomoneseme");
  return u.toString();
}
