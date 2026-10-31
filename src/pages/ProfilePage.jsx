import { useState } from 'react'
import {
  Shield,
  Copy,
  Check,
  Heart,
  FileText,
  Archive,
  Camera,
  Play,
  Pencil,
  Trash2,
  RotateCcw,
  Info,
  Phone,
  User,
} from 'lucide-react'
import userService from '../services/userService'
import gunService from '../services/gunService'
import { useFavorites } from '../hooks/useFavorites'
import {
  getAllDraftIds,
  loadDraft,
  deleteDraft,
  getDraftTimestamp,
  formatDraftTime,
} from '../utils/draftStorage'
import { getArchivedList, restoreGun } from '../services/archiveService'
import { invalidate } from '../utils/queryCache'
import ConfirmModal from '../components/modals/ConfirmModal'
import About from './About'
import Contact from './Contact'

const SECTION_KEY = 'bb_profile_section'

const SECTIONS = [
  { id: 'overview', label: 'Overview', icon: User },
  { id: 'drafts', label: 'Drafts', icon: FileText },
  { id: 'archive', label: 'Archive', icon: Archive },
  { id: 'about', label: 'About', icon: Info },
  { id: 'contact', label: 'Contact', icon: Phone },
]

/** Ambil semua draft dari localStorage dalam bentuk list siap tampil. */
const readDrafts = () =>
  getAllDraftIds()
    .map((id) => {
      const draft = loadDraft(id)
      if (!draft) return null
      const image = draft.uploadedImageUrl || draft.imagePreview || ''
      return {
        id,
        isNew: id === 'create',
        name: draft.formData?.name?.trim() || '(Untitled draft)',
        type: draft.formData?.type || '',
        caliber: draft.formData?.caliber || '',
        image: image.startsWith('blob:') ? '' : image, // blob: URL sudah tidak valid
        timestamp: getDraftTimestamp(id) || draft.savedAt || null,
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))

/**
 * ProfilePage — profil + section: Overview, Drafts, Archive, About, Contact.
 * Edit nama & bio sekarang ada di halaman terpisah (EditProfilePage).
 */
export default function ProfilePage({ onReplaySplash, onNavigate }) {
  const [section, setSectionState] = useState(
    () => sessionStorage.getItem(SECTION_KEY) || 'overview',
  )
  const setSection = (id) => {
    setSectionState(id)
    try {
      sessionStorage.setItem(SECTION_KEY, id)
    } catch {
      /* ignore */
    }
  }

  const [profile, setProfile] = useState(() => userService.getUserProfile())
  const [avatar, setAvatar] = useState(profile.avatar || null)
  const [copied, setCopied] = useState(false)
  const [feedback, setFeedback] = useState('')
  const { favorites } = useFavorites()

  const [drafts, setDrafts] = useState(readDrafts)
  const [archived, setArchived] = useState(getArchivedList)
  const [permDelete, setPermDelete] = useState(null)
  const [permDeleting, setPermDeleting] = useState(false)

  const flash = (msg) => {
    setFeedback(msg)
    setTimeout(() => setFeedback(''), 3000)
  }

  const handleCopyId = () => {
    if (profile.userId) {
      navigator.clipboard.writeText(profile.userId)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    if (file.size > 2 * 1024 * 1024) {
      flash('Avatar image must be under 2MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target.result
      setAvatar(base64)
      const result = userService.updateAvatar(base64)
      if (result.success) setProfile(result.data)
      flash('Avatar updated.')
    }
    reader.readAsDataURL(file)
  }

  // ---- Drafts ----
  const handleResumeDraft = (d) => {
    if (!onNavigate) return
    if (d.isNew) onNavigate('Create')
    else onNavigate('Edit', { id: d.id })
  }
  const handleDeleteDraft = (id) => {
    deleteDraft(id)
    setDrafts(readDrafts())
    flash('Draft deleted.')
  }

  // ---- Archive ----
  const handleRestore = (id) => {
    restoreGun(id)
    setArchived(getArchivedList())
    flash('Item restored to catalog.')
  }
  const handlePermanentDelete = async () => {
    if (!permDelete) return
    try {
      setPermDeleting(true)
      if (!String(permDelete.id).startsWith('local-')) {
        await gunService.deleteGun(permDelete.id)
      }
      restoreGun(permDelete.id) // hapus dari daftar arsip
      invalidate('gun')
      setArchived(getArchivedList())
      setPermDelete(null)
      flash('Item permanently deleted.')
    } catch (err) {
      setPermDelete(null)
      flash(err.message || 'Failed to delete item.')
    } finally {
      setPermDeleting(false)
    }
  }

  return (
    <div className="profile-page">
      <section
        className="masthead"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        <div>
          <h1 className="display">Operator Profile</h1>
          <p className="lede">
            Operator credentials, drafts, archive, and shop information.
          </p>
        </div>
        {onReplaySplash && (
          <button
            type="button"
            className="btn btn--outline btn--sm"
            onClick={onReplaySplash}
            title="Replay introductory splash animation"
          >
            <Play size={14} /> Replay Intro
          </button>
        )}
      </section>

      {feedback && (
        <div className="toast toast--success">
          <Check size={18} /> {feedback}
        </div>
      )}

      {/* Section tabs */}
      <nav className="profile-tabs" aria-label="Profile sections">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className={`profile-tab${section === id ? ' profile-tab--active' : ''}`}
            onClick={() => setSection(id)}
          >
            <Icon size={15} /> {label}
            {id === 'drafts' && drafts.length > 0 && (
              <span className="nav-badge">{drafts.length}</span>
            )}
            {id === 'archive' && archived.length > 0 && (
              <span className="nav-badge">{archived.length}</span>
            )}
          </button>
        ))}
      </nav>

      {/* ---------------- Overview ---------------- */}
      {section === 'overview' && (
        <div className="profile-card">
          <div className="profile-card-top">
            <div className="avatar-wrap">
              {avatar ? (
                <img src={avatar} alt={profile.username} className="avatar-img" />
              ) : (
                <div className="avatar-placeholder">
                  <Shield size={36} stroke="var(--brass)" />
                </div>
              )}
              <label
                htmlFor="avatar-file-input"
                className="avatar-upload-btn"
                title="Upload avatar"
              >
                <Camera size={14} />
                <input
                  id="avatar-file-input"
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarChange}
                  className="hidden-file-input"
                />
              </label>
            </div>

            <div className="profile-identity">
              <h2 className="display">{profile.username || 'Shooter'}</h2>
              {profile.bio ? (
                <p className="profile-bio">{profile.bio}</p>
              ) : (
                <p className="profile-bio profile-bio--empty">No bio yet.</p>
              )}
              <div className="profile-id-row">
                <span className="mono-badge">{profile.userId}</span>
                <button
                  type="button"
                  className="icon-btn"
                  onClick={handleCopyId}
                  title="Copy User ID to clipboard"
                >
                  {copied ? <Check size={14} color="var(--brass)" /> : <Copy size={14} />}
                </button>
              </div>
              {onNavigate && (
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={() => onNavigate('EditProfile')}
                  style={{ marginTop: 12 }}
                >
                  <Pencil size={14} /> Edit Profile
                </button>
              )}
            </div>
          </div>

          <div className="profile-stats">
            <div className="stat-item">
              <Heart size={20} className="stat-icon" stroke="var(--brass)" />
              <div className="stat-val">{favorites.length}</div>
              <div className="stat-label">Procurement Favorites</div>
            </div>
            <div className="stat-item">
              <FileText size={20} className="stat-icon" stroke="var(--steel)" />
              <div className="stat-val">{drafts.length}</div>
              <div className="stat-label">Saved Drafts</div>
            </div>
            <div className="stat-item">
              <Archive size={20} className="stat-icon" stroke="var(--steel)" />
              <div className="stat-val">{archived.length}</div>
              <div className="stat-label">Archived Items</div>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- Drafts ---------------- */}
      {section === 'drafts' && (
        <div className="profile-section">
          <h2 className="section-title">Saved Drafts</h2>
          {drafts.length === 0 ? (
            <div className="state-box">
              <FileText size={32} stroke="var(--steel)" />
              <p>No drafts yet. Use “Save Draft” while adding or editing hardware.</p>
            </div>
          ) : (
            <ul className="item-list">
              {drafts.map((d) => (
                <li key={d.id} className="item-row">
                  {d.image ? (
                    <img className="item-thumb" src={d.image} alt="" loading="lazy" />
                  ) : (
                    <div className="item-thumb item-thumb--empty">
                      <FileText size={20} />
                    </div>
                  )}
                  <div className="item-meta">
                    <strong className="display">{d.name}</strong>
                    <span className="type">
                      {d.isNew ? 'New hardware' : 'Editing existing item'}
                      {d.type ? ` · ${d.type}` : ''}
                      {d.caliber ? ` · ${d.caliber}` : ''}
                    </span>
                    <span className="item-time">Saved {formatDraftTime(d.timestamp)}</span>
                  </div>
                  <div className="item-actions">
                    <button
                      type="button"
                      className="btn btn--primary btn--sm"
                      onClick={() => handleResumeDraft(d)}
                    >
                      <Pencil size={14} /> Resume
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger-ghost"
                      onClick={() => handleDeleteDraft(d.id)}
                      title="Delete draft"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ---------------- Archive (soft delete) ---------------- */}
      {section === 'archive' && (
        <div className="profile-section">
          <h2 className="section-title">Archived Items</h2>
          {archived.length === 0 ? (
            <div className="state-box">
              <Archive size={32} stroke="var(--steel)" />
              <p>Archive is empty. Items you archive from the catalog show up here.</p>
            </div>
          ) : (
            <ul className="item-list">
              {archived.map(({ gun, archivedAt }) => (
                <li key={gun.id ?? gun.name} className="item-row">
                  <img
                    className="item-thumb"
                    src={gun.image_url}
                    alt={gun.name}
                    loading="lazy"
                  />
                  <div className="item-meta">
                    <strong className="display">{gun.name}</strong>
                    <span className="type">
                      {gun.type}
                      {gun.caliber ? ` · ${gun.caliber}` : ''}
                    </span>
                    <span className="item-time">
                      Archived {formatDraftTime(archivedAt)}
                    </span>
                  </div>
                  <div className="item-actions">
                    <button
                      type="button"
                      className="btn btn--outline btn--sm"
                      onClick={() => handleRestore(gun.id ?? gun.name)}
                    >
                      <RotateCcw size={14} /> Restore
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger-ghost"
                      onClick={() => setPermDelete(gun)}
                      title="Delete permanently"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* ---------------- About & Contact ---------------- */}
      {section === 'about' && <About />}
      {section === 'contact' && <Contact />}

      <ConfirmModal
        open={Boolean(permDelete)}
        title="Delete Permanently"
        message={`“${permDelete?.name}” will be permanently removed from the server. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        loading={permDeleting}
        onConfirm={handlePermanentDelete}
        onCancel={() => setPermDelete(null)}
      />
    </div>
  )
}
