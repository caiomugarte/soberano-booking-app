export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

let _getAccessToken: () => string | null = () => null
let _setAccessToken: (token: string) => void = () => {}
let _logout: () => void = () => {}

export function configureHttpClient(opts: {
  getAccessToken: () => string | null
  setAccessToken: (token: string) => void
  logout: () => void
}) {
  _getAccessToken = opts.getAccessToken
  _setAccessToken = opts.setAccessToken
  _logout = opts.logout
}

const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? ''
const TENANT_SLUG = (import.meta.env.VITE_TENANT_SLUG as string | undefined) ?? ''

async function doFetch(path: string, token: string | null, options?: RequestInit): Promise<Response> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (TENANT_SLUG) headers['x-tenant-slug'] = TENANT_SLUG
  return fetch(`${API_URL}${path}`, { ...options, headers, credentials: 'include' })
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await doFetch(path, _getAccessToken(), options)

  if (res.status === 401) {
    const refreshRes = await fetch(`${API_URL}/api/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
    if (!refreshRes.ok) {
      _logout()
      throw new ApiError('UNAUTHORIZED', 'Sessão expirada', 401)
    }
    const { accessToken } = (await refreshRes.json()) as { accessToken: string }
    _setAccessToken(accessToken)

    const retryRes = await doFetch(path, accessToken, options)
    if (!retryRes.ok) {
      _logout()
      throw new ApiError('UNAUTHORIZED', 'Sessão expirada', 401)
    }
    if (retryRes.status === 204) return undefined as T
    return retryRes.json() as Promise<T>
  }

  if (!res.ok) {
    const body = await res
      .json()
      .catch(() => ({ error: 'UNKNOWN', message: 'Erro desconhecido' })) as { error: string; message: string }
    throw new ApiError(body.error, body.message, res.status)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
