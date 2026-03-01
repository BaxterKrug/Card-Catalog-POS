import { apiClient } from "./client";

export type PaymentMethod = "cash" | "credit_card" | "debit_card" | "store_credit" | "check" | "other";
export type DiscountType = "student" | "first_responder" | "military" | "senior" | "employee" | "custom";

export interface OrderPayment {
  id: number;
  order_id: number;
  payment_method: PaymentMethod;
  amount_cents: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: number;
  customer_id: number;
  status: string;
  notes?: string | null;
  subtotal_cents: number;
  discount_type?: DiscountType | null;
  discount_percent: number;
  discount_amount_cents: number;
  tax_rate_percent: number;
  tax_amount_cents: number;
  card_fee_percent: number;
  card_fee_amount_cents: number;
  total_cents: number;
  created_at: string;
  updated_at: string;
  items?: OrderItem[];
  payments?: OrderPayment[];
}

export interface OrderItem {
  id: number;
  order_id: number;
  inventory_item_id: number;
  quantity: number;
  unit_price_cents: number;
  created_at: string;
  updated_at: string;
}

export interface OrderCreateInput {
  customer_id: number;
  notes?: string;
  discount_type?: DiscountType;
  discount_percent?: number;
  tax_rate_percent?: number;
}

export interface OrderItemCreateInput {
  inventory_item_id: number;
  quantity: number;
  unit_price_cents?: number;
}

export interface OrderStatusUpdate {
  status: string;
}

export interface OrderPaymentCreateInput {
  payment_method: PaymentMethod;
  amount_cents: number;
  notes?: string;
}

export const fetchOrders = async (): Promise<Order[]> => {
  const response = await apiClient.get("/orders");
  return response.data;
};

export const createOrder = async (order: OrderCreateInput): Promise<Order> => {
  const response = await apiClient.post("/orders", order);
  return response.data;
};

export const addOrderItem = async (
  orderId: number,
  item: OrderItemCreateInput
): Promise<OrderItem> => {
  const response = await apiClient.post(`/orders/${orderId}/items`, item);
  return response.data;
};

export const submitOrder = async (orderId: number): Promise<Order> => {
  const response = await apiClient.post(`/orders/${orderId}/submit`);
  return response.data;
};

export const updateOrderStatus = async (
  orderId: number,
  status: OrderStatusUpdate
): Promise<Order> => {
  const response = await apiClient.post(`/orders/${orderId}/status`, status);
  return response.data;
};

export const addOrderPayment = async (
  orderId: number,
  payment: OrderPaymentCreateInput
): Promise<OrderPayment> => {
  const response = await apiClient.post(`/orders/${orderId}/payments`, payment);
  return response.data;
};

export const fetchOrderPayments = async (orderId: number): Promise<OrderPayment[]> => {
  const response = await apiClient.get(`/orders/${orderId}/payments`);
  return response.data;
};

export const recalculateOrder = async (orderId: number): Promise<Order> => {
  const response = await apiClient.post(`/orders/${orderId}/recalculate`);
  return response.data;
};

export const refundOrder = async (orderId: number): Promise<Order> => {
  const response = await apiClient.post(`/orders/${orderId}/refund`);
  return response.data;
};
