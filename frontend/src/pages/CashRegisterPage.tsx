import { useState } from "react";
import { DollarSign, TrendingUp, TrendingDown, Plus, Lock, Unlock, Calendar } from "lucide-react";
import {
  useCashRegisterSession,
  useOpenSession,
  useCloseSession,
  useCreateDeposit,
  useCreateAdjustment,
  useCashRegisterTransactions,
} from "../hooks/useCashRegister";

const CashRegisterPage = () => {
  const { data: session, isLoading, isError } = useCashRegisterSession();
  const { data: transactions = [] } = useCashRegisterTransactions(session?.id);
  const openSessionMutation = useOpenSession();
  const closeSessionMutation = useCloseSession();
  const createDepositMutation = useCreateDeposit();
  const createAdjustmentMutation = useCreateAdjustment();

  const [showOpenModal, setShowOpenModal] = useState(false);
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  // Bill counts for opening balance
  const [count100s, setCount100s] = useState("");
  const [count50s, setCount50s] = useState("");
  const [count20s, setCount20s] = useState("");
  const [count10s, setCount10s] = useState("");
  const [count5s, setCount5s] = useState("");
  const [count2s, setCount2s] = useState("");
  const [count1s, setCount1s] = useState("");
  const [openingNotes, setOpeningNotes] = useState("");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentNotes, setAdjustmentNotes] = useState("");
  const [adjustmentType, setAdjustmentType] = useState<"add" | "remove">("add");

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };

  const calculateTotal = () => {
    const hundreds = parseInt(count100s) || 0;
    const fifties = parseInt(count50s) || 0;
    const twenties = parseInt(count20s) || 0;
    const tens = parseInt(count10s) || 0;
    const fives = parseInt(count5s) || 0;
    const twos = parseInt(count2s) || 0;
    const ones = parseInt(count1s) || 0;
    
    return (hundreds * 100) + (fifties * 50) + (twenties * 20) + (tens * 10) + (fives * 5) + (twos * 2) + ones;
  };

  const handleOpenSession = (e: React.FormEvent) => {
    e.preventDefault();
    const totalAmount = calculateTotal();

    openSessionMutation.mutate(
      {
        opening_balance_cents: Math.round(totalAmount * 100),
        notes: openingNotes || undefined,
      },
      {
        onSuccess: () => {
          setShowOpenModal(false);
          setCount100s("");
          setCount50s("");
          setCount20s("");
          setCount10s("");
          setCount5s("");
          setCount2s("");
          setCount1s("");
          setOpeningNotes("");
        },
      }
    );
  };

  const handleCloseSession = () => {
    if (confirm("Are you sure you want to close the current register session?")) {
      closeSessionMutation.mutate();
    }
  };

  const getTransactionIcon = (type: string, amount: number) => {
    switch (type) {
      case "sale":
      case "starting_cash":
        return <TrendingUp size={16} className="text-emerald-400" />;
      case "buylist_payout":
      case "deposit":
        return <TrendingDown size={16} className="text-rose-400" />;
      case "adjustment":
        return amount >= 0 ? 
          <TrendingUp size={16} className="text-emerald-400" /> : 
          <TrendingDown size={16} className="text-rose-400" />;
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
              onClick={() => setShowAdjustmentModal(true)}
              className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-semibold text-white hover:bg-white/10"
            >
              <Plus size={20} />
              Adjust Register
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
                  {getTransactionIcon(txn.transaction_type, txn.amount_cents)}
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
            <p className="mt-1 text-sm text-white/60">Count each denomination of bills in the drawer</p>

            <form onSubmit={handleOpenSession} className="mt-4 space-y-4">
              <div className="space-y-3">
                <label className="block text-sm font-medium text-white/80">Bill Counts</label>
                
                {/* $100 Bills */}
                <div className="flex items-center gap-3">
                  <label className="w-16 text-sm text-white/60">$100:</label>
                  <input
                    type="number"
                    min="0"
                    value={count100s}
                    onChange={(e) => setCount100s(e.target.value)}
                    placeholder="0"
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  />
                  <span className="w-20 text-right text-sm text-white/60">
                    ${((parseInt(count100s) || 0) * 100).toFixed(2)}
                  </span>
                </div>

                {/* $50 Bills */}
                <div className="flex items-center gap-3">
                  <label className="w-16 text-sm text-white/60">$50:</label>
                  <input
                    type="number"
                    min="0"
                    value={count50s}
                    onChange={(e) => setCount50s(e.target.value)}
                    placeholder="0"
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  />
                  <span className="w-20 text-right text-sm text-white/60">
                    ${((parseInt(count50s) || 0) * 50).toFixed(2)}
                  </span>
                </div>

                {/* $20 Bills */}
                <div className="flex items-center gap-3">
                  <label className="w-16 text-sm text-white/60">$20:</label>
                  <input
                    type="number"
                    min="0"
                    value={count20s}
                    onChange={(e) => setCount20s(e.target.value)}
                    placeholder="0"
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  />
                  <span className="w-20 text-right text-sm text-white/60">
                    ${((parseInt(count20s) || 0) * 20).toFixed(2)}
                  </span>
                </div>

                {/* $10 Bills */}
                <div className="flex items-center gap-3">
                  <label className="w-16 text-sm text-white/60">$10:</label>
                  <input
                    type="number"
                    min="0"
                    value={count10s}
                    onChange={(e) => setCount10s(e.target.value)}
                    placeholder="0"
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  />
                  <span className="w-20 text-right text-sm text-white/60">
                    ${((parseInt(count10s) || 0) * 10).toFixed(2)}
                  </span>
                </div>

                {/* $5 Bills */}
                <div className="flex items-center gap-3">
                  <label className="w-16 text-sm text-white/60">$5:</label>
                  <input
                    type="number"
                    min="0"
                    value={count5s}
                    onChange={(e) => setCount5s(e.target.value)}
                    placeholder="0"
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  />
                  <span className="w-20 text-right text-sm text-white/60">
                    ${((parseInt(count5s) || 0) * 5).toFixed(2)}
                  </span>
                </div>

                {/* $2 Bills */}
                <div className="flex items-center gap-3">
                  <label className="w-16 text-sm text-white/60">$2:</label>
                  <input
                    type="number"
                    min="0"
                    value={count2s}
                    onChange={(e) => setCount2s(e.target.value)}
                    placeholder="0"
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  />
                  <span className="w-20 text-right text-sm text-white/60">
                    ${((parseInt(count2s) || 0) * 2).toFixed(2)}
                  </span>
                </div>

                {/* $1 Bills */}
                <div className="flex items-center gap-3">
                  <label className="w-16 text-sm text-white/60">$1:</label>
                  <input
                    type="number"
                    min="0"
                    value={count1s}
                    onChange={(e) => setCount1s(e.target.value)}
                    placeholder="0"
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                  />
                  <span className="w-20 text-right text-sm text-white/60">
                    ${(parseInt(count1s) || 0).toFixed(2)}
                  </span>
                </div>

                {/* Total */}
                <div className="flex items-center gap-3 border-t border-white/10 pt-3">
                  <label className="w-16 text-sm font-semibold text-white">Total:</label>
                  <div className="flex-1"></div>
                  <span className="w-20 text-right text-lg font-bold text-accent">
                    ${calculateTotal().toFixed(2)}
                  </span>
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

      {/* Adjustment Modal */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#1a1a1a] p-6">
            <h3 className="text-xl font-semibold text-white">Adjust Cash Register</h3>
            <p className="mt-1 text-sm text-white/60">Add or remove cash from the register</p>

            {session && (
              <div className="mt-3 rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs text-white/40">Current Register Balance</p>
                <p className="text-lg font-semibold text-white">{formatCurrency(session.current_balance_cents)}</p>
              </div>
            )}

            <form onSubmit={(e) => {
              e.preventDefault();
              const amount = parseFloat(adjustmentAmount);
              if (isNaN(amount) || amount <= 0) {
                alert("Please enter a valid amount");
                return;
              }

              const amountCents = Math.round(amount * 100);
              const adjustmentCents = adjustmentType === "add" ? amountCents : -amountCents;

              // Check if removal would result in negative balance
              if (session && adjustmentType === "remove" && amountCents > session.current_balance_cents) {
                alert("Cannot remove more than the current register balance");
                return;
              }

              createAdjustmentMutation.mutate(
                {
                  amount_cents: adjustmentCents,
                  notes: adjustmentNotes || undefined,
                },
                {
                  onSuccess: () => {
                    setShowAdjustmentModal(false);
                    setAdjustmentAmount("");
                    setAdjustmentNotes("");
                    setAdjustmentType("add");
                  },
                }
              );
            }} className="mt-4 space-y-4">
              {/* Add or Remove Toggle */}
              <div>
                <label className="block text-sm text-white/60 mb-2">Adjustment Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustmentType("add")}
                    className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                      adjustmentType === "add"
                        ? "bg-emerald-500/20 border-2 border-emerald-500/50 text-emerald-300"
                        : "bg-white/5 border-2 border-white/10 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    Add Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustmentType("remove")}
                    className={`rounded-lg px-4 py-2 font-medium transition-colors ${
                      adjustmentType === "remove"
                        ? "bg-rose-500/20 border-2 border-rose-500/50 text-rose-300"
                        : "bg-white/5 border-2 border-white/10 text-white/60 hover:bg-white/10"
                    }`}
                  >
                    Remove Cash
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm text-white/60">Amount</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max={adjustmentType === "remove" && session ? session.current_balance_cents / 100 : undefined}
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(e.target.value)}
                    required
                    placeholder="0.00"
                    className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-7 pr-3 text-white outline-none focus:border-white/20"
                  />
                </div>
                <p className="mt-1 text-xs text-white/40">
                  {adjustmentType === "add" ? "Adding cash to register" : "Removing cash from register"}
                </p>
              </div>

              <div>
                <label className="block text-sm text-white/60">Notes (Optional)</label>
                <textarea
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  rows={2}
                  placeholder="Reason for adjustment..."
                  className="mt-1 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-white/20"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdjustmentModal(false);
                    setAdjustmentAmount("");
                    setAdjustmentNotes("");
                    setAdjustmentType("add");
                  }}
                  className="flex-1 rounded-lg border border-white/10 px-4 py-2 text-white/80 hover:bg-white/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createAdjustmentMutation.isPending}
                  className={`flex-1 rounded-lg px-4 py-2 font-semibold disabled:opacity-50 ${
                    adjustmentType === "add"
                      ? "bg-emerald-500 text-white hover:bg-emerald-600"
                      : "bg-rose-500 text-white hover:bg-rose-600"
                  }`}
                >
                  {createAdjustmentMutation.isPending ? "Processing..." : `${adjustmentType === "add" ? "Add" : "Remove"} Cash`}
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
