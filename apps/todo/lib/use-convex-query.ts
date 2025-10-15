"use client";

import { useQuery as useConvexQuery, useMutation as useConvexMutation } from "convex/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useToast } from "@/components/ui/use-toast";

interface UseConvexQueryOptions {
  retryOnError?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: Error) => void;
  onSuccess?: (data: any) => void;
}

interface UseConvexQueryResult<T> {
  data: T | undefined;
  isLoading: boolean;
  error: Error | null;
  retry: () => void;
  retryCount: number;
}

export function useConvexQueryWithErrorHandling<T>(
  query: any,
  args?: any,
  options: UseConvexQueryOptions = {}
): UseConvexQueryResult<T> {
  const {
    retryOnError = true,
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onSuccess,
  } = options;

  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Use the original Convex query
  const convexData = useConvexQuery(query, args);

  // Handle errors and retries
  useEffect(() => {
    // Check if convexData is an Error object
    if (convexData && typeof convexData === 'object' && 'message' in convexData && convexData instanceof Error) {
      const error = convexData as Error;
      setError(error);
      onError?.(error);

      // Auto-retry if enabled and we haven't exceeded max retries
      if (retryOnError && retryCount < maxRetries && !isRetrying) {
        setIsRetrying(true);
        const delay = Math.min(retryDelay * Math.pow(2, retryCount), 10000); // Exponential backoff
        
        retryTimeoutRef.current = setTimeout(() => {
          setRetryCount(prev => prev + 1);
          setError(null);
          setIsRetrying(false);
        }, delay);
      } else if (retryCount >= maxRetries) {
        // Show error toast after max retries
        toast({
          title: "Connection Error",
          description: "Failed to sync with server. Working in offline mode.",
          variant: "destructive",
        });
      }
    } else if (convexData !== undefined && convexData !== null && !(convexData instanceof Error)) {
      // Success case
      setError(null);
      setRetryCount(0);
      setIsRetrying(false);
      onSuccess?.(convexData);
    }
  }, [convexData, retryCount, maxRetries, retryOnError, retryDelay, isRetrying, onError, onSuccess, toast]);

  // Manual retry function
  const retry = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  return {
    data: convexData instanceof Error ? undefined : convexData,
    isLoading: convexData === undefined || isRetrying,
    error,
    retry,
    retryCount,
  };
}

export function useConvexMutationWithErrorHandling<T>(
  mutation: any,
  options: UseConvexQueryOptions = {}
) {
  const {
    retryOnError = true,
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onSuccess,
  } = options;

  const [error, setError] = useState<Error | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const { toast } = useToast();

  // Use the original Convex mutation
  const convexMutation = useConvexMutation(mutation);

  // Wrapped mutation with error handling
  const wrappedMutation = useCallback(async (args?: any) => {
    try {
      setError(null);
      const result = await convexMutation(args);
      setRetryCount(0);
      onSuccess?.(result);
      return result;
    } catch (err) {
      const error = err as Error;
      setError(error);
      onError?.(error);

      // Show error toast
      toast({
        title: "Sync Error",
        description: "Failed to sync changes. They will be saved locally.",
        variant: "destructive",
      });

      throw error;
    }
  }, [convexMutation, onError, onSuccess, toast]);

  const retry = useCallback(() => {
    setError(null);
    setRetryCount(0);
  }, []);

  return {
    mutate: wrappedMutation,
    error,
    retry,
    retryCount,
  };
}
