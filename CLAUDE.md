# acad-webview-app

SvelteKit 기반 학술 웹뷰 애플리케이션. 정적 사이트로 빌드되어 네이티브 앱 웹뷰에 임베딩됨.

## 기술 스택

- SvelteKit 2 + Svelte 5 + TypeScript 5.9
- Vite 7.3 빌드, @sveltejs/adapter-static 정적 출력
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
  routes/              # SvelteKit 페이지 라우팅
    +page.svelte       # 페이지 컴포넌트
    +layout.svelte     # 레이아웃 (Svelte 5 snippet 문법)
    *.svelte.spec.ts   # 컴포넌트 테스트 (브라우저 환경)
  lib/                 # 공유 라이브러리 ($lib 별칭)
    assets/            # 정적 에셋
  app.html             # HTML 템플릿
  app.d.ts             # 전역 타입
  *.spec.ts            # 서버 단위 테스트 (Node 환경)
e2e/                   # Playwright E2E 테스트
static/                # 정적 파일 (빌드 시 그대로 복사)
```

## 코드 스타일

- 탭 들여쓰기, 작은따옴표, 줄 너비 100자
- trailing comma 없음
- Svelte 파일은 prettier-plugin-svelte로 포맷

## 테스트 규칙

- 컴포넌트 테스트: `*.svelte.spec.ts` → Vitest + Playwright 브라우저 환경
- 서버/유틸 테스트: `*.spec.ts` → Vitest Node 환경
- E2E 테스트: `e2e/` 디렉토리 → Playwright
- 모든 테스트에 assertion 필수 (`requireAssertions: true`)

## 주의사항

- 패키지 매니저: yarn (engine-strict 모드)
- 경로 별칭: `$lib` → `src/lib/` (SvelteKit 내장)
- 정적 어댑터 사용으로 서버 사이드 기능 없음
