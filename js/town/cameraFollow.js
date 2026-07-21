/**
 * js/town/cameraFollow.js
 * Isometric 탑뷰 시점 연출 및 장난감 자동차 중앙 추적 카메라 (Smooth Follow Camera Lerp)
 */

window.CameraFollow = (function() {
    let camera;
    let targetMesh;
    const normalOffset = new THREE.Vector3(22, 28, 25); // 기본 시점 오프셋
    const zoomOffset = new THREE.Vector3(12, 11, 14);    // 굴착 시 적당히 넉넉하고 넓은 줌인 시점 오프셋
    let targetOffset = normalOffset.clone();
    let currentOffset = normalOffset.clone();

    let cameraLerpSpeed = 4.5; // 카메라 추적 속도

    /**
     * Isometric Perspective 카메라 초기화
     */
    function init(scene, container) {
        const aspect = container.clientWidth / container.clientHeight;
        
        // FOV 45도의 시원한 Isometric 시야각 (Z-buffer 정밀도 최적화: near 1.0, far 350)
        camera = new THREE.PerspectiveCamera(45, aspect, 1.0, 350);

        // 초기 카메라 위치 설정
        camera.position.set(22, 28, 25);
        camera.lookAt(0, 0.8, 0);

        return camera;
    }

    /**
     * 줌인/줌아웃 카메라 모드 설정
     */
    function setZoomMode(isZoomed) {
        targetOffset = isZoomed ? zoomOffset.clone() : normalOffset.clone();
    }

    /**
     * 자동차 위치를 화면 중앙에 오도록 선형 보간(Lerp) 추적 & 줌인 스무스 보간
     */
    function update(deltaTime, targetGroup) {
        if (!camera || !targetGroup) return;

        // 오프셋 줌 스무스 보간
        currentOffset.lerp(targetOffset, Math.min(1.0, deltaTime * 3.5));

        // 자동차의 현재 좌표
        const targetPos = targetGroup.position;

        // 카메라가 이동해야 할 목표 3D 좌표 (자동차 좌표 + 시점 오프셋)
        const desiredCameraPos = new THREE.Vector3(
            targetPos.x + currentOffset.x,
            targetPos.y + currentOffset.y,
            targetPos.z + currentOffset.z
        );

        // 부드러운 위치 보간 (Smooth Follow Lerp)
        const lerpFactor = Math.min(1.0, deltaTime * cameraLerpSpeed);
        camera.position.lerp(desiredCameraPos, lerpFactor);

        // 카메라는 항상 자동차의 약간 상단을 바라보도록 조준
        const lookTarget = new THREE.Vector3(targetPos.x, targetPos.y + 0.8, targetPos.z);
        camera.lookAt(lookTarget);
    }

    /**
     * 리사이즈 시 카메라 Aspect 반영
     */
    function resize(width, height) {
        if (!camera) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    }

    return {
        init,
        update,
        resize,
        setZoomMode,
        getCamera: () => camera
    };
})();
