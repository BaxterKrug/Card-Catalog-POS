import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, CreditCard, DollarSign, Check } from "lucide-react";
import { 
  addOrderPayment,
  submitOrder,
  type Order, 
  type PaymentMethod,
  type OrderPaymentCreateInput 
} from "../api/orders";

interface CheckoutModalProps {
  order: Order;
  onClose: () => void;
  onComplete?: () => void;
}

const CheckoutModal = ({ order, onClose, onComplete }: CheckoutModalProps) => {
  const queryClient = useQueryClient();
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState("");
  const [error, setError] = useState<string | null>(null);

  const addPaymentMutation = useMutation({
    mutationFn: ({ orderId, payment }: { orderId: number; payment: OrderPaymentCreateInput }) =>
      addOrderPayment(orderId, payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["orders", order.id] });
      setAmount("");
      setSelectedMethod(null);
    },
  });

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const totalCents = order.total_cents || 0;
  const paidCents = order.payments?.reduce((sum, p) => sum + p.amount_cents, 0) || 0;
  const remainingCents = totalCents - paidCents;

  const handleAddPayment = async () => {
    if (!selectedMethod) {
      setError("Please select a payment method");
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    const amountCents = Math.round(amountNum * 100);
    if (amountCents > remainingCents) {
      setError("Amount exceeds remaining balance");
      return;
    }

    setError(null);

    try {
      // Add payment
      await addPaymentMutation.mutateAsync({
        orderId: order.id,
        payment: {
          payment_method: selectedMethod,
          amount_cents: amountCents,
        },
      });

      // Check if order is fully paid
      const newPaidCents = paidCents + amountCents;
      if (newPaidCents >= totalCents) {
        // Order is fully paid, close modal
        if (onComplete) {
          onComplete();
        } else {
          onClose();
        }
      }
    } catch (err) {
      setError("Failed to add payment");
      console.error(err);
    }
  };

  const handleQuickPay = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setAmount((remainingCents / 100).toFixed(2));
  };

  const paymentMethods: { value: PaymentMethod; label: string; icon: typeof CreditCard }[] = [
    { value: "cash", label: "Cash", icon: DollarSign },
    { value: "credit_card", label: "Credit Card", icon: CreditCard },
    { value: "debit_card", label: "Debit Card", icon: CreditCard },
    { value: "store_credit", label: "Store Credit", icon: DollarSign },
    { value: "check", label: "Check", icon: DollarSign },
    { value: "other", label: "Other", icon: DollarSign },
  ];

  const isFullyPaid = remainingCents === 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#0a0c12]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/40">Checkout</p>
            <h2 className="text-2xl font-semibold text-white">Order #{order.id}</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
          <div className="space-y-6">
            {/* Order Summary */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-white/60">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(order.subtotal_cents || 0)}</span>
                </div>
                {order.discount_amount_cents > 0 && (
                  <div className="flex justify-between text-white/60">
                    <span>Discount ({order.discount_percent}%):</span>
                    <span>-{formatCurrency(order.discount_amount_cents)}</span>
                  </div>
                )}
                <div className="flex justify-between text-white/60">
                  <span>Tax ({order.tax_rate_percent}%):</span>
                  <span>{formatCurrency(order.tax_amount_cents || 0)}</span>
                </div>
                <div className="flex justify-between border-t border-white/10 pt-2 text-lg font-semibold text-white">
                  <span>Total:</span>
                  <span>{formatCurrency(totalCents)}</span>
                </div>
              </div>
            </div>

            {/* Payment Summary */}
            {order.payments && order.payments.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">Payments</p>
                <div className="space-y-2">
                  {order.payments.map((payment, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-2"
                    >
                      <span className="text-sm capitalize text-white/80">
                        {payment.payment_method.replace("_", " ")}
                      </span>
                      <span className="font-medium text-white">{formatCurrency(payment.amount_cents)}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 flex items-center justify-between rounded-xl border border-accent/30 bg-accent/10 px-4 py-3">
                  <span className="text-sm font-medium text-white">Remaining Balance:</span>
                  <span className="text-xl font-bold text-accent">{formatCurrency(remainingCents)}</span>
                </div>
              </div>
            )}

            {!isFullyPaid && (
              <>
                {/* Quick Pay Buttons */}
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">Quick Pay</p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleQuickPay("cash")}
                      className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:border-accent hover:bg-accent/10"
                    >
                      <DollarSign size={16} />
                      Cash {formatCurrency(remainingCents)}
                    </button>
                    <button
                      onClick={() => handleQuickPay("credit_card")}
                      className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:border-accent hover:bg-accent/10"
                    >
                      <CreditCard size={16} />
                      Card {formatCurrency(remainingCents)}
                    </button>
                  </div>
                </div>

                {/* Manual Payment Entry */}
                <div className="space-y-3">
                  <p className="text-xs uppercase tracking-[0.3em] text-white/40">Add Payment</p>
                  
                  {/* Payment Method Selection */}
                  <div className="grid grid-cols-3 gap-2">
                    {paymentMethods.map((method) => {
                      const Icon = method.icon;
                      return (
                        <button
                          key={method.value}
                          onClick={() => setSelectedMethod(method.value)}
                          className={`flex flex-col items-center gap-1 rounded-xl border px-3 py-3 text-xs transition ${
                            selectedMethod === method.value
                              ? "border-accent bg-accent/20 text-accent"
                              : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
                          }`}
                        >
                          <Icon size={18} />
                          <span className="text-center leading-tight">{method.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Amount Input */}
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.01"
                        min="0"
                        max={remainingCents / 100}
                        className="w-full rounded-2xl border border-white/10 bg-[#080b12] py-3 pl-8 pr-4 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                      />
                    </div>
                    <button
                      onClick={handleAddPayment}
                      disabled={!selectedMethod || !amount || addPaymentMutation.isPending}
                      className="rounded-2xl bg-gradient-to-r from-accent to-indigo-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {addPaymentMutation.isPending ? "Adding..." : "Add"}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                    {error}
                  </div>
                )}
              </>
            )}

            {isFullyPaid && (
              <div className="flex items-center justify-center gap-2 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-6 text-green-200">
                <Check size={24} />
                <span className="text-lg font-semibold">Payment Complete</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-white/10 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 px-6 py-2 text-sm text-white/80 hover:border-white/20"
          >
            {isFullyPaid ? "Close" : "Cancel"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
