import { get, put } from '@vercel/blob';
import { requireAdmin } from './_admin-auth.mjs';

const TEST_ISBN = '9791191824001'; // 지구 끝의 온실
const STATE_PATH = 'schools/seongui-high/state/system-state.json';

function clean(v) {
  if (v == null) return '';
  if (Array.isArray(v)) return v.map(clean).filter(Boolean).join(' / ');
  if (typeof v === 'object') {
    if ('#text' in v) return clean(v['#text']);
    return '';
  }
  return String(v).trim();
}

function normalizeIsbn(v) {
  return clean(v).replace(/[^0-9Xx]/g, '');
}

function collectRecords(value, out = [], depth = 0) {
  if (depth > 10 || value == null || out.length > 100) return out;
  if (Array.isArray(value)) {
    for (const item of value) collectRecords(item, out, depth + 1);
    return out;
  }
  if (typeof value !== 'object') return out;

  const keys = Object.keys(value);
  const looksLikeRecord = keys.some((k) => [
    'title_info', 'author_info', 'pub_info', 'pub_year_info',
    'control_no', 'isbn', 'call_no', 'kdc_code_1s', 'detail_link'
  ].includes(k));
  if (looksLikeRecord) out.push(value);

  for (const v of Object.values(value)) collectRecords(v, out, depth + 1);
  return out;
}

function selectBook(payload, isbn) {
  const records = collectRecords(payload);
  const target = normalizeIsbn(isbn);
  return records.find((r) => {
    const ri = normalizeIsbn(r.isbn);
    return ri && (ri === target || ri.includes(target) || target.includes(ri));
  }) || records[0] || null;
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

async function updateState() {
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
      testIsbn: TEST_ISBN
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
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'POST 요청만 허용됩니다.' });
  }
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
    // 사용자 제공 '국립중앙도서관 소장자료 Open API 가이드 v2.6' 기준
    // 상세검색 ISBN: detailSearch=true&isbnOp=isbn&isbnCode=<ISBN>
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
          'User-Agent': 'Mozilla/5.0 (compatible; SeonguiLibrarySearch/5.3.2; +https://seongui-library-search.vercel.app)'
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
        detail: raw.slice(0, 1000)
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
        detail: raw.slice(0, 1000)
      });
    }

    const apiError = detectApiError(payload);
    if (apiError) {
      return res.status(502).json({
        ok: false,
        code: `NLK_${apiError.code}`,
        message: `국립중앙도서관 API 오류 ${apiError.code}: ${apiError.msg}`,
        detail: JSON.stringify(payload).slice(0, 1000)
      });
    }

    const book = selectBook(payload, TEST_ISBN);
    if (!book) {
      return res.status(502).json({
        ok: false,
        code: 'NLK_NO_BOOK',
        message: 'API 연결은 되었지만 테스트 ISBN의 소장자료 검색 결과를 찾지 못했습니다.',
        detail: JSON.stringify(payload).slice(0, 1000)
      });
    }

    const stateUpdated = await updateState();
    return res.status(200).json({
      ok: true,
      message: '국립중앙도서관 소장자료 Open API 연결이 정상입니다.',
      testIsbn: TEST_ISBN,
      sample: {
        title: clean(book.title_info),
        author: clean(book.author_info),
        publisher: clean(book.pub_info),
        year: clean(book.pub_year_info),
        isbn: clean(book.isbn),
        callNo: clean(book.call_no),
        kdcCode: clean(book.kdc_code_1s),
        kdcName: clean(book.kdc_name_1s),
        controlNo: clean(book.control_no),
        detailLink: clean(book.detail_link)
      },
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
