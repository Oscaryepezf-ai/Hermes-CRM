/**
 * Rate limiter en memoria (ventana deslizante).
 * Limitación: en Vercel cada instancia serverless tiene su propia memoria,
 * así que frena fuerza bruta básica pero no es un límite global exacto.
 * Para un límite global, migrar a Upstash Redis / Vercel KV.
 */
const hits = new Map<string, number[]>()

export function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter(t => now - t < windowMs)
  if (recent.length >= max) {
    hits.set(key, recent)
    return false
  }
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) {
    for (const [k, v] of hits) if (v.every(t => now - t >= windowMs)) hits.delete(k)
  }
  return true
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown"
}
