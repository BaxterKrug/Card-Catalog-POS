import { X, ShoppingCart, User, Calendar, Package, CreditCard, RotateCcw } from "lucide-react";
import { useState } from "react";
import { type Order } from "../api/orders";
import { refundOrder } from "../api/orders";
import { useCustomers } from "../hooks/useCustomers";
import { useInventory } from "../hooks/useInventory";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import CheckoutModal from "./CheckoutModal";

interface OrderDetailModalProps {
  order: Order;
  onClose: () => void;
}

const OrderDetailModal = ({ order, onClose }: OrderDetailModalProps) => {
  const { data: customers = [] } = useCustomers();
  const { data: inventory = [] } = useInventory();
  const [showCheckout, setShowCheckout] = useState(false);
  const queryClient = useQueryClient();

  const refundMutation = useMutation({
    mutationFn: (orderId: number) => refundOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["cash-register"] });
      onClose();
    },
  });

  const handleRefund = async () => {
    if (confirm(`Are you sure you want to refund Order #${order.id}? This will return the items to inventory.`)) {
      refundMutation.mutate(order.id);
    }
  };

  const customer = customers.find((c) => c.id === order.customer_id);
  
  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
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

  const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#0a0c12]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-indigo-500">
              <ShoppingCart size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Order #{order.id}</h2>
              <p className="text-xs text-white/60">Order details and items</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-white/60 transition hover:border-accent hover:text-accent"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          <div className="space-y-6">
            {/* Order Info */}
            <div className="grid grid-cols-2 gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
                  <User size={14} />
                  Customer
                </div>
                <p className="mt-1 text-lg font-medium text-white">
                  {customer?.name || `Customer #${order.customer_id}`}
                </p>
                {customer?.email && (
                  <p className="text-sm text-white/60">{customer.email}</p>
                )}
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
                  <Calendar size={14} />
                  Created
                </div>
                <p className="mt-1 text-lg font-medium text-white">
                  {new Date(order.created_at).toLocaleDateString()}
                </p>
                <p className="text-sm text-white/60">
                  {new Date(order.created_at).toLocaleTimeString()}
                </p>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Status
                </div>
                <span className={`mt-1 inline-block rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(order.status)}`}>
                  {order.status}
                </span>
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Total Items
                </div>
                <p className="mt-1 text-lg font-medium text-white">
                  {itemCount} {itemCount === 1 ? "item" : "items"}
                </p>
              </div>
            </div>

            {/* Notes */}
            {order.notes && (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Notes
                </div>
                <p className="mt-2 text-white/80">{order.notes}</p>
              </div>
            )}

            {/* Items */}
            <div>
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/40">
                <Package size={14} />
                Order Items
              </div>
              
              {!order.items || order.items.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-white/60">
                  No items in this order
                </div>
              ) : (
                <div className="space-y-2">
                  {order.items.map((item) => {
                    const inventoryItem = inventory.find((inv) => inv.id === item.inventory_item_id);
                    const lineTotal = item.quantity * item.unit_price_cents;
                    
                    return (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                      >
                        <div className="flex-1">
                          <p className="font-medium text-white">
                            {inventoryItem?.name || `Item #${item.inventory_item_id}`}
                          </p>
                          <p className="text-xs text-white/40">
                            {inventoryItem?.sku || "Unknown SKU"}
                          </p>
                        </div>
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-right">
                            <p className="text-white/40">Qty</p>
                            <p className="font-medium text-white">{item.quantity}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-white/40">Unit Price</p>
                            <p className="font-medium text-white">
                              {formatCurrency(item.unit_price_cents)}
                            </p>
                          </div>
                          <div className="text-right min-w-[80px]">
                            <p className="text-white/40">Total</p>
                            <p className="font-semibold text-white">
                              {formatCurrency(lineTotal)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Financial Breakdown */}
            <div className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Subtotal</span>
                <span className="font-medium text-white">{formatCurrency(order.subtotal_cents)}</span>
              </div>
              
              {order.discount_type && order.discount_percent > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/60">
                    Discount ({order.discount_type.replace('_', ' ')} - {order.discount_percent}%)
                  </span>
                  <span className="font-medium text-green-400">
                    -{formatCurrency(order.discount_amount_cents)}
                  </span>
                </div>
              )}
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">Tax ({order.tax_rate_percent}%)</span>
                <span className="font-medium text-white">{formatCurrency(order.tax_amount_cents)}</span>
              </div>
              
              <div className="mt-2 flex items-center justify-between border-t border-white/10 pt-2">
                <span className="font-semibold text-white">Total</span>
                <span className="text-xl font-bold text-white">{formatCurrency(order.total_cents)}</span>
              </div>
            </div>

            {/* Payments */}
            {order.payments && order.payments.length > 0 && (
              <div>
                <div className="mb-3 text-xs uppercase tracking-[0.3em] text-white/40">
                  Payments
                </div>
                <div className="space-y-2">
                  {order.payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3"
                    >
                      <div>
                        <p className="font-medium text-white">
                          {payment.payment_method.replace('_', ' ').toUpperCase()}
                        </p>
                        {payment.notes && (
                          <p className="text-xs text-white/40">{payment.notes}</p>
                        )}
                      </div>
                      <p className="font-semibold text-white">
                        {formatCurrency(payment.amount_cents)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10 px-6 py-4">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-full border border-white/10 px-6 py-2 text-sm text-white/80 hover:border-white/20"
            >
              Close
            </button>
            {order.status === "draft" && (
              <button
                onClick={() => setShowCheckout(true)}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent to-indigo-500 px-6 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                <CreditCard size={16} />
                Checkout
              </button>
            )}
            {(order.status === "open" || order.status === "ready" || order.status === "picked_up") && (
              <button
                onClick={handleRefund}
                disabled={refundMutation.isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-orange-500 to-red-500 px-6 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
              >
                <RotateCcw size={16} />
                {refundMutation.isPending ? "Processing..." : "Refund Order"}
              </button>
            )}
          </div>
        </div>
      </div>

      {showCheckout && (
        <CheckoutModal
          order={order}
          onClose={() => setShowCheckout(false)}
          onComplete={() => {
            setShowCheckout(false);
            onClose(); // Close the order detail modal too
          }}
        />
      )}
    </div>
  );
};

export default OrderDetailModal;
