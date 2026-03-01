import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { Loader2, PackageSearch, RefreshCw, ScanLine, Edit2, X, Eye, EyeOff, Trash2 } from "lucide-react";

import type {
  InventoryItem,
  InventoryCategory,
  InventorySource,
} from "../api/inventory";
import { upsertInventoryItem, deleteInventoryItem } from "../api/inventory";
import { useInventory } from "../hooks/useInventory";
import BarcodeScanner from "../components/BarcodeScanner";

const currency = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" });

const InventoryPage = () => {
  const { data: items = [], isLoading, isError, refetch, isFetching } = useInventory();
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [showOutOfStock, setShowOutOfStock] = useState(false);

  // Filter items based on out-of-stock toggle
  const filteredItems = useMemo(() => {
    if (showOutOfStock) {
      return items;
    }
    return items.filter(item => item.available_quantity > 0);
  }, [items, showOutOfStock]);

  return (
    <div className="space-y-8">
      {editingItem && (
        <EditInventoryModal
          item={editingItem}
          onClose={() => setEditingItem(null)}
        />
      )}
      
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Catalog</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Inventory intelligence</h1>
          <p className="mt-1 text-sm text-white/60">
            Track and manage all products in your live catalog.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw size={16} className={isFetching ? "animate-spin" : undefined} />
            Refresh
          </button>
          <button className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80">
            <PackageSearch size={16} /> Advanced filters
          </button>
        </div>
      </div>

  <QuickAddInventoryForm />

  <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Live catalog</p>
            <h2 className="text-xl font-semibold text-white">
              {filteredItems.length} tracked SKUs
              {!showOutOfStock && items.length > filteredItems.length && (
                <span className="ml-2 text-sm text-white/40">
                  ({items.length - filteredItems.length} hidden)
                </span>
              )}
            </h2>
          </div>
          <button
            onClick={() => setShowOutOfStock(!showOutOfStock)}
            className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
              showOutOfStock
                ? 'border-accent bg-accent/20 text-accent'
                : 'border-white/10 bg-white/5 text-white/80 hover:border-accent hover:text-accent'
            }`}
          >
            {showOutOfStock ? (
              <>
                <EyeOff size={16} />
                Hide Out of Stock
              </>
            ) : (
              <>
                <Eye size={16} />
                Show Out of Stock ({items.length - filteredItems.length})
              </>
            )}
          </button>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm text-white/70">
            <thead>
              <tr className="text-xs uppercase tracking-[0.3em] text-white/40">
                <th className="py-3 pr-3 font-normal">SKU</th>
                <th className="py-3 pr-3 font-normal">Product</th>
                <th className="py-3 pr-3 font-normal">Source</th>
                <th className="py-3 pr-3 font-normal">Game / Set</th>
                <th className="py-3 pr-3 font-normal">Available</th>
                <th className="py-3 pr-3 font-normal">Unit Price</th>
                <th className="py-3 font-normal">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <InventoryLoadingRows />}
              {isError && !isLoading && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-sm text-rose-200">
                    Could not load inventory. Please try again.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && items.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-sm text-white/60">
                    No inventory items yet. Use the receive or CSV import actions to get started.
                  </td>
                </tr>
              )}
              {!isLoading && !isError && items.length > 0 && filteredItems.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-6 text-center text-sm text-white/60">
                    All items are out of stock. Click "Show Out of Stock" to view them.
                  </td>
                </tr>
              )}
              {!isLoading && !isError &&
                filteredItems.map((item) => (
                  <InventoryRow 
                    key={item.id} 
                    item={item} 
                    onEdit={() => setEditingItem(item)}
                  />
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

const InventorySummaryCard = ({
  title,
  accent,
  payload,
}: {
  title: string;
  accent: string;
  payload: { physical: number; allocated: number; available: number; skus: number };
}) => {
  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/5 to-white/0 p-6">
      <p className="text-xs uppercase tracking-[0.3em] text-white/40">{title}</p>
      <div className={`mt-4 inline-flex items-baseline gap-2 rounded-full bg-gradient-to-r ${accent} px-4 py-2`}>
        <span className="text-sm font-semibold text-[#061012]">Available Now</span>
        <span className="text-2xl font-bold text-[#061012]">{payload.available}</span>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 text-center text-xs text-white/70">
        <div>
          <p className="text-white/40">Unique SKUs</p>
          <p className="text-white text-base font-semibold">{payload.skus}</p>
        </div>
      </div>
    </div>
  );
};

const InventoryRow = ({ item, onEdit }: { item: InventoryItem; onEdit: () => void }) => {
  return (
    <tr className="border-t border-white/5 text-white hover:bg-white/5">
      <td className="py-4 pr-3 text-xs text-white/40">{item.sku}</td>
      <td className="py-4 pr-3">
        <p className="font-medium text-white">{item.name}</p>
        <p className="text-xs text-white/40">{item.condition ?? "Standard"}</p>
      </td>
      <td className="py-4 pr-3">
        <SourceBadge source={item.source} reference={item.acquisition_reference} />
      </td>
      <td className="py-4 pr-3">
        <p>{item.game_title ?? item.set_code ?? "—"}</p>
        {item.set_code && item.game_title && <p className="text-xs text-white/40">Set: {item.set_code}</p>}
      </td>
      <td className="py-4 pr-3 font-bold text-emerald-300 text-lg">{item.available_quantity}</td>
      <td className="py-4 pr-3 text-white/80">{currency.format(item.unit_price_cents / 100)}</td>
      <td className="py-4">
        <button
          onClick={onEdit}
          className="rounded-lg border border-white/10 p-2 text-white/60 hover:border-accent hover:text-accent"
          title="Edit item"
        >
          <Edit2 size={16} />
        </button>
      </td>
    </tr>
  );
};

const SourceBadge = ({ source, reference }: { source: InventoryItem["source"]; reference?: string | null }) => {
  const label = source === "player" ? "Player single" : "Supplier stock";
  const tone =
    source === "player"
      ? "bg-emerald-400/15 text-emerald-200 border-emerald-300/30"
      : "bg-sky-400/10 text-sky-200 border-sky-300/20";
  return (
    <div className={`inline-flex flex-col rounded-2xl border px-3 py-2 text-xs ${tone}`}>
      <span className="font-semibold">{label}</span>
      {reference && <span className="text-[0.65rem] text-white/60">{reference}</span>}
    </div>
  );
};

const InventoryLoadingRows = () => {
  return (
    <tr>
      <td colSpan={8} className="py-8 text-center">
        <div className="inline-flex items-center gap-3 text-white/60">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading inventory…
        </div>
      </td>
    </tr>
  );
};

const EditInventoryModal = ({ item, onClose }: { item: InventoryItem; onClose: () => void }) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    sku: item.sku,
    name: item.name,
    category: item.category,
    source: item.source,
    setCode: item.set_code || "",
    gameTitle: item.game_title || "",
    printing: item.printing || "",
    condition: item.condition || "",
    acquisitionReference: item.acquisition_reference || "",
    unitPrice: (item.unit_price_cents / 100).toString(),
    physicalQuantity: item.physical_quantity.toString(),
  });
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const showSingleOnlyFields = form.category === "single";

  const mutation = useMutation({
    mutationFn: upsertInventoryItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      onClose();
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Could not update inventory item";
      setError(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteInventoryItem(item.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      onClose();
    },
    onError: (err: any) => {
      // Extract error message from API response
      const message = err?.response?.data?.detail || 
                      err?.message || 
                      "Could not delete inventory item";
      setError(message);
      setShowDeleteConfirm(false);
    },
  });

  const handleDelete = () => {
    setError(null);
    deleteMutation.mutate();
  };

  const handleChange = (
    field: keyof typeof form,
  ) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.sku.trim() || !form.name.trim()) {
      setError("SKU and product name are required.");
      return;
    }

    const quantity = Number(form.physicalQuantity || "0");
    if (!Number.isFinite(quantity) || quantity < 0) {
      setError("Physical quantity must be zero or greater.");
      return;
    }

    const unitPrice = Number(form.unitPrice || "0");
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setError("Unit price must be zero or greater.");
      return;
    }

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      category: form.category,
      source: form.source,
      set_code: form.setCode.trim() || undefined,
      game_title: form.gameTitle.trim() || undefined,
      printing: form.printing.trim() || undefined,
      condition: form.condition.trim() || undefined,
      acquisition_reference: form.acquisitionReference.trim() || undefined,
      unit_price_cents: Math.round(unitPrice * 100),
      physical_quantity: Math.round(quantity),
    };

    mutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-[#0a0c12]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">Edit Inventory Item</h2>
            <p className="text-xs text-white/60">{item.sku} - {item.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-white/60 transition hover:border-accent hover:text-accent"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="overflow-y-auto p-6" style={{ maxHeight: "calc(90vh - 140px)" }}>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1 text-sm text-white/70">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">SKU</span>
              <input
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                value={form.sku}
                onChange={handleChange("sku")}
                required
              />
            </div>
            <div className="flex flex-col gap-1 text-sm text-white/70">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">Product name</span>
              <input
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                value={form.name}
                onChange={handleChange("name")}
                required
              />
            </div>
            <div className="flex flex-col gap-1 text-sm text-white/70">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">Category</span>
              <select
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white focus:border-accent focus:outline-none"
                value={form.category}
                onChange={handleChange("category")}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            {showSingleOnlyFields && (
              <div className="flex flex-col gap-1 text-sm text-white/70">
                <span className="text-xs uppercase tracking-[0.3em] text-white/40">Source</span>
                <select
                  className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white focus:border-accent focus:outline-none"
                  value={form.source}
                  onChange={handleChange("source")}
                >
                  {SOURCE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1 text-sm text-white/70">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">Game / Title</span>
              <input
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                value={form.gameTitle}
                onChange={handleChange("gameTitle")}
                placeholder="Magic: The Gathering"
              />
            </div>
            <div className="flex flex-col gap-1 text-sm text-white/70">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">Set / Product code</span>
              <input
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                value={form.setCode}
                onChange={handleChange("setCode")}
                placeholder="MH3"
              />
            </div>
            {showSingleOnlyFields && (
              <div className="flex flex-col gap-1 text-sm text-white/70">
                <span className="text-xs uppercase tracking-[0.3em] text-white/40">Printing</span>
                <input
                  className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                  value={form.printing}
                  onChange={handleChange("printing")}
                  placeholder="Foil"
                />
              </div>
            )}
            {showSingleOnlyFields && (
              <div className="flex flex-col gap-1 text-sm text-white/70">
                <span className="text-xs uppercase tracking-[0.3em] text-white/40">Condition</span>
                <input
                  className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                  value={form.condition}
                  onChange={handleChange("condition")}
                  placeholder="Near Mint"
                />
              </div>
            )}
            <div className="flex flex-col gap-1 text-sm text-white/70">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">Acquisition reference</span>
              <input
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                value={form.acquisitionReference}
                onChange={handleChange("acquisitionReference")}
                placeholder="Distributor PO-9001"
              />
            </div>
            <div className="flex flex-col gap-1 text-sm text-white/70">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">Unit price (USD)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                value={form.unitPrice}
                onChange={handleChange("unitPrice")}
                placeholder="32.99"
              />
            </div>
            <div className="flex flex-col gap-1 text-sm text-white/70">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">Physical quantity</span>
              <input
                type="number"
                min="0"
                step="1"
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                value={form.physicalQuantity}
                onChange={handleChange("physicalQuantity")}
                placeholder="12"
              />
            </div>
          </div>

          <div className="mt-4 rounded-xl bg-blue-500/10 border border-blue-400/20 p-4">
            <p className="text-sm text-blue-200 font-semibold mb-2">
              Current Stock Status
            </p>
            <div className="text-xs">
              <div>
                <p className="text-blue-200/60">Available to Sell</p>
                <p className="text-emerald-300 text-2xl font-bold">{item.available_quantity}</p>
              </div>
            </div>
            <p className="text-xs text-blue-200/70 mt-3">
              💡 This is live catalog inventory available for immediate sale. Pre-order inventory is tracked separately and moves here after the release date.
            </p>
          </div>

          {error && (
            <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-400/20 p-4">
              <p className="text-sm text-rose-200">{error}</p>
            </div>
          )}

          {/* Delete Confirmation */}
          {showDeleteConfirm && (
            <div className="mt-4 rounded-xl bg-rose-500/10 border border-rose-400/20 p-4">
              <p className="text-sm text-rose-200 font-semibold mb-3">
                Are you sure you want to delete this item? This action cannot be undone.
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-sm text-white/80 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="flex-1 rounded-lg bg-rose-500 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete Permanently"}
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={mutation.isPending || deleteMutation.isPending}
              className="rounded-lg border border-rose-400/20 px-4 py-2 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Trash2 size={16} />
              Delete
            </button>
            <div className="flex-1 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-white/80 hover:bg-white/5"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={mutation.isPending || deleteMutation.isPending}
                className="flex-1 rounded-lg bg-accent px-4 py-2 font-semibold text-[#061012] hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {mutation.isPending ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InventoryPage;

type QuickAddFormState = {
  sku: string;
  name: string;
  category: InventoryCategory;
  source: InventorySource;
  setCode: string;
  gameTitle: string;
  printing: string;
  condition: string;
  acquisitionReference: string;
  unitPrice: string;
  physicalQuantity: string;
};

const CATEGORY_OPTIONS: { value: InventoryCategory; label: string }[] = [
  { value: "single", label: "Single" },
  { value: "sealed", label: "Sealed" },
  { value: "supply", label: "Accessory" },
  { value: "other", label: "Other" },
];

const SOURCE_OPTIONS: { value: InventorySource; label: string }[] = [
  { value: "supplier", label: "Supplier" },
  { value: "player", label: "Player trade" },
];

const SAMPLE_ITEM: QuickAddFormState = {
  sku: "MH3-SET-BOOSTER",
  name: "Modern Horizons 3 Set Booster",
  category: "sealed",
  source: "supplier",
  setCode: "MH3",
  gameTitle: "Magic: The Gathering",
  printing: "",
  condition: "",
  acquisitionReference: "Distributor PO-9001",
  unitPrice: "32.99",
  physicalQuantity: "12",
};

const emptyForm = (): QuickAddFormState => ({
  sku: "",
  name: "",
  category: "sealed",
  source: "supplier",
  setCode: "",
  gameTitle: "",
  printing: "",
  condition: "",
  acquisitionReference: "",
  unitPrice: "",
  physicalQuantity: "",
});

const QuickAddInventoryForm = () => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<QuickAddFormState>(emptyForm());
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const showSingleOnlyFields = form.category === "single";

  const mutation = useMutation({
    mutationFn: upsertInventoryItem,
    onSuccess: (item) => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
      setNotice(`Saved ${item.name} (${item.sku})`);
      setError(null);
      setForm(emptyForm());
    },
    onError: (err: unknown) => {
      const message = err instanceof Error ? err.message : "Could not save inventory item";
      setError(message);
      setNotice(null);
    },
  });

  const handleChange = (
    field: keyof QuickAddFormState,
  ) => (event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleBarcodeScanned = (barcode: string) => {
    setForm((prev) => ({ ...prev, sku: barcode }));
    setNotice(`Scanned barcode: ${barcode}`);
    setShowScanner(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setNotice(null);

    if (!form.sku.trim() || !form.name.trim()) {
      setError("SKU and product name are required.");
      return;
    }

    const quantity = Number(form.physicalQuantity || "0");
    if (!Number.isFinite(quantity) || quantity < 0) {
      setError("Physical quantity must be zero or greater.");
      return;
    }

    const unitPrice = Number(form.unitPrice || "0");
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      setError("Unit price must be zero or greater.");
      return;
    }

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      category: form.category,
      source: form.source,
      set_code: form.setCode.trim() || undefined,
      game_title: form.gameTitle.trim() || undefined,
      printing: form.printing.trim() || undefined,
      condition: form.condition.trim() || undefined,
      acquisition_reference: form.acquisitionReference.trim() || undefined,
      unit_price_cents: Math.round(unitPrice * 100),
      physical_quantity: Math.round(quantity),
    };

    mutation.mutate(payload);
  };

  const handleSampleFill = () => {
    setForm({ ...SAMPLE_ITEM });
    setNotice("Sample data filled. You can tweak before saving.");
    setError(null);
  };

  return (
    <div className="rounded-3xl border border-dashed border-white/15 bg-white/5 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Create inventory</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Quick add a SKU</h2>
          <p className="mt-1 text-sm text-white/60">
            Use this lightweight form to seed inventory for testing without touching the CLI or CSV importer.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSampleFill}
          className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/80"
        >
          Autofill sample
        </button>
      </div>

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      )}

      <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
        <div className="flex flex-col gap-1 text-sm text-white/70">
          <span className="text-xs uppercase tracking-[0.3em] text-white/40">SKU</span>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
              value={form.sku}
              onChange={handleChange("sku")}
              placeholder="e.g. MH3-SET"
              required
            />
            <button
              type="button"
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-white/80 hover:border-accent hover:text-accent"
              title="Scan barcode"
            >
              <ScanLine size={18} />
            </button>
          </div>
        </div>
        <TextField
          label="Product name"
          value={form.name}
          onChange={handleChange("name")}
          placeholder="Modern Horizons 3 Set Booster"
          required
        />
        <SelectField
          label="Category"
          value={form.category}
          onChange={handleChange("category")}
          options={CATEGORY_OPTIONS}
        />
        {showSingleOnlyFields && (
          <SelectField
            label="Source"
            value={form.source}
            onChange={handleChange("source")}
            options={SOURCE_OPTIONS}
          />
        )}
        <TextField
          label="Game / Title"
          value={form.gameTitle}
          onChange={handleChange("gameTitle")}
          placeholder="Magic: The Gathering"
        />
        <TextField
          label="Set / Product code"
          value={form.setCode}
          onChange={handleChange("setCode")}
          placeholder="MH3"
        />
        {showSingleOnlyFields && (
          <TextField
            label="Printing"
            value={form.printing}
            onChange={handleChange("printing")}
            placeholder="Foil"
          />
        )}
        {showSingleOnlyFields && (
          <TextField
            label="Condition"
            value={form.condition}
            onChange={handleChange("condition")}
            placeholder="Near Mint"
          />
        )}
        <TextField
          label="Acquisition reference"
          value={form.acquisitionReference}
          onChange={handleChange("acquisitionReference")}
          placeholder="Distributor PO-9001"
        />
        <TextField
          label="Unit price (USD)"
          type="number"
          min="0"
          step="0.01"
          value={form.unitPrice}
          onChange={handleChange("unitPrice")}
          placeholder="32.99"
        />
        <TextField
          label="Physical quantity"
          type="number"
          min="0"
          step="1"
          value={form.physicalQuantity}
          onChange={handleChange("physicalQuantity")}
          placeholder="12"
        />
        <div className="md:col-span-2 flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={mutation.isPending}
            className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-[#0B0F17] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {mutation.isPending ? "Saving…" : "Save inventory item"}
          </button>
          {error && <p className="text-sm text-rose-200">{error}</p>}
          {!error && notice && <p className="text-sm text-emerald-200">{notice}</p>}
        </div>
      </form>
    </div>
  );
};

const TextField = ({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  min,
  step,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  min?: string;
  step?: string;
}) => {
  return (
    <label className="flex flex-col gap-1 text-sm text-white/70">
      <span className="text-xs uppercase tracking-[0.3em] text-white/40">{label}</span>
      <input
        className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        type={type}
        required={required}
        min={min}
        step={step}
      />
    </label>
  );
};

const SelectField = ({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
}) => {
  return (
    <label className="flex flex-col gap-1 text-sm text-white/70">
      <span className="text-xs uppercase tracking-[0.3em] text-white/40">{label}</span>
      <select
        className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-white focus:border-accent focus:outline-none"
        value={value}
        onChange={onChange}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
};
