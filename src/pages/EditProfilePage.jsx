import { useState } from 'react'
import { ArrowLeft, Save, AlertCircle, CheckCircle } from 'lucide-react'
import userService from '../services/userService'

/**
 * EditProfilePage — halaman terpisah untuk mengubah nama & bio.
 * (Sebelumnya form ini ada di bagian bawah ProfilePage.)
 */
export default function EditProfilePage({ onBack, onSaved }) {
  const profile = userService.getUserProfile()
  const [username, setUsername] = useState(profile.username || 'Shooter')
  const [bio, setBio] = useState(profile.bio || '')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const name = username.trim()
    if (name.length < 2) {
      setError('Name must be at least 2 characters.')
      return
    }
    if (name.length > 30) {
      setError('Name must be at most 30 characters.')
      return
    }

    const result = userService.saveUserProfile({
      ...profile,
      username: name,
      bio: bio.trim(),
    })

    if (result.success) {
      setSuccess('Profile successfully updated.')
      setTimeout(() => onSaved && onSaved(), 700)
    } else {
      setError(result.message || 'Failed to save profile.')
    }
  }

  return (
    <div className="form-page">
      <div className="form-head">
        <button type="button" className="detail-back" onClick={onBack}>
          <ArrowLeft size={18} /> Back to Profile
        </button>
      </div>

      <div className="form-title-group">
        <h1 className="display">Edit Profile</h1>
        <p className="lede">Update your callsign and station bio.</p>
      </div>

      {error && (
        <div className="toast toast--error">
          <AlertCircle size={18} /> {error}
        </div>
      )}
      {success && (
        <div className="toast toast--success">
          <CheckCircle size={18} /> {success}
        </div>
      )}

      <form onSubmit={handleSubmit} className="entry-form">
        <div className="form-group">
          <label htmlFor="edit-name" className="form-label">
            Callsign / Operator Alias <span className="req">*</span>
          </label>
          <input
            id="edit-name"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="e.g. Operator Delta, Master Gunsmith"
            className="form-input"
            maxLength={30}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="edit-bio" className="form-label">
            Armory Notes / Station Bio
          </label>
          <textarea
            id="edit-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Qualifications, preferred calibers, unit assignment..."
            rows={5}
            maxLength={300}
            className="form-textarea"
          />
          <span className="form-hint">{bio.length}/300</span>
        </div>

        <div className="form-actions-bar">
          <button type="button" className="btn btn--outline" onClick={onBack}>
            Cancel
          </button>
          <button type="submit" className="btn btn--primary">
            <Save size={16} /> Save Profile
          </button>
        </div>
      </form>
    </div>
  )
}
