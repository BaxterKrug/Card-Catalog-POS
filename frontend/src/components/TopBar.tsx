import { Plus, Search, X, User, ShoppingCart, Package, Calendar, Loader2 } from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AvatarMenu from "./AvatarMenu";
import { useCustomers } from "../hooks/useCustomers";
import { useOrders } from "../hooks/useOrders";
import { useInventory } from "../hooks/useInventory";
import { usePreorderClaims, usePreorderItems } from "../hooks/usePreorders";

interface TopBarProps {
  onNewOrder: () => void;
  onReceiveStock: () => void;
}

type SearchResult = {
  type: "customer" | "order" | "inventory" | "preorder";
  id: number;
  title: string;
  subtitle: string;
  route: string;
};

const TopBar = ({ onNewOrder, onReceiveStock }: TopBarProps) => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const { data: inventory = [], isLoading: inventoryLoading } = useInventory();
  const { data: preorderClaims = [], isLoading: preordersLoading } = usePreorderClaims();
  const { data: preorderItems = [] } = usePreorderItems();

  const isLoading = customersLoading || ordersLoading || inventoryLoading || preordersLoading;

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search results
  const searchResults = useMemo<SearchResult[]>(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase();
    const results: SearchResult[] = [];

    // Search customers
    customers.forEach(customer => {
      if (
        customer.name?.toLowerCase().includes(query) ||
        customer.email?.toLowerCase().includes(query) ||
        customer.phone?.toLowerCase().includes(query)
      ) {
        results.push({
          type: "customer",
          id: customer.id,
          title: customer.name,
          subtitle: customer.email || customer.phone || "Customer",
          route: `/customers?customerId=${customer.id}`
        });
      }
    });

    // Search orders
    orders.forEach(order => {
      const customer = customers.find(c => c.id === order.customer_id);
      const orderIdStr = order.id.toString();
      if (
        orderIdStr.includes(query) ||
        customer?.name?.toLowerCase().includes(query)
      ) {
        results.push({
          type: "order",
          id: order.id,
          title: `Order #${order.id}`,
          subtitle: customer?.name || `Customer #${order.customer_id}`,
          route: `/orders?search=${encodeURIComponent(orderIdStr)}`
        });
      }
    });

    // Search inventory
    inventory.forEach(item => {
      if (
        item.name?.toLowerCase().includes(query) ||
        item.sku?.toLowerCase().includes(query) ||
        item.game_title?.toLowerCase().includes(query)
      ) {
        results.push({
          type: "inventory",
          id: item.id,
          title: item.name,
          subtitle: `SKU: ${item.sku || "N/A"} | ${item.game_title || ""}`,
          route: `/inventory?search=${encodeURIComponent(item.name)}`
        });
      }
    });

    // Search preorders (by customer name or product)
    const seenPreorderCustomers = new Set<number>();
    preorderClaims.forEach(claim => {
      const customer = customers.find(c => c.id === claim.customer_id);
      const preorderItem = preorderItems.find(pi => pi.id === claim.preorder_item_id);
      const invItem = preorderItem ? inventory.find(i => i.id === preorderItem.inventory_item_id) : null;
      
      const matchesCustomer = customer?.name?.toLowerCase().includes(query);
      const matchesProduct = invItem?.name?.toLowerCase().includes(query);
      
      if (matchesCustomer && !seenPreorderCustomers.has(claim.customer_id)) {
        seenPreorderCustomers.add(claim.customer_id);
        results.push({
          type: "preorder",
          id: claim.customer_id,
          title: `Preorders: ${customer?.name}`,
          subtitle: `Customer preorder records`,
          route: `/preorders?customer=${claim.customer_id}`
        });
      }
      if (matchesProduct && invItem) {
        results.push({
          type: "preorder",
          id: claim.id,
          title: `Preorder: ${invItem.name}`,
          subtitle: customer?.name || "Unknown customer",
          route: `/preorders?search=${encodeURIComponent(invItem.name)}`
        });
      }
    });

    // Limit results per category and total
    const limitedResults: SearchResult[] = [];
    const byType = { customer: 0, order: 0, inventory: 0, preorder: 0 };
    for (const result of results) {
      if (byType[result.type] < 3 && limitedResults.length < 10) {
        limitedResults.push(result);
        byType[result.type]++;
      }
    }

    return limitedResults;
  }, [searchQuery, customers, orders, inventory, preorderClaims, preorderItems]);

  const handleResultClick = (result: SearchResult) => {
    navigate(result.route);
    setSearchQuery("");
    setShowDropdown(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && searchQuery.trim()) {
      // Default to orders page with search
      navigate(`/orders?search=${encodeURIComponent(searchQuery)}`);
      setSearchQuery("");
      setShowDropdown(false);
    }
    if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const getResultIcon = (type: SearchResult["type"]) => {
    switch (type) {
      case "customer": return <User size={16} className="text-blue-400" />;
      case "order": return <ShoppingCart size={16} className="text-green-400" />;
      case "inventory": return <Package size={16} className="text-amber-400" />;
      case "preorder": return <Calendar size={16} className="text-purple-400" />;
    }
  };

  return (
    <header className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-[#0f1117]/80 px-8 py-4 backdrop-blur-xl">
      <div ref={searchRef} className="relative flex-1">
        <div className="flex flex-1 items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2">
          <Search size={18} className="text-white/50" />
          <input
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            onKeyDown={handleKeyDown}
            placeholder="Search customers, orders, products, preorders..."
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery("");
                setShowDropdown(false);
              }}
              className="text-white/40 hover:text-white/60"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Search Dropdown */}
        {showDropdown && searchQuery.length >= 2 && (
          <div className="absolute left-0 right-0 top-full mt-2 max-h-[400px] overflow-y-auto rounded-2xl border border-white/10 bg-[#0f1117] shadow-2xl">
            {isLoading && (
              <div className="flex items-center justify-center py-6 text-white/50">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Searching...
              </div>
            )}
            
            {!isLoading && searchResults.length === 0 && (
              <div className="py-6 text-center text-sm text-white/50">
                No results found for "{searchQuery}"
              </div>
            )}

            {!isLoading && searchResults.length > 0 && (
              <div className="py-2">
                {searchResults.map((result, index) => (
                  <button
                    key={`${result.type}-${result.id}-${index}`}
                    onClick={() => handleResultClick(result)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors"
                  >
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5">
                      {getResultIcon(result.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{result.title}</p>
                      <p className="text-xs text-white/50 truncate">{result.subtitle}</p>
                    </div>
                    <span className="text-xs text-white/30 capitalize">{result.type}</span>
                  </button>
                ))}
                <div className="border-t border-white/5 px-4 py-2 text-xs text-white/40">
                  Press Enter to search in Orders
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      <div className="ml-6 flex items-center gap-3">
        <button 
          onClick={onNewOrder}
          className="rounded-full border border-white/10 px-5 py-2 text-sm font-medium text-white hover:border-accent hover:text-accent"
        >
          New Order
        </button>
        <button 
          onClick={onReceiveStock}
          className="flex items-center gap-2 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-[#061012] shadow-glow hover:bg-accent/90"
        >
          <Plus size={16} /> Receive Stock
        </button>
        <AvatarMenu />
      </div>
    </header>
  );
};

export default TopBar;
