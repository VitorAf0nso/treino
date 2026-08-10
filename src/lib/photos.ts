import { useEffect, useState } from 'react'
import { photoGet } from '../db'

export const MAX_SIDE = 1080
export const QUALITY = 0.75

/**
 * Reduz para 1080px no maior lado e recomprime em JPEG.
 * Foto de 12 MP (~4 MB) vira ~200 kB — 36 fotos/ano ficam em ~7 MB.
 */
export async function compressImage(
  file: File | Blob,
  maxSide = MAX_SIDE,
  quality = QUALITY,
): Promise<{ blob: Blob; w: number; h: number }> {
  const bitmap = await loadBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const w = Math.round(bitmap.width * scale)
  const h = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas indisponivel')
  ctx.drawImage(bitmap as CanvasImageSource, 0, 0, w, h)
  if ('close' in bitmap && typeof bitmap.close === 'function') bitmap.close()

  const blob = await new Promise<Blob | null>((res) =>
    canvas.toBlob(res, 'image/jpeg', quality),
  )
  if (!blob) throw new Error('falha ao comprimir')
  return { blob, w, h }
}

async function loadBitmap(file: File | Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ('createImageBitmap' in window) {
    try {
      // imageOrientation resolve fotos de iPhone que vem rotacionadas por EXIF
      return await createImageBitmap(file, { imageOrientation: 'from-image' })
    } catch {
      /* cai no fallback */
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise<void>((res, rej) => {
      img.onload = () => res()
      img.onerror = () => rej(new Error('imagem invalida'))
      img.src = url
    })
    return img
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 5000)
  }
}

/** Object URL de uma foto guardada no IndexedDB, revogado ao desmontar. */
export function usePhotoUrl(id: string | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    let dead = false
    let made: string | null = null
    if (!id) {
      setUrl(null)
      return
    }
    photoGet(id)
      .then((blob) => {
        if (dead || !blob) return
        made = URL.createObjectURL(blob)
        setUrl(made)
      })
      .catch(() => setUrl(null))
    return () => {
      dead = true
      if (made) URL.revokeObjectURL(made)
    }
  }, [id])
  return url
}

export function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} kB`
  return `${(n / (1024 * 1024)).toFixed(1)} MB`
}
