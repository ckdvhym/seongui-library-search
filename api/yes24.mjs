export async function GET(request) {
  const url = new URL(request.url);
  const isbn = (url.searchParams.get('isbn') || '').replace(/[^0-9Xx]/g, '');

  if (!/^\d{13}$/.test(isbn)) {
    return Response.json(
      { ok: false, error: '13자리 ISBN이 필요합니다.' },
      { status: 400 }
    );
  }

  const apiKey = process.env.YES24_API_KEY;
  if (!apiKey) {
    return Response.json(
      { ok: false, error: '서버에 YES24 API Key가 설정되지 않았습니다.' },
      { status: 500 }
    );
  }

  const endpoint = new URL('https://apis.yes24.com/v1/goods/itemDetail');
  endpoint.searchParams.set('searchType', 'ISBN13');
  endpoint.searchParams.set('query', isbn);
  endpoint.searchParams.set('detail', 'Y');

  try {
    const response = await fetch(endpoint, {
      headers: { 'X-Api-Key': apiKey },
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data?.success) {
      return Response.json(
        {
          ok: false,
          error: data?.message || 'YES24 도서정보 조회에 실패했습니다.',
          errorCode: data?.errorCode || null,
        },
        { status: response.status || 502 }
      );
    }

    const item = data?.data?.items?.[0];
    if (!item) {
      return Response.json(
        { ok: false, error: '해당 ISBN의 도서정보를 찾지 못했습니다.' },
        { status: 404 }
      );
    }

    const content = item.contentDetail || {};

    return Response.json(
      {
        ok: true,
        book: {
          title: item.title || '',
          subTitle: item.subTitle || '',
          author: item.author || '',
          publisher: item.publisher || '',
          publishDate: item.publishDate || '',
          isbn13: item.isbn13 || isbn,
          cover: item.cover || '',
          pages: item.pages ?? null,
          originalTitle: item.originalTitle || '',
          bookIntroduction: content.bookIntroduction || '',
          bookSummary: content.bookSummary || '',
          tableOfContents: content.tableOfContents || '',
          series: Array.isArray(item.series) ? item.series : [],
        },
      },
      {
        headers: {
          'Cache-Control': 's-maxage=86400, stale-while-revalidate=604800',
        },
      }
    );
  } catch (error) {
    return Response.json(
      { ok: false, error: '외부 도서정보 서비스 연결 중 오류가 발생했습니다.' },
      { status: 502 }
    );
  }
}
