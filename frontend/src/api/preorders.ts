import { apiClient } from "./client";

// Preorder Item interfaces
export interface PreorderItem {
  id: number;
  inventory_item_id: number;
  release_date: string | null;
  preorder_quantity: number;
  preorder_quantity_allocated: number;
  quantity_cap: number | null;  // Keep for backward compatibility, always 1
  notes: string | null;
  created_at: string;
  updated_at: string;
  inventory_item?: any; // Can expand with full InventoryItem interface if needed
}

export interface PreorderItemCreate {
  inventory_item_id: number;
  release_date?: string;
  preorder_quantity: number;
  notes?: string;
}

export interface PreorderItemCreateWithProduct {
  product_name: string;
  sku: string;
  game_title: string;
  category?: string;
  msrp_cents?: number;
  release_date?: string;
  preorder_quantity: number;
  notes?: string;
}

export interface PreorderItemUpdate {
  release_date?: string;
  preorder_quantity?: number;
  notes?: string;
  msrp_cents?: number;
  set_code?: string;
}

export interface PreorderSetProduct {
  product_name: string;
  sku: string;
  msrp_cents?: number;
  preorder_quantity: number;
}

export interface PreorderSetCreate {
  game_title: string;
  release_date?: string;
  category?: string;
  notes?: string;
  products: PreorderSetProduct[];
}

// Preorder Claim interfaces
export interface PreorderClaim {
  id: number;
  preorder_order_id: number;
  preorder_item_id: number;
  customer_id: number;
  quantity_requested: number;
  quantity_allocated: number;
  status: string;
  is_paid: boolean;
  payment_amount_cents: number | null;
  payment_method: string | null;
  payment_date: string | null;
  payment_notes: string | null;
  created_at: string;
  updated_at: string;
  preorder_item?: PreorderItem;
  customer?: any; // Can expand with full Customer interface if needed
}

// Preorder Order interface (groups claims by customer)
export interface PreorderOrder {
  id: number;
  customer_id: number;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  customer?: any;
  claims: PreorderClaim[];
}

export interface PreorderClaimCreate {
  preorder_item_id: number;
  customer_id: number;
  quantity_requested: number;
}

export interface PreorderClaimUpdate {
  quantity_requested?: number;
  quantity_allocated?: number;
  status?: string;
}

export interface PreorderClaimPaymentUpdate {
  is_paid: boolean;
  payment_amount_cents: number;
  payment_method: string;
  payment_notes?: string;
}

export interface PreorderClaimFulfillRequest {
  mark_picked_up?: boolean;
  note?: string;
}

export interface PreorderReleaseRequest {
  note?: string;
}

// Preorder Items API
export const fetchPreorderItems = async (): Promise<PreorderItem[]> => {
  const response = await apiClient.get("/preorders/items");
  return response.data;
};

export const createPreorderItem = async (item: PreorderItemCreate): Promise<PreorderItem> => {
  const response = await apiClient.post("/preorders/items", item);
  return response.data;
};

export const createPreorderWithProduct = async (item: PreorderItemCreateWithProduct): Promise<PreorderItem> => {
  const response = await apiClient.post("/preorders/items/with-product", item);
  return response.data;
};

export const createPreorderSet = async (set: PreorderSetCreate): Promise<PreorderItem[]> => {
  const response = await apiClient.post("/preorders/sets", set);
  return response.data;
};

export const updatePreorderItem = async (
  itemId: number,
  update: PreorderItemUpdate
): Promise<PreorderItem> => {
  const response = await apiClient.patch(`/preorders/items/${itemId}`, update);
  return response.data;
};

export const releasePreorderToInventory = async (
  itemId: number,
  request: PreorderReleaseRequest
): Promise<PreorderItem> => {
  const response = await apiClient.post(`/preorders/items/${itemId}/release`, request);
  return response.data;
};

// Preorder Claims API
export const fetchPreorderClaims = async (isPaid?: boolean): Promise<PreorderClaim[]> => {
  const params = isPaid !== undefined ? { is_paid: isPaid } : {};
  const response = await apiClient.get("/preorders/claims", { params });
  return response.data;
};

// Preorder Orders API (grouped claims by customer)
export const fetchPreorderOrders = async (): Promise<PreorderOrder[]> => {
  const response = await apiClient.get("/preorders/orders");
  return response.data;
};

export const createPreorderClaim = async (claim: PreorderClaimCreate): Promise<PreorderClaim> => {
  const response = await apiClient.post("/preorders/claims", claim);
  return response.data;
};

export const updatePreorderClaim = async (
  claimId: number,
  update: PreorderClaimUpdate
): Promise<PreorderClaim> => {
  const response = await apiClient.patch(`/preorders/claims/${claimId}`, update);
  return response.data;
};

export const recordPreorderPayment = async (
  claimId: number,
  payment: PreorderClaimPaymentUpdate
): Promise<PreorderClaim> => {
  const response = await apiClient.post(`/preorders/claims/${claimId}/payment`, payment);
  return response.data;
};

export const cancelPreorderClaim = async (claimId: number): Promise<PreorderClaim> => {
  const response = await apiClient.post(`/preorders/claims/${claimId}/cancel`);
  return response.data;
};

export const fulfillPreorderClaim = async (
  claimId: number,
  request: PreorderClaimFulfillRequest
): Promise<PreorderClaim> => {
  const response = await apiClient.post(`/preorders/claims/${claimId}/fulfill`, request);
  return response.data;
};

export const unfulfillPreorderClaim = async (claimId: number): Promise<PreorderClaim> => {
  const response = await apiClient.post(`/preorders/claims/${claimId}/unfulfill`);
  return response.data;
};
