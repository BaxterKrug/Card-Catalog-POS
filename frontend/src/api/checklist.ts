import { apiClient } from "./client";

export interface ChecklistItemWithStatus {
  id: number;
  category: "opening" | "closing" | "maintenance";
  task_name: string;
  display_order: number;
  is_completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  notes: string | null;
}

export interface ChecklistCompletionCreate {
  template_id: number;
  completion_date: string; // ISO date string (YYYY-MM-DD)
  notes?: string;
}

export interface ChecklistCompletionRead {
  id: number;
  template_id: number;
  user_id: number;
  user_name: string;
  completion_date: string;
  completed_at: string;
  notes: string | null;
}

export const fetchTodayChecklist = async (): Promise<ChecklistItemWithStatus[]> => {
  const response = await apiClient.get("/checklist/today");
  return response.data;
};

export const completeChecklistItem = async (
  completion: ChecklistCompletionCreate
): Promise<ChecklistCompletionRead> => {
  const response = await apiClient.post("/checklist/complete", completion);
  return response.data;
};

export const uncheckChecklistItem = async (completionId: number): Promise<void> => {
  await apiClient.delete(`/checklist/complete/${completionId}`);
};

export const fetchChecklistHistory = async (
  startDate: string,
  endDate: string,
  templateId?: number,
  userId?: number
): Promise<ChecklistCompletionRead[]> => {
  const params = new URLSearchParams();
  params.append("start_date", startDate);
  params.append("end_date", endDate);
  if (templateId) params.append("template_id", templateId.toString());
  if (userId) params.append("user_id", userId.toString());

  const response = await apiClient.get(`/checklist/history?${params.toString()}`);
  return response.data;
};
