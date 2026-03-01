import { useQuery } from "@tanstack/react-query";
import { getBuylistTransactions } from "../api/buylist";

export function useBuylistTransactions() {
  return useQuery({
    queryKey: ["buylist"],
    queryFn: getBuylistTransactions,
  });
}
