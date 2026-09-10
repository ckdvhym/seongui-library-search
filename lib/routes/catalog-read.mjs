import { get } from '@vercel/blob';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ ok: false, message: 'GET 요청만 허용됩니다.' });
  }

  try {
    const result = await get('schools/seongui-high/catalog/base-catalog.json', {
      access: 'private',
      useCache: false
    });

    if (!result?.stream) {
      return res.status(404).json({ ok: false, message: '저장된 카탈로그가 없습니다.' });
    }

    // 이 API는 이후 학생 검색 화면 연결용입니다.
    // Node.js 응답 형식으로 통일해 Vercel 함수 시그니처 충돌을 피합니다.
    const buffer = Buffer.from(await new Response(result.stream).arrayBuffer());
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300');
    return res.status(200).send(buffer);
  } catch (error) {
    return res.status(500).json({
      ok: false,
      message: '카탈로그를 읽지 못했습니다.',
      detail: String(error?.message || error)
    });
  }
}
