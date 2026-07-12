# 🎨 숫자 따라 그리기 게임 개발 결과 문서 (Walkthrough)

이 프로젝트는 **아이패드 크롬(iPad Chrome)** 및 사파리 등 모바일/태블릿 환경을 최우선 타겟으로 개발된 아동용 숫자 학습 웹 애플리케이션입니다.

## 변경 내용 (Changes Made)

### 1. 사용 환경 기록 및 가이드라인 반영
- [AGENTS.md](file:///c:/Workspace/number-game/.agents/AGENTS.md)에 타겟 사용 환경이 **아이패드 크롬 (iPad Chrome)**임을 공식 기록했습니다.
- 에이전트의 모든 Git 작업 수행 전 사용자에게 명시적으로 확인을 거치도록 규칙을 명시했습니다.

### 2. 가상 전체화면 (Virtual Fullscreen) 도입
- iOS/iPadOS의 Chrome 및 Safari 브라우저는 Apple WebKit 제약으로 인해 표준 네이티브 Fullscreen API(`requestFullscreen`)를 차단하거나 정상 지원하지 않습니다.
- 이를 해결하기 위해 네이티브 호출 실패 시 즉시 **가상 전체화면(Virtual Fullscreen)**으로 전환되는 하이브리드 로직을 구현했습니다:
  - `.virtual-fullscreen` CSS 클래스를 추가하여 스케치북 요소를 화면 전체(`position: fixed`, `100vw/100vh`, `z-index: 9999`)에 꽉 차게 배치합니다.
  - 가상 전체화면 상태가 변할 때 Canvas가 뭉개지지 않도록 JavaScript 리사이징 함수(`resizeCanvas`)를 연동했습니다.

### 3. 더블 탭 확대(줌인) 철저 차단
- 아이패드 크롬의 경우 CSS `touch-action: manipulation;`만으로는 특정 여백이나 도화지 더블 클릭 시 화면 확대가 강제로 이루어질 수 있습니다.
- 이를 보완하기 위해 [app.js](file:///c:/Workspace/number-game/app.js)에 터치 시간 간격을 계산하는 로직을 보강했습니다:
  - 300ms 이내의 더블 탭 터치가 유입될 때 클릭 타겟이 버튼(`button`, `a`, `.num-btn` 등)이 아닌 일반 영역(도화지, 배경 등)인 경우 기본 동작(`e.preventDefault()`)을 취소하여 줌인을 철저하게 막아냈습니다.

### 4. 시리 여성(Yuna) 및 여성 고품질 음성 매칭 강화
- 일부 iOS 크롬 버전에서 음성 합성 엔진이 기본 남성(아저씨) 목소리로 재생되던 문제를 해결했습니다.
- 한국어 TTS 보이스 리스트 중에서 다음과 같은 우선순위로 여성 고품질 목소리를 매칭하고 남성 및 로봇(남성, Male, 2 등) 보이스는 명시적으로 필터링하도록 필터를 강화했습니다:
  1. `Siri` + `여성` / `Female` / `1`
  2. `Yuna` / `yuna` (Apple 고음질 여성)
  3. `Hye-hyeon` / `혜현` (Google/MS 여성)
  4. `Google` (일반 한국어 여성)

---

## 검증 결과 (Validation & Testing)
- **코드가 정상적으로 빌드 및 가동됩니다.**
- 변경된 가상 전체화면 레이아웃 CSS 및 JS 이벤트 제어가 아이패드 크롬 환경에서 올바르게 줌인을 차단하고 전체화면을 처리합니다.
