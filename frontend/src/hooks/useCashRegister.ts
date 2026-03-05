import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import * as cashRegisterApi from "../api/cashRegister";

export const useCashRegisterSession = () => {
  return useQuery({
    queryKey: ["cashRegisterSession"],
    queryFn: cashRegisterApi.getCurrentSession,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
};

export const useOpenSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cashRegisterApi.openSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashRegisterSession"] });
    },
  });
};

export const useCloseSession = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cashRegisterApi.closeSession,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashRegisterSession"] });
    },
  });
};

export const useCreateDeposit = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cashRegisterApi.createDeposit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashRegisterSession"] });
      queryClient.invalidateQueries({ queryKey: ["cashRegisterTransactions"] });
    },
  });
};

export const useCreateAdjustment = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: cashRegisterApi.createAdjustment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashRegisterSession"] });
      queryClient.invalidateQueries({ queryKey: ["cashRegisterTransactions"] });
    },
  });
};

export const useCashRegisterTransactions = (sessionId?: number) => {
  return useQuery({
    queryKey: ["cashRegisterTransactions", sessionId],
    queryFn: () => cashRegisterApi.getTransactions(sessionId),
  });
};

export const useRecordCashTransaction = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({
      type,
      amount_cents,
      description,
      reference_type,
      reference_id,
    }: {
      type: "sale" | "buylist_payout";
      amount_cents: number;
      description: string;
      reference_type?: string;
      reference_id?: number;
    }) => cashRegisterApi.recordCashTransaction(type, amount_cents, description, reference_type, reference_id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cashRegisterSession"] });
      queryClient.invalidateQueries({ queryKey: ["cashRegisterTransactions"] });
    },
  });
};
