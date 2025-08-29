# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 필요한 가이드를 제공합니다.

## 개발 명령어

- **개발**: `npm run dev` - Vite 개발 서버 시작 및 Electron 애플리케이션 실행
- **빌드**: `npm run build` - TypeScript 컴파일, Vite 빌드, Electron Builder 패키징
- **미리보기**: `npm run preview` - 빌드된 애플리케이션 미리보기
- **테스트**: `npm test` - Vitest 테스트 실행 (테스트 모드용 빌드를 위해 `npm run pretest` 먼저 실행)

## 아키텍처 개요

이 프로젝트는 Vite, React, TypeScript로 구축된 Electron 애플리케이션입니다. 표준 Electron 아키텍처를 따라 별도의 프로세스로 구성됩니다:

### 메인 프로세스 (`electron/main/`)
- **index.ts**: 메인 Electron 프로세스 진입점, 윈도우 생성, IPC, 앱 라이프사이클 관리
- **update.ts**: electron-updater를 사용한 자동 업데이트 기능

### 프리로드 스크립트 (`electron/preload/`)
- **index.ts**: Context Bridge 설정, IPC API 노출, 로딩 화면 관리

### 렌더러 프로세스 (`src/`)
- **React 애플리케이션**: TypeScript를 사용한 표준 React 앱
- **경로 별칭**: `@/*`는 `src/*`에 매핑됨
- **스타일링**: Tailwind CSS (preflight 비활성화) 및 일반 CSS
- **컴포넌트**: `src/components/`의 모듈식 컴포넌트 구조

### 주요 기능
- **자동 업데이터**: `src/components/update/`에 진행률 추적이 포함된 완전한 업데이트 시스템
- **IPC 통신**: 안전한 메인-렌더러 통신을 위해 contextBridge를 통해 노출
- **다중 윈도우**: `open-win` IPC 핸들러를 통한 자식 윈도우 지원
- **보안**: Context isolation 활성화 (nodeIntegration 기본적으로 비활성화)

### 빌드 구조
```
dist-electron/
├── main/index.js      # 빌드된 메인 프로세스
└── preload/index.mjs  # 빌드된 프리로드 스크립트
dist/                  # 빌드된 렌더러 (React 앱)
```

### 설정 파일
- **vite.config.ts**: Electron 플러그인과 React 지원이 포함된 Vite 설정
- **vitest.config.ts**: 테스트 설정 (29초 타임아웃)
- **tsconfig.json**: 경로 매핑과 React JSX가 포함된 TypeScript 설정
- **tailwind.config.js**: preflight가 비활성화된 Tailwind 설정
- **electron-builder.json**: Electron Builder 패키징 설정

### 테스트
테스트는 Vitest와 e2e 테스트용 Playwright를 사용하여 `test/` 디렉토리에 위치합니다.