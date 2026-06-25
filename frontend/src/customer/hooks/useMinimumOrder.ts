import { useState, useEffect, useCallback } from "react";
import { getApiV1Base } from "../../lib/apiBase";

const DEFAULT_MINIMUM_ORDER_VALUE = 2000;

export interface MinimumOrderInfo {
  minimumOrderValue: number;
  formattedMinimum: string;
  loading: boolean;
  error: string | null;
}

export function useMinimumOrder() {
  const [minimumOrderValue, setMinimumOrderValue] = useState<number>(DEFAULT_MINIMUM_ORDER_VALUE);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMinimumOrderValue = useCallback(async () => {
    try {
      const base = getApiV1Base();
      const res = await fetch(`${base}/cms/commerce-settings`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data?.minimumOrderValue !== undefined) {
          setMinimumOrderValue(json.data.minimumOrderValue);
        }
      }
      setError(null);
    } catch (err) {
      console.error('Failed to fetch minimum order value:', err);
      setError('Unable to load minimum order value');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMinimumOrderValue();
  }, [fetchMinimumOrderValue]);

  return {
    minimumOrderValue,
    formattedMinimum: `₹${minimumOrderValue.toLocaleString('en-IN')}`,
    loading,
    error,
    refresh: fetchMinimumOrderValue,
  };
}

export interface MinimumOrderValidation {
  cartSubtotal: number;
  minimumOrderValue: number;
  meetsMinimum: boolean;
  remainingAmount: number;
  progressPercentage: number;
  formattedCartSubtotal: string;
  formattedMinimum: string;
  formattedRemaining: string;
}

export function useMinimumOrderValidation(cartSubtotal: number): MinimumOrderValidation {
  const { minimumOrderValue, formattedMinimum } = useMinimumOrder();
  
  const meetsMinimum = cartSubtotal >= minimumOrderValue;
  const remainingAmount = Math.max(0, minimumOrderValue - cartSubtotal);
  const progressPercentage = Math.min(100, Math.round((cartSubtotal / minimumOrderValue) * 100));
  
  return {
    cartSubtotal,
    minimumOrderValue,
    meetsMinimum,
    remainingAmount,
    progressPercentage,
    formattedCartSubtotal: `₹${cartSubtotal.toLocaleString('en-IN')}`,
    formattedMinimum,
    formattedRemaining: `₹${remainingAmount.toLocaleString('en-IN')}`,
  };
}