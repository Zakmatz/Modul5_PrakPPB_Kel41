import { useState, useMemo } from 'react'
import { RefreshCw, Plus, Loader, AlertCircle, PackageOpen, Check } from 'lucide-react'
import { useGuns } from '../hooks/useGuns'
import GUNS_LOCAL from '../data/guns'
import GunCard from '../components/gun/GunCard'
import GunDetail from '../components/gun/GunDetail'
import AdvancedFilter from '../components/common/AdvancedFilter'
import ConfirmModal from '../components/modals/ConfirmModal'
import { archiveGun, getArchivedIds } from '../services/archiveService'
import {
  matchesSearch,
  matchesCategory,
  sortItems,
  extractCategories,
} from '../utils/helpers'

/**
 * Catalog page — the main product listing.
 *
 * Data source priority:
 *   1. Live API via useGuns() (sudah ter-cache)
 *   2. Local static array (GUNS_LOCAL) when the API is unreachable
 *
 * "Delete" sekarang = SOFT DELETE: produk diarsipkan (disembunyikan dari
 * katalog) dan bisa di-restore dari Profile -> Archive.
 */
export default function Catalog({ onNavigate }) {
  // ---- API data ----
  const { guns: apiGuns, loading, error, refetch } = useGuns({ limit: 50 })
  const [useLocal, setUseLocal] = useState(false)
  const [archivedIds, setArchivedIds] = useState(getArchivedIds)

  // Decide data source, lalu buang yang sudah diarsipkan
  const rawGuns = useMemo(() => {
    const source =
      useLocal || (error && apiGuns.length === 0)
        ? GUNS_LOCAL.map((g, i) => ({ ...g, id: g.id || `local-${i}` }))
        : apiGuns
    return source.filter((g) => !archivedIds.has(String(g.id ?? g.name)))
  }, [apiGuns, error, useLocal, archivedIds])

  // ---- filters / sort ----
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState('All')
  const [sortKey, setSortKey] = useState('name')
  const [sortOrder, setSortOrder] = useState('asc')

  const categories = useMemo(() => extractCategories(rawGuns), [rawGuns])

  const filteredGuns = useMemo(() => {
    const result = rawGuns.filter(
      (g) => matchesSearch(g, search) && matchesCategory(g, activeCategory),
    )
    return sortItems(result, sortKey, sortOrder)
  }, [rawGuns, search, activeCategory, sortKey, sortOrder])

  // ---- detail view ----
  const [selectedGun, setSelectedGun] = useState(null)

  // ---- archive (soft delete) ----
  const [archiveTarget, setArchiveTarget] = useState(null)
  const [notice, setNotice] = useState('')

  const handleArchive = () => {
    if (!archiveTarget) return
    archiveGun(archiveTarget)
    setArchivedIds(getArchivedIds())
    setNotice(`“${archiveTarget.name}” archived. Restore it from Profile → Archive.`)
    setArchiveTarget(null)
    setTimeout(() => setNotice(''), 4000)
  }

  // ---- If viewing a single product detail ----
  if (selectedGun) {
    return (
      <>
        <GunDetail
          gun={selectedGun}
          onBack={() => setSelectedGun(null)}
          onEdit={(g) => onNavigate && onNavigate('Edit', g)}
          onDelete={(g) => {
            setSelectedGun(null)
            setArchiveTarget(g)
          }}
        />
      </>
    )
  }

  // ---- Main catalog view ----
  return (
    <>
      <section className="masthead">
        <h1 className="display">Hardware, by the spec sheet.</h1>
        <p className="lede">
          A small armory of pistols, rifles, and shotguns. Every piece listed
          with its type, caliber, and price — nothing else.
        </p>
      </section>

      <section>
        <div className="list-head">
          <h2>Current stock</h2>
          <div className="list-head-right">
            <span className="count">
              {filteredGuns.length} piece{filteredGuns.length !== 1 ? 's' : ''}
            </span>
            {onNavigate && (
              <button
                type="button"
                className="btn btn--primary btn--sm"
                onClick={() => onNavigate('Create')}
              >
                <Plus size={16} /> Add
              </button>
            )}
          </div>
        </div>

        <AdvancedFilter
          search={search}
          onSearch={setSearch}
          categories={categories}
          activeCategory={activeCategory}
          onCategory={setActiveCategory}
          sortKey={sortKey}
          sortOrder={sortOrder}
          onSort={({ key, order }) => {
            setSortKey(key)
            setSortOrder(order)
          }}
        />

        {loading && (
          <div className="state-box">
            <Loader size={28} className="spin" />
            <p>Loading products…</p>
          </div>
        )}

        {!loading && error && !useLocal && (
          <div className="state-box state-box--error">
            <AlertCircle size={28} />
            <p>{error}</p>
            <div className="state-box__actions">
              <button type="button" className="btn btn--outline" onClick={refetch}>
                <RefreshCw size={16} /> Retry
              </button>
              <button
                type="button"
                className="btn btn--outline"
                onClick={() => setUseLocal(true)}
              >
                View Local Catalog
              </button>
            </div>
          </div>
        )}

        {!loading && filteredGuns.length === 0 && !error && (
          <div className="state-box">
            <PackageOpen size={28} />
            <p>No products match your search.</p>
          </div>
        )}

        {filteredGuns.length > 0 && (
          <ul className="stock">
            {filteredGuns.map((gun) => (
              <GunCard
                key={gun.id || gun.name}
                gun={gun}
                onSelect={setSelectedGun}
                onEdit={onNavigate ? (g) => onNavigate('Edit', g) : undefined}
                onDelete={setArchiveTarget}
              />
            ))}
          </ul>
        )}

        {useLocal && (
          <p className="local-notice">
            Showing local catalog (server unavailable).{' '}
            <button
              type="button"
              className="link-btn"
              onClick={() => {
                setUseLocal(false)
                refetch()
              }}
            >
              Retry server
            </button>
          </p>
        )}
      </section>

      {/* Archive confirmation */}
      <ConfirmModal
        open={!!archiveTarget}
        title="Archive Product"
        message={`Archive "${archiveTarget?.name}"? It will be hidden from the catalog and can be restored from Profile → Archive.`}
        confirmLabel="Archive"
        onConfirm={handleArchive}
        onCancel={() => setArchiveTarget(null)}
      />

      {notice && (
        <div className="toast toast--success">
          <Check size={18} /> {notice}
        </div>
      )}
    </>
  )
}
