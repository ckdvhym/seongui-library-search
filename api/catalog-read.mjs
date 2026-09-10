import { get } from '@vercel/blob';

export default async function handler(request) {
  if (request.method !== 'GET') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const result = await get('schools/seongui-high/catalog/base-catalog.json', {
      access: 'private'
    });
    if (!result || result.statusCode !== 200 || !result.stream) {
      return Response.json({ ok: false, message: '저장된 카탈로그가 없습니다.' }, { status: 404 });
    }
    return new Response(result.stream, {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=60, s-maxage=300'
      }
    });
  } catch (error) {
    return Response.json({
      ok: false,
      message: '카탈로그를 읽지 못했습니다.',
      detail: String(error?.message || error)
    }, { status: 500 });
  }
}
