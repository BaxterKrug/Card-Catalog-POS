import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Trash2, ShoppingCart, Search, ScanLine, ChevronDown, UserPlus, CreditCard, DollarSign, Sparkles, Calendar } from "lucide-react";
import { createOrder, addOrderItem, submitOrder, addOrderPayment, type OrderItemCreateInput, type DiscountType, type PaymentMethod } from "../api/orders";
import { useCustomers } from "../hooks/useCustomers";
import { useInventory } from "../hooks/useInventory";
import BarcodeScanner from "./BarcodeScanner";
import NewCustomerModal from "./NewCustomerModal";

interface NewOrderModalProps {
  onClose: () => void;
}

interface CartItem {
  id: string; // Unique ID for this cart item instance
  inventory_item_id: number | null; // null for custom singles
  sku: string;
  name: string;
  category: string;
  quantity: number;
  unit_price_cents: number;
  original_price_cents: number;
}

const NewOrderModal = ({ onClose }: NewOrderModalProps) => {
  const queryClient = useQueryClient();
  const { data: customers = [] } = useCustomers();
  const { data: inventory = [] } = useInventory();

  const [selectedCustomerId, setSelectedCustomerId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [nextCartItemId, setNextCartItemId] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showProductList, setShowProductList] = useState(false);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [tempPrice, setTempPrice] = useState("");
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [orderDiscountType, setOrderDiscountType] = useState<DiscountType | "">("");
  const [orderDiscountPercent, setOrderDiscountPercent] = useState<number>(0);
  const [showCheckout, setShowCheckout] = useState(false);
  const [payments, setPayments] = useState<Array<{ method: PaymentMethod; amount: number }>>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>("");

  // Find the Walk-in Customer (ID: 1) or use the first customer
  const defaultCustomer = customers.find(c => c.name === "Walk-in Customer") || customers[0];
  
  // Set default customer on mount if not already selected
  useEffect(() => {
    if (selectedCustomerId === null && defaultCustomer) {
      setSelectedCustomerId(defaultCustomer.id);
    }
  }, [defaultCustomer, selectedCustomerId]);

  // Apply customer's default discount when customer changes
  useEffect(() => {
    if (selectedCustomerId) {
      const customer = customers.find(c => c.id === selectedCustomerId);
      if (customer?.default_discount_type) {
        setOrderDiscountType(customer.default_discount_type);
        // Set default percentages based on discount type - all 10%
        const discountPercentages: Record<DiscountType, number> = {
          student: 10,
          first_responder: 10,
          military: 10,
          senior: 10,
          employee: 10,
          custom: 0,
        };
        setOrderDiscountPercent(discountPercentages[customer.default_discount_type] || 0);
      }
    }
  }, [selectedCustomerId, customers]);

  const createOrderMutation = useMutation({
    mutationFn: createOrder,
  });

  const addItemMutation = useMutation({
    mutationFn: ({ orderId, item }: { orderId: number; item: OrderItemCreateInput }) =>
      addOrderItem(orderId, item),
  });

  const submitOrderMutation = useMutation({
    mutationFn: submitOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      onClose();
    },
  });

  const addPaymentMutation = useMutation({
    mutationFn: ({ orderId, payment }: { orderId: number; payment: { payment_method: PaymentMethod; amount_cents: number } }) =>
      addOrderPayment(orderId, payment),
  });

  const filteredInventory = inventory.filter(
    (item) =>
      item.available_quantity > 0 &&
      (item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const addToCart = (itemId: number) => {
    const inventoryItem = inventory.find((item) => item.id === itemId);
    if (!inventoryItem) return;

    // Don't add items with no available stock
    if (inventoryItem.available_quantity <= 0) {
      setError(`${inventoryItem.name} is out of stock`);
      return;
    }

    const existingItem = cart.find((item) => item.inventory_item_id === itemId);
    if (existingItem) {
      // Increment quantity if not exceeding available
      if (existingItem.quantity < inventoryItem.available_quantity) {
        setCart(
          cart.map((item) =>
            item.id === existingItem.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          )
        );
      }
    } else {
      const newCartItem: CartItem = {
        id: `cart-${nextCartItemId}`,
        inventory_item_id: itemId,
        sku: inventoryItem.sku,
        name: inventoryItem.name,
        category: inventoryItem.category,
        quantity: 1,
        unit_price_cents: inventoryItem.unit_price_cents,
        original_price_cents: inventoryItem.unit_price_cents,
      };
      setCart([...cart, newCartItem]);
      setNextCartItemId(nextCartItemId + 1);
    }
    setSearchTerm(""); // Clear search after adding
    setShowProductList(false); // Close product list after adding
  };

  const addSinglesItem = () => {
    // Find or warn about Singles inventory item
    const singlesInventory = inventory.find(item => item.sku === "SINGLES" || item.sku === "SINGLE");
    
    if (!singlesInventory) {
      setError("No Singles inventory item found. Please create a 'SINGLES' SKU in inventory first.");
      return;
    }

    // Add a Singles line item with unique ID (allows multiple instances)
    const newSinglesItem: CartItem = {
      id: `cart-${nextCartItemId}`,
      inventory_item_id: singlesInventory.id,
      sku: singlesInventory.sku,
      name: "Singles",
      category: "single",
      quantity: 1,
      unit_price_cents: 0, // Will be set by user
      original_price_cents: 0,
    };
    setCart([...cart, newSinglesItem]);
    setNextCartItemId(nextCartItemId + 1);
    
    // Automatically open price editor and set temp price to empty
    setEditingPrice(newSinglesItem.id);
    setTempPrice("");
  };

  const addEventsItem = () => {
    // Find or warn about Events inventory item
    const eventsInventory = inventory.find(item => item.sku === "EVENTS" || item.sku === "EVENT");
    
    if (!eventsInventory) {
      setError("No Events inventory item found. Please create an 'EVENTS' SKU in inventory first.");
      return;
    }

    // Add an Events line item with unique ID (allows multiple instances)
    const newEventsItem: CartItem = {
      id: `cart-${nextCartItemId}`,
      inventory_item_id: eventsInventory.id,
      sku: eventsInventory.sku,
      name: "Event Entry",
      category: "other",
      quantity: 1,
      unit_price_cents: 0, // Will be set by user
      original_price_cents: 0,
    };
    setCart([...cart, newEventsItem]);
    setNextCartItemId(nextCartItemId + 1);
    
    // Automatically open price editor and set temp price to empty
    setEditingPrice(newEventsItem.id);
    setTempPrice("");
  };

  const updateQuantity = (cartItemId: string, newQuantity: number) => {
    const cartItem = cart.find((item) => item.id === cartItemId);
    if (!cartItem) return;

    if (newQuantity <= 0) {
      removeFromCart(cartItemId);
      return;
    }

    // Singles items don't have inventory limits
    if (cartItem.inventory_item_id !== null) {
      const inventoryItem = inventory.find((item) => item.id === cartItem.inventory_item_id);
      if (!inventoryItem) return;

      if (newQuantity > inventoryItem.available_quantity) {
        return;
      }
    }

    setCart(
      cart.map((item) =>
        item.id === cartItemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeFromCart = (cartItemId: string) => {
    setCart(cart.filter((item) => item.id !== cartItemId));
  };

  const updatePrice = (cartItemId: string, newPriceCents: number) => {
    setCart(
      cart.map((item) =>
        item.id === cartItemId
          ? {
              ...item,
              unit_price_cents: newPriceCents,
              original_price_cents: item.original_price_cents,
            }
          : item
      )
    );
  };

  const handlePriceEdit = (cartItemId: string) => {
    const item = cart.find((i) => i.id === cartItemId);
    if (item) {
      setEditingPrice(cartItemId);
      setTempPrice((item.unit_price_cents / 100).toFixed(2));
    }
  };

  const handlePriceSave = (cartItemId: string) => {
    const priceDollars = parseFloat(tempPrice);
    if (!isNaN(priceDollars) && priceDollars >= 0) {
      updatePrice(cartItemId, Math.round(priceDollars * 100));
    }
    setEditingPrice(null);
    setTempPrice("");
  };

  const subtotalCents = cart.reduce(
    (sum, item) => sum + item.quantity * item.unit_price_cents,
    0
  );

  // Calculate estimated total with discount and tax
  const discountAmountCents = Math.round(subtotalCents * (orderDiscountPercent / 100));
  const afterDiscountCents = subtotalCents - discountAmountCents;
  const taxAmountCents = Math.round(afterDiscountCents * (8.25 / 100)); // 8.25% tax
  const finalTotalCents = afterDiscountCents + taxAmountCents;
  
  const paidCents = payments.reduce((sum, p) => sum + Math.round(p.amount * 100), 0);
  const remainingCents = finalTotalCents - paidCents;

  const handleProceedToCheckout = () => {
    if (!selectedCustomerId) {
      setError("Please select a customer");
      return;
    }

    if (cart.length === 0) {
      setError("Please add at least one item to the order");
      return;
    }

    setError(null);
    setShowCheckout(true);
  };

  const handleAddPayment = () => {
    if (!selectedPaymentMethod) {
      setError("Please select a payment method");
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount");
      return;
    }

    const amountCents = Math.round(amount * 100);
    if (amountCents > remainingCents) {
      setError("Amount exceeds remaining balance");
      return;
    }

    setError(null);
    setPayments([...payments, { method: selectedPaymentMethod, amount }]);
    setPaymentAmount("");
    setSelectedPaymentMethod(null);
  };

  const handleQuickPay = (method: PaymentMethod) => {
    setSelectedPaymentMethod(method);
    setPaymentAmount((remainingCents / 100).toFixed(2));
  };

  const handleCompleteOrder = async () => {
    if (remainingCents > 0) {
      setError("Order is not fully paid");
      return;
    }

    setError(null);

    try {
      // Create the order with discount settings
      const order = await createOrderMutation.mutateAsync({
        customer_id: selectedCustomerId!,
        notes: notes || undefined,
        discount_type: orderDiscountType || undefined,
        discount_percent: orderDiscountPercent,
        tax_rate_percent: 8.25,
      });

      // Add all items to the order
      for (const item of cart) {
        if (!item.inventory_item_id) continue; // Skip any items without inventory ID
        
        await addItemMutation.mutateAsync({
          orderId: order.id,
          item: {
            inventory_item_id: item.inventory_item_id,
            quantity: item.quantity,
            unit_price_cents: item.unit_price_cents,
          },
        });
      }

      // Add all payments
      for (const payment of payments) {
        await addPaymentMutation.mutateAsync({
          orderId: order.id,
          payment: {
            payment_method: payment.method,
            amount_cents: Math.round(payment.amount * 100),
          },
        });
      }

      // Submit the order
      await submitOrderMutation.mutateAsync(order.id);
      
      // Success - close modal
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to complete order";
      setError(message);
    }
  };

  const handleBarcodeScanned = (barcode: string) => {
    const inventoryItem = inventory.find((item) => item.sku === barcode);
    if (!inventoryItem) {
      setError(`No inventory item found with SKU: ${barcode}`);
      setShowScanner(false);
      return;
    }
    
    // Check if item has available stock
    if (inventoryItem.available_quantity <= 0) {
      setError(`${inventoryItem.name} (${barcode}) is out of stock`);
      setShowScanner(false);
      return;
    }
    
    addToCart(inventoryItem.id);
    setShowScanner(false);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
        <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-[#0a0c12]">
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-indigo-500">
                <ShoppingCart size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">New Order</h2>
                <p className="text-xs text-white/60">Create a new customer order</p>
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
          <div className="min-h-0 flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Customer Selection */}
              <div>
                <label className="flex flex-col gap-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                      Customer *
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowNewCustomerModal(true)}
                      className="flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 transition hover:border-accent hover:text-accent"
                    >
                      <UserPlus size={14} />
                      New Customer
                    </button>
                  </div>
                  
                  {/* Search Input */}
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                    <input
                      type="text"
                      value={customerSearchQuery}
                      onChange={(e) => setCustomerSearchQuery(e.target.value)}
                      placeholder="Search customers by name or email..."
                      className="w-full rounded-2xl border border-white/10 bg-[#080b12] py-3 pl-12 pr-10 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                    />
                    {customerSearchQuery && (
                      <button
                        type="button"
                        onClick={() => setCustomerSearchQuery("")}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                      >
                        <X size={18} />
                      </button>
                    )}
                  </div>

                  {/* Customer List */}
                  <div className="max-h-60 space-y-1 overflow-y-auto rounded-2xl border border-white/10 bg-[#080b12] p-2">
                    {(() => {
                      const filteredCustomers = customers.filter(customer => {
                        const query = customerSearchQuery.toLowerCase();
                        return (
                          customer.name.toLowerCase().includes(query) ||
                          (customer.email && customer.email.toLowerCase().includes(query))
                        );
                      });

                      if (filteredCustomers.length === 0) {
                        return (
                          <p className="py-4 text-center text-sm text-white/40">
                            {customerSearchQuery ? 'No customers found' : 'No customers available'}
                          </p>
                        );
                      }

                      return filteredCustomers.map(customer => (
                        <button
                          key={customer.id}
                          type="button"
                          onClick={() => setSelectedCustomerId(customer.id)}
                          className={`w-full rounded-xl px-4 py-3 text-left transition-all ${
                            selectedCustomerId === customer.id
                              ? 'bg-accent/20 border border-accent/50 text-white'
                              : 'bg-white/5 border border-transparent text-white/80 hover:bg-white/10'
                          }`}
                        >
                          <p className="font-medium">{customer.name}</p>
                          {customer.email && (
                            <p className="text-xs text-white/60">{customer.email}</p>
                          )}
                        </button>
                      ));
                    })()}
                  </div>
                  
                  {!selectedCustomerId && (
                    <p className="text-xs text-white/40">Please select a customer to continue</p>
                  )}
                  {selectedCustomerId && (
                    <p className="text-xs text-emerald-300">
                      ✓ Customer selected: {customers.find(c => c.id === selectedCustomerId)?.name}
                    </p>
                  )}
                </label>
              </div>

              {/* Product Search */}
              <div>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                    Add Products
                  </span>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Search
                        size={18}
                        className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40"
                      />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        onFocus={() => setShowProductList(true)}
                        placeholder="Search by SKU or name..."
                        className="w-full rounded-2xl border border-white/10 bg-[#080b12] py-3 pl-12 pr-4 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowProductList(!showProductList)}
                      className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/80 hover:border-accent hover:text-accent"
                      title="Browse all products"
                    >
                      <ChevronDown size={18} className={showProductList ? "rotate-180 transition-transform" : "transition-transform"} />
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowScanner(true)}
                      className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white/80 hover:border-accent hover:text-accent"
                      title="Scan barcode"
                    >
                      <ScanLine size={18} />
                    </button>
                    <button
                      type="button"
                      onClick={addSinglesItem}
                      className="flex items-center gap-2 rounded-2xl border border-accent/30 bg-accent/10 px-4 py-3 text-accent hover:border-accent hover:bg-accent/20"
                      title="Add singles (custom price)"
                    >
                      <Sparkles size={18} />
                      Singles
                    </button>
                    <button
                      type="button"
                      onClick={addEventsItem}
                      className="flex items-center gap-2 rounded-2xl border border-green-500/30 bg-green-500/10 px-4 py-3 text-green-400 hover:border-green-500 hover:bg-green-500/20"
                      title="Add event entry (custom price)"
                    >
                      <Calendar size={18} />
                      Events
                    </button>
                  </div>
                </label>

                {/* Product List/Search Results */}
                {(showProductList || searchTerm) && filteredInventory.length > 0 && (
                  <div className="mt-2 max-h-64 overflow-y-auto rounded-2xl border border-white/10 bg-[#080b12]">
                    {filteredInventory.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => addToCart(item.id)}
                        className="flex w-full items-center justify-between px-4 py-3 text-left text-sm text-white transition hover:bg-white/5"
                      >
                        <div className="flex-1">
                          <p className="font-medium">{item.name}</p>
                          <p className="text-xs text-white/50">
                            {item.sku} • {item.category} • {item.available_quantity} available
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-white">${(item.unit_price_cents / 100).toFixed(2)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Cart */}
              <div>
                <p className="mb-3 text-xs uppercase tracking-[0.3em] text-white/40">
                  Order Items ({cart.length})
                </p>
                {cart.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 py-8 text-center text-sm text-white/60">
                    No items added yet. Browse or search for products above.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cart.map((item) => {
                      const isSingles = item.sku === "SINGLES" || item.sku === "SINGLE";
                      const needsPrice = isSingles && item.unit_price_cents === 0;
                      
                      return (
                      <div
                        key={item.id}
                        className={`rounded-2xl border px-4 py-3 ${
                          needsPrice 
                            ? 'border-accent bg-accent/5 ring-2 ring-accent/30' 
                            : 'border-white/10 bg-white/5'
                        }`}
                      >
                        {/* Item Header */}
                        <div className="flex items-start gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-white">{item.name}</p>
                              {isSingles && (
                                <span className="rounded-full bg-accent/20 px-2 py-0.5 text-xs font-medium text-accent">
                                  Custom Price
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-white/50">
                              {item.sku} • {item.category}
                            </p>
                            {needsPrice && (
                              <p className="mt-1 text-xs font-semibold text-accent animate-pulse">
                                ⚠️ Click price below to enter amount
                              </p>
                            )}
                          </div>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="text-white/60 hover:text-rose-300"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>

                        {/* Item Controls */}
                        <div className="mt-3 flex items-center gap-3">
                          {/* Quantity */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity - 1)
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/60 hover:border-accent hover:text-accent"
                            >
                              −
                            </button>
                            <span className="w-12 text-center text-white">{item.quantity}</span>
                            <button
                              onClick={() =>
                                updateQuantity(item.id, item.quantity + 1)
                              }
                              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-white/60 hover:border-accent hover:text-accent"
                            >
                              +
                            </button>
                          </div>

                          {/* Price */}
                          <div className="flex items-center gap-2">
                            {!isSingles && <span className="text-xs text-white/40">@</span>}
                            {editingPrice === item.id || (isSingles && item.unit_price_cents === 0) ? (
                              <div className={`flex items-center gap-1 ${isSingles ? 'rounded-lg bg-accent/10 px-3 py-2 ring-2 ring-accent' : ''}`}>
                                <span className={`${isSingles ? 'text-accent font-bold text-lg' : 'text-white'}`}>$</span>
                                <input
                                  type="number"
                                  value={tempPrice}
                                  onChange={(e) => setTempPrice(e.target.value)}
                                  onBlur={() => handlePriceSave(item.id)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") handlePriceSave(item.id);
                                    if (e.key === "Escape") {
                                      setEditingPrice(null);
                                      setTempPrice("");
                                    }
                                  }}
                                  placeholder={isSingles ? "0.00" : ""}
                                  autoFocus
                                  step="0.01"
                                  min="0"
                                  className={`rounded-lg border bg-[#080b12] px-2 py-1 text-white focus:outline-none ${
                                    isSingles 
                                      ? 'w-28 border-accent text-lg font-bold placeholder:text-accent/40' 
                                      : 'w-20 border-accent text-sm'
                                  }`}
                                />
                                {isSingles && (
                                  <span className="text-xs text-accent/60 whitespace-nowrap">
                                    Enter price
                                  </span>
                                )}
                              </div>
                            ) : (
                              <button
                                onClick={() => handlePriceEdit(item.id)}
                                className="text-sm text-white hover:text-accent"
                                title={item.category === "single" ? "Click to edit price" : "Edit price"}
                              >
                                ${(item.unit_price_cents / 100).toFixed(2)}
                              </button>
                            )}
                          </div>

                          {/* Line Total */}
                          <div className="ml-auto text-right">
                            <p className="font-semibold text-white">
                              ${((item.quantity * item.unit_price_cents) / 100).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Order Discount */}
              <div>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                    Order Discount (Optional)
                  </span>
                  <div className="flex gap-2">
                    <select
                      value={orderDiscountType}
                      onChange={(e) => {
                        const value = e.target.value as DiscountType | "";
                        setOrderDiscountType(value);
                        // Set default discount percentages - all 10%
                        if (value === "student") setOrderDiscountPercent(10);
                        else if (value === "first_responder") setOrderDiscountPercent(10);
                        else if (value === "military") setOrderDiscountPercent(10);
                        else if (value === "senior") setOrderDiscountPercent(10);
                        else if (value === "employee") setOrderDiscountPercent(10);
                        else setOrderDiscountPercent(0);
                      }}
                      className="flex-1 rounded-2xl border border-white/10 bg-[#080b12] px-4 py-3 text-white focus:border-accent focus:outline-none [&>option]:bg-gray-900 [&>option]:text-white"
                    >
                      <option value="" className="bg-gray-900 text-white">No Discount</option>
                      <option value="student" className="bg-gray-900 text-white">Student (10%)</option>
                      <option value="first_responder" className="bg-gray-900 text-white">First Responder (10%)</option>
                      <option value="military" className="bg-gray-900 text-white">Military (10%)</option>
                      <option value="senior" className="bg-gray-900 text-white">Senior (10%)</option>
                      <option value="employee" className="bg-gray-900 text-white">Employee (10%)</option>
                      <option value="custom" className="bg-gray-900 text-white">Custom</option>
                    </select>
                    {orderDiscountType && (
                      <input
                        type="number"
                        value={orderDiscountPercent}
                        onChange={(e) => setOrderDiscountPercent(Number(e.target.value))}
                        min="0"
                        max="100"
                        step="0.1"
                        placeholder="%"
                        className="w-24 rounded-2xl border border-white/10 bg-[#080b12] px-4 py-3 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                      />
                    )}
                  </div>
                </label>
              </div>

              {/* Notes */}
              <div>
                <label className="flex flex-col gap-2 text-sm">
                  <span className="text-xs uppercase tracking-[0.3em] text-white/40">
                    Notes (Optional)
                  </span>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any special instructions or notes..."
                    rows={3}
                    className="rounded-2xl border border-white/10 bg-[#080b12] px-4 py-3 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                  />
                </label>
              </div>

              {/* Error Message */}
              {error && (
                <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="flex-shrink-0 border-t border-white/10 px-6 py-4">
            {!showCheckout ? (
              // Order Creation View
              <>
                {cart.length > 0 && (
                  <div className="mb-4 space-y-1 text-sm">
                    <div className="flex justify-between text-white/60">
                      <span>Subtotal:</span>
                      <span>${(subtotalCents / 100).toFixed(2)}</span>
                    </div>
                    {orderDiscountPercent > 0 && (
                      <div className="flex justify-between text-white/60">
                        <span>Discount ({orderDiscountPercent}%):</span>
                        <span>-${(discountAmountCents / 100).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-white/60">
                      <span>Tax (8.25%):</span>
                      <span>${(taxAmountCents / 100).toFixed(2)}</span>
                    </div>
                    <div className="mt-2 flex justify-between border-t border-white/10 pt-2">
                      <span className="text-xs uppercase tracking-[0.3em] text-white/40">Estimated Total</span>
                      <span className="text-xl font-semibold text-white">
                        ${(finalTotalCents / 100).toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={onClose}
                    className="flex-1 rounded-full border border-white/10 px-6 py-2 text-sm text-white/80 hover:border-white/20"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleProceedToCheckout}
                    disabled={!selectedCustomerId || cart.length === 0}
                    className="flex-1 rounded-full bg-gradient-to-r from-accent to-indigo-500 px-6 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </>
            ) : (
              // Checkout View
              <>
                {remainingCents > 0 ? (
                  <div className="space-y-4">
                    {/* Order Summary */}
                    <div className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm">
                      <div className="space-y-1">
                        <div className="flex justify-between text-white/60">
                          <span>Subtotal:</span>
                          <span>${(subtotalCents / 100).toFixed(2)}</span>
                        </div>
                        {orderDiscountPercent > 0 && (
                          <div className="flex justify-between text-white/60">
                            <span>Discount ({orderDiscountPercent}%):</span>
                            <span>-${(discountAmountCents / 100).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between text-white/60">
                          <span>Tax (8.25%):</span>
                          <span>${(taxAmountCents / 100).toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/10 pt-1 font-semibold text-white">
                          <span>Total:</span>
                          <span>${(finalTotalCents / 100).toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Payments Made */}
                    {payments.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs uppercase tracking-[0.3em] text-white/40">Payments</p>
                        {payments.map((payment, idx) => (
                          <div key={idx} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm">
                            <span className="capitalize text-white/80">{payment.method.replace("_", " ")}</span>
                            <span className="font-medium text-white">${payment.amount.toFixed(2)}</span>
                          </div>
                        ))}
                        <div className="flex items-center justify-between rounded-xl border border-accent/30 bg-accent/10 px-3 py-2">
                          <span className="text-sm font-medium text-white">Remaining:</span>
                          <span className="text-lg font-bold text-accent">${(remainingCents / 100).toFixed(2)}</span>
                        </div>
                      </div>
                    )}

                    {/* Quick Pay Buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleQuickPay("cash")}
                        className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:border-accent hover:bg-accent/10"
                      >
                        <DollarSign size={16} />
                        Cash ${(remainingCents / 100).toFixed(2)}
                      </button>
                      <button
                        onClick={() => handleQuickPay("credit_card")}
                        className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white hover:border-accent hover:bg-accent/10"
                      >
                        <CreditCard size={16} />
                        Card ${(remainingCents / 100).toFixed(2)}
                      </button>
                    </div>

                    {/* Payment Method Selection */}
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          { value: "cash" as PaymentMethod, label: "Cash" },
                          { value: "credit_card" as PaymentMethod, label: "Credit" },
                          { value: "debit_card" as PaymentMethod, label: "Debit" },
                          { value: "store_credit" as PaymentMethod, label: "Store Credit" },
                          { value: "check" as PaymentMethod, label: "Check" },
                          { value: "other" as PaymentMethod, label: "Other" },
                        ].map((method) => (
                          <button
                            key={method.value}
                            onClick={() => setSelectedPaymentMethod(method.value)}
                            className={`rounded-xl border px-3 py-2 text-xs transition ${
                              selectedPaymentMethod === method.value
                                ? "border-accent bg-accent/20 text-accent"
                                : "border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white"
                            }`}
                          >
                            {method.label}
                          </button>
                        ))}
                      </div>

                      {/* Amount Input */}
                      <div className="flex gap-2">
                        <div className="relative flex-1">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">$</span>
                          <input
                            type="number"
                            value={paymentAmount}
                            onChange={(e) => setPaymentAmount(e.target.value)}
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                            max={remainingCents / 100}
                            className="w-full rounded-2xl border border-white/10 bg-[#080b12] py-3 pl-8 pr-4 text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                          />
                        </div>
                        <button
                          onClick={handleAddPayment}
                          disabled={!selectedPaymentMethod || !paymentAmount}
                          className="rounded-2xl bg-gradient-to-r from-accent to-indigo-500 px-6 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                          Add
                        </button>
                      </div>
                    </div>

                    {/* Error Message */}
                    {error && (
                      <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                        {error}
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-2">
                      <button
                        onClick={() => setShowCheckout(false)}
                        className="flex-1 rounded-full border border-white/10 px-6 py-2 text-sm text-white/80 hover:border-white/20"
                      >
                        Back to Order
                      </button>
                    </div>
                  </div>
                ) : (
                  // Order is fully paid
                  <div className="space-y-4">
                    <div className="flex items-center justify-center gap-2 rounded-2xl border border-green-500/20 bg-green-500/10 px-4 py-6 text-green-200">
                      <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-lg font-semibold">Payment Complete</span>
                    </div>

                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowCheckout(false)}
                        className="flex-1 rounded-full border border-white/10 px-6 py-2 text-sm text-white/80 hover:border-white/20"
                      >
                        Back
                      </button>
                      <button
                        onClick={handleCompleteOrder}
                        disabled={submitOrderMutation.isPending}
                        className="flex-1 rounded-full bg-gradient-to-r from-accent to-indigo-500 px-6 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {submitOrderMutation.isPending ? "Completing..." : "Complete Order"}
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {showScanner && (
        <BarcodeScanner
          onScan={handleBarcodeScanned}
          onClose={() => setShowScanner(false)}
        />
      )}

      {showNewCustomerModal && (
        <NewCustomerModal
          onClose={() => setShowNewCustomerModal(false)}
          onCustomerCreated={(customerId) => {
            setSelectedCustomerId(customerId);
            setCustomerSearchQuery("");
            setShowNewCustomerModal(false);
          }}
        />
      )}
    </>
  );
};

export default NewOrderModal;
