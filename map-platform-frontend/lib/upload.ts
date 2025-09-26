import { useStudioStore } from '@/lib/store';

export async function uploadAsset(file: File): Promise<{ url: string; public_id: string }> {
  const backend = useStudioStore.getState().backend;
  try {
    const fd = new FormData();
    fd.append('file', file);
    const res = await fetch(`${backend}/api/upload`, { method: 'POST', body: fd });
    if (!res.ok) {
      throw new Error(`Upload failed with status ${res.status}`);
    }
    const json = await res.json();
    return { url: json.url, public_id: json.public_id };
  } catch (error) {
    console.warn('Falling back to local preview for upload', error);
    return { url: URL.createObjectURL(file), public_id: `local-${Date.now()}` };
  }
}
