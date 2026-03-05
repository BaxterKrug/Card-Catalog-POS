import { useState } from "react";
import { DollarSign, TrendingUp, TrendingDown, Plus, Lock, Unlock, Calendar } from "lucide-react";
import {
  useCashRegisterSession,
  useOpenSession,
  useCloseSession,
  useCreateDeposit,
  useCashRegisterTransactions,
} from "../hooks/useCashRegister";

const CashRegisterPage = () => {
  const { data: session, isLoading, isError } = useCashRegisterSession();
  const { data: transactions = [] } = useCashRegisterTransactions(session?.id);
  const openSessionMutation = useOpenSession();
  const closeSessionMutation = useCloseSession();
  const createDepositMutation = useCreateDeposit();

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [depositNotes, setDepositNotes] = useState("");

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const handleOpenSession = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(openingBalance);
    if (isNaN(amount) || amount < 0) {
      alert("Please enter a valid amount");
      return;
    }

    openSessionMutation.mutate(
      {
        opening_balance_cents: Math.round(amount * 100),
        notes: openingNotes || undefined,
      },
      {
        onSuccess: () => {
          setShowOpenModal(false);
          setOpeningBalance("");
          setOpeningNotes("");
        },
      }
    );
  };

  const handleCreateDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    if (session && amount > session.current_balance_cents / 100) {
      alert("Cannot deposit more than the current register balance");
      return;
    }

    createDepositMutation.mutate(
      {
        amount_cents: Math.round(amount * 100),
        notes: depositNotes || undefined,
      },
      {
        onSuccess: () => {
          setShowDepositModal(false);
          setDepositAmount("");
          setDepositNotes("");
        },
      }
    );
  };

  const handleCloseSession = () => {
    if (confirm("Are you sure you want to close the current register session?")) {
      closeSessionMutation.mutate();
    }
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case "sale":
      case "starting_cash":
        return <TrendingUp size={16} className="text-emerald-400" />;
      case "buylist_payout":
      case "deposit":
        return <TrendingDown size={16} className="text-rose-400" />;
      default:
        return <DollarSign size={16} className="text-white/40" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-white/60">Loading cash register...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-rose-300">Error loading cash register</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Cash Register</h1>
          <p className="mt-1 text-sm text-white/60">Manage cash register sessions and deposits</p>
        </div>

        {!session && (
          <button
            onClick={() => setShowOpenModal(true)}
            className="flex items-center gap-2 rounded-xl bg-accent px-4 py-3 font-semibold text-[#061012] hover:bg-accent/90"
          >
            <Unlock size={20} />
            Open Register
          </button>
        )}

        {session && session.is_active && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowDepositModal(true)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white hover:bg-white/10"
            >
              <Plus size={20} />
              Make Deposit
            </button>
            <button
              onClick={handleCloseSession}
              className="flex items-center gap-2 rounded-xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 font-semibold text-rose-300 hover:bg-rose-500/20"
            >
              <Lock size={20} />
              Close Register
            </button>
          </div>
        )}
      </div>

      {/* Current Session Status */}
      {session ? (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/60">
                {session.is_active ? "Current Register Balance" : "Final Balance (Session Closed)"}
              </p>
              <p className="mt-1 text-4xl font-bold text-white">{formatCurrency(session.current_balance_cents)}</p>
              {session.notes && <p className="mt-2 text-sm text-white/60">{session.notes}</p>}
            </div>
            <div className="text-right">
              <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-2">
                <p className="text-xs text-white/40">Opening Balance</p>
                <p className="text-lg font-semibold text-white">{formatCurrency(session.opening_balance_cents)}</p>
              </div>
              <div className="mt-2 flex items-center justify-end gap-2 text-xs text-white/40">
                <Calendar size={12} />
                {formatDate(session.opened_at)}
              </div>
              {!session.is_active && session.closed_at && (
                <div className="mt-1 flex items-center justify-end gap-2 text-xs text-rose-300">
                  <Lock size={12} />
                  Closed: {formatDate(session.closed_at)}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-12 text-center">
          <Unlock size={48} className="mx-auto mb-4 text-white/20" />
          <h3 className="text-xl font-semibold text-white">No Active Session</h3>
          <p className="mt-2 text-sm text-white/60">Open a new register session to start tracking cash</p>
          <button
            onClick={() => setShowOpenModal(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 font-semibold text-[#061012] hover:bg-accent/90"
          >
            <Plus size={20} />
            Open Register
          </button>
        </div>
      )}

      {/* Transaction History */}
      {session && transactions.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="mb-4 text-lg font-semibold text-white">Transaction History</h2>
          <div className="space-y-2">
            {transactions.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center gap-4">
                  {getTransactionIcon(txn.transaction_type)}
                  <div>
                    <p className="font-medium text-white">{txn.description}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-white/40">
                      <Calendar size={12} />
                      {formatDate(txn.created_at)}
                    </div>
                    {txn.notes && <p className="mt-1 text-xs text-white/60">{txn.notes}</p>}
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-xl font-semibold ${
                      txn.amount_cents >= 0 ? "text-emerald-300" : "text-rose-300"
                    }`}
                  >
                    {txn.amount_cents >= 0 ? "+" : ""}
                    {formatCurrency(Math.abs(txn.amount_cents))}
                  </p>
                  <p className="text-xs text-white/40 capitalize">{txn.transaction_type.replace("_", " ")}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open Session Modal */}
      {showOpenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
            <h3 className="text-xl font-semibold text-white">Open Cash Register</h3>
            <p className="mt-1 text-sm text-white/60">Enter the starting cash amount for this session</p>

            <form onSubmit={handleOpenSession} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm text-white/60">Starting Cash Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={openingBalance}
                    onChange={(e) => setOpeningBalance(e.target.value)}
                    required
                    placeholder="0.00"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-7 pr-3 text-white outline-none focus:border-white/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/60">Notes (Optional)</label>
                <textarea
                  value={openingNotes}
                  onChange={(e) => setOpeningNotes(e.target.value)}
                  rows={2}
                  placeholder="Any notes about this session..."
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowOpenModal(false)}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-white/80 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={openSessionMutation.isPending}
                  className="flex-1 rounded-lg bg-accent px-4 py-2 font-semibold text-[#061012] hover:bg-accent/90 disabled:opacity-50"
                >
                  {openSessionMutation.isPending ? "Opening..." : "Open Register"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deposit Modal */}
      {showDepositModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
            <h3 className="text-xl font-semibold text-white">Make Cash Deposit</h3>
            <p className="mt-1 text-sm text-white/60">Remove cash from register to deposit at bank</p>

            {session && (
              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-white/40">Current Register Balance</p>
                <p className="text-lg font-semibold text-white">{formatCurrency(session.current_balance_cents)}</p>
              </div>
            )}

            <form onSubmit={handleCreateDeposit} className="mt-4 space-y-4">
              <div>
                <label className="block text-sm text-white/60">Deposit Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={session ? session.current_balance_cents / 100 : undefined}
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-7 pr-3 text-white outline-none focus:border-white/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/60">Notes (Optional)</label>
                <textarea
                  value={depositNotes}
                  onChange={(e) => setDepositNotes(e.target.value)}
                  rows={2}
                  placeholder="Deposit details..."
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDepositModal(false)}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-white/80 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createDepositMutation.isPending}
                  className="flex-1 rounded-lg bg-accent px-4 py-2 font-semibold text-[#061012] hover:bg-accent/90 disabled:opacity-50"
                >
                  {createDepositMutation.isPending ? "Processing..." : "Make Deposit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashRegisterPage;
