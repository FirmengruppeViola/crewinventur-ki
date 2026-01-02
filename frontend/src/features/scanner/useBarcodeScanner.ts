import { Capacitor } from '@capacitor/core'
import { BarcodeScanner } from '@capacitor-mlkit/barcode-scanning'

type ScanResult = {
  rawValue: string
}

declare class BarcodeDetector {
  constructor(options?: { formats?: string[] })
  detect(image: ImageBitmapSource): Promise<ScanResult[]>
}

async function pickImageFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.onchange = () => {
      resolve(input.files?.[0] ?? null)
    }
    input.click()
  })
}

async function scanWithBarcodeDetector(): Promise<string | null> {
  if (typeof BarcodeDetector === 'undefined') {
    throw new Error('Barcode scanning not supported in this browser.')
  }

  const file = await pickImageFile()
  if (!file) return null

  const imageBitmap = await createImageBitmap(file)
  const detector = new BarcodeDetector()
  const barcodes = await detector.detect(imageBitmap)

  return barcodes[0]?.rawValue ?? null
}

export function useBarcodeScanner() {
  const scanBarcode = async () => {
    if (Capacitor.isNativePlatform()) {
      const result = await BarcodeScanner.scan()
      return result.barcodes[0]?.rawValue ?? null
    }

    return scanWithBarcodeDetector()
  }

  return {
    scanBarcode,
    isSupported: Capacitor.isNativePlatform() || typeof BarcodeDetector !== 'undefined',
  }
}
