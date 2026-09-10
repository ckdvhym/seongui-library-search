export function requireAdmin(request) {
  const configured = process.env.ADMIN_SETUP_SECRET;
  if (!configured) {
    return {
      ok: false,
      response: Response.json({
        ok: false,
        code: 'ADMIN_SECRET_NOT_CONFIGURED',
        message: 'Vercel 환경변수 ADMIN_SETUP_SECRET를 먼저 설정해 주세요.'
      }, { status: 503 })
    };
  }

  const supplied = request.headers.get('x-admin-secret') || '';
  if (supplied !== configured) {
    return {
      ok: false,
      response: Response.json({
        ok: false,
        code: 'UNAUTHORIZED',
        message: '관리자 암호가 맞지 않습니다.'
      }, { status: 401 })
    };
  }
  return { ok: true };
}
