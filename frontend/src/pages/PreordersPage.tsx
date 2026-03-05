import { Calendar, Loader2, Package, DollarSign, Plus, Filter, Edit2, Trash2, Search, X, CreditCard } from "lucide-react";
import { useState, useEffect } from "react";
import { usePreorderItems, usePreorderClaims, useCreatePreorderItem, useCreatePreorderSet, useCreatePreorderClaim, useUpdatePreorderItem, useRecordPreorderPayment, useCancelPreorderClaim } from "../hooks/usePreorders";
import { useInventory } from "../hooks/useInventory";
import { useCustomers } from "../hooks/useCustomers";
import { useAuth } from "../contexts/AuthContext";
import { useRecordCashTransaction } from "../hooks/useCashRegister";
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
  const [viewingItemClaims, setViewingItemClaims] = useState<PreorderItem | null>(null);
  const [viewingOrderClaims, setViewingOrderClaims] = useState<number | null>(null);
  const [selectedCustomerForNewClaim, setSelectedCustomerForNewClaim] = useState<number | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>("");
  const [selectedClaimsForPayment, setSelectedClaimsForPayment] = useState<Set<number>>(new Set());
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [itemsPaidDuringCreation, setItemsPaidDuringCreation] = useState<Set<number>>(new Set());
  const [cashTendered, setCashTendered] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<string>('cash');
  const [editClaimCashTendered, setEditClaimCashTendered] = useState<string>('');
  const [editClaimPaymentMethod, setEditClaimPaymentMethod] = useState<string>('cash');
  
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
  const recordCashTransactionMutation = useRecordCashTransaction();

  // Initialize edit claim form state when modal opens
  useEffect(() => {
    if (editingClaim) {
      setEditClaimPaymentMethod(editingClaim.payment_method || 'cash');
      setEditClaimCashTendered('');
    }
  }, [editingClaim]);

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
  const unpaidClaims = preorderClaims.filter(c => !c.is_paid);
  const totalPaid = paidClaims.reduce((sum, c) => sum + (c.payment_amount_cents || 0), 0);
  const totalClaims = preorderClaims.length;

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
            className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white outline-none focus:border-white/20 [&>option]:bg-gray-900 [&>option]:text-white"
          >
            <option value="all" className="bg-gray-900 text-white">All Games</option>
            {gameTitles.map(game => (
              <option key={game} value={game} className="bg-gray-900 text-white">{game}</option>
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
              const setPaidClaims = setClaims.filter(c => c.is_paid);
              const setUnpaidClaims = setClaims.filter(c => !c.is_paid);
              
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
                      const itemClaims = preorderClaims.filter(c => c.preorder_item_id === item.id);
                      const itemPaidClaims = itemClaims.filter(c => c.is_paid);
                      const availableQty = item.preorder_quantity - item.preorder_quantity_allocated;
                      
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white cursor-pointer hover:bg-white/10 transition-colors"
                          onClick={() => setViewingItemClaims(item)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-3">
                                <p className="font-medium">{invItem?.name || `Preorder Item #${item.id}`}</p>
                                <span className="text-xs text-white/40">SKU: {invItem?.sku || 'N/A'}</span>
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingItem(item);
                              }}
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

      {/* Claims List - Grouped by Customer */}
      {preorderClaims.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
          <h2 className="mb-4 text-lg font-semibold text-white">Customer Preorders</h2>
          <div className="space-y-4">
            {(() => {
              // Group claims by customer_id
              const groupedByCustomer = preorderClaims.reduce((acc, claim) => {
                if (!acc[claim.customer_id]) {
                  acc[claim.customer_id] = [];
                }
                acc[claim.customer_id].push(claim);
                return acc;
              }, {} as Record<number, PreorderClaim[]>);

              // Convert to array and sort by most recent activity
              const sortedCustomers = Object.entries(groupedByCustomer)
                .map(([customerId, claims]) => ({
                  customerId: parseInt(customerId),
                  claims: claims.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()),
                  latestDate: claims.reduce((latest, claim) => {
                    const claimDate = new Date(claim.created_at);
                    return claimDate > latest ? claimDate : latest;
                  }, new Date(claims[0].created_at))
                }))
                .sort((a, b) => b.latestDate.getTime() - a.latestDate.getTime());

              return sortedCustomers.map(({ customerId, claims }) => {
                const customer = customers.find(c => c.id === customerId);
                const activeClaims = claims;
                const paidClaims = activeClaims.filter(c => c.is_paid);
                const unpaidClaims = activeClaims.filter(c => !c.is_paid);
                const totalPaid = paidClaims.reduce((sum, c) => sum + (c.payment_amount_cents || 0), 0);
                const totalUnpaid = unpaidClaims.reduce((sum, c) => {
                  const preorderItem = preorderItems.find(pi => pi.id === c.preorder_item_id);
                  const invItem = preorderItem ? inventory.find(i => i.id === preorderItem.inventory_item_id) : null;
                  return sum + (invItem?.msrp_cents || 0);
                }, 0);
                
                // Group by order for display
                const orderGroups = activeClaims.reduce((acc, claim) => {
                  if (!acc[claim.preorder_order_id]) {
                    acc[claim.preorder_order_id] = [];
                  }
                  acc[claim.preorder_order_id].push(claim);
                  return acc;
                }, {} as Record<number, PreorderClaim[]>);

                return (
                  <div
                    key={customerId}
                    className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3"
                  >
                    {/* Customer Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <span className="text-lg font-bold text-white">
                          {customer?.name || `Customer ${customerId}`}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-sm">
                        <span className="text-white/60">
                          {activeClaims.length} {activeClaims.length === 1 ? 'item' : 'items'}
                        </span>
                        {paidClaims.length === activeClaims.length && activeClaims.length > 0 && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                            <DollarSign size={12} />
                            Fully Paid
                          </span>
                        )}
                        {paidClaims.length > 0 && paidClaims.length < activeClaims.length && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300">
                            <DollarSign size={12} />
                            Partial ({paidClaims.length}/{activeClaims.length})
                          </span>
                        )}
                        {paidClaims.length === 0 && (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/20 px-2.5 py-1 text-xs font-semibold text-rose-300">
                            Unpaid
                          </span>
                        )}
                        {paidClaims.length > 0 && (
                          <div className="flex items-center gap-2 text-emerald-300">
                            <span className="text-xs">Paid:</span>
                            <span className="font-semibold">{formatCurrency(totalPaid)}</span>
                          </div>
                        )}
                        {unpaidClaims.length > 0 && (
                          <>
                            <div className="flex items-center gap-2 text-amber-300">
                              <span className="text-xs">Owe:</span>
                              <span className="font-semibold">{formatCurrency(totalUnpaid)}</span>
                            </div>
                            <button
                              onClick={() => {
                                // Select all unpaid claims from this customer
                                const newSelection = new Set(selectedClaimsForPayment);
                                unpaidClaims.forEach(c => newSelection.add(c.id));
                                setSelectedClaimsForPayment(newSelection);
                                setShowPaymentModal(true);
                              }}
                              className="flex items-center gap-1.5 rounded-full bg-accent/20 px-3 py-1.5 text-xs font-semibold text-accent hover:bg-accent/30 transition-colors"
                            >
                              <CreditCard size={12} />
                              Pay All
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Orders within customer - grouped by order ID */}
                    <div className="space-y-3">
                      {Object.entries(orderGroups)
                        .sort(([, claimsA], [, claimsB]) => 
                          new Date(claimsB[0].created_at).getTime() - new Date(claimsA[0].created_at).getTime()
                        )
                        .map(([orderId, orderClaims]) => {
                          const orderPaid = orderClaims.filter(c => c.is_paid).length;
                          
                          return (
                            <div key={orderId} className="pl-4 border-l-2 border-white/10">
                              <div className="flex items-center gap-2 mb-2">
                                <span 
                                  className="text-xs font-semibold text-white/60 cursor-pointer hover:text-accent transition-colors"
                                  onClick={() => setViewingOrderClaims(parseInt(orderId))}
                                >
                                  Order #{orderId}
                                </span>
                                <span className="text-xs text-white/40">
                                  ({orderClaims.length} {orderClaims.length === 1 ? 'item' : 'items'})
                                </span>
                                {orderPaid > 0 && orderPaid < orderClaims.length && (
                                  <span className="text-xs text-amber-400">
                                    {orderPaid}/{orderClaims.length} paid
                                  </span>
                                )}
                              </div>
                              <div className="space-y-2">
                                {orderClaims.map((claim) => {
                        const preorderItem = preorderItems.find(pi => pi.id === claim.preorder_item_id);
                        const invItem = preorderItem ? inventory.find(i => i.id === preorderItem.inventory_item_id) : null;
                        const isSelected = selectedClaimsForPayment.has(claim.id);
                        
                        return (
                          <div
                            key={claim.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {!claim.is_paid && (
                                <input
                                  type="checkbox"
                                  checked={isSelected}
                                  onChange={(e) => {
                                    const newSelection = new Set(selectedClaimsForPayment);
                                    if (e.target.checked) {
                                      newSelection.add(claim.id);
                                    } else {
                                      newSelection.delete(claim.id);
                                    }
                                    setSelectedClaimsForPayment(newSelection);
                                  }}
                                  className="h-4 w-4 rounded border-white/20 bg-white/10 text-accent focus:ring-accent"
                                />
                              )}
                              {claim.is_paid && <span className="w-4"></span>}
                              <span className="text-white/60">•</span>
                              <span 
                                className="text-white cursor-pointer hover:text-accent transition-colors"
                                onClick={() => preorderItem && setViewingItemClaims(preorderItem)}
                              >
                                {invItem?.name || `Item #${claim.preorder_item_id}`}
                              </span>
                              <span className="text-white/40 text-xs">Qty: {claim.quantity_requested}</span>
                              {!claim.is_paid && invItem?.msrp_cents && (
                                <span className="text-white/60 text-xs">({formatCurrency(invItem.msrp_cents)})</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              {claim.is_paid ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                                  <DollarSign size={10} />
                                  {formatCurrency(claim.payment_amount_cents)}
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">Unpaid</span>
                              )}
                              <button
                                onClick={() => setEditingClaim(claim)}
                                className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/5"
                              >
                                <Edit2 size={10} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* New Preorder Item Modal */}
      {showNewItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
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
                
                // Collect all selected products and their payment status
                const selectedProducts: { itemId: number; isPaid: boolean }[] = [];
                preorderItems.forEach(item => {
                  if (formData.get(`product_${item.id}`) === 'on') {
                    const isPaid = formData.get(`paid_${item.id}`) === 'on';
                    selectedProducts.push({ itemId: item.id, isPaid });
                  }
                });

                if (selectedProducts.length === 0) {
                  alert('Please select at least one product');
                  return;
                }

                // Create claims for each selected product, then mark as paid if needed
                Promise.all(
                  selectedProducts.map(async ({ itemId, isPaid }) => {
                    // First create the claim
                    const claim = await createClaimMutation.mutateAsync({
                      preorder_item_id: itemId,
                      customer_id: customerId,
                      quantity_requested: 1,
                    });
                    
                    // If marked as paid, record the payment
                    if (isPaid) {
                      const preorderItem = preorderItems.find(pi => pi.id === itemId);
                      const invItem = preorderItem ? inventory.find(i => i.id === preorderItem.inventory_item_id) : null;
                      const amount = invItem?.msrp_cents || 0;
                      
                      await recordPaymentMutation.mutateAsync({
                        claimId: claim.id,
                        payment: {
                          is_paid: true,
                          payment_amount_cents: amount,
                          payment_method: 'cash',
                          payment_notes: 'Paid at preorder creation',
                        },
                      });
                    }
                    
                    return claim;
                  })
                ).then(() => {
                  setShowNewClaimModal(false);
                  setSelectedCustomerForNewClaim(null);
                  setCustomerSearchQuery("");
                  setItemsPaidDuringCreation(new Set());
                }).catch(error => {
                  console.error('Error creating preorders:', error);
                  alert('Some preorders failed to create. Please check which items were successfully added.');
                });
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-sm text-white/60 mb-2">Customer</label>
                
                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                  <input
                    type="text"
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    placeholder="Search customers by name or email..."
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-10 text-white outline-none focus:border-white/20"
                  />
                  {customerSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setCustomerSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      <X size={18} />
                    </button>
                  )}
                </div>

                {/* Customer List */}
                <div className="mt-2 max-h-60 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-2">
                  {(() => {
                    const filteredCustomers = customers
                      .filter(customer => {
                        const query = customerSearchQuery.toLowerCase();
                        return (
                          customer.name.toLowerCase().includes(query) ||
                          (customer.email && customer.email.toLowerCase().includes(query))
                        );
                      })
                      .sort((a, b) => a.name.localeCompare(b.name));

                    if (filteredCustomers.length === 0) {
                      return (
                        <p className="py-4 text-center text-sm text-white/40">
                          {customerSearchQuery ? 'No customers found' : 'No customers available'}
                        </p>
                      );
                    }

                    return filteredCustomers.map(customer => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => setSelectedCustomerForNewClaim(customer.id)}
                        className={`w-full rounded-lg px-3 py-2 text-left transition-all ${
                          selectedCustomerForNewClaim === customer.id
                            ? 'bg-accent/20 border border-accent/50 text-white'
                            : 'bg-white/5 border border-transparent text-white/80 hover:bg-white/10'
                        }`}
                      >
                        <p className="font-medium">{customer.name}</p>
                        {customer.email && (
                          <p className="text-xs text-white/60">{customer.email}</p>
                        )}
                      </button>
                    ));
                  })()}
                </div>
                
                {/* Hidden input for form submission */}
                <input
                  type="hidden"
                  name="customer_id"
                  value={selectedCustomerForNewClaim || ''}
                  required
                />
                
                {!selectedCustomerForNewClaim && (
                  <p className="mt-1 text-xs text-white/40">Please select a customer to continue</p>
                )}
                {selectedCustomerForNewClaim && (
                  <p className="mt-1 text-xs text-emerald-300">
                    ✓ Customer selected: {customers.find(c => c.id === selectedCustomerForNewClaim)?.name}
                  </p>
                )}
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
                      
                      // Check if this customer has already claimed this item
                      const existingClaim = selectedCustomerForNewClaim 
                        ? preorderClaims.find(claim => 
                            claim.customer_id === selectedCustomerForNewClaim && 
                            claim.preorder_item_id === item.id
                          )
                        : null;
                      
                      const customerAlreadyClaimed = !!existingClaim;
                      
                      const isDisabled = available <= 0 || customerAlreadyClaimed;
                      const disabledReason = customerAlreadyClaimed 
                        ? 'Already pre-ordered' 
                        : available <= 0 
                        ? 'Out of stock' 
                        : '';
                      
                      return (
                        <div
                          key={item.id}
                          className={`rounded-lg border border-white/10 bg-white/5 p-3 ${
                            isDisabled ? 'opacity-50' : ''
                          }`}
                        >
                          {/* Main product selection */}
                          <label className="flex items-start gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              name={`product_${item.id}`}
                              disabled={isDisabled}
                              className="mt-1 h-4 w-4 flex-shrink-0 rounded border-white/20 bg-white/10"
                            />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="text-sm font-medium text-white break-words">
                                  {invItem?.name || `Item #${item.id}`}
                                </p>
                                {existingClaim && (
                                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold flex-shrink-0 ${
                                    existingClaim.is_paid 
                                      ? 'bg-emerald-500/20 text-emerald-300' 
                                      : 'bg-amber-500/20 text-amber-300'
                                  }`}>
                                    {existingClaim.is_paid && <DollarSign size={10} />}
                                    {existingClaim.is_paid ? 'Paid' : 'Unpaid'}
                                  </span>
                                )}
                              </div>
                              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/60">
                                {invItem?.game_title && (
                                  <span>{invItem.game_title}</span>
                                )}
                                {invItem?.game_title && (disabledReason || available > 0) && (
                                  <span>•</span>
                                )}
                                <span>{disabledReason || `Available: ${available}`}</span>
                                {!isDisabled && invItem?.msrp_cents && (
                                  <>
                                    <span>•</span>
                                    <span className="font-medium text-white">{formatCurrency(invItem.msrp_cents)}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </label>
                          
                          {/* Payment checkbox - only show if item is not disabled */}
                          {!isDisabled && (
                            <label 
                              htmlFor={`paid_${item.id}`}
                              className="mt-3 flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-2 cursor-pointer hover:bg-accent/15 transition-colors"
                            >
                              <input
                                type="checkbox"
                                name={`paid_${item.id}`}
                                id={`paid_${item.id}`}
                                onChange={(e) => {
                                  // Also check the product checkbox when payment is checked
                                  if (e.target.checked) {
                                    const productCheckbox = document.querySelector(`input[name="product_${item.id}"]`) as HTMLInputElement;
                                    if (productCheckbox && !productCheckbox.checked) {
                                      productCheckbox.checked = true;
                                    }
                                  }
                                }}
                                className="h-4 w-4 flex-shrink-0 rounded border-accent/30 text-accent focus:ring-accent"
                              />
                              <div className="flex items-center gap-1.5 text-xs font-medium text-accent">
                                <DollarSign size={14} className="flex-shrink-0" />
                                <span className="whitespace-nowrap">Paid today</span>
                              </div>
                            </label>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                <p className="mt-2 text-xs text-white/40">
                  {selectedCustomerForNewClaim 
                    ? 'Select products and check "Customer paid today" for items paid during preorder creation' 
                    : 'Select a customer to see available products'
                  }
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewClaimModal(false);
                    setSelectedCustomerForNewClaim(null);
                    setCustomerSearchQuery("");
                    setItemsPaidDuringCreation(new Set());
                  }}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-white/80 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createClaimMutation.isPending || recordPaymentMutation.isPending}
                  className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-white hover:bg-white/15 disabled:opacity-50"
                >
                  {(createClaimMutation.isPending || recordPaymentMutation.isPending) ? 'Creating...' : 'Create Preorders'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Preorder Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
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
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
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
                    onSuccess: () => {
                      setEditingClaim(null);
                      setEditClaimCashTendered('');
                      setEditClaimPaymentMethod('cash');
                    }
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
                    onSuccess: () => {
                      setEditingClaim(null);
                      setEditClaimCashTendered('');
                      setEditClaimPaymentMethod('cash');
                    }
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
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20 [&>option]:bg-gray-900 [&>option]:text-white"
                  onChange={(e) => {
                    const form = e.target.form;
                    const paymentFields = form?.querySelector('#payment-fields') as HTMLElement;
                    if (paymentFields) {
                      paymentFields.style.display = e.target.value === 'true' ? 'block' : 'none';
                    }
                  }}
                >
                  <option value="false" className="bg-gray-900 text-white">Unpaid</option>
                  <option value="true" className="bg-gray-900 text-white">Paid</option>
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
                    value={editClaimPaymentMethod}
                    onChange={(e) => {
                      setEditClaimPaymentMethod(e.target.value);
                      setEditClaimCashTendered('');
                    }}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20 [&>option]:bg-gray-900 [&>option]:text-white"
                  >
                    <option value="cash" className="bg-gray-900 text-white">Cash</option>
                    <option value="card" className="bg-gray-900 text-white">Card</option>
                    <option value="store_credit" className="bg-gray-900 text-white">Store Credit</option>
                    <option value="check" className="bg-gray-900 text-white">Check</option>
                    <option value="other" className="bg-gray-900 text-white">Other</option>
                  </select>
                </div>

                {/* Cash Tendered - Only show for cash payments */}
                {editClaimPaymentMethod === 'cash' && (
                  <>
                    <div>
                      <label className="block text-sm text-white/60">Cash Tendered</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editClaimCashTendered}
                          onChange={(e) => setEditClaimCashTendered(e.target.value)}
                          placeholder="0.00"
                          className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 pl-7 pr-3 py-2 text-white outline-none focus:border-white/20"
                        />
                      </div>
                    </div>

                    {/* Change Calculator */}
                    {editClaimCashTendered && parseFloat(editClaimCashTendered) > 0 && (() => {
                      const preorderItem = preorderItems.find(pi => pi.id === editingClaim.preorder_item_id);
                      const invItem = preorderItem ? inventory.find(i => i.id === preorderItem.inventory_item_id) : null;
                      const total = invItem?.msrp_cents || 0;
                      const tendered = Math.round(parseFloat(editClaimCashTendered) * 100);
                      const change = Math.max(0, tendered - total);
                      
                      return (
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white">Change Due:</span>
                            <span className="text-2xl font-bold text-emerald-300">
                              {formatCurrency(change)}
                            </span>
                          </div>
                          {tendered < total && (
                            <p className="mt-2 text-xs text-rose-300">
                              Insufficient payment: {formatCurrency(total - tendered)} short
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}

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
                  onClick={() => {
                    setEditingClaim(null);
                    setEditClaimCashTendered('');
                    setEditClaimPaymentMethod('cash');
                  }}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-white/80 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={(() => {
                    if (recordPaymentMutation.isPending) return true;
                    
                    // Validate sufficient cash for cash payments if user entered a cash tendered amount
                    if (editClaimPaymentMethod === 'cash' && editClaimCashTendered) {
                      const preorderItem = preorderItems.find(pi => pi.id === editingClaim.preorder_item_id);
                      const invItem = preorderItem ? inventory.find(i => i.id === preorderItem.inventory_item_id) : null;
                      const total = invItem?.msrp_cents || 0;
                      const tendered = Math.round(parseFloat(editClaimCashTendered) * 100);
                      if (tendered < total) return true;
                    }
                    
                    return false;
                  })()}
                  className="flex-1 rounded-lg bg-white/10 px-4 py-2 text-white hover:bg-white/15 disabled:opacity-50"
                >
                  {recordPaymentMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>

            {/* Cancel Preorder Section */}
            {editingClaim.status !== 'fulfilled' && (
              <div className="mt-6 border-t border-white/10 pt-6">
                <p className="text-sm font-medium text-rose-300">Danger Zone</p>
                <p className="mt-1 text-xs text-white/60">
                  Deleting this preorder will return {editingClaim.quantity_requested} unit(s) to available inventory and permanently remove it from the system.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this preorder? This action cannot be undone.')) {
                      cancelClaimMutation.mutate(editingClaim.id, {
                        onSuccess: () => setEditingClaim(null)
                      });
                    }
                  }}
                  disabled={cancelClaimMutation.isPending}
                  className="mt-3 flex items-center gap-2 rounded-lg border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm text-rose-300 hover:bg-rose-500/20 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  {cancelClaimMutation.isPending ? 'Deleting...' : 'Delete Preorder'}
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
      
      {/* View Item Claims Modal - Shows who has pre-ordered a specific item */}
      {viewingItemClaims && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Customer Preorders</h3>
                <p className="mt-1 text-sm text-white/60">
                  {inventory.find(i => i.id === viewingItemClaims.inventory_item_id)?.name || `Preorder Item #${viewingItemClaims.id}`}
                </p>
              </div>
              <button
                onClick={() => setViewingItemClaims(null)}
                className="text-white/60 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Item Summary */}
            <div className="mb-4 rounded-lg border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-white/40">Allocated:</span>
                  <span className="font-semibold text-white">{viewingItemClaims.preorder_quantity}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/40">Claimed:</span>
                  <span className="font-semibold text-amber-300">{viewingItemClaims.preorder_quantity_allocated}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-white/40">Available:</span>
                  <span className="font-semibold text-emerald-300">
                    {viewingItemClaims.preorder_quantity - viewingItemClaims.preorder_quantity_allocated}
                  </span>
                </div>
              </div>
            </div>

            {/* List of customers who pre-ordered */}
            <div className="space-y-2">
              {(() => {
                // Get all claims for this item
                const itemClaims = preorderClaims
                  .filter(claim => claim.preorder_item_id === viewingItemClaims.id)
                  .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

                // Group by customer
                const groupedByCustomer = itemClaims.reduce((acc, claim) => {
                  if (!acc[claim.customer_id]) {
                    acc[claim.customer_id] = [];
                  }
                  acc[claim.customer_id].push(claim);
                  return acc;
                }, {} as Record<number, PreorderClaim[]>);

                // Convert to array for rendering
                return Object.entries(groupedByCustomer).map(([customerId, claims]) => {
                  const customer = customers.find(c => c.id === parseInt(customerId));
                  const totalQty = claims.reduce((sum, c) => sum + c.quantity_requested, 0);
                  const totalPaid = claims.filter(c => c.is_paid).reduce((sum, c) => sum + (c.payment_amount_cents || 0), 0);
                  const paidCount = claims.filter(c => c.is_paid).length;

                  return (
                    <div
                      key={customerId}
                      className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-2"
                    >
                      {/* Customer Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium text-white">{customer?.name || `Customer ${customerId}`}</p>
                          {customer?.email && (
                            <p className="text-xs text-white/40">{customer.email}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-white/60">Qty: {totalQty}</span>
                          {paidCount === claims.length && claims.length > 0 && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                              <DollarSign size={12} />
                              Paid {formatCurrency(totalPaid)}
                            </span>
                          )}
                          {paidCount > 0 && paidCount < claims.length && (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300">
                              <DollarSign size={12} />
                              Partial {formatCurrency(totalPaid)}
                            </span>
                          )}
                          {paidCount === 0 && (
                            <span className="inline-flex items-center rounded-full bg-rose-500/20 px-2.5 py-1 text-xs font-semibold text-rose-300">
                              Unpaid
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Individual Claims (Orders) */}
                      <div className="space-y-1 pl-4 border-l-2 border-white/10">
                        {claims.map((claim) => (
                          <div
                            key={claim.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <div className="flex items-center gap-3">
                              <span className="text-white/60">•</span>
                              <span 
                                className="text-accent cursor-pointer hover:underline"
                                onClick={() => {
                                  setViewingItemClaims(null);
                                  setViewingOrderClaims(claim.preorder_order_id);
                                }}
                              >
                                Order #{claim.preorder_order_id}
                              </span>
                              <span className="text-white/60">Qty: {claim.quantity_requested}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              {claim.is_paid ? (
                                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                                  <DollarSign size={10} />
                                  {formatCurrency(claim.payment_amount_cents)}
                                </span>
                              ) : (
                                <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-300">Unpaid</span>
                              )}
                              <button
                                onClick={() => {
                                  setViewingItemClaims(null);
                                  setEditingClaim(claim);
                                }}
                                className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/5"
                              >
                                <Edit2 size={10} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                });
              })()}
              {preorderClaims.filter(claim => claim.preorder_item_id === viewingItemClaims.id).length === 0 && (
                <div className="text-center py-8 text-white/60">
                  No customer preorders for this item yet.
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewingItemClaims(null)}
                className="rounded-lg border border-white/10 px-6 py-2 text-white/80 hover:bg-white/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Order Claims Modal - Shows all items in a preorder order */}
      {viewingOrderClaims && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-xl font-semibold text-white">Preorder #{viewingOrderClaims}</h3>
                {(() => {
                  const orderClaims = preorderClaims.filter(c => c.preorder_order_id === viewingOrderClaims);
                  const customer = orderClaims[0] ? customers.find(c => c.id === orderClaims[0].customer_id) : null;
                  return customer && (
                    <div className="mt-1 text-sm text-white/60">
                      <p>{customer.name}</p>
                      {customer.email && <p className="text-xs text-white/40">{customer.email}</p>}
                    </div>
                  );
                })()}
              </div>
              <button
                onClick={() => setViewingOrderClaims(null)}
                className="text-white/60 hover:text-white text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Order Summary */}
            {(() => {
              const orderClaims = preorderClaims.filter(c => c.preorder_order_id === viewingOrderClaims);
              const paidCount = orderClaims.filter(c => c.is_paid).length;
              const unpaidClaims = orderClaims.filter(c => !c.is_paid);
              const totalPaid = orderClaims.filter(c => c.is_paid).reduce((sum, c) => sum + (c.payment_amount_cents || 0), 0);
              const selectedInOrder = orderClaims.filter(c => selectedClaimsForPayment.has(c.id));
              const selectedTotal = selectedInOrder.reduce((sum, c) => {
                const preorderItem = preorderItems.find(pi => pi.id === c.preorder_item_id);
                const invItem = preorderItem ? inventory.find(i => i.id === preorderItem.inventory_item_id) : null;
                return sum + (invItem?.msrp_cents || 0);
              }, 0);
              
              return (
                <div className="mb-4 space-y-3">
                  <div className="rounded-lg border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-white/40">Total Items:</span>
                        <span className="font-semibold text-white">{orderClaims.length}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/40">Paid Items:</span>
                        <span className="font-semibold text-emerald-300">{paidCount}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-white/40">Total Deposits:</span>
                        <span className="font-semibold text-emerald-300">{formatCurrency(totalPaid)}</span>
                      </div>
                    </div>
                  </div>
                  
                  {unpaidClaims.length > 0 && (
                    <div className="flex items-center justify-between rounded-lg border border-accent/20 bg-accent/10 p-3">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => {
                            const newSelection = new Set(selectedClaimsForPayment);
                            unpaidClaims.forEach(c => newSelection.add(c.id));
                            setSelectedClaimsForPayment(newSelection);
                          }}
                          className="rounded-lg border border-accent/50 px-3 py-1.5 text-xs font-medium text-accent hover:bg-accent/20"
                        >
                          Select All Unpaid
                        </button>
                        {selectedInOrder.length > 0 && (
                          <>
                            <span className="text-sm text-white/60">
                              {selectedInOrder.length} selected
                            </span>
                            <span className="text-sm font-semibold text-accent">
                              {formatCurrency(selectedTotal)}
                            </span>
                          </>
                        )}
                      </div>
                      {selectedInOrder.length > 0 && (
                        <button
                          onClick={() => setShowPaymentModal(true)}
                          className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-sm font-semibold text-[#061012] hover:bg-accent/90"
                        >
                          <CreditCard size={14} />
                          Pay Selected
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}

            {/* List of items in the order */}
            <div className="space-y-2">
              {preorderClaims
                .filter(claim => claim.preorder_order_id === viewingOrderClaims)
                .map((claim) => {
                  const preorderItem = preorderItems.find(pi => pi.id === claim.preorder_item_id);
                  const invItem = preorderItem ? inventory.find(i => i.id === preorderItem.inventory_item_id) : null;
                  const isSelected = selectedClaimsForPayment.has(claim.id);
                  
                  return (
                    <div
                      key={claim.id}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {!claim.is_paid && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const newSelection = new Set(selectedClaimsForPayment);
                              if (e.target.checked) {
                                newSelection.add(claim.id);
                              } else {
                                newSelection.delete(claim.id);
                              }
                              setSelectedClaimsForPayment(newSelection);
                            }}
                            className="h-4 w-4 rounded border-white/20 bg-white/10 text-accent focus:ring-accent"
                          />
                        )}
                        <div 
                          className="flex items-center gap-4 flex-1 cursor-pointer hover:bg-white/5 -mx-4 -my-3 px-4 py-3 rounded-xl transition-colors"
                          onClick={() => {
                            setViewingOrderClaims(null);
                            if (preorderItem) {
                              setViewingItemClaims(preorderItem);
                            }
                          }}
                        >
                          <div className="flex-1">
                            <p className="font-medium">{invItem?.name || `Preorder Item #${claim.preorder_item_id}`}</p>
                            {invItem?.game_title && (
                              <p className="text-xs text-white/40">{invItem.game_title}</p>
                            )}
                          </div>
                          <span className="text-white/60">Qty: {claim.quantity_requested}</span>
                          {!claim.is_paid && invItem?.msrp_cents && (
                            <span className="text-white/60 text-xs">({formatCurrency(invItem.msrp_cents)})</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        {claim.is_paid ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300">
                            <DollarSign size={12} />
                            {formatCurrency(claim.payment_amount_cents)}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300">Unpaid</span>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setViewingOrderClaims(null);
                            setEditingClaim(claim);
                          }}
                          className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-xs text-white/80 hover:bg-white/5"
                        >
                          <Edit2 size={12} />
                          Edit
                        </button>
                      </div>
                    </div>
                  );
                })}
              {preorderClaims.filter(claim => claim.preorder_order_id === viewingOrderClaims).length === 0 && (
                <div className="text-center py-8 text-white/60">
                  No items found in this preorder.
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setViewingOrderClaims(null)}
                className="rounded-lg border border-white/10 px-6 py-2 text-white/80 hover:bg-white/5"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Payment Summary Bar */}
      {selectedClaimsForPayment.size > 0 && !showPaymentModal && (
        <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 transform">
          <div className="rounded-full border border-accent/30 bg-gradient-to-r from-accent to-indigo-500 px-6 py-4 shadow-2xl">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <CreditCard size={20} className="text-[#061012]" />
                <div className="text-[#061012]">
                  <p className="text-xs font-medium opacity-80">Selected for Payment</p>
                  <p className="text-lg font-bold">
                    {selectedClaimsForPayment.size} {selectedClaimsForPayment.size === 1 ? 'item' : 'items'}
                  </p>
                </div>
              </div>

              <div className="h-8 w-px bg-[#061012]/20"></div>

              <div className="text-[#061012]">
                <p className="text-xs font-medium opacity-80">Total Amount</p>
                <p className="text-lg font-bold">
                  {formatCurrency(
                    Array.from(selectedClaimsForPayment).reduce((sum, claimId) => {
                      const claim = preorderClaims.find(c => c.id === claimId);
                      if (!claim) return sum;
                      const preorderItem = preorderItems.find(pi => pi.id === claim.preorder_item_id);
                      const invItem = preorderItem ? inventory.find(i => i.id === preorderItem.inventory_item_id) : null;
                      return sum + (invItem?.msrp_cents || 0);
                    }, 0)
                  )}
                </p>
              </div>

              <button
                onClick={() => setShowPaymentModal(true)}
                className="ml-3 rounded-full bg-[#061012] px-6 py-2 font-semibold text-accent hover:bg-[#0a1a1f] transition-colors"
              >
                Process Payment
              </button>

              <button
                onClick={() => setSelectedClaimsForPayment(new Set())}
                className="ml-1 rounded-full p-2 text-[#061012] hover:bg-[#061012]/10 transition-colors"
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal for Multiple Items */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
            <h3 className="text-xl font-semibold text-white">Process Payment</h3>
            <p className="mt-1 text-sm text-white/60">Record payment for selected preorder items</p>

            {/* Selected Items Summary */}
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium text-white">Selected Items:</p>
              <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border border-white/10 bg-white/5 p-3">
                {Array.from(selectedClaimsForPayment).map(claimId => {
                  const claim = preorderClaims.find(c => c.id === claimId);
                  if (!claim) return null;
                  const preorderItem = preorderItems.find(pi => pi.id === claim.preorder_item_id);
                  const invItem = preorderItem ? inventory.find(i => i.id === preorderItem.inventory_item_id) : null;
                  const customer = customers.find(c => c.id === claim.customer_id);

                  return (
                    <div key={claimId} className="flex items-center justify-between rounded-lg bg-white/5 p-3">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-white">{invItem?.name || `Item #${claim.preorder_item_id}`}</p>
                        <p className="text-xs text-white/60">{customer?.name}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-semibold text-white">{formatCurrency(invItem?.msrp_cents || 0)}</span>
                        <button
                          type="button"
                          onClick={() => {
                            const newSelection = new Set(selectedClaimsForPayment);
                            newSelection.delete(claimId);
                            setSelectedClaimsForPayment(newSelection);
                          }}
                          className="text-white/40 hover:text-white"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total */}
              <div className="flex items-center justify-between rounded-lg border border-accent/20 bg-accent/10 p-4">
                <span className="text-base font-semibold text-white">Total Amount:</span>
                <span className="text-xl font-bold text-accent">
                  {formatCurrency(
                    Array.from(selectedClaimsForPayment).reduce((sum, claimId) => {
                      const claim = preorderClaims.find(c => c.id === claimId);
                      if (!claim) return sum;
                      const preorderItem = preorderItems.find(pi => pi.id === claim.preorder_item_id);
                      const invItem = preorderItem ? inventory.find(i => i.id === preorderItem.inventory_item_id) : null;
                      return sum + (invItem?.msrp_cents || 0);
                    }, 0)
                  )}
                </span>
              </div>
            </div>

            {/* Payment Form */}
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                const paymentMethod = formData.get('payment_method') as string;
                const paymentNotes = formData.get('payment_notes') as string;

                try {
                  // Calculate total amount for cash register
                  const totalAmount = Array.from(selectedClaimsForPayment).reduce((sum, claimId) => {
                    const claim = preorderClaims.find(c => c.id === claimId);
                    if (!claim) return sum;
                    const preorderItem = preorderItems.find(pi => pi.id === claim.preorder_item_id);
                    const invItem = preorderItem ? inventory.find(i => i.id === preorderItem.inventory_item_id) : null;
                    return sum + (invItem?.msrp_cents || 0);
                  }, 0);

                  // Process each payment
                  await Promise.all(
                    Array.from(selectedClaimsForPayment).map(claimId => {
                      const claim = preorderClaims.find(c => c.id === claimId);
                      if (!claim) return Promise.resolve();
                      
                      const preorderItem = preorderItems.find(pi => pi.id === claim.preorder_item_id);
                      const invItem = preorderItem ? inventory.find(i => i.id === preorderItem.inventory_item_id) : null;
                      const amount = invItem?.msrp_cents || 0;

                      return recordPaymentMutation.mutateAsync({
                        claimId: claimId,
                        payment: {
                          is_paid: true,
                          payment_amount_cents: amount,
                          payment_method: paymentMethod,
                          payment_notes: paymentNotes || undefined,
                        },
                      });
                    })
                  );

                  // If payment was in cash, record it in the cash register
                  if (paymentMethod === 'cash' && totalAmount > 0) {
                    const itemCount = selectedClaimsForPayment.size;
                    const customer = customers.find(c =>  {
                      const firstClaim = preorderClaims.find(claim => selectedClaimsForPayment.has(claim.id));
                      return firstClaim && c.id === firstClaim.customer_id;
                    });
                    const customerName = customer?.name || 'Customer';
                    
                    recordCashTransactionMutation.mutate({
                      type: 'sale',
                      amount_cents: totalAmount,
                      description: `Preorder payment from ${customerName} (${itemCount} item${itemCount > 1 ? 's' : ''})`,
                      reference_type: 'preorder',
                      reference_id: Array.from(selectedClaimsForPayment)[0],
                    });
                  }

                  // Clear selection and close modal
                  setSelectedClaimsForPayment(new Set());
                  setShowPaymentModal(false);
                  setCashTendered('');
                  setPaymentMethod('cash');
                } catch (error) {
                  console.error('Error processing payments:', error);
                  alert('Some payments failed to process. Please check and try again.');
                }
              }}
              className="mt-4 space-y-4"
            >
              <div>
                <label className="block text-sm text-white/60">Payment Method</label>
                <select
                  name="payment_method"
                  required
                  value={paymentMethod}
                  onChange={(e) => {
                    setPaymentMethod(e.target.value);
                    setCashTendered('');
                  }}
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20 [&>option]:bg-gray-900 [&>option]:text-white"
                >
                  <option value="cash" className="bg-gray-900 text-white">Cash</option>
                  <option value="credit_card" className="bg-gray-900 text-white">Credit Card</option>
                  <option value="debit_card" className="bg-gray-900 text-white">Debit Card</option>
                  <option value="store_credit" className="bg-gray-900 text-white">Store Credit</option>
                  <option value="check" className="bg-gray-900 text-white">Check</option>
                  <option value="other" className="bg-gray-900 text-white">Other</option>
                </select>
              </div>

              {/* Cash Tendered - Only show for cash payments */}
              {paymentMethod === 'cash' && (
                <>
                  <div>
                    <label className="block text-sm text-white/60">Cash Tendered</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={cashTendered}
                        onChange={(e) => setCashTendered(e.target.value)}
                        placeholder="0.00"
                        className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 pl-7 pr-3 py-2 text-white outline-none focus:border-white/20"
                      />
                    </div>
                  </div>

                  {/* Change Calculator */}
                  {cashTendered && parseFloat(cashTendered) > 0 && (
                    <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">Change Due:</span>
                        <span className="text-2xl font-bold text-emerald-300">
                          {(() => {
                            const total = Array.from(selectedClaimsForPayment).reduce((sum, claimId) => {
                              const claim = preorderClaims.find(c => c.id === claimId);
                              if (!claim) return sum;
                              const preorderItem = preorderItems.find(pi => pi.id === claim.preorder_item_id);
                              const invItem = preorderItem ? inventory.find(i => i.id === preorderItem.inventory_item_id) : null;
                              return sum + (invItem?.msrp_cents || 0);
                            }, 0);
                            const tendered = Math.round(parseFloat(cashTendered) * 100);
                            const change = Math.max(0, tendered - total);
                            return formatCurrency(change);
                          })()}
                        </span>
                      </div>
                      {(() => {
                        const total = Array.from(selectedClaimsForPayment).reduce((sum, claimId) => {
                          const claim = preorderClaims.find(c => c.id === claimId);
                          if (!claim) return sum;
                          const preorderItem = preorderItems.find(pi => pi.id === claim.preorder_item_id);
                          const invItem = preorderItem ? inventory.find(i => i.id === preorderItem.inventory_item_id) : null;
                          return sum + (invItem?.msrp_cents || 0);
                        }, 0);
                        const tendered = Math.round(parseFloat(cashTendered) * 100);
                        if (tendered < total) {
                          return (
                            <p className="mt-2 text-xs text-rose-300">
                              Insufficient payment: {formatCurrency(total - tendered)} short
                            </p>
                          );
                        }
                        return null;
                      })()}
                    </div>
                  )}
                </>
              )}

              <div>
                <label className="block text-sm text-white/60">Payment Notes (Optional)</label>
                <textarea
                  name="payment_notes"
                  rows={2}
                  placeholder="Optional notes about this payment..."
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setCashTendered('');
                    setPaymentMethod('cash');
                    setSelectedClaimsForPayment(new Set());
                  }}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-white/80 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={(() => {
                    if (recordPaymentMutation.isPending || selectedClaimsForPayment.size === 0) return true;
                    
                    // Validate sufficient cash for cash payments
                    if (paymentMethod === 'cash' && cashTendered) {
                      const total = Array.from(selectedClaimsForPayment).reduce((sum, claimId) => {
                        const claim = preorderClaims.find(c => c.id === claimId);
                        if (!claim) return sum;
                        const preorderItem = preorderItems.find(pi => pi.id === claim.preorder_item_id);
                        const invItem = preorderItem ? inventory.find(i => i.id === preorderItem.inventory_item_id) : null;
                        return sum + (invItem?.msrp_cents || 0);
                      }, 0);
                      const tendered = Math.round(parseFloat(cashTendered) * 100);
                      if (tendered < total) return true;
                    }
                    
                    return false;
                  })()}
                  className="flex-1 rounded-lg bg-accent px-4 py-2 font-semibold text-[#061012] hover:bg-accent/90 disabled:opacity-50"
                >
                  {recordPaymentMutation.isPending ? 'Processing...' : `Process Payment`}
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

