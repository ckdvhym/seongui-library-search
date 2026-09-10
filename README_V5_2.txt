성의고 도서관 V5 - 2단계: 서버 영구 저장 기반

이번 단계의 목적
- 브라우저 IndexedDB/localStorage를 원본 저장소로 사용하지 않음
- 현재 8,050종 기본 카탈로그를 Vercel Blob에 영구 저장
- 이후 YES24/NLK/AI 보강 결과도 같은 서버 저장 구조에 누적할 기반 마련

GitHub에 추가할 파일
- admin-v5.html
- school-config.json
- package.json
- data/base-catalog.json
- docs/PROFILE_SCHEMA_V1.md
- api/_admin-auth.mjs
- api/storage-status.mjs
- api/storage-init.mjs
- api/catalog-read.mjs

기존 파일은 삭제하지 마세요.
특히 api/yes24.mjs, api/gemini.mjs 등 기존 API는 그대로 둡니다.

Vercel에서 한 번만 해야 하는 설정
1) 프로젝트 > Storage > Create Database > Blob
2) 반드시 Private로 생성하고 현재 seongui-library-search 프로젝트에 연결
   - 2026년 신규 연결은 OIDC 인증이 기본이며, Vercel 함수가 자동 인증할 수 있습니다.
3) 프로젝트 Settings > Environment Variables에 ADMIN_SETUP_SECRET 추가
   - 본인만 아는 긴 관리자 암호로 설정
   - Production/Preview/Development 모두 적용 권장
4) Redeploy

확인 주소
https://seongui-library-search.vercel.app/admin-v5.html

정상 순서
- 관리자 암호 입력
- “저장소 상태 확인”
- Blob 연결 정상 메시지 확인
- “V5 기본 데이터 영구 저장” 한 번 실행
- 다시 상태 확인 → 기본 카탈로그 저장됨 / 영구 저장소 연결됨

중요
- 이 단계에서는 YES24 8천 건 수집과 Gemini 프로필 구축을 시작하지 않습니다.
- 먼저 영구 저장이 실제로 정상 작동하는지 확인한 후 다음 단계로 갑니다.
