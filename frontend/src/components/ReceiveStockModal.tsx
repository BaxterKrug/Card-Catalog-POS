import { useState, FormEvent } from "react";
import { Package, X, Plus, Minus } from "lucide-react";
import { useInventory, useBulkReceiveInventory } from "../hooks/useInventory";

interface ReceiveStockModalProps {
  onClose: () => void;
}

interface StockItem {
  inventoryItemId: number;
  quantity: number;
}

const ReceiveStockModal = ({ onClose }: ReceiveStockModalProps) => {
  const { data: inventory = [] } = useInventory();
  const bulkReceiveMutation = useBulkReceiveInventory();
  const [items, setItems] = useState<StockItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredInventory = inventory.filter(item => 
    item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.game_title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addItem = () => {
    if (!selectedItemId) return;
    
    const itemId = parseInt(selectedItemId);
    const existingIndex = items.findIndex(i => i.inventoryItemId === itemId);
    
    if (existingIndex >= 0) {
      // Increment existing item
      const newItems = [...items];
      newItems[existingIndex].quantity += 1;
      setItems(newItems);
    } else {
      // Add new item
      setItems([...items, { inventoryItemId: itemId, quantity: 1 }]);
    }
    
    setSelectedItemId("");
    setSearchTerm("");
  };

  const updateQuantity = (index: number, delta: number) => {
    const newItems = [...items];
    newItems[index].quantity = Math.max(1, newItems[index].quantity + delta);
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (items.length === 0) {
      alert("Please add at least one item to receive");
      return;
    }

    try {
      await bulkReceiveMutation.mutateAsync({
        items: items.map(item => ({
          inventory_item_id: item.inventoryItemId,
          quantity: item.quantity
        })),
        note: notes || undefined,
        actor: "staff" // You can get this from auth context if needed
      });
      
      onClose();
    } catch (error) {
      console.error("Failed to receive stock:", error);
      alert("Failed to receive stock. Please try again.");
    }
  };

  const getItemName = (itemId: number) => {
    const item = inventory.find(i => i.id === itemId);
    return item ? `${item.name} (${item.sku})` : `Item ${itemId}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#0a0c12]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-indigo-500">
              <Package size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Receive Stock</h2>
              <p className="text-xs text-white/60">Add received inventory to stock levels</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-white/60 transition hover:border-accent hover:text-accent"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {/* Add Item Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white/80 mb-2">
              Add Items to Receive
            </label>
            <div className="flex gap-2">
              <div className="flex-1">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search products..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
                />
                {searchTerm && filteredInventory.length > 0 && (
                  <div className="mt-1 max-h-48 overflow-y-auto rounded-lg border border-white/10 bg-[#080b12]">
                    {filteredInventory.slice(0, 10).map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setSelectedItemId(item.id.toString());
                          setSearchTerm(item.name);
                        }}
                        className="w-full px-4 py-2 text-left text-sm text-white hover:bg-white/5"
                      >
                        <div className="font-medium">{item.name}</div>
                        <div className="text-xs text-white/60">
                          {item.sku} • {item.game_title || 'No game'}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={addItem}
                disabled={!selectedItemId}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-[#061012] hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Plus size={16} /> Add
              </button>
            </div>
          </div>

          {/* Items List */}
          {items.length > 0 && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-white/80 mb-2">
                Items to Receive ({items.length})
              </label>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-4 py-3"
                  >
                    <span className="text-sm text-white">{getItemName(item.inventoryItemId)}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => updateQuantity(index, -1)}
                        className="rounded-lg border border-white/10 p-1 text-white/60 hover:border-accent hover:text-accent"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="min-w-[3ch] text-center text-white font-medium">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(index, 1)}
                        className="rounded-lg border border-white/10 p-1 text-white/60 hover:border-accent hover:text-accent"
                      >
                        <Plus size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        className="ml-2 rounded-lg border border-rose-500/20 bg-rose-500/10 p-1 text-rose-300 hover:bg-rose-500/20"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-white/80 mb-2">
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Shipment details, supplier info, etc..."
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-white placeholder:text-white/40 focus:border-accent focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-white/80 hover:bg-white/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={items.length === 0 || bulkReceiveMutation.isPending}
              className="flex-1 rounded-lg bg-accent px-4 py-2 font-semibold text-[#061012] hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {bulkReceiveMutation.isPending 
                ? "Receiving..." 
                : `Receive ${items.length > 0 ? `${items.reduce((sum, i) => sum + i.quantity, 0)} Items` : ''}`
              }
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ReceiveStockModal;
