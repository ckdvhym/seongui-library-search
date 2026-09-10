import { put } from '@vercel/blob';
import { requireAdmin } from './_admin-auth.mjs';

async function fetchStatic(request, pathname) {
  const url = new URL(pathname, request.url);
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok || !res.body) {
    throw new Error(`${pathname} 파일을 읽지 못했습니다. HTTP ${res.status}`);
  }
  return res;
}

export default async function handler(request) {
  if (request.method !== 'POST') {
    return Response.json({ ok: false, message: 'POST 요청만 허용됩니다.' }, { status: 405 });
  }

  const auth = requireAdmin(request);
  if (!auth.ok) return auth.response;

  try {
    // 7MB 카탈로그를 브라우저 → 함수로 다시 올리지 않고,
    // 배포된 정적 파일을 서버가 직접 읽어 Blob으로 스트리밍합니다.
    const catalogRes = await fetchStatic(request, '/data/base-catalog.json');
    const configRes = await fetchStatic(request, '/school-config.json');

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

    return Response.json({
      ok: true,
      message: '성의고 V5 기본 데이터가 Vercel Blob에 영구 저장되었습니다.',
      catalog: { pathname: catalogBlob.pathname, etag: catalogBlob.etag },
      config: { pathname: configBlob.pathname, etag: configBlob.etag },
      state: { pathname: stateBlob.pathname, etag: stateBlob.etag }
    });
  } catch (error) {
    return Response.json({
      ok: false,
      code: 'INIT_FAILED',
      message: '초기 저장에 실패했습니다.',
      detail: String(error?.message || error)
    }, { status: 500 });
  }
}
