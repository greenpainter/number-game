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

    /**
     * 터치/마우스 클릭 이벤트 바인딩
     */
    function bindEvents() {
        if (!container) return;

        // 마우스 및 터치 통합 핸들러
        const handlePointer = (e) => {
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
                targetPosition = new THREE.Vector3(hitPoint.x, 0, hitPoint.z);

                // 씬 타겟 마커 위치 업데이트
                if (window.TownScene) {
                    window.TownScene.setTargetMarkerPosition(hitPoint.x, hitPoint.z);
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
     * 프레임별 자동차 이동 및 회전 보간 연산
     */
    function update(deltaTime) {
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

            carGroup.position.x += moveX;
            carGroup.position.z += moveZ;

            // 장난감 자동차 통통 튀는 움직임 묘사
            const time = Date.now() * 0.015;
            carGroup.children[0].position.y = 0.7 + Math.sin(time) * 0.05;

        } else {
            // 목푯값 도착
            isMoving = false;
            targetPosition = null;
            currentSpeed = 0;

            if (window.TownScene) {
                window.TownScene.hideTargetMarker();
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
