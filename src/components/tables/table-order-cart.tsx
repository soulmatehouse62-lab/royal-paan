"use client";

import { THEME_COLORS } from "@/lib/theme-colors";
import { X, Plus, Minus } from "lucide-react";

export interface CartItem {
  id: string;
  menuItemId: string;
  itemName: string;
  quantity: number;
  unitPrice: number;
  note?: string;
  variantName?: string;
}

interface TableOrderCartProps {
  items: CartItem[];
  onUpdateQuantity: (itemId: string, quantity: number) => void;
  onRemoveItem: (itemId: string) => void;
  onUpdateNote: (itemId: string, note: string) => void;
  onSendKOT: () => void;
  onPrintBill: () => void;
  isKOTSent: boolean;
  subtotal: number;
  total: number;
}

export function TableOrderCart({
  items,
  onUpdateQuantity,
  onRemoveItem,
  onUpdateNote,
  onSendKOT,
  onPrintBill,
  isKOTSent,
  subtotal,
  total,
}: TableOrderCartProps) {
  return (
    <div className="space-y-4">
      {/* Items List */}
      <div className="card space-y-3">
        {items.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-muted">No items added yet</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="border border-line/40 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-ink truncate">
                    {item.itemName}
                  </p>
                  {item.variantName && (
                    <p className="text-xs text-muted">{item.variantName}</p>
                  )}
                </div>
                <button
                  onClick={() => onRemoveItem(item.id)}
                  className="shrink-0 p-1.5 rounded-lg hover:bg-danger-soft text-danger transition"
                  title="Remove item"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Quantity Controls */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    onUpdateQuantity(item.id, Math.max(1, item.quantity - 1))
                  }
                  className="p-1.5 rounded-lg border border-line hover:bg-cream-deep transition"
                >
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  min="1"
                  max="999"
                  value={item.quantity}
                  onChange={(e) =>
                    onUpdateQuantity(item.id, parseInt(e.target.value) || 1)
                  }
                  className="w-12 text-center p-1 border border-line rounded-lg"
                />
                <button
                  onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                  className="p-1.5 rounded-lg border border-line hover:bg-cream-deep transition"
                >
                  <Plus size={16} />
                </button>
                <div className="flex-1 text-right">
                  <p className="font-semibold text-ink">
                    ₹{((item.unitPrice * item.quantity) / 100).toFixed(2)}
                  </p>
                  <p className="text-xs text-muted">
                    @₹{(item.unitPrice / 100).toFixed(2)} each
                  </p>
                </div>
              </div>

              {/* Notes */}
              <input
                type="text"
                placeholder="Add notes (e.g., less spicy, no onion)"
                value={item.note || ""}
                onChange={(e) => onUpdateNote(item.id, e.target.value)}
                className="input text-sm h-9 placeholder:text-muted/50"
              />
            </div>
          ))
        )}
      </div>

      {/* Totals */}
      {items.length > 0 && (
        <div
          className="card p-4 space-y-2"
          style={{
            backgroundColor: `${THEME_COLORS.gold.soft}`,
            borderTop: `3px solid ${THEME_COLORS.gold.primary}`,
          }}
        >
          <div className="flex justify-between text-sm">
            <span className="text-muted">Subtotal:</span>
            <span className="font-semibold">₹{(subtotal / 100).toFixed(2)}</span>
          </div>
          <div className="border-t border-line/50 pt-2 flex justify-between">
            <span className="font-semibold">Total:</span>
            <span
              className="font-bold text-lg"
              style={{ color: THEME_COLORS.gold.primary }}
            >
              ₹{(total / 100).toFixed(2)}
            </span>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onSendKOT}
          disabled={items.length === 0}
          className="btn-primary flex-1"
        >
          {isKOTSent ? "Send Another KOT" : "Send KOT"}
        </button>
        <button
          onClick={onPrintBill}
          disabled={!isKOTSent || items.length === 0}
          className="btn-primary flex-1"
          style={{
            backgroundColor: isKOTSent
              ? THEME_COLORS.leaf.primary
              : "transparent",
            borderColor: THEME_COLORS.leaf.primary,
            color: isKOTSent ? "white" : THEME_COLORS.leaf.primary,
          }}
        >
          Print Bill
        </button>
      </div>
    </div>
  );
}
