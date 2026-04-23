import { apiFetch } from './http-client'

export async function apiLogin(
  email: string,
  password: string,
): Promise<{ accessToken: string }> {
  return apiFetch<{ accessToken: string }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}
