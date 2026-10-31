// ---------------------------------------------------------------------------
// queryCache.js — query caching sederhana (in-memory) dengan TTL,
// de-duplikasi request yang sedang berjalan, dan invalidasi berdasarkan prefix.
//
// Pola yang dipakai hooks: "stale-while-revalidate"
//   1. Kalau ada data di cache -> tampilkan langsung (tanpa loading spinner)
//   2. Kalau cache sudah lewat TTL -> ambil data baru di belakang layar
// ---------------------------------------------------------------------------
const store = new Map() // key -> { data, time }
const inflight = new Map() // key -> Promise

export const DEFAULT_TTL = 60 * 1000 // 1 menit

/** Ambil data cache (tanpa peduli sudah expired atau belum). */
export const peek = (key) => store.get(key)?.data

/** Simpan data ke cache. */
export const setCached = (key, data) => {
  store.set(key, { data, time: Date.now() })
}

/**
 * Ambil data lewat cache.
 * - Jika cache masih fresh (umur < ttl) dan bukan force -> return dari cache
 * - Jika request yang sama sedang berjalan -> pakai promise yang sama
 * - Selain itu panggil fetcher() lalu simpan hasilnya
 * Fetcher yang melempar error TIDAK disimpan ke cache.
 */
export const fetchWithCache = async (
  key,
  fetcher,
  { ttl = DEFAULT_TTL, force = false } = {},
) => {
  const entry = store.get(key)
  if (!force && entry && Date.now() - entry.time < ttl) return entry.data
  if (inflight.has(key)) return inflight.get(key)

  const promise = fetcher()
    .then((data) => {
      setCached(key, data)
      return data
    })
    .finally(() => inflight.delete(key))

  inflight.set(key, promise)
  return promise
}

/** Hapus semua cache yang key-nya diawali prefix. Contoh: invalidate('guns:') */
export const invalidate = (prefix = '') => {
  for (const key of Array.from(store.keys())) {
    if (key.startsWith(prefix)) store.delete(key)
  }
}

export const clearCache = () => store.clear()
