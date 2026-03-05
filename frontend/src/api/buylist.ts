import { apiClient } from "./client";

export interface BuylistTransaction {
  id: number;
  customer_id: number;
  amount_cents: number;
  payment_method: "cash" | "store_credit" | "cashapp" | "venmo";
  notes: string | null;
  created_at: string;
}

export interface CreateBuylistTransactionPayload {
  customer_id: number;
  amount_cents: number;
  payment_method: "cash" | "store_credit" | "cashapp" | "venmo";
  notes?: string;
}

export interface UpdateBuylistTransactionPayload {
  customer_id?: number;
  amount_cents?: number;
  payment_method?: "cash" | "store_credit" | "cashapp" | "venmo";
  notes?: string;
}

export async function getBuylistTransactions(): Promise<BuylistTransaction[]> {
  const response = await apiClient.get<BuylistTransaction[]>("/buylist/");
  return response.data;
}

export async function createBuylistTransaction(
  payload: CreateBuylistTransactionPayload
): Promise<BuylistTransaction> {
  const response = await apiClient.post<BuylistTransaction>("/buylist/", payload);
  return response.data;
}

export async function updateBuylistTransaction(
  id: number,
  payload: UpdateBuylistTransactionPayload
): Promise<BuylistTransaction> {
  const response = await apiClient.patch<BuylistTransaction>(`/buylist/${id}`, payload);
  return response.data;
}
