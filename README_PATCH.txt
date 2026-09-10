V5.2.1 Blob OIDC 수정 패치

GitHub 저장소 루트에 이 압축의 파일들을 그대로 업로드합니다.
기존 같은 이름 파일은 새 파일로 교체됩니다.

포함 파일:
- admin-v5.html
- package.json (@vercel/blob 2.6.1 이상)
- api/_admin-auth.mjs
- api/storage-probe.mjs (신규)
- api/storage-status.mjs
- api/storage-init.mjs
- api/catalog-read.mjs

배포 후:
1) admin-v5.html 열기
2) 관리자 암호 입력
3) Blob 연결 테스트
4) 성공하면 저장소 상태 확인
5) 둘 다 정상일 때만 V5 기본 데이터 영구 저장

이 패치는 base-catalog.json을 다시 올릴 필요가 없습니다.
