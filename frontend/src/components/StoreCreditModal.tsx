import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Wallet, Plus, TrendingUp, TrendingDown, DollarSign, ArrowRight, Loader2 } from "lucide-react";
import {
  getStoreCreditBalance,
  getStoreCreditHistory,
  addStoreCredit,
  adjustStoreCredit,
  type StoreCreditTransaction,
} from "../api/storeCredit";

interface StoreCreditModalProps {
  customerId: number;
  customerName: string;
  onClose: () => void;
}

const StoreCreditModal = ({ customerId, customerName, onClose }: StoreCreditModalProps) => {
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [amount, setAmount] = useState("");
  const [transactionType, setTransactionType] = useState<string>("gift_card");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Fetch balance and history
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ["store-credit-balance", customerId],
    queryFn: () => getStoreCreditBalance(customerId),
  });

  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["store-credit-history", customerId],
    queryFn: () => getStoreCreditHistory(customerId, 50),
  });

  const addCreditMutation = useMutation({
    mutationFn: (data: { amount_cents: number; transaction_type: string; notes?: string }) =>
      addStoreCredit(customerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-credit-balance", customerId] });
      queryClient.invalidateQueries({ queryKey: ["store-credit-history", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setShowAddForm(false);
      setAmount("");
      setNotes("");
      setError(null);
    },
    onError: (error: any) => {
      setError(error.response?.data?.detail || "Failed to add credit");
    },
  });

  const adjustCreditMutation = useMutation({
    mutationFn: (data: { amount_cents: number; notes: string }) =>
      adjustStoreCredit(customerId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["store-credit-balance", customerId] });
      queryClient.invalidateQueries({ queryKey: ["store-credit-history", customerId] });
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setShowAddForm(false);
      setAmount("");
      setNotes("");
      setError(null);
    },
    onError: (error: any) => {
      setError(error.response?.data?.detail || "Failed to adjust credit");
    },
  });

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

  const formatTransactionType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const handleAddCredit = () => {
    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    if (transactionType === "manual_adjustment") {
      // For manual adjustments, require notes
      if (!notes || notes.trim().length < 3) {
        setError("Notes are required for manual adjustments");
        return;
      }

      adjustCreditMutation.mutate({
        amount_cents: Math.round(amountValue * 100),
        notes: notes.trim(),
      });
    } else {
      addCreditMutation.mutate({
        amount_cents: Math.round(amountValue * 100),
        transaction_type: transactionType,
        notes: notes.trim() || undefined,
      });
    }
  };

  const getTransactionIcon = (txn: StoreCreditTransaction) => {
    if (txn.amount_cents > 0) {
      return <TrendingUp size={16} className="text-emerald-400" />;
    } else {
      return <TrendingDown size={16} className="text-rose-400" />;
    }
  };

  const getTransactionColor = (txn: StoreCreditTransaction) => {
    if (txn.amount_cents > 0) {
      return "text-emerald-400";
    } else {
      return "text-rose-400";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0a0c12]">
        {/* Header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Store Credit</p>
            <h2 className="text-2xl font-semibold text-white">{customerName}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">
          {balanceLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="animate-spin text-white/40" size={32} />
            </div>
          ) : (
            <div className="space-y-6">
              {/* Balance Card */}
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Wallet size={32} className="text-emerald-400" />
                    <div>
                      <p className="text-sm text-emerald-200">Current Balance</p>
                      <p className="text-4xl font-bold text-emerald-400">
                        {formatCurrency(balance?.balance_cents || 0)}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowAddForm(!showAddForm)}
                    className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-500/30"
                  >
                    <Plus size={16} />
                    Add Credit
                  </button>
                </div>
              </div>

              {/* Add Credit Form */}
              {showAddForm && (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
                  <h3 className="mb-4 text-lg font-semibold text-white">Add Store Credit</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm text-white/60">Transaction Type</label>
                      <select
                        value={transactionType}
                        onChange={(e) => setTransactionType(e.target.value)}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#080b12] px-4 py-3 text-white focus:border-accent focus:outline-none"
                      >
                        <option value="gift_card">Gift Card</option>
                        <option value="promotional">Promotional Credit</option>
                        <option value="manual_adjustment">Manual Adjustment</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm text-white/60">Amount</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span>
                        <input
                          type="number"
                          value={amount}
                          onChange={(e) => {
                            setAmount(e.target.value);
                            setError(null);
                          }}
                          placeholder="0.00"
                          step="0.01"
                          min="0"
                          className="mt-1 w-full rounded-xl border border-white/10 bg-[#080b12] py-3 pl-8 pr-4 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm text-white/60">
                        Notes {transactionType === "manual_adjustment" && <span className="text-rose-300">*</span>}
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => {
                          setNotes(e.target.value);
                          setError(null);
                        }}
                        placeholder={
                          transactionType === "manual_adjustment"
                            ? "Required: Explain the reason for this adjustment..."
                            : "Optional notes..."
                        }
                        rows={3}
                        className="mt-1 w-full rounded-xl border border-white/10 bg-[#080b12] px-4 py-3 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                      />
                    </div>

                    {error && (
                      <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                        {error}
                      </div>
                    )}

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          setShowAddForm(false);
                          setAmount("");
                          setNotes("");
                          setError(null);
                        }}
                        className="flex-1 rounded-xl border border-white/10 px-4 py-3 text-white/80 hover:bg-white/5"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleAddCredit}
                        disabled={addCreditMutation.isPending || adjustCreditMutation.isPending}
                        className="flex-1 rounded-xl bg-gradient-to-r from-accent to-indigo-500 px-4 py-3 text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {addCreditMutation.isPending || adjustCreditMutation.isPending ? (
                          <span className="flex items-center justify-center gap-2">
                            <Loader2 className="animate-spin" size={16} />
                            Adding...
                          </span>
                        ) : (
                          "Add Credit"
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Transaction History */}
              <div>
                <h3 className="mb-3 text-sm uppercase tracking-[0.3em] text-white/40">Transaction History</h3>
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="animate-spin text-white/40" size={24} />
                  </div>
                ) : history.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
                    <Wallet size={32} className="mx-auto mb-2 text-white/20" />
                    <p className="text-sm text-white/40">No transactions yet</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {history.map((txn) => (
                      <div
                        key={txn.id}
                        className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3 hover:bg-white/10"
                      >
                        <div className="flex-shrink-0">{getTransactionIcon(txn)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-white">
                              {formatTransactionType(txn.transaction_type)}
                            </span>
                            {txn.reference_type && (
                              <span className="text-xs text-white/40">
                                {txn.reference_type} #{txn.reference_id}
                              </span>
                            )}
                          </div>
                          {txn.notes && <p className="mt-1 text-xs text-white/60">{txn.notes}</p>}
                          <p className="mt-1 text-xs text-white/40">{formatDate(txn.created_at)}</p>
                        </div>
                        <div className={`text-lg font-bold ${getTransactionColor(txn)}`}>
                          {txn.amount_cents > 0 ? "+" : ""}
                          {formatCurrency(Math.abs(txn.amount_cents))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 px-6 py-2 text-sm text-white/80 hover:border-white/20"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default StoreCreditModal;
