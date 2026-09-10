import { put } from '@vercel/blob';
import { requireAdmin } from '../lib/admin-auth.mjs';

function getOrigin(req) {
  const protoHeader = req.headers?.['x-forwarded-proto'];
  const proto = Array.isArray(protoHeader) ? protoHeader[0] : (protoHeader || 'https');
  const hostHeader = req.headers?.['x-forwarded-host'] || req.headers?.host;
  const host = Array.isArray(hostHeader) ? hostHeader[0] : hostHeader;
  if (!host) throw new Error('현재 배포 주소를 확인하지 못했습니다.');
  return `${proto}://${host}`;
}

async function fetchStatic(origin, pathname) {
  const response = await fetch(`${origin}${pathname}`, { cache: 'no-store' });
  if (!response.ok || !response.body) {
    throw new Error(`${pathname} 파일을 읽지 못했습니다. HTTP ${response.status}`);
  }
  return response;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'POST 요청만 허용됩니다.' });
  }
  if (!requireAdmin(req, res)) return;

  try {
    const origin = getOrigin(req);

    // 큰 카탈로그를 브라우저에서 함수로 업로드하지 않고,
    // 현재 배포의 정적 파일을 서버가 직접 읽어 Blob으로 보냅니다.
    const [catalogRes, configRes] = await Promise.all([
      fetchStatic(origin, '/data/base-catalog.json'),
      fetchStatic(origin, '/school-config.json')
    ]);

    const [catalogBlob, configBlob] = await Promise.all([
      put('schools/seongui-high/catalog/base-catalog.json', catalogRes.body, {
        access: 'private',
        allowOverwrite: true,
        contentType: 'application/json; charset=utf-8',
        cacheControlMaxAge: 60
      }),
      put('schools/seongui-high/config/school-config.json', configRes.body, {
        access: 'private',
        allowOverwrite: true,
        contentType: 'application/json; charset=utf-8',
        cacheControlMaxAge: 60
      })
    ]);

    const state = {
      schemaVersion: 'seongui-system-state-v1',
      schoolId: 'seongui-high',
      initializedAt: new Date().toISOString(),
      catalog: {
        pathname: catalogBlob.pathname,
        etag: catalogBlob.etag,
        expectedGroupedTitles: 8050,
        source: 'DLS base catalog V5'
      },
      externalMetadata: {
        yes24: { status: 'not_started', completed: 0, failed: 0 },
        nlk: { status: 'waiting_for_api_key', completed: 0, failed: 0 }
      },
      profiles: {
        base: { status: 'not_started', completed: 0 },
        aiEnrichment: { status: 'not_started', completed: 0, failed: 0 }
      },
      safety: {
        browserStorageIsSourceOfTruth: false,
        persistentStorage: 'vercel-blob-private'
      }
    };

    const stateBlob = await put(
      'schools/seongui-high/state/system-state.json',
      JSON.stringify(state, null, 2),
      {
        access: 'private',
        allowOverwrite: true,
        contentType: 'application/json; charset=utf-8',
        cacheControlMaxAge: 60
      }
    );

    return res.status(200).json({
      ok: true,
      message: '성의고 V5 기본 데이터가 Vercel Blob에 영구 저장되었습니다.',
      catalog: { pathname: catalogBlob.pathname, etag: catalogBlob.etag },
      config: { pathname: configBlob.pathname, etag: configBlob.etag },
      state: { pathname: stateBlob.pathname, etag: stateBlob.etag }
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      code: 'INIT_FAILED',
      message: '초기 저장에 실패했습니다.',
      detail: String(error?.stack || error?.message || error)
    });
  }
}
