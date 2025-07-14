import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

export function useAuth() {
  const { data: user, isLoading } = useQuery({
    queryKey: ['/api/auth/user'],
    retry: false,
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

  const logout = () => {
    window.location.href = '/api/logout';
  };

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    loginDemo: demoLoginMutation.mutate,
    logout,
    isDemoLoginLoading: demoLoginMutation.isPending,
  };
}