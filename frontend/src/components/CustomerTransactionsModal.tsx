import { useEffect, useMemo, useState } from "react";
import { X, ShoppingCart, DollarSign, Loader2, ArrowUpRight, Package } from "lucide-react";
import { useOrders } from "../hooks/useOrders";
import { useBuylistTransactions } from "../hooks/useBuylist";
import { usePreorderClaims, usePreorderItems } from "../hooks/usePreorders";
import { useInventory } from "../hooks/useInventory";
import { useNavigate } from "react-router-dom";

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
  const navigate = useNavigate();
  const { data: allOrders = [], isLoading: ordersLoading } = useOrders();
  const { data: allBuylistTransactions = [], isLoading: buylistLoading } = useBuylistTransactions();
  const { data: allPreorderClaims = [], isLoading: preordersLoading } = usePreorderClaims();
  const { data: preorderItems = [] } = usePreorderItems();
  const { data: inventory = [] } = useInventory();

  const [filter, setFilter] = useState<"all" | "orders" | "buylist" | "preorders">("all");

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
      .filter((txn) => txn.payment_method === "cash")
      .reduce((sum, txn) => sum + txn.amount_cents, 0);
  }, [customerBuylist]);

  const totalCreditReceived = useMemo(() => {
    return customerBuylist
      .filter((txn) => txn.payment_method === "store_credit")
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

  const handleViewAllOrders = () => {
    navigate(`/orders?customer=${customerId}`);
    onClose();
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
              {customerBuylist.filter((t) => t.payment_method === "cash").length} transactions
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
              <DollarSign size={14} />
              Credit Received
            </div>
            <p className="mt-2 text-2xl font-semibold text-blue-400">{formatCurrency(totalCreditReceived)}</p>
            <p className="mt-1 text-xs text-white/50">
              {customerBuylist.filter((t) => t.payment_method === "store_credit").length} transactions
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
          <div className="ml-auto">
            <button
              onClick={handleViewAllOrders}
              className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 hover:border-accent hover:text-accent"
            >
              View in Orders <ArrowUpRight size={14} />
            </button>
          </div>
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
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 transition hover:bg-white/10"
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
                              txn.payment_method === "cash"
                                ? "bg-green-500/20 text-green-300"
                                : "bg-blue-500/20 text-blue-300"
                            }`}
                          >
                            {txn.payment_method === "cash" ? "Cash" : "Store Credit"}
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
    </div>
  );
};

export default CustomerTransactionsModal;
