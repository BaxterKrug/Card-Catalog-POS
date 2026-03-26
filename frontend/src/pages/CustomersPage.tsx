import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, UserPlus, Search, Trash2, ArrowRightLeft, Pencil } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useCustomers } from "../hooks/useCustomers";
import { deleteCustomer, transferCustomerRecords, type Customer } from "../api/customers";
import NewCustomerModal from "../components/NewCustomerModal";
import EditCustomerModal from "../components/EditCustomerModal";
import CustomerTransactionsModal from "../components/CustomerTransactionsModal";

const CustomersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: customers = [], isLoading, isError } = useCustomers();
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: number; name: string } | null>(null);
  const [customerToEdit, setCustomerToEdit] = useState<Customer | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [customerToDelete, setCustomerToDelete] = useState<{ id: number; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [targetCustomerId, setTargetCustomerId] = useState<number | null>(null);
  const [transferSuccess, setTransferSuccess] = useState<string | null>(null);

  // Auto-open customer profile when customerId is in URL
  useEffect(() => {
    const customerId = searchParams.get("customerId");
    if (customerId && customers.length > 0 && !selectedCustomer) {
      const customer = customers.find(c => c.id === parseInt(customerId));
      if (customer) {
        setSelectedCustomer({ id: customer.id, name: customer.name });
        // Clear the URL param after opening
        setSearchParams({}, { replace: true });
      }
    }
  }, [searchParams, customers, selectedCustomer, setSearchParams]);

  const queryClient = useQueryClient();
  const deleteMutation = useMutation({
    mutationFn: deleteCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setCustomerToDelete(null);
      setDeleteError(null);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || "Failed to delete customer. They may have related orders or transactions.";
      setDeleteError(errorMessage);
    },
  });

  const transferMutation = useMutation({
    mutationFn: ({ sourceId, targetId }: { sourceId: number; targetId: number }) =>
      transferCustomerRecords(sourceId, targetId),
    onSuccess: (result) => {
      const transferred = [];
      if (result.orders > 0) transferred.push(`${result.orders} order(s)`);
      if (result.preorder_orders > 0) transferred.push(`${result.preorder_orders} preorder order(s)`);
      if (result.preorder_claims > 0) transferred.push(`${result.preorder_claims} preorder claim(s)`);
      if (result.buylist_transactions > 0) transferred.push(`${result.buylist_transactions} buylist transaction(s)`);
      
      setTransferSuccess(`Successfully transferred: ${transferred.join(", ")}`);
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setDeleteError(null);
      setShowTransferModal(false);
      setTargetCustomerId(null);
    },
    onError: (error: any) => {
      const errorMessage = error.response?.data?.detail || "Failed to transfer records.";
      setDeleteError(errorMessage);
    },
  });

  // Filter customers based on search query
  const filteredCustomers = customers.filter((customer) => {
    const query = searchQuery.toLowerCase();
    return (
      customer.name.toLowerCase().includes(query) ||
      customer.email?.toLowerCase().includes(query) ||
      customer.phone?.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Relationships</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Customer directory</h1>
          <p className="mt-1 text-sm text-white/60">Manage retail, collector, and wholesale accounts.</p>
        </div>
        <button 
          onClick={() => setShowNewCustomerModal(true)}
          className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:border-accent hover:text-accent transition"
        >
          <UserPlus size={16} /> Add customer
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-white/40" />
        <input
          type="text"
          placeholder="Search customers by name, email, or phone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl border border-white/10 bg-white/5 py-3 pl-12 pr-4 text-white placeholder-white/40 outline-none focus:border-accent focus:bg-white/10 transition"
        />
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-white/60">
            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
            Loading customers…
          </div>
        )}
        {isError && !isLoading && (
          <div className="py-8 text-center text-sm text-rose-200">
            Could not load customers. Please try again.
          </div>
        )}
        {!isLoading && !isError && customers.length === 0 && (
          <div className="py-8 text-center text-sm text-white/60">
            No customers yet. Add one to get started.
          </div>
        )}
        {!isLoading && !isError && customers.length > 0 && filteredCustomers.length === 0 && (
          <div className="py-8 text-center text-sm text-white/60">
            No customers found matching "{searchQuery}"
          </div>
        )}
        {!isLoading && !isError && filteredCustomers.length > 0 && (
          <div className="space-y-3">
            {filteredCustomers.sort((a, b) => a.name.localeCompare(b.name)).map((customer) => (
              <div
                key={customer.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white"
              >
                <div>
                  <p className="text-lg font-medium">{customer.name}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-white/60">
                    {customer.email && <span>{customer.email}</span>}
                    {customer.phone && <span>{customer.phone}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => setSelectedCustomer({ id: customer.id, name: customer.name })}
                    className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60 hover:border-accent hover:text-accent"
                  >
                    View transactions
                  </button>
                  <button
                    onClick={() => setCustomerToEdit(customer)}
                    className="rounded-full border border-white/10 p-2 text-white/60 hover:border-accent hover:text-accent transition"
                    title="Edit customer"
                  >
                    <Pencil size={16} />
                  </button>
                  <button
                    onClick={() => setCustomerToDelete({ id: customer.id, name: customer.name })}
                    className="rounded-full border border-white/10 p-2 text-white/60 hover:border-rose-500 hover:text-rose-500 transition"
                    title="Delete customer"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNewCustomerModal && (
        <NewCustomerModal onClose={() => setShowNewCustomerModal(false)} />
      )}

      {customerToEdit && (
        <EditCustomerModal
          customer={customerToEdit}
          onClose={() => setCustomerToEdit(null)}
        />
      )}

      {selectedCustomer && (
        <CustomerTransactionsModal
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
          onClose={() => setSelectedCustomer(null)}
        />
      )}

      {/* Transfer Records Modal */}
      {showTransferModal && customerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-gray-900 p-6">
            <h2 className="text-xl font-semibold text-white">Transfer Records</h2>
            <p className="mt-3 text-white/70">
              Transfer all orders, preorders, and transactions from <strong className="text-white">{customerToDelete.name}</strong> to another customer:
            </p>
            <div className="mt-4">
              <label className="block text-sm text-white/60 mb-2">Select target customer</label>
              <select
                value={targetCustomerId || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  setTargetCustomerId(value ? Number(value) : null);
                }}
                className="w-full rounded-lg border border-white/10 bg-gray-800 px-4 py-2 text-white outline-none focus:border-accent focus:bg-gray-700 transition"
              >
                <option value="" className="bg-gray-800 text-white">Choose a customer...</option>
                {customers
                  .filter((c) => c.id !== customerToDelete.id)
                  .sort((a, b) => a.name.localeCompare(b.name))
                  .map((customer) => (
                    <option key={customer.id} value={customer.id} className="bg-gray-800 text-white">
                      {customer.name}
                    </option>
                  ))}
              </select>
            </div>
            {deleteError && (
              <div className="mt-4 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3">
                <p className="text-sm text-rose-400">{deleteError}</p>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowTransferModal(false);
                  setTargetCustomerId(null);
                  setDeleteError(null);
                }}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 hover:border-white/30 hover:text-white transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (targetCustomerId) {
                    transferMutation.mutate({
                      sourceId: customerToDelete.id,
                      targetId: targetCustomerId,
                    });
                  }
                }}
                disabled={!targetCustomerId || transferMutation.isPending}
                className="rounded-full bg-accent px-4 py-2 text-sm text-white hover:bg-accent/90 transition disabled:opacity-50"
              >
                {transferMutation.isPending ? "Transferring..." : "Transfer Records"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {customerToDelete && !showTransferModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-gray-900 p-6">
            <h2 className="text-xl font-semibold text-white">Delete Customer</h2>
            <p className="mt-3 text-white/70">
              Are you sure you want to delete <strong className="text-white">{customerToDelete.name}</strong>? This action cannot be undone.
            </p>
            {deleteError && (
              <div className="mt-4 rounded-lg bg-rose-500/10 border border-rose-500/20 p-3">
                <p className="text-sm text-rose-400">{deleteError}</p>
                <button
                  onClick={() => {
                    setShowTransferModal(true);
                    setDeleteError(null);
                  }}
                  className="mt-2 flex items-center gap-1 text-xs text-accent hover:underline"
                >
                  <ArrowRightLeft size={12} /> Transfer records to another customer
                </button>
              </div>
            )}
            {transferSuccess && (
              <div className="mt-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3">
                <p className="text-sm text-emerald-400">{transferSuccess}</p>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setCustomerToDelete(null);
                  setDeleteError(null);
                  setTransferSuccess(null);
                }}
                className="rounded-full border border-white/10 px-4 py-2 text-sm text-white/60 hover:border-white/30 hover:text-white transition"
              >
                Cancel
              </button>
              {transferSuccess ? (
                <button
                  onClick={() => deleteMutation.mutate(customerToDelete.id)}
                  disabled={deleteMutation.isPending}
                  className="rounded-full bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700 transition disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Now Delete Customer"}
                </button>
              ) : (
                <button
                  onClick={() => deleteMutation.mutate(customerToDelete.id)}
                  disabled={deleteMutation.isPending}
                  className="rounded-full bg-rose-600 px-4 py-2 text-sm text-white hover:bg-rose-700 transition disabled:opacity-50"
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomersPage;
