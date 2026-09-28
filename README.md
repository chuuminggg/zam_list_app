# ZAM List

할 일, 위시리스트, 가계부를 한 곳에서 관리하는 개인용 웹앱.

위시리스트는 쇼핑몰에서 상품을 검색해 바로 담을 수 있고, 담아둔 상품의 가격 변동·품절 여부와 오프라인 매장 재고도 확인할 수 있다.

## 기능

### 할 일

- 월 달력에서 날짜를 골라 그날의 할 일을 관리
- 카테고리별로 묶어서 보기, 카테고리 추가·수정·삭제
- 할 일 추가·수정·완료 체크

### 위시리스트

- 직접 입력하거나 쇼핑몰 검색 결과에서 골라 담기
  - 지원: 다이소몰, 올리브영, 마켓컬리, 번개장터
  - 설정되지 않았거나 막힌 쇼핑몰은 탭에 사유를 함께 표시
- 담아둔 상품의 가격·품절 다시 확인
  - 가격이 바뀌면 이력을 남김 (최근 20건)
  - 번개장터는 상품 상세로 판매완료까지 확인, 나머지는 상품명으로 다시 검색해 같은 상품번호를 찾는 방식
- 매장 재고 확인 (다이소·올리브영에서 담은 상품만)
  - 다이소는 매장별, 올리브영은 전체 매장 기준으로 표시
- 필터·정렬, 항목 수정

### 가계부

- 달력에서 날짜별 수입·지출 입력
- 월세·월급 같은 고정 수입·지출을 규칙(매월 N일, 시작~종료 월)으로 등록하면 해당 월에 자동으로 반영
- 월별 요약, 카테고리별 지출

### 공통

- 아이디·비밀번호 로그인, 로그인하면 기기 간 데이터 동기화
  - 로그인하지 않으면 브라우저(localStorage)에만 저장
- 다크모드 (라이트 / 다크 / 시스템)
- 모바일 대응

### 인스타그램 DM 연동 (작업 중)

봇 계정에 인스타 게시물·릴스를 DM으로 공유하면, 캡션과 이미지에서 상품을 뽑아 쇼핑몰 검색 후보와 함께 위시리스트의 인스타 인박스에 올려준다. 인박스에서 골라 담는 방식. Meta 앱 설정 전이라 아직 실제로는 동작하지 않는다.

## 기술 스택

| 구분 | 사용 |
| --- | --- |
| 프론트엔드 | React 19, TypeScript, Vite, React Router, Zustand, Tailwind CSS v4 |
| 서버 | Vercel Functions (`api/`) |
| DB | Neon Postgres (`@neondatabase/serverless`) |
| 캐시 | Upstash Redis — 매장 재고 조회 결과 캐시 (5분) |
| 외부 연동 | 각 쇼핑몰 검색 API, Instagram Messaging API, Claude API (게시물 상품 분석) |
| 테스트 | Vitest, Testing Library, PGlite (메모리 Postgres로 실제 SQL 검증) |

## 구조

```
api/          Vercel 서버 함수 (auth, data, search, stock, product, providers, instagram)
server/       서버 공통 코드
  providers/  쇼핑몰별 검색·재고·상품 조회 어댑터
  storage/    DB 접근, 로그인, 입력 검증
  cache/      Redis 캐시
  instagram/  DM 웹훅 처리, 게시물 분석
shared/       클라이언트·서버 공용 타입
src/
  pages/      할 일 / 위시리스트 / 가계부
  components/ 화면 컴포넌트
  stores/     Zustand 스토어 (localStorage persist)
  sync/       스토어 변경을 서버에 반영하는 동기화 로직
```

데이터는 사용자별로 `items` 테이블 하나에 컬렉션(todos, wishes, categories, transactions, fixedItems) 단위로 저장한다. 테이블은 첫 요청 때 자동으로 만들어진다.

## 실행

```bash
npm install
cp .env.example .env.local   # 필요한 값만 채우기
npm run dev
```

`npm run dev`에서 Vite 플러그인(`server/devApi.ts`)이 `/api/*`도 함께 실행하므로 `vercel dev` 없이 로컬에서 서버 함수까지 돌아간다.

```bash
npm test        # 테스트
npm run lint    # 린트
npm run build   # 타입 체크 + 빌드
```

## 환경변수

전부 선택 사항이고, 비어 있으면 해당 기능만 꺼진다. 자세한 설명은 `.env.example` 참고.

| 변수 | 용도 | 비어 있으면 |
| --- | --- | --- |
| `DATABASE_URL` | Neon Postgres | 로그인·동기화 없이 브라우저에만 저장 |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Upstash Redis | 재고를 매번 새로 조회 |
| `PROVIDERS_ENABLED` | 켤 쇼핑몰 목록 (쉼표 구분) | 전부 켜짐 |
| `IG_APP_SECRET`, `IG_VERIFY_TOKEN`, `IG_ACCESS_TOKEN`, `IG_BOT_USERNAME` | 인스타 DM 연동 | 연동 꺼짐 |
| `ANTHROPIC_API_KEY`, `IG_EXTRACT_MODEL` | 게시물 상품 분석 | 연동 꺼짐 |

서버 함수 전용 값이므로 `VITE_` 접두사를 붙이지 않는다.

## 보안

KISA 웹 취약점 점검 항목을 기준으로 정리했다.

- 비밀번호는 scrypt 해시로 저장, 세션은 Bearer 토큰
- 로그인 5회 실패 시 15분 잠금
- CSP, HSTS, X-Frame-Options 등 보안 헤더 (`vercel.json`)
- 저장하는 링크는 http(s)만 허용 (`javascript:` 등은 버림)
- 인스타 웹훅은 서명 검증 후 처리

## 참고

- 올리브영은 클라우드·가정용 IP 모두 직접 호출이 막혀서 [daiso-mcp](https://mcp.aka.page) 호스팅 API를 거친다. 이쪽도 간헐적으로 차단되어 실패 시 몇 번 다시 시도한다.
- 다이소몰 매장별 재고 API는 수량이 0으로만 오는 경우가 많아 재고 없음과 구분이 안 된다. 이런 매장은 "수량 비공개"로 표시한다.
