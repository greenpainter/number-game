/**
 * js/town/townGame.js
 * 3D 마을 운전 놀이 라이프사이클 (init, start, pause, resize, render loop) 메인 컨트롤러
 */

window.TownGame = (function() {
    let container = null;
    let isInitialized = false;
    let isRunning = false;
    let animFrameId = null;
    let lastTimestamp = 0;

    /**
     * 전체 3D 마을 놀이 초기화
     */
    function init() {
        container = document.getElementById('townCanvasContainer');
        if (!container) {
            console.error("townCanvasContainer 요소를 찾을 수 없습니다.");
            return;
        }

        // 1. 씬 생성
        const { scene, renderer, carGroup, groundMesh } = window.TownScene.initScene(container);

        // 2. 카메라 생성
        const camera = window.CameraFollow.init(scene, container);

        // 3. 차 조작 컨트롤러 생성
        window.CarController.init(carGroup, groundMesh, camera, container);

        // 4. 차량 선택 팔레트 바 이벤트 바인딩
        bindVehicleEvents();

        isInitialized = true;

        // 리사이즈 이벤트 리스너
        window.addEventListener('resize', handleResize);
    }

    let vehicleEventsBound = false;

    /**
     * 차량 선택 팔레트 바 버튼 클릭/터치 및 TTS 연동
     */
    function bindVehicleEvents() {
        if (vehicleEventsBound) return;

        const selector = document.getElementById('vehicleSelector');
        if (!selector) return;

        // 조작 바 터치 시 3D Canvas 레이캐스팅 전파 방지
        const stopProp = (e) => {
            e.stopPropagation();
        };

        selector.addEventListener('pointerdown', stopProp);
        selector.addEventListener('touchstart', stopProp);
        selector.addEventListener('mousedown', stopProp);

        const buttons = selector.querySelectorAll('.vehicle-btn');
        buttons.forEach(btn => {
            const handleSelect = (e) => {
                e.stopPropagation();

                const vehicleType = btn.dataset.vehicle;
                if (!vehicleType) return;

                // 선택 UI 활성화 교체
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // 3D 탈것 메쉬 즉시 교체
                if (window.TownScene && typeof window.TownScene.switchVehicle === 'function') {
                    window.TownScene.switchVehicle(vehicleType);
                }

                // TTS 음성 안내 발성
                speakVehicle(vehicleType);
            };

            btn.addEventListener('click', handleSelect);
        });

        vehicleEventsBound = true;
    }

    /**
     * 차량 교체 TTS 음성 안내 ("신나는 꼬마 버스!", "빨간 승용차!", "신나는 덤프트럭!", "포크레인 굴착기!")
     */
    function speakVehicle(type) {
        let text = "";
        switch (type) {
            case 'bus':
                text = "신나는 꼬마 버스!";
                break;
            case 'car':
                text = "빨간 승용차!";
                break;
            case 'truck':
                text = "신나는 덤프트럭!";
                break;
            case 'excavator':
                text = "포크레인 굴착기!";
                break;
            default:
                text = "신나는 장난감 차!";
        }

        if (window.speak) {
            window.speak(text);
        } else if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'ko-KR';
            utterance.rate = 0.9;
            window.speechSynthesis.speak(utterance);
        }
    }

    /**
     * 3D 마을 놀이 시작 (애니메이션 루프 가동)
     */
    function start() {
        if (!isInitialized) {
            init();
        }

        bindVehicleEvents();

        if (isRunning) return;
        isRunning = true;

        // 안내 오버레이 다시 띄우기
        const overlay = document.getElementById('townOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
        }

        // 리사이즈 1회 즉시 호출
        handleResize();

        lastTimestamp = performance.now();
        animFrameId = requestAnimationFrame(loop);
    }

    /**
     * 3D 마을 놀이 일시정지 (메모리 및 CPU/GPU 리소스 최적화)
     */
    function pause() {
        isRunning = false;
        if (animFrameId) {
            cancelAnimationFrame(animFrameId);
            animFrameId = null;
        }
    }

    /**
     * 렌더링 애니메이션 엔진 루프
     */
    function loop(timestamp) {
        if (!isRunning) return;

        const deltaTime = Math.min((timestamp - lastTimestamp) / 1000, 0.1); // 최대 100ms 캡핑
        lastTimestamp = timestamp;

        // 1. 자동차 물리 및 조향 업데이트
        if (window.CarController) {
            window.CarController.update(deltaTime);
        }

        // 2. 카메라 추적 업데이트
        if (window.CameraFollow && window.TownScene) {
            const carGroup = window.TownScene.getCarGroup();
            window.CameraFollow.update(deltaTime, carGroup);
        }

        // 3. Three.js 씬 렌더링
        if (window.TownScene) {
            const renderer = window.TownScene.getRenderer();
            const scene = window.TownScene.getScene();
            const camera = window.CameraFollow.getCamera();
            if (renderer && scene && camera) {
                renderer.render(scene, camera);
            }
        }

        animFrameId = requestAnimationFrame(loop);
    }

    /**
     * 컨테이너 크기 변화에 맞춘 3D 뷰포트 리사이즈
     */
    function handleResize() {
        if (!container || !isInitialized) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        if (width === 0 || height === 0) return;

        if (window.CameraFollow) {
            window.CameraFollow.resize(width, height);
        }

        if (window.TownScene) {
            const renderer = window.TownScene.getRenderer();
            if (renderer) {
                renderer.setSize(width, height);
                renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            }
        }
    }

    return {
        init,
        start,
        pause,
        resize: handleResize
    };
})();
