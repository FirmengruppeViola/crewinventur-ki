export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string | null,
): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set('Content-Type', 'application/json')
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload?.detail || payload?.message || 'Request fehlgeschlagen.'
    throw new Error(message)
  }

  return payload as T
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  accessToken?: string | null,
): Promise<T> {
  const headers = new Headers()
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    body: formData,
    headers,
  })

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      payload?.detail || payload?.message || 'Request fehlgeschlagen.'
    throw new Error(message)
  }

  return payload as T
}
