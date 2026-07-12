# 숫자 따라 그리기 학습 웹 애플리케이션 구현 계획서 (Number Tracing Game)

이 계획서는 사용자의 아들을 위한 태블릿(아이패드 등) 대응 숫자 학습 웹 앱의 설계와 구현 단계를 설명합니다. 이 앱은 정적 HTML/CSS/JS 기반으로 설계되어 빌드 단계가 없으며, GitHub Pages를 통해 즉시 배포하여 모바일/태블릿 브라우저에서 편리하게 사용할 수 있습니다.

## User Review Required

> [!IMPORTANT]
> **오디오 재생 및 터치 감지 최적화 (iPad 대응)**
> - iOS Safari(아이패드 브라우저)의 오디오 자동 재생 제한 정책으로 인해 첫 터치(화면 시작/그리기 시작) 시점에 오디오 컨텍스트 및 TTS(음성 합성) 엔진을 활성화(unlock)하는 처리가 포함됩니다.
> - 터치 펜슬 또는 멀티터치 도중 드로잉 끊김을 방지하기 위해 터치 이벤트(`touchstart`, `touchmove`, `touchend`)와 마우스 이벤트를 완벽하게 통합 지원합니다.

## Proposed Changes

프로젝트는 복잡한 프레임워크 없이 순수 프론트엔드 기술(Vanilla JS, Canvas API, CSS)을 활용해 하나의 정적 페이지로 구성됩니다. 따라서 파일 구조는 매우 간단하고 가볍게 유지됩니다.

---

### [Component: Frontend Web App]

#### [NEW] [index.html](file:///c:/Workspace/number-game/index.html)
- 스케치북 테마의 HTML5 마크업 구조 설계
- Google Fonts에서 귀여운 한국어 폰트([Gaegu](https://fonts.google.com/specimen/Gaegu) 또는 [Jua](https://fonts.google.com/specimen/Jua)) 가져오기
- 숫자 선택 패널(0~9), 드로잉 캔버스(숫자 가이드 포함), 그리고 컨트롤 패널(지우개, 다시 재생 등) 배치
- SEO 메타 태그 지정 및 모바일 기기 반응형 뷰포트 설정

#### [NEW] [style.css](file:///c:/Workspace/number-game/style.css)
- 스케치북 종이 질감(격자 무늬 배경 또는 파스텔톤 종이 디자인) 구현
- 동적인 UI 애니메이션: 마우스 호버 시 둥실둥실 움직이는 효과, 버튼 클릭 시 바운스 효과
- 모바일 및 태블릿 화면 크기에 맞추어 캔버스가 비율을 유지하며 유연하게 늘어나는 반응형 레이아웃 구성
- 유리 효과(Glassmorphism) 스타일의 모달 및 패널 디자인

#### [NEW] [app.js](file:///c:/Workspace/number-game/app.js)
- **가이드 및 Tracing 로직:**
  - 각 숫자(0~9)를 그리기 위한 핵심 경로 점(Checkpoint)을 좌표 배열로 정의합니다.
  - 사용자가 그리는 선이 현재 활성화된 Checkpoint의 일정 반경(오차 허용 범위)을 통과하면 해당 점을 완료로 판정합니다.
  - 가이드 포인트(예: 녹색으로 깜빡이는 화살표나 별 모양의 지점)를 통해 다음에 그릴 위치를 안내합니다.
- **드로잉 효과:** 
  - 캔버스에 선을 그릴 때 알록달록한 무지개 펜 효과 또는 별가루 파티클 꼬리 효과를 옵션으로 제공합니다.
- **피드백 시스템:**
  - 완성 시 `SpeechSynthesisUtterance`를 활용해 한국어로 **"1은 하나~", "2는 둘~"**을 귀여운 목소리 톤(속도 및 음높이 조절)으로 읽어줍니다.
  - 캔버스 위에 Canvas 파티클을 뿜어내는 화려한 **폭죽(Fireworks) & Confetti 효과**를 물리 물리(중력, 마찰력)를 적용하여 부드러운 60fps 애니메이션으로 구현합니다.
- **오디오 잠금 해제:** 
  - 앱 첫 터치 시 음성 인스턴스를 한 번 활성화하여 iPad에서 소리가 안 나오는 문제를 예방합니다.

#### [NEW] [README.md](file:///c:/Workspace/number-game/README.md)
- 프로젝트 설치 방법 및 실행 방법 기술
- **GitHub Pages 배포 가이드:** 
  1. GitHub 저장소 생성 및 코드 푸시
  2. 저장소 Settings -> Pages 탭 진입
  3. Build and deployment의 Source를 `Deploy from a branch`로 설정하고 `main` 브라우저 선택 후 저장
  4. 수 분 내 배포 완료 링크(`https://username.github.io/repo-name/`) 확인 방법 안내

## Verification Plan

## Manual Verification
1. **로컬 테스트:** `index.html` 파일을 브라우저로 직접 실행하거나 간이 서버를 띄워 화면 비율 및 동작을 확인합니다.
2. **모바일/아이패드 환경 테스트:**
   - Chrome 및 Safari 브라우저에서 스크롤이 잠기는지, 그리기 감지가 매끄러운지 확인합니다.
   - 숫자 완성 시 폭죽이 부드럽게 끊김 없이 연출되는지, 한국어 목소리가 정상적으로 들리는지 검증합니다.
3. **GitHub Pages 빌드 검증:** 배포 후 주소에 접속하여 정적 자산 경로 문제 없이 작동하는지 확인합니다.
