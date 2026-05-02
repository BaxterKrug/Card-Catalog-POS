import { apiClient } from "./client";

export interface StoreCreditBalance {
  customer_id: number;
  balance_cents: number;
  balance_dollars: number;
}

export interface StoreCreditTransaction {
  id: number;
  customer_id: number;
  transaction_type: string;
  amount_cents: number;
  reference_type?: string | null;
  reference_id?: number | null;
  created_by_user_id: number;
  created_at: string;
  notes?: string | null;
}

export const getStoreCreditBalance = async (customerId: number): Promise<StoreCreditBalance> => {
  const response = await apiClient.get(`/customers/${customerId}/store-credit/balance`);
  return response.data;
};

export const getStoreCreditHistory = async (customerId: number, limit?: number): Promise<StoreCreditTransaction[]> => {
  const response = await apiClient.get(`/customers/${customerId}/store-credit/history`, {
    params: { limit },
  });
  return response.data;
};

export interface StoreCreditAddRequest {
  amount_cents: number;
  transaction_type: string;
  notes?: string;
}

export const addStoreCredit = async (customerId: number, data: StoreCreditAddRequest): Promise<StoreCreditTransaction> => {
  const response = await apiClient.post(`/customers/${customerId}/store-credit/add`, data);
  return response.data;
};

export interface StoreCreditAdjustRequest {
  amount_cents: number;
  notes: string;
}

export const adjustStoreCredit = async (customerId: number, data: StoreCreditAdjustRequest): Promise<StoreCreditTransaction> => {
  const response = await apiClient.post(`/customers/${customerId}/store-credit/adjust`, data);
  return response.data;
};
