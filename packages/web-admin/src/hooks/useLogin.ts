import { useMutation } from '@tanstack/react-query';
import { platformRequest } from '../api/platform.ts';
import { useAuthStore } from '../stores/auth.store.ts';

export function useLogin() {
  const setToken = useAuthStore((s) => s.setToken);

  return useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }) => {
      const data = await platformRequest<{ token: string }>('/auth', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      return data;
    },
    onSuccess: ({ token }) => {
      setToken(token);
    },
  });
}
