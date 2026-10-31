import { ShoppingCart, Minus, Plus, Trash2, MessageCircle, ArrowRight } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { formatPrice } from '../utils/helpers'
import { WA_NUMBER, SHOP_NAME } from '../config/shop'

/**
 * CartPage — keranjang + checkout. Checkout mengarahkan ke WhatsApp dengan
 * pesan yang sudah terisi ("Hi aku mau pesan ...").
 */
export default function CartPage({ onNavigateCatalog }) {
  const { items, setQty, removeItem, clearCart, totalQty, totalPrice } = useCart()

  const buildMessage = () => {
    const lines = items.map(
      (it, i) => `${i + 1}. ${it.name} x${it.qty} - ${formatPrice(it.price * it.qty)}`,
    )
    return [
      `Hi aku mau pesan di ${SHOP_NAME}:`,
      '',
      ...lines,
      '',
      `Total: ${formatPrice(totalPrice)}`,
    ].join('\n')
  }

  const handleCheckout = () => {
    if (items.length === 0) return
    const url = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(buildMessage())}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  return (
    <div className="cart-page">
      <section className="masthead">
        <h1 className="display">Your Cart</h1>
        <p className="lede">Review your selection, then check out via WhatsApp.</p>
      </section>

      {items.length === 0 ? (
        <div className="state-box">
          <ShoppingCart size={36} stroke="var(--steel)" />
          <h3>Your cart is empty</h3>
          <p className="lede">Add something from the catalog to get started.</p>
          {onNavigateCatalog && (
            <button type="button" className="btn btn--primary" onClick={onNavigateCatalog}>
              Browse Catalog <ArrowRight size={16} />
            </button>
          )}
        </div>
      ) : (
        <>
          <ul className="cart-list">
            {items.map((it) => (
              <li key={it.id} className="cart-item">
                <img
                  className="cart-thumb"
                  src={it.image}
                  alt={it.name}
                  width="72"
                  height="72"
                  loading="lazy"
                />
                <div className="cart-info">
                  <span className="cart-name display">{it.name}</span>
                  <span className="type">{it.type}</span>
                  <span className="price">{formatPrice(it.price)}</span>
                </div>
                <div className="cart-qty">
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setQty(it.id, it.qty - 1)}
                    aria-label="Decrease quantity"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="cart-qty-num">{it.qty}</span>
                  <button
                    type="button"
                    className="icon-btn"
                    onClick={() => setQty(it.id, it.qty + 1)}
                    aria-label="Increase quantity"
                  >
                    <Plus size={14} />
                  </button>
                </div>
                <span className="cart-line-total">{formatPrice(it.price * it.qty)}</span>
                <button
                  type="button"
                  className="btn btn--danger-ghost"
                  onClick={() => removeItem(it.id)}
                  aria-label={`Remove ${it.name}`}
                  title="Remove"
                >
                  <Trash2 size={16} />
                </button>
              </li>
            ))}
          </ul>

          <div className="cart-summary">
            <div className="cart-summary-row">
              <span>{totalQty} item{totalQty !== 1 ? 's' : ''}</span>
              <strong className="cart-total">{formatPrice(totalPrice)}</strong>
            </div>
            <div className="cart-summary-actions">
              <button type="button" className="btn btn--outline" onClick={clearCart}>
                Clear Cart
              </button>
              <button type="button" className="btn btn--primary" onClick={handleCheckout}>
                <MessageCircle size={16} /> Checkout via WhatsApp
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
