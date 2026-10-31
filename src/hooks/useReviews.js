import { useState, useEffect, useCallback } from 'react'
import reviewService from '../services/reviewService'
import { fetchWithCache, peek, invalidate } from '../utils/queryCache'

// ---------------------------------------------------------------------------
// useReviews — review untuk satu produk (ter-cache, key 'reviews:<gunId>').
// ---------------------------------------------------------------------------
export function useReviews(gunId) {
  const cacheKey = `reviews:${gunId}`
  const cached = gunId ? peek(cacheKey) : null

  const [reviews, setReviews] = useState(cached || [])
  const [loading, setLoading] = useState(Boolean(gunId) && !cached)
  const [error, setError] = useState(null)

  const fetchReviews = useCallback(
    async (force = false) => {
      if (!gunId) {
        setLoading(false)
        return
      }
      const hit = peek(cacheKey)
      if (hit) {
        setReviews(hit)
        setLoading(false)
      } else {
        setLoading(true)
      }

      try {
        setError(null)
        const list = await fetchWithCache(
          cacheKey,
          async () => {
            const r = await reviewService.getReviews(gunId)
            if (!r.success) throw new Error(r.message || 'Failed to fetch reviews.')
            return r.data || []
          },
          { force, ttl: 30 * 1000 },
        )
        setReviews(list)
      } catch (err) {
        setError(err.message || 'An error occurred while fetching reviews.')
        if (!hit) setReviews([])
      } finally {
        setLoading(false)
      }
    },
    [gunId, cacheKey],
  )

  useEffect(() => {
    fetchReviews()
  }, [fetchReviews])

  return { reviews, loading, error, refetch: () => fetchReviews(true) }
}

// ---------------------------------------------------------------------------
// useCreateReview — CREATE
// ---------------------------------------------------------------------------
export function useCreateReview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  const createReview = async (gunId, reviewData) => {
    try {
      setLoading(true)
      setError(null)
      setSuccess(false)
      const response = await reviewService.createReview(gunId, reviewData)
      if (response.success) {
        invalidate('reviews:')
        setSuccess(true)
        return response.data
      }
      setError(response.message || 'Failed to submit review.')
      return null
    } catch (err) {
      setError(err.message || 'An error occurred while submitting review.')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { createReview, loading, error, success }
}

// ---------------------------------------------------------------------------
// useUpdateReview — UPDATE
// ---------------------------------------------------------------------------
export function useUpdateReview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const updateReview = async (reviewId, reviewData) => {
    try {
      setLoading(true)
      setError(null)
      const response = await reviewService.updateReview(reviewId, reviewData)
      if (response.success) {
        invalidate('reviews:')
        return response.data || true
      }
      setError(response.message || 'Failed to update review.')
      return null
    } catch (err) {
      setError(err.message || 'An error occurred while updating review.')
      return null
    } finally {
      setLoading(false)
    }
  }

  return { updateReview, loading, error }
}

// ---------------------------------------------------------------------------
// useDeleteReview — DELETE
// ---------------------------------------------------------------------------
export function useDeleteReview() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const deleteReview = async (reviewId) => {
    try {
      setLoading(true)
      setError(null)
      const response = await reviewService.deleteReview(reviewId)
      if (response.success) {
        invalidate('reviews:')
        return true
      }
      setError(response.message || 'Failed to delete review.')
      return false
    } catch (err) {
      setError(err.message || 'An error occurred while deleting review.')
      return false
    } finally {
      setLoading(false)
    }
  }

  return { deleteReview, loading, error }
}
