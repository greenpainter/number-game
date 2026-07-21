/**
 * js/town/carController.js
 * Raycaster 지면 클릭 감지, 자동차 조향(Angle Lerp) 및 전진 물리 조작
 */

window.CarController = (function() {
    let carGroup, groundMesh, camera, container;
    let raycaster, mouse;
    let targetPosition = null;
    let moveSpeed = 14.0; // 이동 속도
    let currentSpeed = 0;
    let isMoving = false;

    /**
     * 자동차 컨트롤러 초기화 및 이벤트 등록
     */
    function init(pCarGroup, pGroundMesh, pCamera, pContainer) {
        carGroup = pCarGroup;
        groundMesh = pGroundMesh;
        camera = pCamera;
        container = pContainer;

        raycaster = new THREE.Raycaster();
        mouse = new THREE.Vector2();
        targetPosition = null;
        isMoving = false;
        currentSpeed = 0;

        bindEvents();
    }

    let isDigging = false;
    let digProgress = 0.0;
    let isTargetingSand = false;

    /**
     * 터치/마우스 클릭 이벤트 바인딩
     */
    function bindEvents() {
        if (!container) return;

        // 마우스 및 터치 통합 핸들러
        const handlePointer = (e) => {
            if (isDigging) return; // 굴착 동작 중 조종 차단

            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;

            const rect = container.getBoundingClientRect();
            
            // NDC (Normalized Device Coordinates: -1 ~ +1) 변환
            mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

            // Raycasting 3D 지면 좌표 연산
            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObject(groundMesh);

            if (intersects.length > 0) {
                const hitPoint = intersects[0].point;

                // 모래 산 부근 클릭 감지 (x: 70~100, z: -100~-70)
                if (hitPoint.x > 70 && hitPoint.x < 100 && hitPoint.z < -70 && hitPoint.z > -100) {
                    isTargetingSand = true;
                    // 모래 산 봉우리 흙더미 안쪽(77, -73)에 정차 좌표 지정
                    targetPosition = new THREE.Vector3(77, 0, -73);
                } else {
                    isTargetingSand = false;
                    const BOUNDARY_LIMIT = 115.0;
                    const clampedX = Math.max(-BOUNDARY_LIMIT, Math.min(BOUNDARY_LIMIT, hitPoint.x));
                    const clampedZ = Math.max(-BOUNDARY_LIMIT, Math.min(BOUNDARY_LIMIT, hitPoint.z));
                    targetPosition = new THREE.Vector3(clampedX, 0, clampedZ);
                }

                // 씬 타겟 마커 위치 업데이트
                if (window.TownScene) {
                    window.TownScene.setTargetMarkerPosition(targetPosition.x, targetPosition.z);
                }

                // 가이드 안내 텍스트 숨기기
                const overlay = document.getElementById('townOverlay');
                if (overlay) {
                    overlay.classList.add('hidden');
                }

                isMoving = true;
            }
        };

        container.addEventListener('pointerdown', (e) => {
            e.preventDefault();
            handlePointer(e);
        });
    }

    /**
     * 프레임별 자동차 이동, 굴착기 굴착 동작 및 카메라 줌 보간 연산
     */
    function update(deltaTime) {
        // 1. 굴착 동작 애니메이션 진행 중일 때
        if (isDigging) {
            digProgress += deltaTime * 0.28; // 약 3.5초 동안 굴착 및 트럭 덤핑 시네마틱 실행
            if (window.TownScene && typeof window.TownScene.animateExcavatorDig === 'function') {
                window.TownScene.animateExcavatorDig(digProgress);
            }

            if (digProgress >= 1.0) {
                // 굴착 & 적재 완수 -> 줌아웃 복귀 및 동작 해제
                isDigging = false;
                digProgress = 0.0;
                if (window.CameraFollow && typeof window.CameraFollow.setZoomMode === 'function') {
                    window.CameraFollow.setZoomMode(false); // 스무스 줌아웃
                }

                // 헬퍼 트럭 지우기 & 덤프트럭 대기 위치(81, -68)에서 덤프트럭으로 자연스럽게 전환!
                if (window.TownScene) {
                    carGroup.position.set(81, 0, -68);
                    carGroup.rotation.y = -Math.PI / 4;
                    window.TownScene.showHelperTruck(false);
                    window.TownScene.switchVehicle('truck', true);
                }

                // UI 하단 버튼 덤프트럭으로 활성화
                const buttons = document.querySelectorAll('.vehicle-btn');
                buttons.forEach(b => {
                    b.classList.toggle('active', b.dataset.vehicle === 'truck');
                });

                // TTS 칭찬 및 덤프트럭 운전 안내
                const speakMsg = "와! 모래를 가득 실었어요! 이제 덤프트럭을 신나게 운전해보아요!";
                if (window.speak) window.speak(speakMsg);
            }
            return;
        }

        if (!isMoving || !targetPosition || !carGroup) {
            currentSpeed = THREE.MathUtils.lerp(currentSpeed, 0, deltaTime * 8);
            if (window.TownScene) {
                window.TownScene.update(deltaTime, currentSpeed);
            }
            return;
        }

        // 현재 차 위치와 목표 지점 간 거리 계산
        const carPos = new THREE.Vector3(carGroup.position.x, 0, carGroup.position.z);
        const distance = carPos.distanceTo(targetPosition);

        if (distance > 0.4) {
            // 1. 차체가 바라보아야 할 목표 각도 계산 (Three.js Z축 정면 기준)
            const dir = new THREE.Vector3().subVectors(targetPosition, carPos).normalize();
            const targetAngle = Math.atan2(dir.x, dir.z);

            // 2. 현재 각도와 목표 각도 간 부드러운 각도 보간 (Angle Lerp)
            let currentAngle = carGroup.rotation.y;
            let angleDiff = targetAngle - currentAngle;

            // 각도 점프 최단 경로 정규화 (-PI ~ PI)
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            // 조향 보간
            carGroup.rotation.y += angleDiff * Math.min(1.0, deltaTime * 9.0);

            // 3. 전진 속도 가속 & 전진 이동
            currentSpeed = THREE.MathUtils.lerp(currentSpeed, moveSpeed, deltaTime * 5.0);
            const step = Math.min(currentSpeed * deltaTime, distance);

            const moveX = Math.sin(carGroup.rotation.y) * step;
            const moveZ = Math.cos(carGroup.rotation.y) * step;

            // 울타리 경계선 내부로 이동 물리 강제 제한
            const BOUNDARY_LIMIT = 115.0;
            carGroup.position.x = Math.max(-BOUNDARY_LIMIT, Math.min(BOUNDARY_LIMIT, carGroup.position.x + moveX));
            carGroup.position.z = Math.max(-BOUNDARY_LIMIT, Math.min(BOUNDARY_LIMIT, carGroup.position.z + moveZ));

            // 장난감 자동차 통통 튀는 움직임 묘사
            const time = Date.now() * 0.015;
            if (carGroup.children[0]) {
                carGroup.children[0].position.y = 0.7 + Math.sin(time) * 0.05;
            }

        } else {
            // 목푯값 도착
            isMoving = false;
            targetPosition = null;
            currentSpeed = 0;

            if (window.TownScene) {
                window.TownScene.hideTargetMarker();
            }

            // 모래 산 목표 도착 + 굴착기일 때 굴착 동작 & 줌인 트리거 가동!
            const currentVehicle = window.TownScene ? window.TownScene.getCurrentVehicleType() : 'bus';
            if (isTargetingSand && currentVehicle === 'excavator') {
                isTargetingSand = false;
                isDigging = true;
                digProgress = 0.0;

                // 스무스 카메라 줌인 가동!
                if (window.CameraFollow && typeof window.CameraFollow.setZoomMode === 'function') {
                    window.CameraFollow.setZoomMode(true);
                }

                // 차체가 모래 산 중심(85, -85)을 똑바로 바라보도록 정확 조향 (135도)
                carGroup.rotation.y = Math.PI * 0.75;
            } else if (isTargetingSand) {
                isTargetingSand = false;
                if (window.speak) window.speak("굴착기로 교체하고 모래를 퍼보아요!");
            }

            // 차체 가볍게 착지
            if (carGroup.children[0]) {
                carGroup.children[0].position.y = 0.7;
            }
        }

        // 씬 애니메이션 업데이터 호출 (바퀴 회전 등)
        if (window.TownScene) {
            window.TownScene.update(deltaTime, currentSpeed);
        }
    }

    return {
        init,
        update,
        getCurrentSpeed: () => currentSpeed,
        getIsMoving: () => isMoving
    };
})();
