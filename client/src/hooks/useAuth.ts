import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      try {
        const response = await fetch('/auth/user', {
          credentials: 'same-origin'
        });
        
        if (response.status === 401) {
          return null; // User not authenticated
        }
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Auth check error:', error);
        return null;
      }
    },
    retry: false,
    refetchOnWindowFocus: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const demoLoginMutation = useMutation({
    mutationFn: async (name: string) => {
      console.log('Making demo login request for:', name);
      try {
        const response = await fetch('/auth/demo-login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ name }),
          credentials: 'same-origin'
        });
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        console.log('Demo login response:', data);
        return data;
      } catch (error) {
        console.error('Demo login error:', error);
        throw error;
      }
    },
    onSuccess: (user) => {
      console.log('Demo login successful, setting user:', user);
      queryClient.setQueryData(['auth', 'user'], user);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
    onError: (error) => {
      console.error('Demo login mutation error:', error);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/auth/logout', {
        method: 'POST',
        credentials: 'same-origin'
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'user'], null);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    loginDemo: demoLoginMutation.mutate,
    logout: logoutMutation.mutate,
    isDemoLoginLoading: demoLoginMutation.isPending,
    isLogoutLoading: logoutMutation.isPending,
  };
}