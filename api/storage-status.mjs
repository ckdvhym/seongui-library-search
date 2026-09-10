import { list } from '@vercel/blob';
import { requireAdmin } from '../lib/admin-auth.mjs';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'GET 요청만 허용됩니다.' });
  }
  if (!requireAdmin(req, res)) return;

  try {
    const { blobs } = await list({
      prefix: 'schools/seongui-high/',
      limit: 100
    });

    const byPath = Object.fromEntries(
      blobs.map((b) => [b.pathname, {
        size: b.size,
        uploadedAt: b.uploadedAt,
        etag: b.etag
      }])
    );

    const catalog = byPath['schools/seongui-high/catalog/base-catalog.json'] || null;
    const config = byPath['schools/seongui-high/config/school-config.json'] || null;
    const state = byPath['schools/seongui-high/state/system-state.json'] || null;

    return res.status(200).json({
      ok: true,
      storageConnected: true,
      initialized: Boolean(catalog && config && state),
      catalog,
      config,
      state,
      blobCount: blobs.length,
      authMode: process.env.VERCEL_OIDC_TOKEN
        ? 'oidc'
        : (process.env.BLOB_READ_WRITE_TOKEN ? 'token' : 'sdk-auto')
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      storageConnected: false,
      code: 'BLOB_STATUS_FAILED',
      message: 'Vercel Blob 상태를 확인하지 못했습니다.',
      detail: String(error?.stack || error?.message || error),
      env: {
        blobStoreId: Boolean(process.env.BLOB_STORE_ID),
        oidcToken: Boolean(process.env.VERCEL_OIDC_TOKEN),
        rwToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN)
      }
    });
  }
}
