import { useQuery } from "@tanstack/react-query";
import { fetchBalance } from "@/lib/telegram";

export const useBalance = () => {
  return useQuery({
    queryKey: ["balance"],
    queryFn: fetchBalance,
    // Fallback to zero balances if backend is not reachable
    placeholderData: { dollarBalance: 0, starBalance: 0 },
    retry: 2,
    refetchInterval: 30000, // refresh every 30s
  });
};
