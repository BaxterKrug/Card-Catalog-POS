import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchPreorderItems,
  fetchPreorderClaims,
  fetchPreorderOrders,
  createPreorderItem,
  createPreorderWithProduct,
  createPreorderSet,
  updatePreorderItem,
  releasePreorderToInventory,
  createPreorderClaim,
  updatePreorderClaim,
  recordPreorderPayment,
  cancelPreorderClaim,
  fulfillPreorderClaim,
  unfulfillPreorderClaim,
  PreorderItemCreate,
  PreorderItemCreateWithProduct,
  PreorderSetCreate,
  PreorderItemUpdate,
  PreorderClaimCreate,
  PreorderClaimUpdate,
  PreorderClaimPaymentUpdate,
  PreorderClaimFulfillRequest,
  PreorderReleaseRequest,
} from "../api/preorders";

// Hooks for Preorder Items
export const usePreorderItems = () => {
  return useQuery({
    queryKey: ["preorders", "items"],
    queryFn: fetchPreorderItems,
  });
};

// Hook for Preorder Orders (grouped by customer)
export const usePreorderOrders = () => {
  return useQuery({
    queryKey: ["preorders", "orders"],
    queryFn: fetchPreorderOrders,
  });
};

export const useCreatePreorderItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (item: PreorderItemCreate | PreorderItemCreateWithProduct) => {
      // Check if it has product details (PreorderItemCreateWithProduct)
      if ('product_name' in item) {
        return createPreorderWithProduct(item);
      }
      return createPreorderItem(item);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preorders", "items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
};

export const useCreatePreorderSet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (set: PreorderSetCreate) => createPreorderSet(set),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preorders", "items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
};

export const useUpdatePreorderItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, update }: { itemId: number; update: PreorderItemUpdate }) =>
      updatePreorderItem(itemId, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preorders", "items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] }); // Invalidate inventory since we can update MSRP and set code
    },
  });
};

export const useReleasePreorderToInventory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ itemId, request }: { itemId: number; request: PreorderReleaseRequest }) =>
      releasePreorderToInventory(itemId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preorders", "items"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
};

// Hooks for Preorder Claims
export const usePreorderClaims = (isPaid?: boolean) => {
  return useQuery({
    queryKey: ["preorders", "claims", isPaid],
    queryFn: () => fetchPreorderClaims(isPaid),
  });
};

export const useCreatePreorderClaim = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (claim: PreorderClaimCreate) => createPreorderClaim(claim),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preorders", "claims"] });
      queryClient.invalidateQueries({ queryKey: ["preorders", "items"] });
      queryClient.invalidateQueries({ queryKey: ["preorders", "orders"] });
    },
  });
};

export const useUpdatePreorderClaim = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, update }: { claimId: number; update: PreorderClaimUpdate }) =>
      updatePreorderClaim(claimId, update),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preorders", "claims"] });
    },
  });
};

export const useRecordPreorderPayment = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, payment }: { claimId: number; payment: PreorderClaimPaymentUpdate }) =>
      recordPreorderPayment(claimId, payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preorders", "claims"] });
      queryClient.invalidateQueries({ queryKey: ["cash-register"] });
    },
  });
};

export const useCancelPreorderClaim = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (claimId: number) => cancelPreorderClaim(claimId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preorders", "claims"] });
      queryClient.invalidateQueries({ queryKey: ["preorders", "items"] });
      queryClient.invalidateQueries({ queryKey: ["cash-register"] });
    },
  });
};

export const useFulfillPreorderClaim = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ claimId, request }: { claimId: number; request: PreorderClaimFulfillRequest }) =>
      fulfillPreorderClaim(claimId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preorders", "claims"] });
      queryClient.invalidateQueries({ queryKey: ["inventory"] });
    },
  });
};

export const useUnfulfillPreorderClaim = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (claimId: number) => unfulfillPreorderClaim(claimId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preorders", "claims"] });
    },
  });
};
