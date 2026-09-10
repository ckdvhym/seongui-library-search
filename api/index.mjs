import storageStatus from '../lib/routes/storage-status.mjs';
import storageProbe from '../lib/routes/storage-probe.mjs';
import nlkProbe from '../lib/routes/nlk-probe.mjs';
import storageInit from '../lib/routes/storage-init.mjs';
import catalogSync from '../lib/routes/catalog-sync.mjs';
import catalogRead from '../lib/routes/catalog-read.mjs';
import metadataStatus from '../lib/routes/metadata-status.mjs';
import metadataRun from '../lib/routes/metadata-run.mjs';
import metadataBuildIndex from '../lib/routes/metadata-build-index.mjs';
import bookDetail from '../lib/routes/book-detail.mjs';
import search from '../lib/routes/search.mjs';

const ROUTES = {
  'storage-status': storageStatus,
  'storage-probe': storageProbe,
  'nlk-probe': nlkProbe,
  'storage-init': storageInit,
  'catalog-sync': catalogSync,
  'catalog-read': catalogRead,
  'metadata-status': metadataStatus,
  'metadata-run': metadataRun,
  'metadata-build-index': metadataBuildIndex,
  'book-detail': bookDetail,
  'search': search,
};

export default async function handler(req, res) {
  const route = String(req.query?.route || '').trim();
  const fn = ROUTES[route];
  if (!fn) return res.status(404).json({ ok:false, message:'알 수 없는 API 요청입니다.', route });
  return fn(req, res);
}
