# 성의고 도서관 표준 도서 프로필 v1.0

이 규격은 화면과 데이터를 분리하기 위한 기본 구조입니다. 화면을 바꾸더라도 이 프로필은 유지됩니다.

## 1. identity
- title, author, publisher, year, isbn13

## 2. holding
- copies, callNumbers, locations, kdc, kdcMajor
- DLS 업로드 시 갱신되는 소장 정보

## 3. external
- yes24: cover, introduction, toc, pages 등
- nlk: 국립중앙도서관 승인 후 보완 정보
- 외부 원문 정보와 AI 생성 정보를 섞지 않음

## 4. profile
- materialType
- genres
- primaryTopics / secondaryTopics
- emotions
- curriculumFields / careerFields
- literatureOrigin
- settingPlaces / timePeriods
- audience / difficulty
- searchTerms / exclusions

## 5. quality
- baseProfileReady
- externalMetadataReady
- aiEnriched
- needsAiReview
- confidence
- sources
- profileSchema

## 운영 원칙
1. 전체 장서는 AI 없이 기본 프로필을 먼저 생성합니다.
2. YES24와 국립중앙도서관 정보를 붙입니다.
3. 정보가 충분하면 AI를 사용하지 않습니다.
4. 장르·정서·복합 주제처럼 불확실한 항목만 AI 보강 후보가 됩니다.
5. 검색 시에는 저장된 프로필을 사용하며 책 프로필을 다시 생성하지 않습니다.
6. 새 필드가 필요하면 profileSchema 버전을 올리고 필요한 필드만 보완합니다.
