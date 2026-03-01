import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, UserPlus } from "lucide-react";
import { createCustomer, type CustomerCreateInput } from "../api/customers";
import { type DiscountType } from "../api/orders";

interface NewCustomerModalProps {
  onClose: () => void;
  onCustomerCreated?: (customerId: number) => void;
}

const NewCustomerModal = ({ onClose, onCustomerCreated }: NewCustomerModalProps) => {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [discordId, setDiscordId] = useState("");
  const [defaultDiscountType, setDefaultDiscountType] = useState<DiscountType | "">("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createCustomerMutation = useMutation({
    mutationFn: createCustomer,
    onSuccess: (customer) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      if (onCustomerCreated) {
        onCustomerCreated(customer.id);
      }
      onClose();
    },
    onError: (err: any) => {
      setError(err?.response?.data?.detail || "Failed to create customer");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Customer name is required");
      return;
    }

    const payload: CustomerCreateInput = {
      name: name.trim(),
      email: email.trim() || undefined,
      phone: phone.trim() || undefined,
      discord_id: discordId.trim() || undefined,
      default_discount_type: defaultDiscountType || undefined,
      notes: notes.trim() || undefined,
    };

    createCustomerMutation.mutate(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-[#0a0c12]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-indigo-500">
              <UserPlus size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">New Customer</h2>
              <p className="text-xs text-white/60">Add a new customer account</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full border border-white/10 p-2 text-white/60 transition hover:border-accent hover:text-accent"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="space-y-4">
            {error && (
              <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {error}
              </div>
            )}

            {/* Name */}
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                Name *
              </span>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-3 text-white placeholder-white/30 focus:border-accent focus:outline-none"
                autoFocus
              />
            </label>

            {/* Email */}
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                Email
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john@example.com"
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-3 text-white placeholder-white/30 focus:border-accent focus:outline-none"
              />
            </label>

            {/* Phone */}
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                Phone
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(555) 123-4567"
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-3 text-white placeholder-white/30 focus:border-accent focus:outline-none"
              />
            </label>

            {/* Discord ID */}
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                Discord ID
              </span>
              <input
                type="text"
                value={discordId}
                onChange={(e) => setDiscordId(e.target.value)}
                placeholder="username#1234"
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-3 text-white placeholder-white/30 focus:border-accent focus:outline-none"
              />
            </label>

            {/* Default Discount */}
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                Default Discount
              </span>
              <select
                value={defaultDiscountType}
                onChange={(e) => setDefaultDiscountType(e.target.value as DiscountType | "")}
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-3 text-white focus:border-accent focus:outline-none"
              >
                <option value="">No Default Discount</option>
                <option value="student">Student (10%)</option>
                <option value="first_responder">First Responder (10%)</option>
                <option value="military">Military (10%)</option>
                <option value="senior">Senior (10%)</option>
                <option value="employee">Employee (10%)</option>
              </select>
            </label>

            {/* Notes */}
            <label className="flex flex-col gap-2 text-sm">
              <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                Notes
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional information..."
                rows={3}
                className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-3 text-white placeholder-white/30 focus:border-accent focus:outline-none"
              />
            </label>
          </div>

          {/* Actions */}
          <div className="mt-6 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={createCustomerMutation.isPending}
              className="flex-1 rounded-full border border-white/10 px-6 py-2 text-sm text-white/80 hover:border-white/20 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createCustomerMutation.isPending}
              className="flex-1 rounded-full bg-gradient-to-r from-accent to-indigo-500 px-6 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NewCustomerModal;
