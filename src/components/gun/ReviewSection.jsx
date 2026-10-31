import { useState, useEffect } from 'react'
import {
  Star,
  Send,
  Loader,
  Pencil,
  Trash2,
  ThumbsUp,
  ThumbsDown,
  Check,
  X,
} from 'lucide-react'
import { useCreateReview, useUpdateReview, useDeleteReview } from '../../hooks/useReviews'
import { getVotes, setVote } from '../../services/reviewVoteService'
import { getUserIdentifier } from '../../services/userService'
import ConfirmModal from '../modals/ConfirmModal'

function StarPicker({ value, onChange, size = 22 }) {
  return (
    <div className="review-stars">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className="star-btn"
          onClick={() => onChange(n)}
          aria-label={`${n} star${n > 1 ? 's' : ''}`}
        >
          <Star
            size={size}
            fill={n <= value ? 'var(--brass)' : 'none'}
            stroke={n <= value ? 'var(--brass)' : 'var(--steel)'}
          />
        </button>
      ))}
    </div>
  )
}

/**
 * ReviewSection — CRUD review + thumbs up / down.
 * Data review (reviews/loading/refetch) dikirim dari GunDetail.
 */
export default function ReviewSection({ gunId, reviews, loading, refetch }) {
  const me = getUserIdentifier()

  // ---- Create ----
  const { createReview, loading: submitting } = useCreateReview()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // ---- Update ----
  const { updateReview, loading: updating } = useUpdateReview()
  const [editingId, setEditingId] = useState(null)
  const [editRating, setEditRating] = useState(5)
  const [editComment, setEditComment] = useState('')

  // ---- Delete ----
  const { deleteReview, loading: deleting } = useDeleteReview()
  const [deleteTarget, setDeleteTarget] = useState(null)

  // ---- Votes ----
  const [votes, setVotes] = useState({ counts: {}, mine: {}, isLocal: false })
  const idsKey = reviews.map((r) => r.id).join(',')

  useEffect(() => {
    let alive = true
    if (!idsKey) return undefined
    getVotes(idsKey.split(',')).then((v) => {
      if (alive) setVotes(v)
    })
    return () => {
      alive = false
    }
  }, [idsKey])

  const flash = (setter, msg) => {
    setter(msg)
    setTimeout(() => setter(''), 3000)
  }

  // CREATE
  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    const result = await createReview(gunId, {
      user_identifier: me,
      rating,
      comment: comment.trim(),
    })
    if (result) {
      flash(setSuccess, 'Review submitted!')
      setComment('')
      setRating(5)
      refetch()
    } else {
      setError('Could not submit review. The server may be unavailable.')
    }
  }

  // UPDATE
  const startEdit = (rev) => {
    setEditingId(rev.id)
    setEditRating(rev.rating)
    setEditComment(rev.comment || '')
  }
  const handleUpdate = async (rev) => {
    const result = await updateReview(rev.id, {
      rating: editRating,
      comment: editComment.trim(),
    })
    if (result) {
      setEditingId(null)
      flash(setSuccess, 'Review updated.')
      refetch()
    } else {
      setError('Could not update review.')
    }
  }

  // DELETE
  const handleDelete = async () => {
    if (!deleteTarget) return
    const ok = await deleteReview(deleteTarget.id)
    setDeleteTarget(null)
    if (ok) {
      flash(setSuccess, 'Review deleted.')
      refetch()
    } else {
      setError('Could not delete review.')
    }
  }

  // THUMBS UP / DOWN
  const handleVote = async (reviewId, type) => {
    const current = votes.mine[reviewId] || null
    const next = current === type ? null : type

    // optimistic update
    setVotes((prev) => {
      const entry = { ...(prev.counts[reviewId] || { up: 0, down: 0 }) }
      if (current) entry[current] = Math.max(0, entry[current] - 1)
      if (next) entry[next] += 1
      return {
        ...prev,
        counts: { ...prev.counts, [reviewId]: entry },
        mine: { ...prev.mine, [reviewId]: next },
      }
    })

    try {
      await setVote(reviewId, next, votes.isLocal)
    } catch {
      flash(setError, 'Could not save your vote.')
      getVotes(reviews.map((r) => r.id)).then(setVotes) // rollback
    }
  }

  return (
    <section className="detail-section">
      <h2>Reviews</h2>

      {/* Create */}
      <form className="review-form" onSubmit={handleSubmit}>
        <StarPicker value={rating} onChange={setRating} />
        <textarea
          className="review-input"
          rows="3"
          placeholder="Write a short review (optional)…"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={500}
        />
        <button type="submit" className="btn btn--primary" disabled={submitting || !gunId}>
          {submitting ? (
            <>
              <Loader size={16} className="spin" /> Submitting…
            </>
          ) : (
            <>
              <Send size={16} /> Submit Review
            </>
          )}
        </button>
        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}
        {!gunId && (
          <p className="form-hint">
            Reviews require a server-generated product ID. This product is local-only.
          </p>
        )}
      </form>

      {/* Read */}
      {loading ? (
        <p className="detail-loading">Loading reviews…</p>
      ) : reviews.length > 0 ? (
        <ul className="review-list">
          {reviews.map((rev) => {
            const isMine = rev.user_id && rev.user_id === me
            const isEditing = editingId === rev.id
            const count = votes.counts[rev.id] || { up: 0, down: 0 }
            const myVote = votes.mine[rev.id] || null

            return (
              <li key={rev.id} className="review-item">
                <div className="review-head">
                  <span className="review-user">
                    {isMine ? 'You' : rev.user_identifier || 'Anonymous'}
                  </span>
                  {!isEditing && (
                    <span className="review-stars-display">
                      {Array.from({ length: 5 }, (_, i) => (
                        <Star
                          key={i}
                          size={14}
                          fill={i < rev.rating ? 'var(--brass)' : 'none'}
                          stroke={i < rev.rating ? 'var(--brass)' : 'var(--line)'}
                        />
                      ))}
                    </span>
                  )}
                </div>

                {isEditing ? (
                  <div className="review-edit">
                    <StarPicker value={editRating} onChange={setEditRating} size={20} />
                    <textarea
                      className="review-input"
                      rows="3"
                      value={editComment}
                      onChange={(e) => setEditComment(e.target.value)}
                      maxLength={500}
                    />
                    <div className="review-actions">
                      <button
                        type="button"
                        className="btn btn--primary btn--sm"
                        onClick={() => handleUpdate(rev)}
                        disabled={updating}
                      >
                        <Check size={14} /> {updating ? 'Saving…' : 'Save'}
                      </button>
                      <button
                        type="button"
                        className="btn btn--outline btn--sm"
                        onClick={() => setEditingId(null)}
                        disabled={updating}
                      >
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  rev.comment && <p className="review-comment">{rev.comment}</p>
                )}

                {!isEditing && (
                  <div className="review-actions">
                    <button
                      type="button"
                      className={`vote-btn${myVote === 'up' ? ' vote-btn--active' : ''}`}
                      onClick={() => handleVote(rev.id, 'up')}
                      aria-pressed={myVote === 'up'}
                      title="Helpful"
                    >
                      <ThumbsUp size={14} /> {count.up}
                    </button>
                    <button
                      type="button"
                      className={`vote-btn${myVote === 'down' ? ' vote-btn--active vote-btn--down' : ''}`}
                      onClick={() => handleVote(rev.id, 'down')}
                      aria-pressed={myVote === 'down'}
                      title="Not helpful"
                    >
                      <ThumbsDown size={14} /> {count.down}
                    </button>

                    {isMine && (
                      <>
                        <button
                          type="button"
                          className="vote-btn"
                          onClick={() => startEdit(rev)}
                          title="Edit review"
                        >
                          <Pencil size={14} /> Edit
                        </button>
                        <button
                          type="button"
                          className="vote-btn vote-btn--danger"
                          onClick={() => setDeleteTarget(rev)}
                          title="Delete review"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      </>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      ) : (
        <p className="detail-empty">No reviews yet. Be the first!</p>
      )}

      {votes.isLocal && reviews.length > 0 && (
        <p className="form-hint">
          Vote counts are stored on this device only (review_votes table not available).
        </p>
      )}

      <ConfirmModal
        open={Boolean(deleteTarget)}
        title="Delete Review"
        message="Are you sure you want to delete your review? This action cannot be undone."
        confirmLabel="Delete"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </section>
  )
}
