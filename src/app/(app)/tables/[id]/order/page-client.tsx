"use client";

import { useState, useCallback } from "react";
import { TableOrderCart, CartItem } from "@/components/tables/table-order-cart";
import { Search, Plus } from "lucide-react";

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  variants?: Array<{ name: string; price: number }>;
  isAvailable: boolean;
}

interface TableOrderPageClientProps {
  tableId: string;
  initialMenu: MenuItem[];
}

export function TableOrderPageClient({
  tableId,
  initialMenu,
}: TableOrderPageClientProps) {
  const [menu] = useState<MenuItem[]>(initialMenu);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [kotSent, setKotSent] = useState(false);

  const categories = Array.from(new Set(menu.map((item) => item.category)));

  const filteredMenu = menu.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (menuItem: MenuItem) => {
    const cartItemId = `${menuItem.id}-${Date.now()}`;
    const newItem: CartItem = {
      id: cartItemId,
      menuItemId: menuItem.id,
      itemName: menuItem.name,
      quantity: 1,
      unitPrice: menuItem.price,
    };
    setCart([...cart, newItem]);
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    setCart(
      cart.map((item) =>
        item.id === itemId ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  };

  const removeItem = (itemId: string) => {
    setCart(cart.filter((item) => item.id !== itemId));
  };

  const updateNote = (itemId: string, note: string) => {
    setCart(
      cart.map((item) => (item.id === itemId ? { ...item, note } : item))
    );
  };

  const handleSendKOT = async () => {
    if (cart.length === 0) return;
    // TODO: Implement KOT sending logic
    setKotSent(true);
    console.log("Sending KOT for table", tableId, "with items:", cart);
  };

  const handlePrintBill = async () => {
    if (cart.length === 0) return;
    // TODO: Implement bill printing logic
    console.log("Printing bill for table", tableId, "with items:", cart);
  };

  const subtotal = cart.reduce(
    (sum, item) => sum + item.unitPrice * item.quantity,
    0
  );
  const total = subtotal;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Menu Section */}
      <div className="lg:col-span-2 space-y-4">
        {/* Search & Filter */}
        <div className="card p-4 space-y-3">
          <div className="relative">
            <Search
              size={18}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted"
            />
            <input
              type="search"
              placeholder="Search menu items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input pl-10"
            />
          </div>

          {/* Category Filters */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`chip ${
                selectedCategory === null
                  ? "bg-leaf text-white border-leaf"
                  : "bg-white text-ink border-line hover:border-leaf"
              }`}
            >
              All Items
            </button>
            {categories.map((category) => (
              <button
                key={category}
                onClick={() =>
                  setSelectedCategory(
                    selectedCategory === category ? null : category
                  )
                }
                className={`chip ${
                  selectedCategory === category
                    ? "bg-leaf text-white border-leaf"
                    : "bg-white text-ink border-line hover:border-leaf"
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {filteredMenu.map((item) => (
            <button
              key={item.id}
              onClick={() => addToCart(item)}
              className="card p-3 text-left hover:shadow-float transition group"
            >
              <div className="space-y-2">
                <p className="font-medium text-sm text-ink line-clamp-2 group-hover:text-leaf">
                  {item.name}
                </p>
                <p className="text-xs text-muted">{item.category}</p>
                <div className="flex items-baseline justify-between pt-2 border-t border-line/50">
                  <span className="font-bold text-leaf">
                    ₹{(item.price / 100).toFixed(0)}
                  </span>
                  <Plus
                    size={16}
                    className="text-gold group-hover:scale-110 transition"
                  />
                </div>
              </div>
            </button>
          ))}
        </div>

        {filteredMenu.length === 0 && (
          <div className="card p-8 text-center">
            <p className="text-muted">No items found</p>
          </div>
        )}
      </div>

      {/* Cart Section */}
      <div className="lg:col-span-1">
        <div className="sticky top-24">
          <TableOrderCart
            items={cart}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeItem}
            onUpdateNote={updateNote}
            onSendKOT={handleSendKOT}
            onPrintBill={handlePrintBill}
            isKOTSent={kotSent}
            subtotal={subtotal}
            total={total}
          />
        </div>
      </div>
    </div>
  );
}
