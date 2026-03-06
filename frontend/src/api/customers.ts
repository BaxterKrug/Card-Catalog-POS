import { apiClient } from "./client";
import { type DiscountType } from "./orders";

export interface Customer {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  discord_id?: string | null;
  default_discount_type?: DiscountType | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerCreateInput {
  name: string;
  email?: string;
  phone?: string;
  discord_id?: string;
  default_discount_type?: DiscountType;
  notes?: string;
}

export async function fetchCustomers(): Promise<Customer[]> {
  const { data } = await apiClient.get<Customer[]>("/customers");
  return data;
}

export async function createCustomer(payload: CustomerCreateInput): Promise<Customer> {
  const { data } = await apiClient.post<Customer>("/customers", payload);
  return data;
}

export async function deleteCustomer(customerId: number): Promise<void> {
  await apiClient.delete(`/customers/${customerId}`);
}
