import { get, put } from '@vercel/blob';
import { requireAdmin } from './_admin-auth.mjs';

const TEST_ISBN = '9791191824001'; // 지구 끝의 온실
const TEST_TITLE = '지구 끝의 온실';
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


function numericTotal(payload) {
  const raw = payload?.total ?? firstField(payload, 'total');
  const n = Number(String(raw ?? '').replace(/[^0-9]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function firstResultRecord(payload) {
  const result = payload?.result;
  if (Array.isArray(result)) return result.find(x => x && typeof x === 'object') || null;
  if (result && typeof result === 'object') {
    for (const v of Object.values(result)) {
      if (Array.isArray(v)) {
        const hit = v.find(x => x && typeof x === 'object');
        if (hit) return hit;
      }
      if (v && typeof v === 'object') return v;
    }
  }
  return null;
}

async function callNlk(key, mode) {
  const common = { key, apiType: 'json', pageNum: '1', pageSize: '10', category: '도서' };
  const params = mode === 'isbn'
    ? new URLSearchParams({ ...common, detailSearch: 'true', isbnOp: 'isbn', isbnCode: TEST_ISBN })
    : new URLSearchParams({ ...common, srchTarget: 'title', kwd: TEST_TITLE });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 12000);
  let response;
  try {
    response = await fetch(`https://www.nl.go.kr/NL/search/openApi/search.do?${params.toString()}`, {
      headers: {
        Accept: 'application/json,text/plain,*/*',
        'User-Agent': 'Mozilla/5.0 (compatible; SeonguiLibrarySearch/5.3.4; +https://seongui-library-search.vercel.app)'
      },
      cache: 'no-store',
      signal: controller.signal
    });
  } finally { clearTimeout(timer); }

  const raw = await response.text();
  if (!response.ok) throw new Error(`NLK HTTP ${response.status}: ${raw.slice(0, 500)}`);
  let payload;
  try { payload = JSON.parse(raw); }
  catch { throw new Error(`NLK 응답 JSON 파싱 실패: ${raw.slice(0, 500)}`); }
  const apiError = detectApiError(payload);
  if (apiError) throw new Error(`NLK API ${apiError.code}: ${apiError.msg}`);
  return payload;
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
      parserVersion: '5.3.4',
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
    // 1차: ISBN 상세검색. 소장자료 API 특성상 ISBN 검색 결과가 0건일 수 있음.
    let payload = await callNlk(key, 'isbn');
    const isbnTotal = numericTotal(payload);
    let lookupMode = 'isbn';

    // ISBN 0건이면 같은 책 제목으로 한 번 더 확인한다.
    // 이는 "연결/파싱 실패"와 "국립중앙도서관 소장검색 0건"을 구분하기 위한 안전장치다.
    if (isbnTotal === 0) {
      payload = await callNlk(key, 'title');
      lookupMode = 'title-fallback';
    }

    const target = normalizeIsbn(TEST_ISBN);
    const record = findIsbnContainer(payload, target) || firstResultRecord(payload);
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
    const finalTotal = numericTotal(payload);
    if (finalTotal === 0) {
      return res.status(200).json({
        ok: true,
        connected: true,
        recordFound: false,
        message: '국립중앙도서관 API 연결은 정상입니다. 다만 테스트 도서는 소장자료 검색 결과가 0건입니다.',
        testIsbn: TEST_ISBN,
        testTitle: TEST_TITLE,
        isbnSearchTotal: isbnTotal,
        lookupMode
      });
    }
    if (meaningful === 0) {
      return res.status(502).json({
        ok: false,
        code: 'NLK_PARSE_INCOMPLETE',
        message: 'API 연결과 검색 결과는 정상이나 실제 result 레코드의 필드 파싱을 더 보완해야 합니다.',
        detail: JSON.stringify({
          isbnSearchTotal: isbnTotal,
          finalTotal,
          lookupMode,
          topLevelKeys: Object.keys(payload || {}),
          resultPreview: payload?.result,
          titleValues: findValuesByKey(payload, 'title_info').slice(0, 3),
          authorValues: findValuesByKey(payload, 'author_info').slice(0, 3),
          isbnValues: findValuesByKey(payload, 'isbn').slice(0, 3)
        }).slice(0, 5000)
      });
    }

    const stateUpdated = await updateState(sample);
    return res.status(200).json({
      ok: true,
      message: lookupMode === 'isbn' ? '국립중앙도서관 소장자료 Open API의 ISBN 조회와 서지정보 파싱이 정상입니다.' : '국립중앙도서관 API 연결은 정상이며, ISBN 0건 후 제목 검색으로 서지정보를 확인했습니다.',
      testIsbn: TEST_ISBN,
      testTitle: TEST_TITLE,
      isbnSearchTotal: isbnTotal,
      lookupMode,
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
