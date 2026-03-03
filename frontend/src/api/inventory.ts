import { apiClient } from "./client";

export type InventoryCategory = "single" | "sealed" | "supply" | "other";
export type InventorySource = "player" | "supplier";

export interface InventoryItem {
  id: number;
  sku: string;
  name: string;
  category: InventoryCategory;
  source: InventorySource;
  set_code?: string | null;
  printing?: string | null;
  condition?: string | null;
  game_title?: string | null;
  acquisition_reference?: string | null;
  msrp_cents?: number | null;
  acquisition_cost_cents?: number | null;
  unit_price_cents: number;
  physical_quantity: number;
  allocated_quantity: number;
  available_quantity: number;
}

export interface InventoryCreateInput {
  sku: string;
  name: string;
  category: InventoryCategory;
  source: InventorySource;
  set_code?: string | null;
  printing?: string | null;
  condition?: string | null;
  game_title?: string | null;
  acquisition_reference?: string | null;
  acquisition_cost_cents?: number | null;
  unit_price_cents: number;
  physical_quantity: number;
}

export interface BulkReceiveItem {
  inventory_item_id: number;
  quantity: number;
}

export interface BulkReceiveInventoryRequest {
  items: BulkReceiveItem[];
  note?: string;
  actor?: string;
}

export async function fetchInventory(): Promise<InventoryItem[]> {
  const { data } = await apiClient.get<InventoryItem[]>("/inventory");
  return data;
}

export async function upsertInventoryItem(payload: InventoryCreateInput): Promise<InventoryItem> {
  const { data } = await apiClient.post<InventoryItem>("/inventory", payload);
  return data;
}

export async function bulkReceiveInventory(payload: BulkReceiveInventoryRequest): Promise<InventoryItem[]> {
  const { data } = await apiClient.post<InventoryItem[]>("/inventory/receive-bulk", payload);
  return data;
}

export async function deleteInventoryItem(itemId: number): Promise<void> {
  await apiClient.delete(`/inventory/${itemId}`);
}

