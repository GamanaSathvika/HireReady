export function cn(...parts) {
  return parts
    .flatMap((p) => {
      if (!p) return []
      if (typeof p === 'string') return [p]
      if (Array.isArray(p)) return p
      if (typeof p === 'object') return Object.entries(p).flatMap(([k, v]) => (v ? [k] : []))
      return []
    })
    .join(' ')
}

