import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, DollarSign, CreditCard, User, Calendar, Search, X } from "lucide-react";
import { useCustomers } from "../hooks/useCustomers";
import { useBuylistTransactions } from "../hooks/useBuylist";
import { createBuylistTransaction, CreateBuylistTransactionPayload } from "../api/buylist";

const BuylistPage = () => {
  const queryClient = useQueryClient();
  const { data: customers = [] } = useCustomers();
  const { data: transactions = [], isLoading, isError } = useBuylistTransactions();

  const [showNewTransaction, setShowNewTransaction] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "store_credit">("cash");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const createMutation = useMutation({
    mutationFn: createBuylistTransaction,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["buylist"] });
      setShowNewTransaction(false);
      setSelectedCustomerId(null);
      setAmount("");
      setNotes("");
      setError(null);
    },
    onError: (err: any) => {
      const message = err?.response?.data?.detail || err?.message || "Failed to create transaction";
      setError(message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedCustomerId) {
      setError("Please select a customer");
      return;
    }

    const amountValue = parseFloat(amount);
    if (isNaN(amountValue) || amountValue <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    createMutation.mutate({
      customer_id: selectedCustomerId,
      amount_cents: Math.round(amountValue * 100),
      payment_method: paymentMethod,
      notes: notes || undefined,
    });
  };

  const getCustomerName = (customerId: number) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || `Customer #${customerId}`;
  };

  const filteredTransactions = transactions.filter((txn) => {
    if (!searchTerm) return true;
    const customerName = getCustomerName(txn.customer_id).toLowerCase();
    const search = searchTerm.toLowerCase();
    return customerName.includes(search) || txn.id.toString().includes(search);
  });

  const totalCashPaid = transactions
    .filter((t) => t.payment_method === "cash")
    .reduce((sum, t) => sum + t.amount_cents, 0);

  const totalCreditGiven = transactions
    .filter((t) => t.payment_method === "store_credit")
    .reduce((sum, t) => sum + t.amount_cents, 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Buylist</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Buy Singles from Community</h1>
          <p className="mt-1 text-sm text-white/60">Track cash and store credit given for singles purchases.</p>
        </div>
        <button
          onClick={() => setShowNewTransaction(true)}
          className="flex items-center gap-2 rounded-full border border-accent bg-accent/10 px-4 py-2 text-sm font-medium text-accent hover:bg-accent/20"
        >
          <Plus size={16} />
          New Transaction
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-green-500/10 to-emerald-500/10 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-green-500/20 p-3">
              <DollarSign size={24} className="text-green-400" />
            </div>
            <div>
              <p className="text-sm text-white/60">Total Cash Paid</p>
              <p className="text-2xl font-bold text-white">${(totalCashPaid / 100).toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-purple-500/20 p-3">
              <CreditCard size={24} className="text-purple-400" />
            </div>
            <div>
              <p className="text-sm text-white/60">Total Store Credit Given</p>
              <p className="text-2xl font-bold text-white">${(totalCreditGiven / 100).toFixed(2)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by customer name or transaction #..."
          className="w-full rounded-2xl border border-white/10 bg-[#080b12] py-3 pl-12 pr-4 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
        />
      </div>

      {/* Transactions List */}
      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        <h2 className="mb-4 text-lg font-semibold text-white">Recent Transactions</h2>

        {isLoading && (
          <div className="flex items-center justify-center py-12 text-white/60">
            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
            Loading transactions…
          </div>
        )}

        {isError && !isLoading && (
          <div className="py-8 text-center text-sm text-rose-200">
            Could not load transactions. Please try again.
          </div>
        )}

        {!isLoading && !isError && filteredTransactions.length === 0 && (
          <div className="py-8 text-center text-sm text-white/60">
            {searchTerm ? "No transactions match your search." : "No transactions yet. Click 'New Transaction' to record a purchase."}
          </div>
        )}

        {!isLoading && !isError && filteredTransactions.length > 0 && (
          <div className="space-y-3">
            {filteredTransactions.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <User size={16} className="text-white/40" />
                    <p className="font-medium text-white">{getCustomerName(txn.customer_id)}</p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        txn.payment_method === "cash"
                          ? "bg-green-500/20 text-green-300"
                          : "bg-purple-500/20 text-purple-300"
                      }`}
                    >
                      {txn.payment_method === "cash" ? "Cash" : "Store Credit"}
                    </span>
                  </div>
                  {txn.notes && <p className="mt-1 text-sm text-white/50">{txn.notes}</p>}
                  <div className="mt-1 flex items-center gap-2 text-xs text-white/40">
                    <Calendar size={14} />
                    {new Date(txn.created_at).toLocaleDateString()} at{" "}
                    {new Date(txn.created_at).toLocaleTimeString()}
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xl font-semibold text-white">${(txn.amount_cents / 100).toFixed(2)}</p>
                  <p className="text-xs text-white/40">Transaction #{txn.id}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Transaction Modal */}
      {showNewTransaction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-[#0a0c12] p-6">
            <div className="mb-6 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-white">New Singles Purchase</h2>
              <button
                onClick={() => {
                  setShowNewTransaction(false);
                  setError(null);
                }}
                className="text-white/60 hover:text-white"
              >
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-2 block text-sm text-white/70">
                  <span className="text-xs uppercase tracking-[0.3em] text-white/40">Customer</span>
                </label>
                <select
                  value={selectedCustomerId || ""}
                  onChange={(e) => setSelectedCustomerId(Number(e.target.value))}
                  className="w-full rounded-2xl border border-white/10 bg-[#080b12] px-4 py-3 text-white focus:border-accent focus:outline-none"
                  required
                >
                  <option value="">Select a customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name}
                      {customer.email && ` (${customer.email})`}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  <span className="text-xs uppercase tracking-[0.3em] text-white/40">Amount</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/60">$</span>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="w-full rounded-2xl border border-white/10 bg-[#080b12] py-3 pl-8 pr-4 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  <span className="text-xs uppercase tracking-[0.3em] text-white/40">Payment Method</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                      paymentMethod === "cash"
                        ? "border-accent bg-accent/20 text-accent"
                        : "border-white/10 bg-white/5 text-white/80 hover:border-white/20"
                    }`}
                  >
                    <DollarSign size={16} className="mx-auto mb-1" />
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("store_credit")}
                    className={`rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                      paymentMethod === "store_credit"
                        ? "border-accent bg-accent/20 text-accent"
                        : "border-white/10 bg-white/5 text-white/80 hover:border-white/20"
                    }`}
                  >
                    <CreditCard size={16} className="mx-auto mb-1" />
                    Store Credit
                  </button>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm text-white/70">
                  <span className="text-xs uppercase tracking-[0.3em] text-white/40">Notes (Optional)</span>
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add any notes about the purchase..."
                  rows={3}
                  className="w-full rounded-2xl border border-white/10 bg-[#080b12] px-4 py-3 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                />
              </div>

              {error && (
                <div className="rounded-xl border border-rose-400/20 bg-rose-500/10 p-4">
                  <p className="text-sm text-rose-200">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewTransaction(false);
                    setError(null);
                  }}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-white/80 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 rounded-lg bg-accent px-4 py-2 font-semibold text-[#061012] hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {createMutation.isPending ? "Recording..." : "Record Purchase"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BuylistPage;
