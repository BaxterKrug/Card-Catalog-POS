import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchTodayChecklist,
  completeChecklistItem,
  uncheckChecklistItem,
  ChecklistCompletionCreate,
} from "../api/checklist";

export const useTodayChecklist = () => {
  return useQuery({
    queryKey: ["checklist", "today"],
    queryFn: fetchTodayChecklist,
    refetchInterval: 60000, // Refresh every minute to catch 8 AM reset
  });
};

export const useCompleteChecklistItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (completion: ChecklistCompletionCreate) =>
      completeChecklistItem(completion),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist", "today"] });
    },
  });
};

export const useUncheckChecklistItem = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (completionId: number) => uncheckChecklistItem(completionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["checklist", "today"] });
    },
  });
};
