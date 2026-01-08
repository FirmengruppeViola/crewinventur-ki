import { Capacitor, CapacitorHttp } from '@capacitor/core'
import { Directory, Filesystem } from '@capacitor/filesystem'
import { Share } from '@capacitor/share'

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
if (!API_BASE_URL) {
  throw new Error('VITE_API_BASE_URL missing for this build')
}

const DEFAULT_TIMEOUT_MS = 15000
export const SCAN_TIMEOUT_MS = 60000 // Längerer Timeout für KI-Scans

function normalizeNetworkError(error: unknown): Error {
  if (error instanceof Error) {
    if (error.name === 'AbortError') {
      return new Error('Request timeout. Bitte erneut versuchen.')
    }
    const message = error.message.toLowerCase()
    if (message.includes('failed to fetch') || message.includes('network')) {
      return new Error('Netzwerkfehler. Bitte Verbindung pruefen.')
    }
    return error
  }
  return new Error('Netzwerkfehler.')
}

function parseJsonBody(body: BodyInit | null | undefined): unknown {
  if (typeof body !== 'string' || body.length === 0) return undefined
  try {
    return JSON.parse(body)
  } catch {
    return body
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string | null,
  timeout: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const headers = new Headers(options.headers)
  const method = (options.method ?? 'GET').toUpperCase()
  const hasBody = typeof options.body === 'string' && options.body.length > 0

  if (hasBody && method !== 'GET' && method !== 'HEAD') {
    headers.set('Content-Type', 'application/json')
  }
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const response = await CapacitorHttp.request({
        url: `${API_BASE_URL}${path}`,
        method,
        headers: Object.fromEntries(headers.entries()),
        data: hasBody ? parseJsonBody(options.body) : undefined,
        connectTimeout: timeout,
        readTimeout: timeout,
      })

      if (response.status < 200 || response.status >= 300) {
        const message =
          response.data?.detail ||
          response.data?.message ||
          'Request fehlgeschlagen.'
        const error = new Error(message)
        ;(error as { status?: number }).status = response.status
        throw error
      }

      return response.data as T
    } catch (error) {
      throw normalizeNetworkError(error)
    }
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    timeout,
  )

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers,
      signal: controller.signal,
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      const message =
        payload?.detail || payload?.message || 'Request fehlgeschlagen.'
      const error = new Error(message)
      ;(error as { status?: number }).status = response.status
      throw error
    }

    return payload as T
  } catch (error) {
    throw normalizeNetworkError(error)
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  accessToken?: string | null,
  timeout: number = DEFAULT_TIMEOUT_MS,
): Promise<T> {
  const headers = new Headers()
  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`)
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    timeout,
  )

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'POST',
      body: formData,
      headers,
      signal: controller.signal,
    })

    const payload = await response.json().catch(() => null)
    if (!response.ok) {
      const message =
        payload?.detail || payload?.message || 'Request fehlgeschlagen.'
      const error = new Error(message)
      ;(error as { status?: number }).status = response.status
      throw error
    }

    return payload as T
  } catch (error) {
    throw normalizeNetworkError(error)
  } finally {
    clearTimeout(timeoutId)
  }
}

export async function apiDownload(
  path: string,
  filename: string,
  accessToken?: string | null,
): Promise<void> {
  const headers: Record<string, string> = {}
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const response = await CapacitorHttp.request({
        url: `${API_BASE_URL}${path}`,
        method: 'GET',
        headers,
        responseType: 'blob',
        connectTimeout: DEFAULT_TIMEOUT_MS,
        readTimeout: DEFAULT_TIMEOUT_MS,
      })

      if (response.status < 200 || response.status >= 300) {
        const message =
          response.data?.detail ||
          response.data?.message ||
          'Download fehlgeschlagen.'
        const error = new Error(message)
        ;(error as { status?: number }).status = response.status
        throw error
      }

      if (typeof response.data !== 'string' || response.data.length === 0) {
        throw new Error('Download fehlgeschlagen.')
      }

      const safeName = filename.replace(/[^\w.-]+/g, '_')
      const targetPath = `exports/${Date.now()}-${safeName}`

      await Filesystem.mkdir({
        path: 'exports',
        directory: Directory.Cache,
        recursive: true,
      })

      await Filesystem.writeFile({
        path: targetPath,
        directory: Directory.Cache,
        data: response.data,
      })

      const fileUri = await Filesystem.getUri({
        path: targetPath,
        directory: Directory.Cache,
      })

      await Share.share({
        title: safeName,
        url: fileUri.uri,
      })
      return
    } catch (error) {
      throw normalizeNetworkError(error)
    }
  }

  const controller = new AbortController()
  const timeoutId = window.setTimeout(
    () => controller.abort(),
    DEFAULT_TIMEOUT_MS,
  )

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: 'GET',
      headers,
      signal: controller.signal,
    })

    if (!response.ok) {
      const message = 'Download fehlgeschlagen.'
      const error = new Error(message)
      ;(error as { status?: number }).status = response.status
      throw error
    }

    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    link.click()
    URL.revokeObjectURL(url)
  } catch (error) {
    throw normalizeNetworkError(error)
  } finally {
    clearTimeout(timeoutId)
  }
}
