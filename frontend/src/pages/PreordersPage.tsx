import { Calendar, Loader2, Package, DollarSign, Plus, Filter, Edit2, Trash2 } from "lucide-react";
import { useState } from "react";
import { usePreorderItems, usePreorderClaims, useCreatePreorderItem, useCreatePreorderSet, useCreatePreorderClaim, useUpdatePreorderItem, useRecordPreorderPayment, useCancelPreorderClaim } from "../hooks/usePreorders";
import { useInventory } from "../hooks/useInventory";
import { useCustomers } from "../hooks/useCustomers";
import { useAuth } from "../contexts/AuthContext";
import type { PreorderItem, PreorderClaim } from "../api/preorders";

const PreordersPage = () => {
  const { user } = useAuth();
  const [paymentFilter, setPaymentFilter] = useState<"all" | "paid" | "unpaid">("all");
  const [showNewItemModal, setShowNewItemModal] = useState(false);
  const [showNewSetModal, setShowNewSetModal] = useState(false);
  const [showNewClaimModal, setShowNewClaimModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PreorderItem | null>(null);
  const [editingClaim, setEditingClaim] = useState<PreorderClaim | null>(null);
  const [selectedGameFilter, setSelectedGameFilter] = useState<string>("all");
  
  const { data: preorderItems = [], isLoading: itemsLoading, isError: itemsError } = usePreorderItems();
  const { data: inventory = [] } = useInventory();
  const { data: customers = [] } = useCustomers();
  
  // Check if user is management (owner or manager)
  const isManagement = user?.role === "owner" || user?.role === "manager";
  
  // Fetch claims based on filter
  const isPaidFilter = paymentFilter === "all" ? undefined : paymentFilter === "paid";
  const { data: allClaims = [], isLoading: claimsLoading, isError: claimsError } = usePreorderClaims(isPaidFilter);
  
  const createItemMutation = useCreatePreorderItem();
  const createSetMutation = useCreatePreorderSet();
  const createClaimMutation = useCreatePreorderClaim();
  const updateItemMutation = useUpdatePreorderItem();
  const recordPaymentMutation = useRecordPreorderPayment();
  const cancelClaimMutation = useCancelPreorderClaim();

  const isLoading = itemsLoading || claimsLoading;
  const isError = itemsError || claimsError;

  // Format cents to currency
  const formatCurrency = (cents: number | null | undefined) => {
    if (cents === null || cents === undefined) return "$0.00";
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "TBA";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  // Get unique game titles from inventory
  const gameTitles = Array.from(new Set(
    preorderItems
      .map(item => {
        const invItem = inventory.find(i => i.id === item.inventory_item_id);
        return invItem?.game_title;
      })
      .filter(Boolean)
  )) as string[];

  // Filter items by game
  const filteredItems = selectedGameFilter === "all" 
    ? preorderItems 
    : preorderItems.filter(item => {
        const invItem = inventory.find(i => i.id === item.inventory_item_id);
        return invItem?.game_title === selectedGameFilter;
      });

  // Group preorder items by set (same game_title, release_date, and notes)
  const groupedPreorderSets = filteredItems.reduce((groups, item) => {
    const invItem = inventory.find(i => i.id === item.inventory_item_id);
    const gameTitle = invItem?.game_title || 'Unknown Game';
    const releaseDate = item.release_date || 'TBA';
    const notes = item.notes || '';
    
    // Create a unique key for each set
    const setKey = `${gameTitle}|||${releaseDate}|||${notes}`;
    
    if (!groups[setKey]) {
      groups[setKey] = {
        gameTitle,
        releaseDate,
        notes,
        items: [],
      };
    }
    
    groups[setKey].items.push(item);
    return groups;
  }, {} as Record<string, { gameTitle: string; releaseDate: string | null; notes: string; items: PreorderItem[] }>);

  // Convert to array and sort by release date
  const preorderSets = Object.values(groupedPreorderSets).sort((a, b) => {
    if (!a.releaseDate && !b.releaseDate) return 0;
    if (!a.releaseDate) return 1;
    if (!b.releaseDate) return -1;
    return new Date(a.releaseDate).getTime() - new Date(b.releaseDate).getTime();
  });

  // Filter claims based on payment status and game
  const preorderClaims = allClaims.filter(claim => {
    if (selectedGameFilter === "all") return true;
    const preorderItem = preorderItems.find(pi => pi.id === claim.preorder_item_id);
    if (!preorderItem) return false;
    const invItem = inventory.find(i => i.id === preorderItem.inventory_item_id);
    return invItem?.game_title === selectedGameFilter;
  });

  // Calculate total paid and unpaid claims
  const paidClaims = preorderClaims.filter(c => c.is_paid);
  const unpaidClaims = preorderClaims.filter(c => !c.is_paid && c.status !== 'cancelled');
  const totalPaid = paidClaims.reduce((sum, c) => sum + (c.payment_amount_cents || 0), 0);
  const totalClaims = preorderClaims.filter(c => c.status !== 'cancelled').length;

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Deposits</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Preorder Management</h1>
          <p className="mt-1 text-sm text-white/60">
            Track upcoming releases, inventory allocation, and customer payments.
          </p>
        </div>
        <div className="flex gap-2">
          {/* Primary action - New Customer Preorder */}
          <button 
            onClick={() => setShowNewClaimModal(true)}
            className="flex items-center gap-2 rounded-full bg-gradient-to-r from-accent to-indigo-500 px-6 py-3 text-base font-semibold text-[#061012] shadow-lg hover:shadow-xl transition-all hover:scale-105"
          >
            <Plus size={20} /> New Customer Preorder
          </button>
          
          {/* Management-only actions */}
          {isManagement && (
            <>
              <button 
                onClick={() => setShowNewItemModal(true)}
                className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white/80"
              >
                <Package size={16} /> New Product
              </button>
              <button 
                onClick={() => setShowNewSetModal(true)}
                className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 hover:bg-white/5 hover:text-white/80"
              >
                <Package size={16} /> New Set
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-white/40" />
          <span className="text-sm text-white/60">Game:</span>
          <select
            value={selectedGameFilter}
            onChange={(e) => setSelectedGameFilter(e.target.value)}
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-white/20"
          >
            <option value="all">All Games</option>
            {gameTitles.map(game => (
              <option key={game} value={game}>{game}</option>
            ))}
          </select>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-white/60">Payment:</span>
          <div className="flex rounded-lg border border-white/10 bg-white/5">
            <button
              onClick={() => setPaymentFilter("all")}
              className={`px-3 py-1.5 text-sm ${
                paymentFilter === "all" ? "bg-white/10 text-white" : "text-white/60"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setPaymentFilter("paid")}
              className={`px-3 py-1.5 text-sm ${
                paymentFilter === "paid" ? "bg-emerald-500/20 text-emerald-300" : "text-white/60"
              }`}
            >
              Paid ({paidClaims.length})
            </button>
            <button
              onClick={() => setPaymentFilter("unpaid")}
              className={`px-3 py-1.5 text-sm ${
                paymentFilter === "unpaid" ? "bg-amber-500/20 text-amber-300" : "text-white/60"
              }`}
            >
              Unpaid ({unpaidClaims.length})
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-white/40">Active Products</p>
          <p className="mt-2 text-2xl font-semibold text-white">{filteredItems.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-white/40">Preorder Sets</p>
          <p className="mt-2 text-2xl font-semibold text-white">{preorderSets.length}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-white/40">Total Preorders</p>
          <p className="mt-2 text-2xl font-semibold text-white">{totalClaims}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wider text-white/40">Paid Preorders</p>
          <p className="mt-2 text-2xl font-semibold text-emerald-300">{paidClaims.length}</p>
        </div>
      </div>

      {/* Preorder Sets List - Grouped by game/release date/notes */}
      <div className="space-y-6">
        <h2 className="text-lg font-semibold text-white">Preorder Sets</h2>
        
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-white/60">
            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
            Loading preorders…
          </div>
        )}
        {isError && !isLoading && (
          <div className="py-8 text-center text-sm text-rose-200">
            Could not load preorders. Please try again.
          </div>
        )}
        {!isLoading && !isError && preorderSets.length === 0 && (
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 text-center text-sm text-white/60">
            {selectedGameFilter === "all" 
              ? "No preorder sets yet. Create one to get started."
              : `No preorder sets for ${selectedGameFilter}.`
            }
          </div>
        )}
        {!isLoading && !isError && preorderSets.length > 0 && (
          <div className="space-y-6">
            {preorderSets.map((set, setIndex) => {
              // Calculate set-level statistics
              const setTotalStock = set.items.reduce((sum, item) => sum + item.preorder_quantity, 0);
              const setTotalAllocated = set.items.reduce((sum, item) => sum + item.preorder_quantity_allocated, 0);
              const setTotalAvailable = setTotalStock - setTotalAllocated;
              
              // Get all claims for this set
              const setClaims = preorderClaims.filter(claim => 
                set.items.some(item => item.id === claim.preorder_item_id)
              );
              const setPaidClaims = setClaims.filter(c => c.is_paid && c.status !== 'cancelled');
              const setUnpaidClaims = setClaims.filter(c => !c.is_paid && c.status !== 'cancelled');
              
              return (
                <div
                  key={setIndex}
                  className="rounded-3xl border border-white/10 bg-white/5 p-6"
                >
                  {/* Set Header */}
                  <div className="mb-5 flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-xl font-semibold text-white">{set.gameTitle}</h3>
                        <span className="rounded-full bg-accent/20 px-3 py-1 text-xs font-medium text-accent">
                          {set.items.length} {set.items.length === 1 ? 'Product' : 'Products'}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-3 text-sm text-white/60">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} />
                          <span>Release: {formatDate(set.releaseDate)}</span>
                        </div>
                      </div>
                      {set.notes && (
                        <p className="mt-2 text-sm text-white/50 italic">{set.notes}</p>
                      )}
                    </div>
                    
                    {/* Set Summary Stats */}
                    <div className="flex gap-3">
                      <div className="rounded-lg bg-white/5 px-4 py-2 text-center">
                        <p className="text-xs text-white/40">Total Stock</p>
                        <p className="mt-1 text-lg font-semibold text-white">{setTotalStock}</p>
                      </div>
                      <div className="rounded-lg bg-white/5 px-4 py-2 text-center">
                        <p className="text-xs text-white/40">Available</p>
                        <p className="mt-1 text-lg font-semibold text-emerald-300">{setTotalAvailable}</p>
                      </div>
                      <div className="rounded-lg bg-white/5 px-4 py-2 text-center">
                        <p className="text-xs text-white/40">Claims</p>
                        <p className="mt-1 text-lg font-semibold text-amber-300">{setClaims.length}</p>
                      </div>
                    </div>
                  </div>

                  {/* Products in Set */}
                  <div className="space-y-3">
                    {set.items.map((item) => {
                      const invItem = inventory.find(i => i.id === item.inventory_item_id);
                      const itemClaims = preorderClaims.filter(c => c.preorder_item_id === item.id && c.status !== 'cancelled');
                      const itemPaidClaims = itemClaims.filter(c => c.is_paid);
                      const availableQty = item.preorder_quantity - item.preorder_quantity_allocated;
                      
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <p className="font-medium">{invItem?.name || `Preorder Item #${item.id}`}</p>
                                <span className="text-xs text-white/40">SKU: {invItem?.sku || 'N/A'}</span>
                              </div>
                            </div>
                            <button
                              onClick={() => setEditingItem(item)}
                              className="flex items-center gap-2 rounded-lg border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:bg-white/5"
                            >
                              <Edit2 size={12} />
                              Edit
                            </button>
                          </div>
                          
                          <div className="mt-3 flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-white/40">Allocated:</span>
                              <span className="font-semibold text-white">{item.preorder_quantity}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-white/40">Claimed:</span>
                              <span className="font-semibold text-amber-300">{item.preorder_quantity_allocated}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-white/40">Available:</span>
                              <span className="font-semibold text-emerald-300">{availableQty}</span>
                            </div>
                            {itemClaims.length > 0 && (
                              <div className="ml-auto flex items-center gap-3 text-xs text-white/60">
                                <span>{itemClaims.length} preorders</span>
                                <span className="text-emerald-300">{itemPaidClaims.length} paid</span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Set Footer - Payment Summary */}
                  {setClaims.length > 0 && (
                    <div className="mt-4 flex items-center gap-6 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-white/60">Customer Preorders:</span>
                        <span className="font-semibold text-white">{setClaims.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign size={14} className="text-emerald-300" />
                        <span className="text-white/60">Paid:</span>
                        <span className="font-semibold text-emerald-300">{setPaidClaims.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/60">Unpaid:</span>
                        <span className="font-semibold text-amber-300">{setUnpaidClaims.length}</span>
                      </div>
                      <div className="ml-auto flex items-center gap-2">
                        <span className="text-white/60">Total Deposits:</span>
                        <span className="font-semibold text-emerald-300">
                          {formatCurrency(setPaidClaims.reduce((sum, c) => sum + (c.payment_amount_cents || 0), 0))}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Claims List */}
      {preorderClaims.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Recent Customer Preorders</h2>
          <div className="space-y-2">
            {preorderClaims.slice(0, 10).map((claim) => (
              <div
                key={claim.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
              >
                <div className="flex items-center gap-4">
                  <span className="font-medium">Preorder #{claim.id}</span>
                  <span className="text-white/60">
                    {customers.find(c => c.id === claim.customer_id)?.name || `Customer ${claim.customer_id}`}
                  </span>
                  <span className="text-white/60">Qty: {claim.quantity_requested}</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setEditingClaim(claim)}
                    className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/5"
                  >
                    <Edit2 size={12} />
                    Edit
                  </button>
                  {claim.is_paid ? (
                    <div className="flex items-center gap-2 text-emerald-300">
                      <DollarSign size={14} />
                      <span className="font-semibold">{formatCurrency(claim.payment_amount_cents)}</span>
                      <span className="text-xs text-white/40">{claim.payment_method}</span>
                    </div>
                  ) : (
                    <span className="text-amber-300">Unpaid</span>
                  )}
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs uppercase tracking-wider text-white/60">
                    {claim.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New Preorder Item Modal */}
      {showNewItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
            <h3 className="text-xl font-semibold text-white">New Preorder Product</h3>
            <p className="mt-1 text-sm text-white/60">Set up a preorder for an upcoming release</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const msrp = formData.get('msrp') as string;
                createItemMutation.mutate({
                  product_name: formData.get('product_name') as string,
                  sku: formData.get('sku') as string,
                  game_title: formData.get('game_title') as string,
                  category: 'sealed',
                  msrp_cents: msrp ? Math.round(parseFloat(msrp) * 100) : undefined,
                  preorder_quantity: parseInt(formData.get('preorder_quantity') as string),
                  release_date: formData.get('release_date') as string || undefined,
                  notes: formData.get('notes') as string || undefined,
                }, {
                  onSuccess: () => setShowNewItemModal(false)
                });
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-sm text-white/60">Product Name</label>
                <input
                  type="text"
                  name="product_name"
                  required
                  placeholder="e.g., Magic: The Gathering - Modern Horizons 4 Booster Box"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60">Game/System</label>
                  <input
                    type="text"
                    name="game_title"
                    required
                    placeholder="e.g., Magic: The Gathering"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60">SKU</label>
                  <input
                    type="text"
                    name="sku"
                    required
                    placeholder="e.g., MH4-BB-001"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/60">Allocated Units</label>
                <input
                  type="number"
                  name="preorder_quantity"
                  required
                  min="1"
                  placeholder="50"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                />
                <p className="mt-1 text-xs text-white/40">Total units allocated (1 per customer max)</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60">MSRP</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2 text-white/60">$</span>
                    <input
                      type="number"
                      name="msrp"
                      step="0.01"
                      min="0"
                      placeholder="149.99"
                      className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-7 pr-3 text-white outline-none focus:border-white/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-white/60">Release Date</label>
                  <input
                    type="date"
                    name="release_date"
                    required
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/60">Notes (optional)</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Limited allocation, includes promo card..."
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewItemModal(false)}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-white/80 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createItemMutation.isPending}
                  className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-white hover:bg-white/15 disabled:opacity-50"
                >
                  {createItemMutation.isPending ? 'Creating...' : 'Create Preorder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Claim Modal */}
      {showNewClaimModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
            <h3 className="text-xl font-semibold text-white">New Customer Preorder</h3>
            <p className="mt-1 text-sm text-white/60">Select customer and products (1 unit per product)</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const customerId = parseInt(formData.get('customer_id') as string);
                
                // Collect all selected products
                const selectedProducts: number[] = [];
                preorderItems.forEach(item => {
                  if (formData.get(`product_${item.id}`) === 'on') {
                    selectedProducts.push(item.id);
                  }
                });

                if (selectedProducts.length === 0) {
                  alert('Please select at least one product');
                  return;
                }

                // Create claims for each selected product
                Promise.all(
                  selectedProducts.map(preorderItemId =>
                    createClaimMutation.mutateAsync({
                      preorder_item_id: preorderItemId,
                      customer_id: customerId,
                      quantity_requested: 1,
                    })
                  )
                ).then(() => {
                  setShowNewClaimModal(false);
                }).catch(error => {
                  console.error('Error creating preorders:', error);
                  alert('Some preorders failed to create. Check console for details.');
                });
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-sm text-white/60">Customer</label>
                <select
                  name="customer_id"
                  required
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                >
                  <option value="">Select a customer...</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.email && `(${customer.email})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-white/60 mb-2">Select Products (1 unit each)</label>
                <div className="max-h-80 space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-3">
                  {preorderItems.length === 0 ? (
                    <p className="text-sm text-white/40 text-center py-4">No preorder products available</p>
                  ) : (
                    preorderItems.map(item => {
                      const invItem = inventory.find(i => i.id === item.inventory_item_id);
                      const available = item.preorder_quantity - item.preorder_quantity_allocated;
                      return (
                        <label
                          key={item.id}
                          className={`flex items-center gap-3 rounded-lg border border-white/10 bg-white/5 p-3 cursor-pointer hover:bg-white/10 ${
                            available <= 0 ? 'opacity-50 cursor-not-allowed' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            name={`product_${item.id}`}
                            disabled={available <= 0}
                            className="h-4 w-4 rounded border-white/20 bg-white/10"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-white">
                              {invItem?.name || `Item #${item.id}`}
                            </p>
                            <p className="text-xs text-white/60">
                              {invItem?.game_title && `${invItem.game_title} • `}
                              Available: {available}
                            </p>
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
                <p className="mt-2 text-xs text-white/40">Customer will get 1 unit of each selected product</p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewClaimModal(false)}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-white/80 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createClaimMutation.isPending}
                  className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-white hover:bg-white/15 disabled:opacity-50"
                >
                  {createClaimMutation.isPending ? 'Creating...' : 'Create Preorders'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Preorder Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
            <h3 className="text-xl font-semibold text-white">Edit Preorder Item</h3>
            <p className="mt-1 text-sm text-white/60">Update preorder details</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const msrp = formData.get('msrp') as string;
                const setCode = formData.get('set_code') as string;
                
                console.log('Form submission - MSRP:', msrp, 'Set Code:', setCode);
                
                const update: any = {
                  release_date: formData.get('release_date') as string || undefined,
                  preorder_quantity: parseInt(formData.get('preorder_quantity') as string),
                  notes: formData.get('notes') as string || undefined,
                };
                
                // Add MSRP if provided and not empty
                if (msrp && msrp.trim() !== '') {
                  update.msrp_cents = Math.round(parseFloat(msrp) * 100);
                  console.log('Adding msrp_cents:', update.msrp_cents);
                }
                
                // Add set code if provided and not empty
                if (setCode && setCode.trim() !== '') {
                  update.set_code = setCode.trim();
                  console.log('Adding set_code:', update.set_code);
                }
                
                console.log('Final update object:', update);
                
                updateItemMutation.mutate({
                  itemId: editingItem.id,
                  update: update,
                }, {
                  onSuccess: () => setEditingItem(null)
                });
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-sm text-white/60">Product Name</label>
                <input
                  type="text"
                  value={inventory.find(i => i.id === editingItem.inventory_item_id)?.name || ''}
                  disabled
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/60 cursor-not-allowed outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-white/60">MSRP</label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-2 text-white/60">$</span>
                    <input
                      type="number"
                      name="msrp"
                      step="0.01"
                      min="0"
                      defaultValue={
                        inventory.find(i => i.id === editingItem.inventory_item_id)?.msrp_cents
                          ? (inventory.find(i => i.id === editingItem.inventory_item_id)!.msrp_cents! / 100).toFixed(2)
                          : ''
                      }
                      placeholder="0.00"
                      className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-7 pr-3 text-white outline-none focus:border-white/20"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-white/60">Set Code</label>
                  <input
                    type="text"
                    name="set_code"
                    defaultValue={inventory.find(i => i.id === editingItem.inventory_item_id)?.set_code || ''}
                    placeholder="e.g., MH4"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/60">Allocated Units</label>
                <input
                  type="number"
                  name="preorder_quantity"
                  required
                  min="0"
                  defaultValue={editingItem.preorder_quantity}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                />
                <p className="mt-1 text-xs text-white/40">
                  Currently allocated: {editingItem.preorder_quantity_allocated} units
                </p>
              </div>

              <div>
                <label className="block text-sm text-white/60">Release Date</label>
                <input
                  type="date"
                  name="release_date"
                  defaultValue={editingItem.release_date || ''}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60">Notes</label>
                <textarea
                  name="notes"
                  rows={3}
                  defaultValue={editingItem.notes || ''}
                  placeholder="Any additional information..."
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-white/80 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateItemMutation.isPending}
                  className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-white hover:bg-white/15 disabled:opacity-50"
                >
                  {updateItemMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Preorder Claim Modal */}
      {editingClaim && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
            <h3 className="text-xl font-semibold text-white">Edit Customer Preorder</h3>
            <p className="mt-1 text-sm text-white/60">Update payment and status information</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const isPaid = formData.get('is_paid') === 'true';
                
                if (isPaid) {
                  const paymentAmount = formData.get('payment_amount') as string;
                  recordPaymentMutation.mutate({
                    claimId: editingClaim.id,
                    payment: {
                      is_paid: true,
                      payment_amount_cents: Math.round(parseFloat(paymentAmount) * 100),
                      payment_method: formData.get('payment_method') as string,
                      payment_notes: formData.get('payment_notes') as string || undefined,
                    }
                  }, {
                    onSuccess: () => setEditingClaim(null)
                  });
                } else {
                  // Just update paid status to false
                  recordPaymentMutation.mutate({
                    claimId: editingClaim.id,
                    payment: {
                      is_paid: false,
                      payment_amount_cents: 0,
                      payment_method: 'none',
                    }
                  }, {
                    onSuccess: () => setEditingClaim(null)
                  });
                }
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-sm text-white/60">Customer</label>
                <input
                  type="text"
                  value={customers.find(c => c.id === editingClaim.customer_id)?.name || `Customer ${editingClaim.customer_id}`}
                  disabled
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/60 cursor-not-allowed outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60">Product</label>
                <input
                  type="text"
                  value={(() => {
                    const item = preorderItems.find(pi => pi.id === editingClaim.preorder_item_id);
                    const invItem = inventory.find(i => i.id === item?.inventory_item_id);
                    return invItem?.name || `Preorder Item #${editingClaim.preorder_item_id}`;
                  })()}
                  disabled
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/60 cursor-not-allowed outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-white/60">Payment Status</label>
                <select
                  name="is_paid"
                  defaultValue={editingClaim.is_paid ? 'true' : 'false'}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  onChange={(e) => {
                    const form = e.target.form;
                    const paymentFields = form?.querySelector('#payment-fields') as HTMLElement;
                    if (paymentFields) {
                      paymentFields.style.display = e.target.value === 'true' ? 'block' : 'none';
                    }
                  }}
                >
                  <option value="false">Unpaid</option>
                  <option value="true">Paid</option>
                </select>
              </div>

              <div id="payment-fields" style={{ display: editingClaim.is_paid ? 'block' : 'none' }} className="space-y-4">
                <div>
                  <label className="block text-sm text-white/60">Payment Amount</label>
                  <input
                    type="number"
                    name="payment_amount"
                    step="0.01"
                    min="0"
                    defaultValue={editingClaim.payment_amount_cents ? (editingClaim.payment_amount_cents / 100).toFixed(2) : ''}
                    placeholder="0.00"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  />
                </div>

                <div>
                  <label className="block text-sm text-white/60">Payment Method</label>
                  <select
                    name="payment_method"
                    defaultValue={editingClaim.payment_method || 'cash'}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  >
                    <option value="cash">Cash</option>
                    <option value="card">Card</option>
                    <option value="store_credit">Store Credit</option>
                    <option value="check">Check</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm text-white/60">Payment Notes</label>
                  <textarea
                    name="payment_notes"
                    rows={2}
                    defaultValue={editingClaim.payment_notes || ''}
                    placeholder="Optional notes about the payment..."
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingClaim(null)}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-white/80 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordPaymentMutation.isPending}
                  className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-white hover:bg-white/15 disabled:opacity-50"
                >
                  {recordPaymentMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>

            {/* Cancel Preorder Section */}
            {editingClaim.status !== 'cancelled' && editingClaim.status !== 'fulfilled' && (
              <div className="mt-6 border-t border-white/10 pt-6">
                <p className="text-sm font-medium text-rose-300">Danger Zone</p>
                <p className="mt-1 text-xs text-white/60">
                  Canceling this preorder will return {editingClaim.quantity_requested} unit(s) to available inventory.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to cancel this preorder? This will return inventory to stock.')) {
                      cancelClaimMutation.mutate(editingClaim.id, {
                        onSuccess: () => setEditingClaim(null)
                      });
                    }
                  }}
                  disabled={cancelClaimMutation.isPending}
                  className="mt-3 flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  {cancelClaimMutation.isPending ? 'Canceling...' : 'Cancel Preorder'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* New Preorder Set Modal */}
      {showNewSetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
            <h3 className="text-xl font-semibold text-white">New Preorder Set</h3>
            <p className="mt-1 text-sm text-white/60">Create multiple preorder products with shared game and release date</p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                
                // Collect shared details
                const gameTitle = formData.get('game_title') as string;
                const releaseDate = formData.get('release_date') as string || undefined;
                const notes = formData.get('notes') as string || undefined;
                
                // Collect products from the dynamic fields
                const products = [];
                let i = 0;
                while (formData.has(`product_${i}_name`)) {
                  const msrp = formData.get(`product_${i}_msrp`) as string;
                  products.push({
                    product_name: formData.get(`product_${i}_name`) as string,
                    sku: formData.get(`product_${i}_sku`) as string,
                    msrp_cents: msrp ? Math.round(parseFloat(msrp) * 100) : undefined,
                    preorder_quantity: parseInt(formData.get(`product_${i}_preorder_quantity`) as string),
                  });
                  i++;
                }
                
                createSetMutation.mutate({
                  game_title: gameTitle,
                  release_date: releaseDate,
                  category: 'sealed',
                  notes: notes,
                  products: products,
                }, {
                  onSuccess: () => setShowNewSetModal(false)
                });
              }}
              className="mt-4 space-y-4"
            >
              {/* Shared Details */}
              <div className="rounded-lg border border-white/20 bg-white/5 p-4">
                <h4 className="text-sm font-semibold text-white mb-3">Shared Details</h4>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-white/60">Game/System</label>
                    <input
                      type="text"
                      name="game_title"
                      required
                      placeholder="e.g., Magic: The Gathering"
                      className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-white/60">Release Date</label>
                      <input
                        type="date"
                        name="release_date"
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white/60">Notes</label>
                      <input
                        type="text"
                        name="notes"
                        placeholder="Optional"
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Products */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-white">Products in Set</h4>
                <PreorderSetProductFields />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowNewSetModal(false)}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-white/80 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createSetMutation.isPending}
                  className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-white hover:bg-white/15 disabled:opacity-50"
                >
                  {createSetMutation.isPending ? 'Creating Set...' : 'Create Preorder Set'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Component for dynamic product fields
const PreorderSetProductFields = () => {
  const [productCount, setProductCount] = useState(2);

  return (
    <div className="space-y-3">
      {Array.from({ length: productCount }).map((_, i) => (
        <div key={i} className="rounded-lg border border-white/10 bg-white/5 p-4">
          <h5 className="text-xs font-semibold text-white/60 mb-3">Product {i + 1}</h5>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/60">Product Name</label>
                <input
                  type="text"
                  name={`product_${i}_name`}
                  required
                  placeholder="e.g., Booster Box"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60">SKU</label>
                <input
                  type="text"
                  name={`product_${i}_sku`}
                  required
                  placeholder="e.g., MH4-BB"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/60">MSRP ($)</label>
                <input
                  type="number"
                  name={`product_${i}_msrp`}
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                />
              </div>
              <div>
                <label className="block text-xs text-white/60">Allocated Units (1 per customer)</label>
                <input
                  type="number"
                  name={`product_${i}_preorder_quantity`}
                  required
                  min="0"
                  defaultValue="0"
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-white/20"
                />
              </div>
            </div>
          </div>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setProductCount(productCount + 1)}
        className="w-full rounded-lg border border-dashed border-white/20 px-4 py-3 text-sm text-white/60 hover:bg-white/5 hover:text-white"
      >
        + Add Another Product
      </button>
    </div>
  );
};

export default PreordersPage;

