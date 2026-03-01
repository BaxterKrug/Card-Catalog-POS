import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { fetchInventory, bulkReceiveInventory, BulkReceiveInventoryRequest } from "../api/inventory";

export function useInventory() {
  return useQuery({
    queryKey: ["inventory"],
    queryFn: fetchInventory,
    staleTime: 30_000,
  });
}

export function useBulkReceiveInventory() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (request: BulkReceiveInventoryRequest) => bulkReceiveInventory(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
}
