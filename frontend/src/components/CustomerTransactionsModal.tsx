import { useMemo, useState } from "react";
import { X, ShoppingCart, DollarSign, Loader2, Package, Calendar, User, CreditCard } from "lucide-react";
import { useOrders } from "../hooks/useOrders";
import { useBuylistTransactions } from "../hooks/useBuylist";
import { usePreorderClaims, usePreorderItems } from "../hooks/usePreorders";
import { useInventory } from "../hooks/useInventory";
import { useCustomers } from "../hooks/useCustomers";
import { type Order } from "../api/orders";
import { type PreorderClaim } from "../api/preorders";
import { type BuylistTransaction } from "../api/buylist";
import OrderDetailModal from "./OrderDetailModal";

interface CustomerTransactionsModalProps {
  customerId: number;
  customerName: string;
  onClose: () => void;
}

type Transaction = {
  id: number;
  type: "order" | "buylist" | "preorder";
  date: string;
  amount_cents: number;
  status?: string;
  payment_method?: string;
  notes?: string | null;
  productName?: string;
  isPaid?: boolean;
};

const CustomerTransactionsModal = ({ customerId, customerName, onClose }: CustomerTransactionsModalProps) => {
  const { data: allOrders = [], isLoading: ordersLoading } = useOrders();
  const { data: allBuylistTransactions = [], isLoading: buylistLoading } = useBuylistTransactions();
  const { data: allPreorderClaims = [], isLoading: preordersLoading } = usePreorderClaims();
  const { data: preorderItems = [] } = usePreorderItems();
  const { data: inventory = [] } = useInventory();
  const { data: customers = [] } = useCustomers();

  const [filter, setFilter] = useState<"all" | "orders" | "buylist" | "preorders">("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedPreorderClaim, setSelectedPreorderClaim] = useState<PreorderClaim | null>(null);
  const [selectedBuylistTxn, setSelectedBuylistTxn] = useState<BuylistTransaction | null>(null);

  // Filter orders for this customer
  const customerOrders = useMemo(() => {
    return allOrders.filter((order) => order.customer_id === customerId);
  }, [allOrders, customerId]);

  // Filter buylist transactions for this customer
  const customerBuylist = useMemo(() => {
    return allBuylistTransactions.filter((txn) => txn.customer_id === customerId);
  }, [allBuylistTransactions, customerId]);

  // Filter preorder claims for this customer
  const customerPreorders = useMemo(() => {
    return allPreorderClaims.filter((claim) => claim.customer_id === customerId);
  }, [allPreorderClaims, customerId]);

  // Helper to get product name for preorder
  const getPreorderProductName = (preorderItemId: number) => {
    const preorderItem = preorderItems.find((pi) => pi.id === preorderItemId);
    if (!preorderItem) return "Unknown Product";
    const invItem = inventory.find((i) => i.id === preorderItem.inventory_item_id);
    return invItem?.name || "Unknown Product";
  };

  // Combine and sort transactions
  const transactions = useMemo(() => {
    const combined: Transaction[] = [];

    if (filter === "all" || filter === "orders") {
      customerOrders.forEach((order) => {
        combined.push({
          id: order.id,
          type: "order",
          date: order.created_at,
          amount_cents: order.total_cents,
          status: order.status,
        });
      });
    }

    if (filter === "all" || filter === "buylist") {
      customerBuylist.forEach((txn) => {
        combined.push({
          id: txn.id,
          type: "buylist",
          date: txn.created_at,
          amount_cents: txn.amount_cents,
          payment_method: txn.payment_method,
          notes: txn.notes,
        });
      });
    }

    if (filter === "all" || filter === "preorders") {
      customerPreorders.forEach((claim) => {
        const preorderItem = preorderItems.find((pi) => pi.id === claim.preorder_item_id);
        const invItem = preorderItem ? inventory.find((i) => i.id === preorderItem.inventory_item_id) : null;
        combined.push({
          id: claim.id,
          type: "preorder",
          date: claim.created_at,
          amount_cents: claim.payment_amount_cents || invItem?.msrp_cents || 0,
          status: claim.is_paid ? "paid" : "unpaid",
          payment_method: claim.payment_method || undefined,
          notes: claim.payment_notes,
          productName: getPreorderProductName(claim.preorder_item_id),
          isPaid: claim.is_paid,
        });
      });
    }

    // Sort by date descending
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [customerOrders, customerBuylist, customerPreorders, filter, preorderItems, inventory]);

  // Calculate totals
  const totalSpent = useMemo(() => {
    return customerOrders
      .filter((order) => order.status !== "cancelled" && order.status !== "refunded")
      .reduce((sum, order) => sum + order.total_cents, 0);
  }, [customerOrders]);

  const totalCashReceived = useMemo(() => {
    return customerBuylist
      .filter((txn) => txn.payment_method?.toLowerCase() === "cash")
      .reduce((sum, txn) => sum + txn.amount_cents, 0);
  }, [customerBuylist]);

  const totalCreditReceived = useMemo(() => {
    return customerBuylist
      .filter((txn) => txn.payment_method?.toLowerCase() === "store_credit")
      .reduce((sum, txn) => sum + txn.amount_cents, 0);
  }, [customerBuylist]);

  // Calculate preorder totals
  const totalPreorderDeposits = useMemo(() => {
    return customerPreorders
      .filter((claim) => claim.is_paid)
      .reduce((sum, claim) => sum + (claim.payment_amount_cents || 0), 0);
  }, [customerPreorders]);

  const unpaidPreordersCount = useMemo(() => {
    return customerPreorders.filter((claim) => !claim.is_paid).length;
  }, [customerPreorders]);

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "draft":
        return "bg-gray-500/20 text-gray-300";
      case "open":
        return "bg-blue-500/20 text-blue-300";
      case "ready":
        return "bg-yellow-500/20 text-yellow-300";
      case "picked_up":
        return "bg-green-500/20 text-green-300";
      case "cancelled":
        return "bg-red-500/20 text-red-300";
      case "refunded":
        return "bg-orange-500/20 text-orange-300";
      default:
        return "bg-white/10 text-white/60";
    }
  };

  const handleOrderClick = (orderId: number) => {
    const order = customerOrders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrder(order);
    }
  };

  const handlePreorderClick = (claimId: number) => {
    const claim = customerPreorders.find(c => c.id === claimId);
    if (claim) {
      setSelectedPreorderClaim(claim);
    }
  };

  const handleBuylistClick = (txnId: number) => {
    const txn = customerBuylist.find(t => t.id === txnId);
    if (txn) {
      setSelectedBuylistTxn(txn);
    }
  };

  const isLoading = ordersLoading || buylistLoading || preordersLoading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 bg-[#0a0c12] shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 px-6 py-5">
          <div>
            <h2 className="text-2xl font-semibold text-white">{customerName}</h2>
            <p className="mt-1 text-sm text-white/60">Transaction history</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/60 transition hover:bg-white/5 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 border-b border-white/10 px-6 py-5 sm:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
              <ShoppingCart size={14} />
              Total Spent
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(totalSpent)}</p>
            <p className="mt-1 text-xs text-white/50">{customerOrders.length} orders</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
              <DollarSign size={14} />
              Cash Received
            </div>
            <p className="mt-2 text-2xl font-semibold text-green-400">{formatCurrency(totalCashReceived)}</p>
            <p className="mt-1 text-xs text-white/50">
              {customerBuylist.filter((t) => t.payment_method?.toLowerCase() === "cash").length} transactions
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
              <DollarSign size={14} />
              Credit Received
            </div>
            <p className="mt-2 text-2xl font-semibold text-blue-400">{formatCurrency(totalCreditReceived)}</p>
            <p className="mt-1 text-xs text-white/50">
              {customerBuylist.filter((t) => t.payment_method?.toLowerCase() === "store_credit").length} transactions
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
              <Package size={14} />
              Preorder Deposits
            </div>
            <p className="mt-2 text-2xl font-semibold text-purple-400">{formatCurrency(totalPreorderDeposits)}</p>
            <p className="mt-1 text-xs text-white/50">
              {customerPreorders.length} preorders{unpaidPreordersCount > 0 && ` (${unpaidPreordersCount} unpaid)`}
            </p>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-white/10 px-6 py-3">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === "all"
                ? "bg-accent text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            All ({transactions.length})
          </button>
          <button
            onClick={() => setFilter("orders")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === "orders"
                ? "bg-accent text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            Orders ({customerOrders.length})
          </button>
          <button
            onClick={() => setFilter("preorders")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === "preorders"
                ? "bg-accent text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            Preorders ({customerPreorders.length})
          </button>
          <button
            onClick={() => setFilter("buylist")}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              filter === "buylist"
                ? "bg-accent text-white"
                : "text-white/60 hover:bg-white/5 hover:text-white"
            }`}
          >
            Buylist ({customerBuylist.length})
          </button>
        </div>

        {/* Transaction List */}
        <div className="max-h-[400px] overflow-y-auto px-6 py-4">
          {isLoading && (
            <div className="flex items-center justify-center py-12 text-white/60">
              <Loader2 className="mr-3 h-5 w-5 animate-spin" />
              Loading transactions…
            </div>
          )}

          {!isLoading && transactions.length === 0 && (
            <div className="py-12 text-center text-sm text-white/60">
              No transactions found for this customer.
            </div>
          )}

          {!isLoading && transactions.length > 0 && (
            <div className="space-y-2">
              {transactions.map((txn) => (
                <div
                  key={`${txn.type}-${txn.id}`}
                  onClick={() => {
                    if (txn.type === "order") handleOrderClick(txn.id);
                    else if (txn.type === "preorder") handlePreorderClick(txn.id);
                    else if (txn.type === "buylist") handleBuylistClick(txn.id);
                  }}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10 cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`rounded-full p-2 ${
                        txn.type === "order" 
                          ? "bg-blue-500/20" 
                          : txn.type === "preorder"
                          ? "bg-purple-500/20"
                          : "bg-green-500/20"
                      }`}
                    >
                      {txn.type === "order" ? (
                        <ShoppingCart size={16} className="text-blue-300" />
                      ) : txn.type === "preorder" ? (
                        <Package size={16} className="text-purple-300" />
                      ) : (
                        <DollarSign size={16} className="text-green-300" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-white">
                          {txn.type === "order" 
                            ? `Order #${txn.id}` 
                            : txn.type === "preorder"
                            ? txn.productName || `Preorder #${txn.id}`
                            : `Buylist #${txn.id}`}
                        </p>
                        {txn.type === "preorder" && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              txn.isPaid
                                ? "bg-emerald-500/20 text-emerald-300"
                                : "bg-amber-500/20 text-amber-300"
                            }`}
                          >
                            {txn.isPaid ? "Paid" : "Unpaid"}
                          </span>
                        )}
                        {txn.type !== "preorder" && txn.status && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(
                              txn.status
                            )}`}
                          >
                            {txn.status}
                          </span>
                        )}
                        {txn.type === "buylist" && txn.payment_method && (
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              txn.payment_method.toLowerCase() === "cash"
                                ? "bg-green-500/20 text-green-300"
                                : "bg-blue-500/20 text-blue-300"
                            }`}
                          >
                            {txn.payment_method.toLowerCase() === "cash" ? "Cash" : "Store Credit"}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-white/50">{formatDate(txn.date)}</p>
                      {txn.notes && <p className="mt-1 text-xs text-white/40 italic">{txn.notes}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-semibold ${
                        txn.type === "order" 
                          ? "text-white" 
                          : txn.type === "preorder"
                          ? "text-purple-400"
                          : "text-green-400"
                      }`}
                    >
                      {txn.type === "buylist" && "+"}
                      {txn.type === "preorder" && txn.isPaid && "−"}
                      {formatCurrency(txn.amount_cents)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full rounded-full border border-white/10 py-2 text-sm font-medium text-white/60 transition hover:border-accent hover:text-accent"
          >
            Close
          </button>
        </div>
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      )}

      {/* Preorder Claim Detail Modal */}
      {selectedPreorderClaim && (() => {
        const preorderItem = preorderItems.find(pi => pi.id === selectedPreorderClaim.preorder_item_id);
        const invItem = preorderItem ? inventory.find(i => i.id === preorderItem.inventory_item_id) : null;
        const customer = customers.find(c => c.id === selectedPreorderClaim.customer_id);
        
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
            <div className="relative w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-[#0a0c12]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500">
                    <Package size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Preorder #{selectedPreorderClaim.id}</h2>
                    <p className="text-xs text-white/60">Preorder claim details</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPreorderClaim(null)}
                  className="rounded-full border border-white/10 p-2 text-white/60 transition hover:border-accent hover:text-accent"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Product Info */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40 mb-2">
                    <Package size={14} />
                    Product
                  </div>
                  <p className="text-xl font-semibold text-white">
                    {invItem?.name || `Item #${selectedPreorderClaim.preorder_item_id}`}
                  </p>
                  {invItem?.game_title && (
                    <p className="text-sm text-white/60 mt-1">{invItem.game_title}</p>
                  )}
                  <p className="text-sm text-white/40 mt-2">
                    Qty: {selectedPreorderClaim.quantity_requested}
                    {selectedPreorderClaim.quantity_allocated > 0 && (
                      <span className="ml-2 text-emerald-400">
                        ({selectedPreorderClaim.quantity_allocated} allocated)
                      </span>
                    )}
                  </p>
                </div>

                {/* Order Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
                      <User size={14} />
                      Customer
                    </div>
                    <p className="mt-1 text-lg font-medium text-white">
                      {customer?.name || customerName}
                    </p>
                    {customer?.email && (
                      <p className="text-sm text-white/60">{customer.email}</p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
                      <Calendar size={14} />
                      Created
                    </div>
                    <p className="mt-1 text-lg font-medium text-white">
                      {new Date(selectedPreorderClaim.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-white/60">
                      {new Date(selectedPreorderClaim.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Payment Info */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40 mb-3">
                    <CreditCard size={14} />
                    Payment Status
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-semibold ${
                          selectedPreorderClaim.is_paid
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        {selectedPreorderClaim.is_paid ? "Paid" : "Unpaid"}
                      </span>
                      {selectedPreorderClaim.payment_method && (
                        <span className="ml-2 text-sm text-white/60">
                          via {selectedPreorderClaim.payment_method.replace("_", " ")}
                        </span>
                      )}
                    </div>
                    {selectedPreorderClaim.is_paid && selectedPreorderClaim.payment_amount_cents && (
                      <p className="text-2xl font-semibold text-emerald-400">
                        {formatCurrency(selectedPreorderClaim.payment_amount_cents)}
                      </p>
                    )}
                    {!selectedPreorderClaim.is_paid && invItem?.msrp_cents && (
                      <p className="text-2xl font-semibold text-white/60">
                        {formatCurrency(invItem.msrp_cents)}
                      </p>
                    )}
                  </div>
                  {selectedPreorderClaim.payment_date && (
                    <p className="mt-2 text-sm text-white/50">
                      Paid on {new Date(selectedPreorderClaim.payment_date).toLocaleDateString()}
                    </p>
                  )}
                  {selectedPreorderClaim.payment_notes && (
                    <p className="mt-2 text-sm text-white/40 italic">
                      {selectedPreorderClaim.payment_notes}
                    </p>
                  )}
                </div>

                {/* Status */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.3em] text-white/40 mb-2">Status</div>
                  <span className={`inline-block rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(selectedPreorderClaim.status)}`}>
                    {selectedPreorderClaim.status}
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="border-t border-white/10 px-6 py-4">
                <button
                  onClick={() => setSelectedPreorderClaim(null)}
                  className="w-full rounded-full border border-white/10 py-2 text-sm font-medium text-white/60 transition hover:border-accent hover:text-accent"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Buylist Transaction Detail Modal */}
      {selectedBuylistTxn && (() => {
        const customer = customers.find(c => c.id === selectedBuylistTxn.customer_id);
        
        const getPaymentMethodLabel = (method: string) => {
          switch (method.toLowerCase()) {
            case "cash": return "Cash";
            case "store_credit": return "Store Credit";
            case "cashapp": return "CashApp";
            case "venmo": return "Venmo";
            default: return method;
          }
        };

        const getPaymentMethodColor = (method: string) => {
          switch (method.toLowerCase()) {
            case "cash": return "bg-green-500/20 text-green-300";
            case "store_credit": return "bg-blue-500/20 text-blue-300";
            case "cashapp": return "bg-emerald-500/20 text-emerald-300";
            case "venmo": return "bg-cyan-500/20 text-cyan-300";
            default: return "bg-white/10 text-white/60";
          }
        };
        
        return (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4">
            <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#0a0c12]">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500">
                    <DollarSign size={20} className="text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Buylist #{selectedBuylistTxn.id}</h2>
                    <p className="text-xs text-white/60">Buylist transaction details</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedBuylistTxn(null)}
                  className="rounded-full border border-white/10 p-2 text-white/60 transition hover:border-accent hover:text-accent"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-6">
                {/* Amount */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-center">
                  <div className="text-xs uppercase tracking-[0.3em] text-white/40 mb-2">Amount Paid</div>
                  <p className="text-3xl font-bold text-green-400">
                    {formatCurrency(selectedBuylistTxn.amount_cents)}
                  </p>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
                      <User size={14} />
                      Customer
                    </div>
                    <p className="mt-1 text-lg font-medium text-white">
                      {customer?.name || customerName}
                    </p>
                    {customer?.email && (
                      <p className="text-sm text-white/60">{customer.email}</p>
                    )}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
                      <Calendar size={14} />
                      Date
                    </div>
                    <p className="mt-1 text-lg font-medium text-white">
                      {new Date(selectedBuylistTxn.created_at).toLocaleDateString()}
                    </p>
                    <p className="text-sm text-white/60">
                      {new Date(selectedBuylistTxn.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40 mb-3">
                    <CreditCard size={14} />
                    Payment Method
                  </div>
                  <span className={`inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold ${getPaymentMethodColor(selectedBuylistTxn.payment_method)}`}>
                    {getPaymentMethodLabel(selectedBuylistTxn.payment_method)}
                  </span>
                </div>

                {/* Notes */}
                {selectedBuylistTxn.notes && (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <div className="text-xs uppercase tracking-[0.3em] text-white/40 mb-2">Notes</div>
                    <p className="text-white/80">{selectedBuylistTxn.notes}</p>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="border-t border-white/10 px-6 py-4">
                <button
                  onClick={() => setSelectedBuylistTxn(null)}
                  className="w-full rounded-full border border-white/10 py-2 text-sm font-medium text-white/60 transition hover:border-accent hover:text-accent"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default CustomerTransactionsModal;
