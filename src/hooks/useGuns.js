import { useState, useEffect, useCallback } from 'react'
import gunService from '../services/gunService'
import { fetchWithCache, peek } from '../utils/queryCache'

// ---------------------------------------------------------------------------
// useGuns — daftar produk, sekarang dengan QUERY CACHING.
// Key cache = 'guns:' + params, jadi tiap kombinasi filter punya cache sendiri.
// Returns { guns, loading, error, pagination, refetch }.
// ---------------------------------------------------------------------------
export function useGuns(params = {}) {
  const paramKey = JSON.stringify(params)
  const cacheKey = `guns:${paramKey}`

  const cached = peek(cacheKey)
  const [guns, setGuns] = useState(cached?.data || [])
  const [loading, setLoading] = useState(!cached)
  const [error, setError] = useState(null)
  const [pagination, setPagination] = useState(cached?.pagination || null)

  const fetchGuns = useCallback(
    async (force = false) => {
      const hit = peek(cacheKey)
      if (hit) {
        // Tampilkan data cache dulu (stale-while-revalidate)
        setGuns(hit.data || [])
        setPagination(hit.pagination || null)
        setLoading(false)
      } else {
        setLoading(true)
      }

      try {
        setError(null)
        const response = await fetchWithCache(
          cacheKey,
          async () => {
            const r = await gunService.getGuns(params)
            if (!r.success) throw new Error(r.message || 'Failed to fetch products.')
            return r
          },
          { force },
        )
        setGuns(response.data || [])
        setPagination(response.pagination || null)
      } catch (err) {
        setError(err.message || 'An error occurred while fetching products.')
        if (!hit) setGuns([])
      } finally {
        setLoading(false)
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    [cacheKey],
  )

  useEffect(() => {
    fetchGuns()
  }, [fetchGuns])

  return { guns, loading, error, pagination, refetch: () => fetchGuns(true) }
}

// ---------------------------------------------------------------------------
// useGunById — satu produk by id, juga ter-cache ('gun:<id>').
// ---------------------------------------------------------------------------
export function useGunById(id) {
  const cacheKey = `gun:${id}`
  const cached = id ? peek(cacheKey) : null
  const [gun, setGun] = useState(cached || null)
  const [loading, setLoading] = useState(Boolean(id) && !cached)
  const [error, setError] = useState(null)

  const fetchGun = useCallback(
    async (force = false) => {
      if (!id) {
        setLoading(false)
        return
      }
      const hit = peek(cacheKey)
      if (hit) {
        setGun(hit)
        setLoading(false)
      } else {
        setLoading(true)
      }

      try {
        setError(null)
        const data = await fetchWithCache(
          cacheKey,
          async () => {
            const r = await gunService.getGunById(id)
            if (!r.success) throw new Error(r.message || 'Product not found.')
            return r.data
          },
          { force },
        )
        setGun(data)
      } catch (err) {
        setError(err.message || 'Failed to load product details.')
        if (!hit) setGun(null)
      } finally {
        setLoading(false)
      }
    },
    [id, cacheKey],
  )

  useEffect(() => {
    fetchGun()
  }, [fetchGun])

  return { gun, loading, error, refetch: () => fetchGun(true) }
}
