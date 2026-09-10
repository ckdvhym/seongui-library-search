import { list } from '@vercel/blob';
import { requireAdmin } from './_admin-auth.mjs';

export default async function handler(request) {
  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    const { blobs } = await list({ prefix: 'schools/seongui-high/', limit: 100 });
    const byPath = Object.fromEntries(blobs.map(b => [b.pathname, {
      size: b.size,
      uploadedAt: b.uploadedAt,
      etag: b.etag
    }]));

    const catalog = byPath['schools/seongui-high/catalog/base-catalog.json'] || null;
    const config = byPath['schools/seongui-high/config/school-config.json'] || null;
    const state = byPath['schools/seongui-high/state/system-state.json'] || null;

    return Response.json({
      ok: true,
      storageConnected: true,
      initialized: Boolean(catalog && config && state),
      catalog,
      config,
      state,
      blobCount: blobs.length
    });
  } catch (error) {
    return Response.json({
      ok: false,
      storageConnected: false,
      code: 'BLOB_NOT_CONNECTED',
      message: 'Vercel Blob 저장소가 아직 이 프로젝트에 연결되지 않았거나 인증 설정이 필요합니다.',
      detail: String(error?.message || error)
    }, { status: 503 });
  }
}
