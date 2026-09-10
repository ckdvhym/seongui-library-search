성의고 도서관 V6.2 - 단일 함수 배포본

목표: Vercel Hobby의 함수 개수/리전 배포 문제를 피하기 위해 API 11개를 하나의 Vercel Function으로 통합했습니다.

중요: GitHub의 기존 api 폴더에 있는 .mjs 파일을 모두 삭제한 뒤, 이 패키지의 api/index.mjs 하나만 올려야 합니다.

업로드/교체:
- 루트: index.html, admin-v5.html, package.json, vercel.json
- api/: index.mjs 하나
- lib/: 기존 파일을 이 패키지 내용으로 교체/추가 (routes 폴더 포함)

기존 루트의 data/ 및 school-config.json 등은 삭제하지 않습니다.

Vercel 환경변수(기존 값 유지):
YES24_API_KEY, NLK_API_KEY, GEMINI_API_KEY, ADMIN_SETUP_SECRET, BLOB_STORE_ID, BLOB_WEBHOOK_PUBLIC_KEY 등

배포 성공 후 관리자 페이지에서 6. 통합 검색 데이터 구축(V6.0)을 확인합니다.
