import { useState } from 'react'
import { Share2, Check } from 'lucide-react'

/**
 * Bangun tautan unik untuk satu produk: https://domain-kamu/?gun=<id>
 * Saat link dibuka, App.jsx membaca ?gun= lalu langsung membuka detail produk.
 */
const buildShareUrl = (gunId) => {
  const url = new URL(window.location.href)
  url.search = ''
  url.hash = ''
  url.searchParams.set('gun', String(gunId))
  return url.toString()
}

/**
 * ShareButton — bagikan produk lewat tautan unik.
 * - HP: membuka share sheet bawaan (WhatsApp, dll) lewat navigator.share
 * - Desktop / tidak didukung: menyalin link ke clipboard
 */
export default function ShareButton({ gun, className = 'btn btn--outline' }) {
  const [copied, setCopied] = useState(false)
  const isLocal = !gun.id || String(gun.id).startsWith('local-')

  const handleShare = async (e) => {
    e.stopPropagation()
    const url = buildShareUrl(gun.id)
    const data = {
      title: gun.name,
      text: `Lihat ${gun.name} di Bore & Barrel`,
      url,
    }

    try {
      if (navigator.share) {
        await navigator.share(data)
        return
      }
    } catch (err) {
      if (err?.name === 'AbortError') return // user menutup share sheet
    }

    try {
      await navigator.clipboard.writeText(url)
    } catch {
      window.prompt('Salin link ini:', url)
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      type="button"
      className={className}
      onClick={handleShare}
      disabled={isLocal}
      title={isLocal ? 'Produk lokal tidak bisa dibagikan' : 'Bagikan tautan produk'}
    >
      {copied ? <Check size={16} /> : <Share2 size={16} />}
      {copied ? 'Link copied!' : 'Share'}
    </button>
  )
}
