import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import { useCustomers } from "../hooks/useCustomers";
import NewCustomerModal from "../components/NewCustomerModal";
import CustomerTransactionsModal from "../components/CustomerTransactionsModal";

const CustomersPage = () => {
  const { data: customers = [], isLoading, isError } = useCustomers();
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<{ id: number; name: string } | null>(null);

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
        {!isLoading && !isError && customers.length > 0 && (
          <div className="space-y-3">
            {customers.map((customer) => (
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
                <button 
                  onClick={() => setSelectedCustomer({ id: customer.id, name: customer.name })}
                  className="rounded-full border border-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/60 hover:border-accent hover:text-accent"
                >
                  View transactions
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {showNewCustomerModal && (
        <NewCustomerModal onClose={() => setShowNewCustomerModal(false)} />
      )}

      {selectedCustomer && (
        <CustomerTransactionsModal
          customerId={selectedCustomer.id}
          customerName={selectedCustomer.name}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </div>
  );
};

export default CustomersPage;
