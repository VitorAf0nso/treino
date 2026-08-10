import { photoGet, photoSet } from '../db'
import { getState, replaceAll, update } from '../store'
import type { AppData } from '../types'
import { todayISO } from './date'

interface Backup {
  app: 'treino'
  exportedAt: string
  data: AppData
  photos?: Record<string, string> // id -> dataURL
}

function blobToDataUrl(b: Blob): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader()
    r.onload = () => res(String(r.result))
    r.onerror = () => rej(r.error)
    r.readAsDataURL(b)
  })
}

async function dataUrlToBlob(u: string): Promise<Blob> {
  const r = await fetch(u)
  return r.blob()
}

export async function buildBackup(includePhotos: boolean): Promise<Blob> {
  const data = getState()
  const out: Backup = { app: 'treino', exportedAt: new Date().toISOString(), data }
  if (includePhotos) {
    const photos: Record<string, string> = {}
    for (const p of data.photos) {
      const b = await photoGet(p.id)
      if (b) photos[p.id] = await blobToDataUrl(b)
    }
    out.photos = photos
  }
  return new Blob([JSON.stringify(out)], { type: 'application/json' })
}

export async function exportBackup(includePhotos: boolean): Promise<'shared' | 'downloaded'> {
  const blob = await buildBackup(includePhotos)
  const name = `treino-${todayISO()}${includePhotos ? '-com-fotos' : ''}.json`
  const file = new File([blob], name, { type: 'application/json' })

  let result: 'shared' | 'downloaded' = 'downloaded'
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean }
  if (nav.share && nav.canShare?.({ files: [file] })) {
    try {
      await nav.share({ files: [file], title: name })
      result = 'shared'
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') throw err
      download(blob, name)
    }
  } else {
    download(blob, name)
  }

  update((d) => {
    d.settings.lastExportAt = Date.now()
  })
  return result
}

function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

export interface ImportSummary {
  sessions: number
  weights: number
  foodEntries: number
  photos: number
  photosRestored: number
}

export async function importBackup(file: File): Promise<ImportSummary> {
  const text = await file.text()
  const parsed = JSON.parse(text) as Backup | AppData
  const backup: Backup =
    'app' in parsed && parsed.app === 'treino'
      ? (parsed as Backup)
      : { app: 'treino', exportedAt: '', data: parsed as AppData }

  if (!backup.data || typeof backup.data !== 'object') throw new Error('arquivo invalido')

  let restored = 0
  if (backup.photos) {
    for (const [id, url] of Object.entries(backup.photos)) {
      try {
        await photoSet(id, await dataUrlToBlob(url))
        restored++
      } catch {
        /* uma foto ruim nao derruba o import */
      }
    }
  }

  replaceAll(backup.data)
  const d = backup.data
  return {
    sessions: d.sessions?.length ?? 0,
    weights: d.weights?.length ?? 0,
    foodEntries: d.foodLog?.length ?? 0,
    photos: d.photos?.length ?? 0,
    photosRestored: restored,
  }
}
