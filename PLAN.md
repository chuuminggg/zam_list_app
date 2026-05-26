# ZAM List App — 위시리스트 & 투두 앱

## 목표

브라우저 세션(localStorage) 기반으로 데이터를 저장하는 위시리스트 + 투두 앱.
별도 백엔드 없이 Vercel에 배포하는 순수 프론트엔드 프로젝트.

---

## 기술 스택

| 항목 | 선택 | 이유 |
|------|------|------|
| 빌드 도구 | Vite | 빠른 HMR, 가벼운 번들 |
| 프레임워크 | React 18 + TypeScript | 컴포넌트 기반 UI, 타입 안전성 |
| 스타일 | Tailwind CSS v4 | 유틸리티 퍼스트, 빠른 프로토타이핑 |
| 상태 관리 | Zustand | 가볍고 직관적인 전역 상태, persist 미들웨어로 localStorage 연동 |
| 라우팅 | React Router v7 | 페이지 분리 (위시리스트 / 투두) |
| 배포 | Vercel | GitHub 연동 자동 배포 |

---

## 핵심 기능

### 투두 (Todo)
- [ ] 항목 추가 / 수정 / 삭제
- [ ] 완료 체크 토글
- [ ] 카테고리/태그 분류
- [ ] 우선순위 설정 (High / Medium / Low)
- [ ] 필터: 전체 / 완료 / 미완료

### 위시리스트 (Wishlist)
- [ ] 항목 추가 (이름, URL, 가격, 메모, 이미지 URL)
- [ ] 상태 관리: 원함 / 구매함 / 포기
- [ ] 카테고리 분류
- [ ] 정렬: 추가순 / 가격순

### 공통
- [ ] localStorage 자동 저장 (Zustand persist)
- [ ] 다크모드 토글
- [ ] 반응형 레이아웃 (모바일 우선)

---

## 데이터 모델

```ts
// Todo
interface Todo {
  id: string;
  title: string;
  done: boolean;
  priority: 'high' | 'medium' | 'low';
  category: string;
  createdAt: string;
}

// WishItem
interface WishItem {
  id: string;
  name: string;
  url?: string;
  price?: number;
  memo?: string;
  imageUrl?: string;
  status: 'want' | 'bought' | 'dropped';
  category: string;
  createdAt: string;
}
```

---

## 디렉토리 구조

```
src/
├── components/       # 재사용 UI 컴포넌트
│   ├── common/       # Button, Input, Modal, Badge 등
│   ├── todo/         # TodoItem, TodoForm, TodoList
│   └── wishlist/     # WishItem, WishForm, WishList
├── pages/
│   ├── TodoPage.tsx
│   └── WishlistPage.tsx
├── stores/
│   ├── todoStore.ts   # Zustand + persist
│   └── wishStore.ts
├── types/
│   └── index.ts
├── hooks/             # 커스텀 훅
└── App.tsx
```

---

## 라우팅

| 경로 | 페이지 |
|------|--------|
| `/` | 투두 페이지 |
| `/wishlist` | 위시리스트 페이지 |

---

## 구현 단계

### Phase 1 — 프로젝트 초기 설정
- [x] Vite + React + TypeScript 스캐폴딩
- [x] Tailwind CSS v4 설정
- [x] Zustand 설치
- [x] React Router 설치
- [x] 폴더 구조 생성
- [x] 기본 레이아웃 & 네비게이션

### Phase 2 — 투두 기능
- [ ] Zustand todoStore (persist)
- [ ] TodoForm 컴포넌트
- [ ] TodoItem 컴포넌트
- [ ] 필터 & 정렬

### Phase 3 — 위시리스트 기능
- [ ] Zustand wishStore (persist)
- [ ] WishForm 컴포넌트
- [ ] WishItem 카드
- [ ] 상태/정렬 필터

### Phase 4 — UI 폴리싱
- [ ] 다크모드
- [ ] 애니메이션 (Tailwind transition)
- [ ] 빈 상태 UI
- [ ] 모바일 반응형 점검

### Phase 5 — 배포
- [ ] GitHub 저장소 연결
- [ ] Vercel 프로젝트 생성
- [ ] 도메인 설정 (선택)

---

## Vercel 배포 설정

```json
// vercel.json
{
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

SPA 라우팅을 위한 fallback 설정 필수.
