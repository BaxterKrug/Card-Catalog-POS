import { Clock, MoveRight, Loader2, ShoppingCart, Filter, X, ChevronDown, ChevronRight, Calendar, Package } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useOrders } from "../hooks/useOrders";
import { useCustomers } from "../hooks/useCustomers";
import { useInventory } from "../hooks/useInventory";
import NewOrderModal from "../components/NewOrderModal";
import OrderDetailModal from "../components/OrderDetailModal";
import { type Order } from "../api/orders";

interface DateGroup {
  label: string;
  orders: Order[];
  type: 'day' | 'week' | 'month' | 'year';
  date: Date;
}

const OrdersPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: orders = [], isLoading, isError } = useOrders();
  const { data: customers = [] } = useCustomers();
  const { data: inventory = [] } = useInventory();
  const [showNewOrderModal, setShowNewOrderModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [customerFilter, setCustomerFilter] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  // Initialize customer filter from URL params
  useEffect(() => {
    const customerId = searchParams.get("customer");
    if (customerId) {
      setCustomerFilter(customerId);
    }
  }, [searchParams]);

  // Toggle group collapse
  const toggleGroup = (groupKey: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  };

  // Format cents to currency
  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  // Get customer name by ID
  const getCustomerName = (customerId: number) => {
    const customer = customers.find((c) => c.id === customerId);
    return customer?.name || `Customer #${customerId}`;
  };

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // Status filter
      if (statusFilter !== "all" && order.status !== statusFilter) {
        return false;
      }

      // Customer filter
      if (customerFilter !== "all" && order.customer_id.toString() !== customerFilter) {
        return false;
      }

      // Search filter (by customer name, order ID, or item names/SKUs)
      if (searchTerm) {
        const customerName = getCustomerName(order.customer_id).toLowerCase();
        const orderId = order.id.toString();
        const search = searchTerm.toLowerCase();
        
        // Check customer name and order ID
        const matchesBasic = customerName.includes(search) || orderId.includes(search);
        
        // Check order items (names and SKUs)
        const matchesItems = order.items?.some(item => {
          const invItem = inventory.find(i => i.id === item.inventory_item_id);
          return invItem?.name?.toLowerCase().includes(search) ||
                 invItem?.sku?.toLowerCase().includes(search);
        });
        
        if (!matchesBasic && !matchesItems) {
          return false;
        }
      }

      return true;
    });
  }, [orders, statusFilter, customerFilter, searchTerm, customers, inventory]);

  // Group orders hierarchically by date
  const groupedOrders = useMemo(() => {
    if (!filteredOrders.length) return [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(today);
    monthAgo.setMonth(monthAgo.getMonth() - 1);
    const yearAgo = new Date(today);
    yearAgo.setFullYear(yearAgo.getFullYear() - 1);

    const groups: DateGroup[] = [];
    const todayOrders: Order[] = [];
    const yesterdayOrders: Order[] = [];
    const thisWeekOrders: Order[] = [];
    const weekBuckets = new Map<string, Order[]>();
    const monthBuckets = new Map<string, Order[]>();
    const yearBuckets = new Map<string, Order[]>();

    filteredOrders.forEach(order => {
      const orderDate = new Date(order.created_at);
      const orderDay = new Date(orderDate.getFullYear(), orderDate.getMonth(), orderDate.getDate());

      if (orderDay.getTime() === today.getTime()) {
        todayOrders.push(order);
      } else if (orderDay.getTime() === yesterday.getTime()) {
        yesterdayOrders.push(order);
      } else if (orderDate >= weekAgo) {
        thisWeekOrders.push(order);
      } else if (orderDate >= monthAgo) {
        // Group by week
        const weekStart = new Date(orderDay);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekKey = weekStart.toISOString().split('T')[0];
        if (!weekBuckets.has(weekKey)) {
          weekBuckets.set(weekKey, []);
        }
        weekBuckets.get(weekKey)!.push(order);
      } else if (orderDate >= yearAgo) {
        // Group by month
        const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
        if (!monthBuckets.has(monthKey)) {
          monthBuckets.set(monthKey, []);
        }
        monthBuckets.get(monthKey)!.push(order);
      } else {
        // Group by year
        const yearKey = orderDate.getFullYear().toString();
        if (!yearBuckets.has(yearKey)) {
          yearBuckets.set(yearKey, []);
        }
        yearBuckets.get(yearKey)!.push(order);
      }
    });

    // Add groups in chronological order (newest first)
    if (todayOrders.length > 0) {
      groups.push({
        label: 'Today',
        orders: todayOrders,
        type: 'day',
        date: today
      });
    }

    if (yesterdayOrders.length > 0) {
      groups.push({
        label: 'Yesterday',
        orders: yesterdayOrders,
        type: 'day',
        date: yesterday
      });
    }

    if (thisWeekOrders.length > 0) {
      groups.push({
        label: 'This Week',
        orders: thisWeekOrders,
        type: 'week',
        date: weekAgo
      });
    }

    // Add week groups
    Array.from(weekBuckets.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .forEach(([weekKey, orders]) => {
        const weekStart = new Date(weekKey);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        groups.push({
          label: `Week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`,
          orders,
          type: 'week',
          date: weekStart
        });
      });

    // Add month groups
    Array.from(monthBuckets.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .forEach(([monthKey, orders]) => {
        const [year, month] = monthKey.split('-');
        const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        groups.push({
          label: monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
          orders,
          type: 'month',
          date: monthDate
        });
      });

    // Add year groups
    Array.from(yearBuckets.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .forEach(([yearKey, orders]) => {
        const yearDate = new Date(parseInt(yearKey), 0, 1);
        groups.push({
          label: yearKey,
          orders,
          type: 'year',
          date: yearDate
        });
      });

    return groups;
  }, [filteredOrders]);

  // Get unique statuses for filter
  const availableStatuses = useMemo(() => {
    const statuses = new Set(orders.map((o) => o.status));
    return Array.from(statuses).sort();
  }, [orders]);

  // Status badge color
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

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">Orders</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">Commerce pipeline</h1>
          <p className="mt-1 text-sm text-white/60">Track and fulfill customer orders.</p>
        </div>
        <button
          onClick={() => setShowNewOrderModal(true)}
          className="flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:border-accent hover:text-accent"
        >
          <ShoppingCart size={16} /> New order
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer, order #, product, or SKU..."
            className="w-full rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 pr-10 text-sm text-white placeholder-white/30 focus:border-accent focus:outline-none"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/60"
            >
              <X size={16} />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter size={16} className="text-white/40" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-sm text-white focus:border-accent focus:outline-none [&>option]:bg-gray-900 [&>option]:text-white"
          >
            <option value="all" className="bg-gray-900 text-white">All Statuses</option>
            {availableStatuses.map((status) => (
              <option key={status} value={status} className="bg-gray-900 text-white">
                {status.charAt(0).toUpperCase() + status.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
          
          <select
            value={customerFilter}
            onChange={(e) => setCustomerFilter(e.target.value)}
            className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-2 text-sm text-white focus:border-accent focus:outline-none [&>option]:bg-gray-900 [&>option]:text-white"
          >
            <option value="all" className="bg-gray-900 text-white">All Customers</option>
            {customers
              .filter((customer) => orders.some((order) => order.customer_id === customer.id))
              .map((customer) => (
                <option key={customer.id} value={customer.id.toString()} className="bg-gray-900 text-white">
                  {customer.name}
                </option>
              ))}
          </select>
        </div>

        {(searchTerm || statusFilter !== "all" || customerFilter !== "all") && (
          <div className="flex items-center gap-2 text-xs text-white/60">
            <span>Showing {filteredOrders.length} of {orders.length} orders</span>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-white/10 bg-white/5 p-5">
        {isLoading && (
          <div className="flex items-center justify-center py-12 text-white/60">
            <Loader2 className="mr-3 h-5 w-5 animate-spin" />
            Loading orders…
          </div>
        )}
        {isError && !isLoading && (
          <div className="py-8 text-center text-sm text-rose-200">
            Could not load orders. Please try again.
          </div>
        )}
        {!isLoading && !isError && filteredOrders.length === 0 && orders.length === 0 && (
          <div className="py-8 text-center text-sm text-white/60">
            No orders yet. Click "New order" to create one.
          </div>
        )}
        {!isLoading && !isError && filteredOrders.length === 0 && orders.length > 0 && (
          <div className="py-8 text-center text-sm text-white/60">
            No orders match your filters.
          </div>
        )}
        {!isLoading && !isError && groupedOrders.length > 0 && (
          <div className="space-y-6">
            {groupedOrders.map((group) => {
              const groupKey = `${group.type}-${group.date.toISOString()}`;
              const isCollapsed = collapsedGroups.has(groupKey);
              const totalOrders = group.orders.length;
              const totalValue = group.orders.reduce((sum, order) => sum + (order.total_cents || 0), 0);

              return (
                <div key={groupKey} className="space-y-3">
                  {/* Group Header */}
                  <button
                    onClick={() => toggleGroup(groupKey)}
                    className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-left transition hover:border-accent/50 hover:bg-white/10"
                  >
                    <div className="text-white/60">
                      {isCollapsed ? <ChevronRight size={20} /> : <ChevronDown size={20} />}
                    </div>
                    <Calendar size={18} className="text-accent" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-white">{group.label}</p>
                      <p className="text-xs text-white/40">
                        {totalOrders} {totalOrders === 1 ? 'order' : 'orders'} · {formatCurrency(totalValue)}
                      </p>
                    </div>
                    <Package size={18} className="text-white/40" />
                  </button>

                  {/* Orders in Group */}
                  {!isCollapsed && (
                    <div className="ml-8 space-y-3">
                      {group.orders.map((order) => {
                        const total = order.total_cents || 0;
                        const itemCount = order.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

                        return (
                          <div
                            key={order.id}
                            onClick={() => setSelectedOrder(order)}
                            className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-white transition hover:border-accent/50 hover:bg-white/10"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="text-xs text-white/50">Order #{order.id}</p>
                                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(order.status)}`}>
                                  {order.status}
                                </span>
                              </div>
                              <p className="mt-1 text-lg font-medium">{getCustomerName(order.customer_id)}</p>
                              <p className="text-xs text-white/40">
                                {itemCount} {itemCount === 1 ? "item" : "items"} · {new Date(order.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-white/40">Total</p>
                              <p className="text-xl font-semibold text-white">{formatCurrency(total)}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {showNewOrderModal && <NewOrderModal onClose={() => setShowNewOrderModal(false)} />}
      {selectedOrder && <OrderDetailModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />}
    </div>
  );
};

export default OrdersPage;
