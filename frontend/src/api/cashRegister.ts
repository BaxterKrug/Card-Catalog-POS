import { apiClient } from "./client";

export interface CashRegisterSession {
  id: number;
  opened_by_user_id: number;
  opening_balance_cents: number;
  current_balance_cents: number;
  opened_at: string;
  closed_at: string | null;
  is_active: boolean;
  notes: string | null;
}

export interface CashRegisterTransaction {
  id: number;
  session_id: number;
  transaction_type: "starting_cash" | "sale" | "buylist_payout" | "deposit" | "adjustment";
  amount_cents: number;
  description: string;
  reference_type: string | null;
  reference_id: number | null;
  created_by_user_id: number;
  created_at: string;
  notes: string | null;
}

export interface CashRegisterSessionCreate {
  opening_balance_cents: number;
  notes?: string;
}

export interface CashRegisterDepositCreate {
  amount_cents: number;
  notes?: string;
}

export const getCurrentSession = async (): Promise<CashRegisterSession | null> => {
  const response = await apiClient.get<CashRegisterSession | null>("/cash-register/current-session");
  return response.data;
};

export const openSession = async (payload: CashRegisterSessionCreate): Promise<CashRegisterSession> => {
  const response = await apiClient.post<CashRegisterSession>("/cash-register/open-session", payload);
  return response.data;
};

export const closeSession = async (): Promise<CashRegisterSession> => {
  const response = await apiClient.post<CashRegisterSession>("/cash-register/close-session");
  return response.data;
};

export const createDeposit = async (payload: CashRegisterDepositCreate): Promise<CashRegisterTransaction> => {
  const response = await apiClient.post<CashRegisterTransaction>("/cash-register/deposit", payload);
  return response.data;
};

export const getTransactions = async (sessionId?: number): Promise<CashRegisterTransaction[]> => {
  const params = sessionId ? { session_id: sessionId } : {};
  const response = await apiClient.get<CashRegisterTransaction[]>("/cash-register/transactions", { params });
  return response.data;
};

export const recordCashTransaction = async (
  type: "sale" | "buylist_payout",
  amount_cents: number,
  description: string,
  reference_type?: string,
  reference_id?: number
): Promise<CashRegisterTransaction> => {
  const response = await apiClient.post<CashRegisterTransaction>("/cash-register/transaction", {
    transaction_type: type,
    amount_cents,
    description,
    reference_type,
    reference_id,
  });
  return response.data;
};
