// ---------------------------------------------------------------------------
// archiveService — SOFT DELETE / arsip.
//
// Produk yang "dihapus" dari katalog tidak benar-benar dihapus dari database,
// hanya ditandai diarsipkan (disimpan di localStorage beserta snapshot datanya)
// dan disembunyikan dari katalog. Bisa di-restore kapan saja dari
// Profile -> Archive. "Delete permanently" baru memanggil gunService.deleteGun.
// ---------------------------------------------------------------------------
const KEY = 'bore_barrel_archive'

const read = () => {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}
const write = (map) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(map))
  } catch {
    /* quota exceeded */
  }
}

/** Arsipkan produk (simpan snapshot supaya bisa ditampilkan di halaman Archive). */
export const archiveGun = (gun) => {
  const id = String(gun.id ?? gun.name)
  const map = read()
  map[id] = {
    archivedAt: new Date().toISOString(),
    gun: {
      id: gun.id,
      name: gun.name,
      type: gun.type || gun.category || '',
      caliber: gun.caliber || '',
      price: Number(gun.price ?? gun.cook_time ?? 0),
      description: gun.description || '',
      image_url: gun.image_url || gun.image || '/guns/pistol.svg',
    },
  }
  write(map)
}

/** Kembalikan produk dari arsip (otomatis muncul lagi di katalog). */
export const restoreGun = (id) => {
  const map = read()
  delete map[String(id)]
  write(map)
}

/** Daftar produk yang diarsipkan, terbaru di atas. */
export const getArchivedList = () =>
  Object.values(read()).sort((a, b) => (a.archivedAt < b.archivedAt ? 1 : -1))

/** Set berisi id (string) produk yang diarsipkan. */
export const getArchivedIds = () => new Set(Object.keys(read()))

export const isArchived = (id) => String(id) in read()
