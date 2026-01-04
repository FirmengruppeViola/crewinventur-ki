import { Capacitor } from '@capacitor/core'
import { SecureStorage } from '@aparajita/capacitor-secure-storage'

type StorageValue = string | null

const isNative = Capacitor.isNativePlatform()

function getWebStorage(): Storage | null {
  if (typeof window === 'undefined') return null
  return window.localStorage ?? null
}

let warned = false
function warnOnce(message: string, error: unknown) {
  if (warned || !import.meta.env.DEV) return
  warned = true
  console.warn(message, error)
}

async function getSecureItem(key: string): Promise<StorageValue> {
  try {
    const value = await SecureStorage.getItem(key)
    return typeof value === 'string' ? value : null
  } catch {
    return null
  }
}

async function setSecureItem(key: string, value: string): Promise<void> {
  await SecureStorage.setItem(key, value)
}

async function removeSecureItem(key: string): Promise<void> {
  await SecureStorage.removeItem(key)
}

async function migrateLegacyValue(key: string): Promise<StorageValue> {
  const legacyStorage = getWebStorage()
  if (!legacyStorage) return null

  const legacyValue = legacyStorage.getItem(key)
  if (!legacyValue) return null

  try {
    await setSecureItem(key, legacyValue)
    legacyStorage.removeItem(key)
    return legacyValue
  } catch (error) {
    warnOnce('Secure storage migration failed.', error)
    return legacyValue
  }
}

export const authStorage = {
  async getItem(key: string): Promise<StorageValue> {
    if (!isNative) {
      return getWebStorage()?.getItem(key) ?? null
    }

    const secureValue = await getSecureItem(key)
    if (secureValue !== null) return secureValue

    return migrateLegacyValue(key)
  },

  async setItem(key: string, value: string): Promise<void> {
    if (!isNative) {
      getWebStorage()?.setItem(key, value)
      return
    }

    try {
      await setSecureItem(key, value)
      getWebStorage()?.removeItem(key)
    } catch (error) {
      warnOnce('Secure storage set failed.', error)
    }
  },

  async removeItem(key: string): Promise<void> {
    if (!isNative) {
      getWebStorage()?.removeItem(key)
      return
    }

    try {
      await removeSecureItem(key)
    } catch (error) {
      warnOnce('Secure storage remove failed.', error)
    } finally {
      getWebStorage()?.removeItem(key)
    }
  },
}
