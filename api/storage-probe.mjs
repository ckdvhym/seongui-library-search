import { put, get, del } from '@vercel/blob';
import { requireAdmin } from './_admin-auth.mjs';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'POST 요청만 허용됩니다.' });
  }
  if (!requireAdmin(req, res)) return;

  const pathname = `schools/seongui-high/diagnostics/probe-${Date.now()}.json`;

  try {
    const payload = JSON.stringify({ ok: true, at: new Date().toISOString() });

    const written = await put(pathname, payload, {
      access: 'private',
      contentType: 'application/json; charset=utf-8'
    });

    const result = await get(pathname, {
      access: 'private',
      useCache: false
    });

    if (!result?.stream) {
      throw new Error('테스트 파일을 저장했지만 다시 읽지 못했습니다.');
    }

    const text = await new Response(result.stream).text();
    const parsed = JSON.parse(text);

    await del(pathname);

    return res.status(200).json({
      ok: true,
      message: 'Vercel Private Blob 쓰기·읽기·삭제 테스트가 모두 성공했습니다.',
      pathname: written.pathname,
      roundTrip: parsed.ok === true,
      authMode: process.env.VERCEL_OIDC_TOKEN
        ? 'oidc'
        : (process.env.BLOB_READ_WRITE_TOKEN ? 'token' : 'sdk-auto')
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      code: 'BLOB_PROBE_FAILED',
      message: 'Blob 연결 테스트에 실패했습니다.',
      detail: String(error?.stack || error?.message || error),
      env: {
        blobStoreId: Boolean(process.env.BLOB_STORE_ID),
        oidcToken: Boolean(process.env.VERCEL_OIDC_TOKEN),
        rwToken: Boolean(process.env.BLOB_READ_WRITE_TOKEN)
      }
    });
  }
}
