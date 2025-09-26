import type { AssetKind, LibraryAsset, PlaceTypeDefinition } from '@/types'

function withBase(url: string, path: string): string {
  return `${url.replace(/\/$/, '')}${path}`
}

async function parseJson<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || `Request failed with status ${res.status}`)
  }
  return res.json() as Promise<T>
}

export async function fetchAssets(backend: string, type?: AssetKind): Promise<LibraryAsset[]> {
  const search = type ? `?type=${encodeURIComponent(type)}` : ''
  const res = await fetch(withBase(backend, `/api/assets${search}`))
  const data = await parseJson<{ items: LibraryAsset[] }>(res)
  return data.items
}

export async function createAsset(
  backend: string,
  payload: { type: AssetKind; label: string; url: string; publicId?: string },
): Promise<LibraryAsset> {
  const res = await fetch(withBase(backend, '/api/assets'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await parseJson<{ item: LibraryAsset }>(res)
  return data.item
}

export async function updateAsset(
  backend: string,
  id: string,
  payload: Partial<Pick<LibraryAsset, 'label' | 'url' | 'publicId'>>,
): Promise<LibraryAsset> {
  const res = await fetch(withBase(backend, `/api/assets/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await parseJson<{ item: LibraryAsset }>(res)
  return data.item
}

export async function deleteAsset(backend: string, id: string): Promise<void> {
  const res = await fetch(withBase(backend, `/api/assets/${id}`), { method: 'DELETE' })
  await parseJson<{ ok: boolean }>(res)
}

export async function fetchPlaceTypes(backend: string): Promise<PlaceTypeDefinition[]> {
  const res = await fetch(withBase(backend, '/api/place-types'))
  const data = await parseJson<{ items: PlaceTypeDefinition[] }>(res)
  return data.items
}

export async function createPlaceType(
  backend: string,
  payload: { name: string; description?: string },
): Promise<PlaceTypeDefinition> {
  const res = await fetch(withBase(backend, '/api/place-types'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await parseJson<{ item: PlaceTypeDefinition }>(res)
  return data.item
}

export async function updatePlaceType(
  backend: string,
  id: string,
  payload: Partial<Pick<PlaceTypeDefinition, 'name' | 'description'>>,
): Promise<PlaceTypeDefinition> {
  const res = await fetch(withBase(backend, `/api/place-types/${id}`), {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const data = await parseJson<{ item: PlaceTypeDefinition }>(res)
  return data.item
}

export async function deletePlaceType(backend: string, id: string): Promise<void> {
  const res = await fetch(withBase(backend, `/api/place-types/${id}`), { method: 'DELETE' })
  await parseJson<{ ok: boolean }>(res)
}
