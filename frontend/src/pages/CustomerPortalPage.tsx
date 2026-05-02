import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Wallet, Search, Loader2, TrendingUp, TrendingDown, Store } from "lucide-react";
import { fetchCustomers, type Customer } from "../api/customers";
import { getStoreCreditBalance, getStoreCreditHistory, type StoreCreditTransaction } from "../api/storeCredit";

const CustomerPortalPage = () => {
  const [searchValue, setSearchValue] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Fetch all customers (for lookup)
  const { data: customers = [] } = useQuery({
    queryKey: ["customers"],
    queryFn: fetchCustomers,
  });

  // Fetch balance when customer is selected
  const { data: balance, isLoading: balanceLoading } = useQuery({
    queryKey: ["store-credit-balance", selectedCustomer?.id],
    queryFn: () => getStoreCreditBalance(selectedCustomer!.id),
    enabled: !!selectedCustomer,
  });

  // Fetch transaction history when customer is selected
  const { data: history = [], isLoading: historyLoading } = useQuery({
    queryKey: ["store-credit-history", selectedCustomer?.id],
    queryFn: () => getStoreCreditHistory(selectedCustomer!.id, 20),
    enabled: !!selectedCustomer,
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
    });
  };

  const formatTransactionType = (type: string) => {
    return type.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
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

  const handleSearch = () => {
    if (!searchValue.trim()) return;

    // Search by phone or email
    const found = customers.find(
      (c) =>
        c.phone?.toLowerCase() === searchValue.toLowerCase() ||
        c.email?.toLowerCase() === searchValue.toLowerCase()
    );

    if (found) {
      setSelectedCustomer(found);
    } else {
      alert("No customer found with that phone number or email. Please check and try again.");
    }
  };

  const handleReset = () => {
    setSearchValue("");
    setSelectedCustomer(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a0c12] via-[#0f1117] to-[#0a0c12]">
      <div className="mx-auto max-w-2xl px-4 py-12">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full border-2 border-accent/30 bg-accent/10 p-4">
              <Store size={40} className="text-accent" />
            </div>
          </div>
          <h1 className="text-4xl font-bold text-white">Customer Portal</h1>
          <p className="mt-2 text-lg text-white/60">Check your store credit balance</p>
        </div>

        {!selectedCustomer ? (
          /* Search Form */
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-sm">
            <h2 className="mb-6 text-xl font-semibold text-white">Look Up Your Account</h2>
            <p className="mb-6 text-sm text-white/60">
              Enter your phone number or email address to view your store credit balance and transaction history.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/80">Phone or Email</label>
                <input
                  type="text"
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  placeholder="555-1234 or you@example.com"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-[#080b12] px-4 py-4 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                />
              </div>

              <button
                onClick={handleSearch}
                disabled={!searchValue.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-accent to-indigo-500 px-6 py-4 font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Search size={20} />
                Look Up Account
              </button>
            </div>

            <div className="mt-6 rounded-xl border border-blue-500/20 bg-blue-500/10 p-4">
              <p className="text-xs text-blue-200">
                💡 <strong>Tip:</strong> Make sure to enter the same phone number or email you provided when making
                purchases at the store.
              </p>
            </div>
          </div>
        ) : (
          /* Account Details */
          <div className="space-y-6">
            {/* Customer Info Card */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm">
              <div className="mb-4">
                <h2 className="text-2xl font-bold text-white">{selectedCustomer.name}</h2>
                {selectedCustomer.email && <p className="text-sm text-white/60">{selectedCustomer.email}</p>}
                {selectedCustomer.phone && <p className="text-sm text-white/60">{selectedCustomer.phone}</p>}
              </div>

              {/* Balance */}
              {balanceLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="animate-spin text-accent" size={32} />
                </div>
              ) : (
                <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Wallet size={32} className="text-emerald-400" />
                      <div>
                        <p className="text-sm text-emerald-200">Store Credit Balance</p>
                        <p className="text-4xl font-bold text-emerald-400">
                          {formatCurrency(balance?.balance_cents || 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                  {balance && balance.balance_cents > 0 && (
                    <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                      <p className="text-xs text-emerald-200">
                        ✨ You can use this credit on your next purchase at checkout!
                      </p>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleReset}
                className="mt-4 w-full rounded-2xl border border-white/10 px-4 py-3 text-sm text-white/80 hover:bg-white/5"
              >
                Look Up Different Account
              </button>
            </div>

            {/* Transaction History */}
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur-sm">
              <h3 className="mb-4 text-lg font-semibold text-white">Recent Transactions</h3>

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
                      className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div className="flex-shrink-0">{getTransactionIcon(txn)}</div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">
                            {formatTransactionType(txn.transaction_type)}
                          </span>
                        </div>
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

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-white/40">
          <p>Questions? Visit us in store or contact our team.</p>
        </div>
      </div>
    </div>
  );
};

export default CustomerPortalPage;
