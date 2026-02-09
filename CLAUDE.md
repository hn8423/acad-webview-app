# acad-webview-app

학원 관리 B2B 서비스 웹뷰 앱. SvelteKit 기반, 정적 빌드 후 네이티브 앱 웹뷰에 임베딩.

## 기술 스택

- SvelteKit 2 + Svelte 5 (runes) + TypeScript 5.9
- Vite 7.3 빌드, @sveltejs/adapter-static 정적 출력
- 순수 CSS/SCSS 스타일링 (Tailwind 미사용)
- Zod 입력 검증
- Vitest (단위/컴포넌트 테스트) + Playwright (E2E 테스트)
- ESLint + Prettier 코드 스타일

## 명령어

```bash
yarn dev              # 개발 서버
yarn build            # 프로덕션 빌드
yarn preview          # 빌드 미리보기
yarn check            # TypeScript 타입 검사
yarn lint             # ESLint + Prettier 검사
yarn format           # Prettier 자동 포맷
yarn test:unit        # Vitest 단위 테스트
yarn test:e2e         # Playwright E2E 테스트
yarn test             # 단위 + E2E 전체 테스트
```

## 프로젝트 구조

```
src/
  lib/
    api/               # API 클라이언트 (fetch wrapper + JWT 자동 첨부)
      client.ts        # 공통 fetch, 401 자동 갱신, 에러 처리
      auth.ts          # 인증 API
      academy.ts       # 학원 정보 + 앱설정 + 공지 API
      member.ts        # 멤버십 + 수강권 + 음료권 API
    stores/            # Svelte 5 rune 기반 상태관리
      auth.svelte.ts   # user, tokens, login/logout
      academy.svelte.ts # 현재 학원 + 앱설정(nav)
    components/
      ui/              # 공통 UI (Button, Input, Modal, Card, Badge, Spinner)
      layout/          # 레이아웃 (Header, BottomNav, BackHeader, AdminSidebar)
    types/             # TypeScript 타입 정의 (api, auth, academy, member)
    utils/             # 유틸리티 (format, storage)
    styles/            # 글로벌 SCSS (_variables, _reset, _mixins, global)
    assets/            # 아이콘, 이미지
  routes/
    auth/              # 인증 (로그인, 회원가입, 학원 선택)
    app/               # 회원 앱 (메인, 공지, 프로필) - Header + BottomNav 레이아웃
    admin/             # 관리자/강사 앱 (대시보드, 공지관리, 수강생관리) - Sidebar 레이아웃
  app.html             # HTML 템플릿
  app.d.ts             # 전역 타입
e2e/                   # Playwright E2E 테스트
static/                # 정적 파일
```

## 라우팅 구조

- /auth/login          # 전화번호 + 비밀번호 로그인
- /auth/signup         # SMS 인증 → 회원가입
- /auth/select-academy # 학원 선택 (로그인 후)
- /app                 # 회원 메인 (음료권, 수강권, 공지)
- /app/notice          # 공지사항 목록
- /app/notice/[id]     # 공지사항 상세
- /app/profile         # 내 정보
- /admin               # 관리자 대시보드
- /admin/notices       # 공지사항 관리 (CRUD)
- /admin/students      # 수강생 목록 (무한스크롤)
- /admin/students/[id] # 수강생 상세 (수강권/음료권 관리)

## 환경 변수

- PUBLIC_API_BASE_URL  # 백엔드 API URL (SvelteKit PUBLIC_ 접두사 → 클라이언트 접근 가능)
- PUBLIC_WS_URL        # WebSocket URL (합주조 채팅용, 후순위)

## 백엔드 API

- 인증: ACADEMIC_USER 전용 JWT (기존 auth와 분리)
- 멀티테넌시: 모든 API에 academy_id path param
- API 경로: /academic/auth/*, /academic/academies/:academy_id/*
- 앱설정: /academic/academies/:academy_id/app-config?app_type=USER|ADMIN
  → 바텀 네비/메뉴를 동적으로 렌더링

## 코드 스타일

- 탭 들여쓰기, 작은따옴표, 줄 너비 100자, trailing comma 없음
- Svelte 파일은 prettier-plugin-svelte로 포맷
- 불변 패턴 사용 (객체 직접 변경 금지, spread로 새 객체 생성)
- 함수 50줄 이하, 파일 800줄 이하
- Svelte 5 runes 사용 ($state, $derived, $effect, $props)

## 테스트 규칙

- 컴포넌트 테스트: *.svelte.spec.ts → Vitest + Playwright 브라우저 환경
- 서버/유틸 테스트: *.spec.ts → Vitest Node 환경
- E2E 테스트: e2e/ → Playwright
- 모든 테스트에 assertion 필수 (requireAssertions: true)
- 최소 커버리지: 80%

## 주의사항

- 패키지 매니저: yarn (engine-strict 모드)
- 경로 별칭: $lib → src/lib/ (SvelteKit 내장)
- 정적 어댑터 사용으로 서버 사이드 기능 없음 (SSR 없음)
- 인증 토큰은 localStorage에 저장
- 모든 사용자 입력은 zod로 검증
