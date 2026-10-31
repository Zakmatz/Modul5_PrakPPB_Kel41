import { lazy, Suspense, useEffect, useState } from 'react'
import { Loader, AlertCircle } from 'lucide-react'
import Header from './components/Header.jsx'
import Footer from './components/Footer.jsx'
import PWABadge from './components/PWABadge.jsx'
import ConfirmModal from './components/modals/ConfirmModal.jsx'
import SplashScreen from './components/common/SplashScreen.jsx'
import { CartProvider } from './context/CartContext.jsx'
import gunService from './services/gunService.js'
import { archiveGun } from './services/archiveService.js'
import { invalidate } from './utils/queryCache.js'
import './App.css'
import './challenge.css'

// ---------------------------------------------------------------------------
// LAZY LOADING — tiap halaman jadi chunk JS terpisah yang baru diunduh saat
// pertama kali dibuka (code splitting), sehingga bundle awal jadi lebih kecil.
// ---------------------------------------------------------------------------
const Catalog = lazy(() => import('./pages/Catalog.jsx'))
const FavoritesPage = lazy(() => import('./pages/FavoritesPage.jsx'))
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'))
const EditProfilePage = lazy(() => import('./pages/EditProfilePage.jsx'))
const CartPage = lazy(() => import('./pages/CartPage.jsx'))
const CreateGunPage = lazy(() => import('./pages/CreateGunPage.jsx'))
const EditGunPage = lazy(() => import('./pages/EditGunPage.jsx'))
const GunDetail = lazy(() => import('./components/gun/GunDetail.jsx'))

function PageLoader() {
  return (
    <div className="state-box page-loader">
      <Loader size={28} className="spin" />
      <p>Loading…</p>
    </div>
  )
}

// Hapus ?gun=<id> dari address bar (setelah keluar dari halaman share link)
const clearSharedParam = () => {
  if (window.location.search) {
    window.history.replaceState(null, '', window.location.pathname)
  }
}

function AppContent() {
  // ?gun=<id> -> tautan share
  const [sharedId] = useState(() => new URLSearchParams(window.location.search).get('gun'))
  const [sharedState, setSharedState] = useState(sharedId ? 'loading' : 'idle')

  const [showSplash, setShowSplash] = useState(!sharedId)
  const [tab, setTab] = useState('Catalog')
  // 'list' | 'create' | 'edit' | 'detail' | 'editProfile'
  const [mode, setMode] = useState('list')
  const [selectedGun, setSelectedGun] = useState(null)
  const [editingGun, setEditingGun] = useState(null)
  const [archiveTarget, setArchiveTarget] = useState(null)

  // Buka produk dari tautan share
  useEffect(() => {
    if (!sharedId) return undefined
    let alive = true
    gunService
      .getGunById(sharedId)
      .then((res) => {
        if (!alive) return
        if (res.success && res.data) {
          setSelectedGun(res.data)
          setMode('detail')
          setSharedState('idle')
        } else {
          setSharedState('error')
        }
      })
      .catch(() => alive && setSharedState('error'))
    return () => {
      alive = false
    }
  }, [sharedId])

  const scrollTop = () => window.scrollTo({ top: 0, behavior: 'smooth' })

  // Unified navigation handler
  const handleNavigate = (target, payload) => {
    if (target === 'Create') {
      setMode('create')
    } else if (target === 'Edit') {
      setEditingGun(payload)
      setMode('edit')
    } else if (target === 'Detail') {
      setSelectedGun(payload)
      setMode('detail')
    } else if (target === 'EditProfile') {
      setMode('editProfile')
    } else {
      // Tab change
      clearSharedParam()
      setSharedState('idle')
      setTab(target)
      setMode('list')
      setSelectedGun(null)
      setEditingGun(null)
    }
    scrollTop()
  }

  const handleBackToList = () => {
    clearSharedParam()
    setSharedState('idle')
    setMode('list')
    setSelectedGun(null)
    setEditingGun(null)
  }

  // Setelah create / edit berhasil: buang cache supaya katalog ambil data baru
  const handleSaved = () => {
    invalidate('gun')
    handleBackToList()
    setTab('Catalog')
  }

  // Soft delete dari halaman detail
  const handleArchiveConfirm = () => {
    if (!archiveTarget) return
    archiveGun(archiveTarget)
    setArchiveTarget(null)
    handleBackToList()
    setTab('Catalog')
  }

  return (
    <div className="shell">
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}

      <Header
        tab={mode === 'list' ? tab : ''}
        onTab={(newTab) => handleNavigate(newTab)}
        onNavigateCreate={() => handleNavigate('Create')}
      />

      <main className="main">
        <Suspense fallback={<PageLoader />}>
          {/* Link share sedang dimuat / gagal */}
          {sharedState === 'loading' && <PageLoader />}
          {sharedState === 'error' && (
            <div className="state-box state-box--error">
              <AlertCircle size={28} />
              <p>The shared item could not be found.</p>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => handleNavigate('Catalog')}
              >
                Go to Catalog
              </button>
            </div>
          )}

          {/* Sub-page views */}
          {mode === 'create' && (
            <CreateGunPage onBack={handleBackToList} onSuccess={handleSaved} />
          )}

          {mode === 'edit' && (
            <EditGunPage
              gun={editingGun}
              gunId={editingGun?.id}
              onBack={handleBackToList}
              onSuccess={handleSaved}
            />
          )}

          {mode === 'detail' && selectedGun && (
            <GunDetail
              gun={selectedGun}
              onBack={handleBackToList}
              onEdit={(g) => handleNavigate('Edit', g)}
              onDelete={(g) => setArchiveTarget(g)}
            />
          )}

          {mode === 'editProfile' && (
            <EditProfilePage onBack={handleBackToList} onSaved={handleBackToList} />
          )}

          {/* Top-level Tabs */}
          {mode === 'list' && sharedState === 'idle' && (
            <>
              {tab === 'Catalog' && (
                <Catalog onNavigate={(destination, payload) => handleNavigate(destination, payload)} />
              )}
              {tab === 'Favorites' && (
                <FavoritesPage
                  onSelectGun={(g) => handleNavigate('Detail', g)}
                  onNavigateCatalog={() => handleNavigate('Catalog')}
                />
              )}
              {tab === 'Profile' && (
                <ProfilePage
                  onReplaySplash={() => setShowSplash(true)}
                  onNavigate={handleNavigate}
                />
              )}
              {tab === 'Cart' && <CartPage onNavigateCatalog={() => handleNavigate('Catalog')} />}
            </>
          )}
        </Suspense>
      </main>

      {/* Archive confirmation (soft delete) */}
      <ConfirmModal
        open={Boolean(archiveTarget)}
        title="Archive Hardware"
        message={`Archive "${archiveTarget?.name}"? It will be hidden from the catalog and can be restored from Profile → Archive.`}
        confirmLabel="Archive"
        onConfirm={handleArchiveConfirm}
        onCancel={() => setArchiveTarget(null)}
      />

      <PWABadge />
      <Footer />
    </div>
  )
}

function App() {
  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  )
}

export default App
