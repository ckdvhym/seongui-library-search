function readHeader(req, name) {
  const headers = req?.headers || {};
  const lower = name.toLowerCase();
  const value = headers[lower] ?? headers[name] ?? '';
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

export function requireAdmin(req, res) {
  const configured = process.env.ADMIN_SETUP_SECRET;

  if (!configured) {
    res.status(503).json({
      ok: false,
      code: 'ADMIN_SECRET_NOT_CONFIGURED',
      message: 'Vercel 환경변수 ADMIN_SETUP_SECRET를 먼저 설정해 주세요.'
    });
    return false;
  }

  const supplied = readHeader(req, 'x-admin-secret');
  if (supplied !== configured) {
    res.status(401).json({
      ok: false,
      code: 'UNAUTHORIZED',
      message: '관리자 암호가 맞지 않습니다.'
    });
    return false;
  }

  return true;
}
