import { get, put } from '@vercel/blob';
import { requireAdmin } from './_admin-auth.mjs';

const TEST_ISBN = '9791191824001'; // 지구 끝의 온실
const STATE_PATH = 'schools/seongui-high/state/system-state.json';

function primitiveText(v, depth = 0) {
  if (v == null || depth > 8) return '';
  if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') return String(v).trim();
  if (Array.isArray(v)) return v.map(x => primitiveText(x, depth + 1)).filter(Boolean).join(' / ');
  if (typeof v === 'object') {
    if ('#text' in v) return primitiveText(v['#text'], depth + 1);
    if ('_text' in v) return primitiveText(v._text, depth + 1);
    if ('$t' in v) return primitiveText(v.$t, depth + 1);
    return Object.values(v).map(x => primitiveText(x, depth + 1)).filter(Boolean).join(' / ');
  }
  return '';
}

function normalizeIsbn(v) {
  return primitiveText(v).replace(/[^0-9Xx]/g, '');
}

function findValuesByKey(value, wantedKey, out = [], depth = 0) {
  if (value == null || depth > 12 || out.length > 100) return out;
  if (Array.isArray(value)) {
    for (const item of value) findValuesByKey(item, wantedKey, out, depth + 1);
    return out;
  }
  if (typeof value !== 'object') return out;

  for (const [k, v] of Object.entries(value)) {
    if (String(k).toLowerCase() === wantedKey.toLowerCase()) out.push(v);
    findValuesByKey(v, wantedKey, out, depth + 1);
  }
  return out;
}

function firstField(payload, key) {
  const values = findValuesByKey(payload, key);
  for (const v of values) {
    const text = primitiveText(v);
    if (text) return text;
  }
  return '';
}

function findIsbnContainer(value, target, depth = 0) {
  if (value == null || depth > 12) return null;
  if (Array.isArray(value)) {
    for (const item of value) {
      const hit = findIsbnContainer(item, target, depth + 1);
      if (hit) return hit;
    }
    return null;
  }
  if (typeof value !== 'object') return null;

  for (const [k, v] of Object.entries(value)) {
    if (String(k).toLowerCase() === 'isbn') {
      const isbn = normalizeIsbn(v);
      if (isbn && (isbn === target || isbn.includes(target) || target.includes(isbn))) return value;
    }
  }

  for (const v of Object.values(value)) {
    const hit = findIsbnContainer(v, target, depth + 1);
    if (hit) return hit;
  }
  return null;
}

function fieldFrom(container, payload, key) {
  const local = container ? firstField(container, key) : '';
  return local || firstField(payload, key);
}

function detectApiError(payload) {
  if (!payload || typeof payload !== 'object') return null;
  const text = JSON.stringify(payload);
  const known = [
    ['010', '인증키값 누락'],
    ['011', '유효하지 않은 인증키'],
    ['012', '검색결과 500건 제한'],
    ['013', '카테고리값 오류'],
    ['014', '파라미터 입력값 오류'],
    ['015', '필수 파라미터 누락'],
    ['101', '검색서버 오류'],
    ['000', '시스템 오류']
  ];
  for (const [code, msg] of known) {
    if (text.includes(`\"${code}\"`) || text.includes(`:${code}`) || text.includes(code + ' :')) {
      return { code, msg };
    }
  }
  return null;
}

async function updateState(sample) {
  try {
    const current = await get(STATE_PATH, { access: 'private', useCache: false });
    if (!current?.stream) return false;
    const state = JSON.parse(await new Response(current.stream).text());
    state.externalMetadata ||= {};
    state.externalMetadata.nlkHoldings = {
      ...(state.externalMetadata.nlkHoldings || {}),
      status: 'connected',
      api: '국립중앙도서관 소장자료 Open API',
      lastCheckedAt: new Date().toISOString(),
      testIsbn: TEST_ISBN,
      parserVersion: '5.3.3',
      sampleTitle: sample?.title || null
    };
    await put(STATE_PATH, JSON.stringify(state, null, 2), {
      access: 'private',
      allowOverwrite: true,
      contentType: 'application/json; charset=utf-8',
      cacheControlMaxAge: 60
    });
    return true;
  } catch {
    return false;
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ ok: false, message: 'POST 요청만 허용됩니다.' });
  if (!requireAdmin(req, res)) return;

  const key = process.env.NLK_API_KEY;
  if (!key) {
    return res.status(503).json({
      ok: false,
      code: 'NLK_KEY_NOT_CONFIGURED',
      message: 'Vercel 환경변수 NLK_API_KEY가 설정되어 있지 않습니다.'
    });
  }

  try {
    const params = new URLSearchParams({
      key,
      apiType: 'json',
      detailSearch: 'true',
      isbnOp: 'isbn',
      isbnCode: TEST_ISBN,
      pageNum: '1',
      pageSize: '10',
      category: '도서'
    });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 12000);
    let response;
    try {
      response = await fetch(`https://www.nl.go.kr/NL/search/openApi/search.do?${params.toString()}`, {
        headers: {
          Accept: 'application/json,text/plain,*/*',
          'User-Agent': 'Mozilla/5.0 (compatible; SeonguiLibrarySearch/5.3.3; +https://seongui-library-search.vercel.app)'
        },
        cache: 'no-store',
        signal: controller.signal
      });
    } finally {
      clearTimeout(timer);
    }

    const raw = await response.text();
    if (!response.ok) {
      return res.status(502).json({
        ok: false,
        code: 'NLK_HTTP_ERROR',
        message: `국립중앙도서관 소장자료 API가 HTTP ${response.status}를 반환했습니다.`,
        detail: raw.slice(0, 1200)
      });
    }

    let payload;
    try {
      payload = JSON.parse(raw);
    } catch {
      return res.status(502).json({
        ok: false,
        code: 'NLK_NOT_JSON',
        message: '국립중앙도서관 API 응답을 JSON으로 읽지 못했습니다.',
        detail: raw.slice(0, 1200)
      });
    }

    const apiError = detectApiError(payload);
    if (apiError) {
      return res.status(502).json({
        ok: false,
        code: `NLK_${apiError.code}`,
        message: `국립중앙도서관 API 오류 ${apiError.code}: ${apiError.msg}`,
        detail: JSON.stringify(payload).slice(0, 1200)
      });
    }

    const target = normalizeIsbn(TEST_ISBN);
    const record = findIsbnContainer(payload, target);
    const sample = {
      title: fieldFrom(record, payload, 'title_info'),
      author: fieldFrom(record, payload, 'author_info'),
      publisher: fieldFrom(record, payload, 'pub_info'),
      year: fieldFrom(record, payload, 'pub_year_info'),
      isbn: fieldFrom(record, payload, 'isbn') || TEST_ISBN,
      callNo: fieldFrom(record, payload, 'call_no'),
      kdcCode: fieldFrom(record, payload, 'kdc_code_1s'),
      kdcName: fieldFrom(record, payload, 'kdc_name_1s'),
      controlNo: fieldFrom(record, payload, 'control_no'),
      detailLink: fieldFrom(record, payload, 'detail_link')
    };

    const meaningful = [sample.title, sample.author, sample.publisher].filter(Boolean).length;
    if (meaningful === 0) {
      return res.status(502).json({
        ok: false,
        code: 'NLK_PARSE_INCOMPLETE',
        message: 'API 연결은 정상이나 서지 필드 파싱이 아직 완전하지 않습니다.',
        detail: JSON.stringify({
          topLevelKeys: Object.keys(payload || {}),
          titleValues: findValuesByKey(payload, 'title_info').slice(0, 3),
          authorValues: findValuesByKey(payload, 'author_info').slice(0, 3),
          isbnValues: findValuesByKey(payload, 'isbn').slice(0, 3)
        }).slice(0, 3000)
      });
    }

    const stateUpdated = await updateState(sample);
    return res.status(200).json({
      ok: true,
      message: '국립중앙도서관 소장자료 Open API 연결 및 서지정보 파싱이 정상입니다.',
      testIsbn: TEST_ISBN,
      sample,
      stateUpdated
    });
  } catch (error) {
    return res.status(500).json({
      ok: false,
      code: 'NLK_PROBE_FAILED',
      message: '국립중앙도서관 소장자료 API 연결 확인 중 오류가 발생했습니다.',
      detail: [
        String(error?.stack || error?.message || error),
        error?.cause ? `CAUSE: ${String(error.cause?.stack || error.cause?.message || error.cause)}` : '',
        error?.code ? `CODE: ${error.code}` : ''
      ].filter(Boolean).join('\n')
    });
  }
}
