# 🎨 아들을 위한 재미있는 숫자 놀이! (Number Tracing Game)

사용자(아들)를 위한 재미있고 직관적인 태블릿(아이패드 등) 대응 숫자 학습 웹 앱입니다.

이 앱은 정적 HTML/CSS/JS 기반으로 설계되어 빌드 단계가 없으며, GitHub Pages를 통해 배포하여 모바일 및 태블릿 브라우저에서 바로 편리하게 학습할 수 있습니다.

---

## 🌟 핵심 기능
1. **스케치북 감성 디자인:** 따뜻하고 친근한 색감과 질감으로 아이들이 거부감 없이 접근할 수 있습니다.
2. **반응형 가이드 트랙:** 각 숫자의 정해진 획과 체크포인트를 따라 터치하여 그릴 수 있도록 돕습니다.
3. **무지개 펜 모드:** 그릴 때마다 색상이 변하는 무지개 모드를 추가하여 그리기 놀이에 대한 동기를 유도합니다.
4. **성공 피드백 애니메이션:** 숫자를 완성하면 화면 가득 폭죽(Fireworks)이 터지며 화려한 색종이(Confetti) 조각들이 떨어집니다.
5. **목소리 합성(TTS):** 완성 시 한국어 음성으로 "1은 하나~", "2는 둘~" 같은 정다운 소리를 들려줍니다.

---

## 🛠 로컬에서 실행하기
본 프로젝트는 빌드 과정이 필요 없는 순수 정적 웹사이트입니다.
1. 이 레포지토리를 클론합니다:
   ```bash
   git clone <your-repository-url>
   ```
2. 프로젝트 루트의 `index.html` 파일을 브라우저로 직접 실행하거나, VS Code의 `Live Server` 확장을 이용해 가볍게 로컬 서버를 기동하여 실행할 수 있습니다.

> [!NOTE]  
> 일부 브라우저 및 태블릿(Safari 등)에서는 보안 정책상 첫 터치 전까지 소리(TTS)가 제한될 수 있으므로, 실행 시 첫 모달 창의 "시작하기" 버튼을 눌러 소리 세션을 활성화해 주어야 소리가 정상적으로 출력됩니다.

---

## 🚀 GitHub Pages 배포 가이드
GitHub 저장소에 올려 무료 웹 호스팅을 사용해 보세요:

1. **GitHub 저장소 생성 및 푸시**
   - GitHub에서 새로운 저장소(Public)를 생성합니다.
   - 프로젝트 폴더에서 깃을 초기화하고 원격 저장소를 추가하여 메인 브랜치로 코드를 푸시합니다:
     ```bash
     git init
     git add .
     git commit -m "Initial commit: Number Tracing Game Setup"
     git branch -M main
     git remote add origin <your-repository-url>
     git push -u origin main
     ```

2. **GitHub Pages 활성화**
   - 생성한 GitHub 저장소 페이지의 상단 메뉴에서 **Settings** 탭으로 들어갑니다.
   - 좌측 사이드바에서 **Pages**를 클릭합니다.
   - **Build and deployment** 섹션의 **Source** 설정을 `Deploy from a branch`로 지정합니다.
   - **Branch** 설정에서 `main` 브랜치 및 `/ (root)` 폴더를 선택한 뒤 **Save** 버튼을 누릅니다.

3. **배포 확인**
   - 1~2분 정도 기다린 뒤 페이지를 새로고침하면 Settings -> Pages 페이지 상단에 **"Your site is live at..."** 문구와 함께 웹 브라우저 주소(예: `https://<username>.github.io/<repo-name>/`)가 활성화됩니다.
   - 해당 주소를 통해 태블릿(아이패드 등)에서 즐겁게 실행할 수 있습니다!
