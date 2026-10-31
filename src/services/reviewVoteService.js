import { apiClient, IS_SUPABASE } from '../config/api'
import { getUserIdentifier } from './userService'

// ---------------------------------------------------------------------------
// reviewVoteService — thumbs up / thumbs down untuk review.
//
// Mode 1 (server): tabel Supabase `review_votes` (lihat SQL di panduan).
// Mode 2 (fallback): localStorage — dipakai otomatis kalau tabel belum ada /
//                    request gagal. Di mode ini hitungan hanya mencerminkan
//                    vote milik browser ini.
// ---------------------------------------------------------------------------
const LOCAL_KEY = 'bore_barrel_review_votes'

const readLocal = () => {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY)) || {}
  } catch {
    return {}
  }
}
const writeLocal = (map) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

const buildLocal = (ids) => {
  const mine = readLocal()
  const counts = {}
  const myVotes = {}
  ids.forEach((id) => {
    const v = mine[id] || null
    myVotes[id] = v
    counts[id] = { up: v === 'up' ? 1 : 0, down: v === 'down' ? 1 : 0 }
  })
  return { counts, mine: myVotes, isLocal: true }
}

/** Ambil jumlah vote + vote milik user untuk daftar review. */
export const getVotes = async (reviewIds) => {
  if (!reviewIds.length) return { counts: {}, mine: {}, isLocal: false }

  if (IS_SUPABASE) {
    try {
      const rows = await apiClient.get(
        `/rest/v1/review_votes?review_id=in.(${reviewIds.join(',')})&select=review_id,user_id,vote`,
      )
      if (!Array.isArray(rows)) throw new Error('Unexpected response')
      const me = getUserIdentifier()
      const counts = {}
      const mine = {}
      reviewIds.forEach((id) => {
        counts[id] = { up: 0, down: 0 }
        mine[id] = null
      })
      rows.forEach((r) => {
        const id = r.review_id
        if (!counts[id]) counts[id] = { up: 0, down: 0 }
        if (r.vote === 'up') counts[id].up += 1
        if (r.vote === 'down') counts[id].down += 1
        if (r.user_id === me) mine[id] = r.vote
      })
      return { counts, mine, isLocal: false }
    } catch {
      return buildLocal(reviewIds)
    }
  }
  return buildLocal(reviewIds)
}

/**
 * Simpan vote. `vote` = 'up' | 'down' | null (null = hapus vote).
 * `isLocal` dari hasil getVotes menentukan mode penyimpanan.
 */
export const setVote = async (reviewId, vote, isLocal) => {
  if (isLocal || !IS_SUPABASE) {
    const map = readLocal()
    if (vote) map[reviewId] = vote
    else delete map[reviewId]
    writeLocal(map)
    return
  }

  const me = getUserIdentifier()
  if (!vote) {
    await apiClient.delete(`/rest/v1/review_votes?review_id=eq.${reviewId}&user_id=eq.${me}`)
    return
  }
  await apiClient.post(
    '/rest/v1/review_votes?on_conflict=review_id,user_id',
    { review_id: reviewId, user_id: me, vote },
    { headers: { Prefer: 'resolution=merge-duplicates,return=minimal' } },
  )
}
