import React, { createContext, useContext } from "react";
import { useBalance } from "@/hooks/useBalance";
import { useQueryClient } from "@tanstack/react-query";

interface BalanceContextType {
  dollarBalance: number;
  starBalance: number;
  dollarWinning: number;
  starWinning: number;
  isLoading: boolean;
  refreshBalance: () => void;
}

const BalanceContext = createContext<BalanceContextType>({
  dollarBalance: 0,
  starBalance: 0,
  dollarWinning: 0,
  starWinning: 0,
  isLoading: false,
  refreshBalance: () => {},
});

export const BalanceProvider = ({ children }: { children: React.ReactNode }) => {
  const queryClient = useQueryClient();
  const { data, isLoading } = useBalance();

  const refreshBalance = () => {
    queryClient.invalidateQueries({ queryKey: ["balance"] });
  };

  return (
    <BalanceContext.Provider
      value={{
        dollarBalance: data?.dollarBalance ?? 0,
        starBalance: data?.starBalance ?? 0,
        dollarWinning: data?.dollarWinning ?? 0,
        starWinning: data?.starWinning ?? 0,
        isLoading,
        refreshBalance,
      }}
    >
      {children}
    </BalanceContext.Provider>
  );
};

export const useBalanceContext = () => useContext(BalanceContext);
