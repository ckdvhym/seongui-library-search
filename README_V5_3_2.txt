성의고 도서관 V5.3.2 — 국립중앙도서관 네트워크 연결 보강

변경사항
1) api/nlk-probe.mjs를 Vercel 서울 리전(icn1)에서 실행
2) 국립중앙도서관 요청에 일반 브라우저형 User-Agent 추가
3) 12초 타임아웃 추가
4) fetch 실패 시 내부 cause/code까지 관리자 화면에서 확인 가능

업로드
- ZIP을 풀어 GitHub 저장소 루트에 그대로 업로드 후 Commit
- vercel.json이 새로 추가됨
- 기존 admin-v5.html과 다른 API/데이터 파일은 그대로 유지

배포 후
관리자 페이지 → 관리자 암호 입력 → 국립중앙도서관 연결 테스트
