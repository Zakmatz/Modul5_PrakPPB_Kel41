import { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'

// ---------------------------------------------------------------------------
// CartContext — keranjang belanja global, dipersist di localStorage.
// ---------------------------------------------------------------------------
const KEY = 'bore_barrel_cart'
const CartContext = createContext(null)

const readCart = () => {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(readCart)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(items))
    } catch {
      /* ignore */
    }
  }, [items])

  const addItem = useCallback((gun, qty = 1) => {
    const id = String(gun.id ?? gun.name)
    setItems((prev) => {
      const existing = prev.find((i) => i.id === id)
      if (existing) {
        return prev.map((i) => (i.id === id ? { ...i, qty: i.qty + qty } : i))
      }
      return [
        ...prev,
        {
          id,
          name: gun.name,
          price: Number(gun.price ?? gun.cook_time ?? 0),
          image: gun.image_url || gun.image || '/guns/pistol.svg',
          type: gun.type || gun.category || '',
          qty,
        },
      ]
    })
  }, [])

  const setQty = useCallback((id, qty) => {
    setItems((prev) =>
      prev
        .map((i) => (i.id === id ? { ...i, qty: Math.max(0, qty) } : i))
        .filter((i) => i.qty > 0),
    )
  }, [])

  const removeItem = useCallback((id) => {
    setItems((prev) => prev.filter((i) => i.id !== id))
  }, [])

  const clearCart = useCallback(() => setItems([]), [])

  const value = useMemo(
    () => ({
      items,
      addItem,
      setQty,
      removeItem,
      clearCart,
      totalQty: items.reduce((s, i) => s + i.qty, 0),
      totalPrice: items.reduce((s, i) => s + i.price * i.qty, 0),
    }),
    [items, addItem, setQty, removeItem, clearCart],
  )

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>')
  return ctx
}
