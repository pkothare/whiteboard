import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import type { User } from '@shared/schema';

export function useAuth() {
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery<User | null>({
    queryKey: ['auth', 'user'],
    queryFn: async () => {
      try {
        const response = await fetch('/auth/user');
        if (!response.ok) {
          if (response.status === 401) {
            return null;
          }
          throw new Error('Failed to fetch user');
        }
        return response.json();
      } catch (error) {
        return null;
      }
    },
    retry: false,
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
      await apiRequest('/auth/logout', {
        method: 'POST',
      });
    },
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'user'], null);
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });

  const isAuthenticated = !!user;

  const login = {
    google: () => {
      window.location.href = '/auth/google';
    },
    apple: () => {
      window.location.href = '/auth/apple';
    },
  };

  const loginDemo = (name: string) => {
    demoLoginMutation.mutate(name);
  };

  const logout = () => {
    logoutMutation.mutate();
  };

  return {
    user,
    isLoading: isLoading || demoLoginMutation.isPending,
    isAuthenticated,
    login,
    loginDemo,
    logout,
    isLoggingOut: logoutMutation.isPending,
  };
}