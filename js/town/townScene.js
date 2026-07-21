/**
 * js/town/townScene.js
 * Three.js 씬 구성 요소 (조명, 지면, 도로, Low-Poly 건물, 나무, 자동차)
 */

window.TownScene = (function() {
    let scene, renderer;
    let groundMesh, carGroup, targetMarker;
    let wheels = [];
    let treeLeavesList = [];
    let targetMarkerRing, targetMarkerAura;

    /**
     * Three.js 씬 및 3D 오브젝트 초기화
     */
    function initScene(container) {
        scene = new THREE.Scene();
        scene.background = new THREE.Color('#e0f4f7'); // 파스텔 하늘색 배경
        scene.fog = new THREE.FogExp2('#e0f4f7', 0.007); // 부드러운 안개

        // 렌더러 생성 및 그림자 설정
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
        renderer.setSize(container.clientWidth, container.clientHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.outputEncoding = THREE.sRGBEncoding;

        // 기존 캔버스 비우기 후 신규 캔버스 삽입
        container.innerHTML = '';
        container.appendChild(renderer.domElement);

        // 조명 생성
        setupLights();

        // 지면 & 도로 생성
        createGroundAndRoads();

        // 3D 마을 구조물 (집, 나무, 가로등) 생성
        createTownEnvironment();

        // 장난감 자동차 메쉬 생성
        createToyCar();

        // 터치 타겟 마커 생성
        createTargetMarker();

        return { scene, renderer, carGroup, groundMesh };
    }

    /**
     * 조명 세팅 (부드러운 주광, 방향광, 입체 그림자)
     */
    function setupLights() {
        // 환경광 (따뜻하고 화사한 기본 빛)
        const ambientLight = new THREE.AmbientLight('#ffffff', 0.65);
        scene.add(ambientLight);

        // 반구광 (하늘은 파스텔 블루, 바닥은 잔디 녹색 튀어남 표현)
        const hemiLight = new THREE.HemisphereLight('#ffffff', '#81c784', 0.35);
        hemiLight.position.set(0, 50, 0);
        scene.add(hemiLight);

        // 메인 직사광선 (태양광 & 그림자)
        const dirLight = new THREE.DirectionalLight('#ffffff', 0.85);
        dirLight.position.set(30, 45, 25);
        dirLight.castShadow = true;

        // 그림자 맵 품질 및 범위 최적화
        dirLight.shadow.mapSize.width = 2048;
        dirLight.shadow.mapSize.height = 2048;
        dirLight.shadow.camera.near = 0.5;
        dirLight.shadow.camera.far = 150;
        const shadowCamSize = 40;
        dirLight.shadow.camera.left = -shadowCamSize;
        dirLight.shadow.camera.right = shadowCamSize;
        dirLight.shadow.camera.top = shadowCamSize;
        dirLight.shadow.camera.bottom = -shadowCamSize;
        dirLight.shadow.bias = -0.0005;

        scene.add(dirLight);
    }

    /**
     * 잔디 지면 및 도로 타일 생성
     */
    function createGroundAndRoads() {
        const groundSize = 120;
        const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
        const groundMat = new THREE.MeshLambertMaterial({ color: '#7ec850' }); // 화사한 잔디색

        groundMesh = new THREE.Mesh(groundGeo, groundMat);
        groundMesh.rotation.x = -Math.PI / 2;
        groundMesh.receiveShadow = true;
        groundMesh.name = "ground";
        scene.add(groundMesh);

        // 도로 네트워크 생성 (십자로 + 외각 루프)
        const roadMat = new THREE.MeshStandardMaterial({ color: '#4a4e69', roughness: 0.8 });
        const lineMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });

        // 메인 십자 도로
        createRoadTile(0, 0, 120, 12, roadMat); // E-W
        createRoadTile(0, 0, 12, 120, roadMat); // N-S

        // 외곽 정사각형 루프 도로
        createRoadTile(0, 40, 92, 10, roadMat);
        createRoadTile(0, -40, 92, 10, roadMat);
        createRoadTile(40, 0, 10, 92, roadMat);
        createRoadTile(-40, 0, 10, 92, roadMat);

        // 중앙 차선 점선 데코레이션
        for (let i = -55; i <= 55; i += 6) {
            if (Math.abs(i) < 7) continue; // 교차로 부분 비우기
            // E-W 차선
            createStripe(i, 0, 3, 0.4, lineMat);
            // N-S 차선
            createStripe(0, i, 0.4, 3, lineMat);
        }
    }

    function createRoadTile(x, z, width, height, material) {
        const roadGeo = new THREE.PlaneGeometry(width, height);
        const road = new THREE.Mesh(roadGeo, material);
        road.rotation.x = -Math.PI / 2;
        road.position.set(x, 0.01, z);
        road.receiveShadow = true;
        scene.add(road);
        registerWrapObject(road, x, z);
    }

    function createStripe(x, z, w, h, material) {
        const stripeGeo = new THREE.PlaneGeometry(w, h);
        const stripe = new THREE.Mesh(stripeGeo, material);
        stripe.rotation.x = -Math.PI / 2;
        stripe.position.set(x, 0.02, z);
        scene.add(stripe);
        registerWrapObject(stripe, x, z);
    }

    /**
     * 알록달록 Low-Poly 장난감 마을 환경 (집, 나무, 가로등)
     */
    function createTownEnvironment() {
        // 집 색상 파스텔 팔레트
        const houseColors = [
            { wall: '#ff85a1', roof: '#ff3366' }, // 핑크
            { wall: '#4ea8de', roof: '#0077b6' }, // 파랑
            { wall: '#ffd166', roof: '#e63946' }, // 노랑/빨강
            { wall: '#70e000', roof: '#38b000' }, // 연두
            { wall: '#b8c0ff', roof: '#7209b7' }, // 보라
            { wall: '#ff9e00', roof: '#d00000' }  // 주황
        ];

        // 마을 집배치 좌표 목록
        const housePositions = [
            // 구역 1 (북서)
            { x: -22, z: -22, colorIdx: 0, scale: 1.2, rot: 0 },
            { x: -14, z: -25, colorIdx: 1, scale: 1.0, rot: Math.PI / 4 },
            { x: -25, z: -14, colorIdx: 2, scale: 1.1, rot: -Math.PI / 6 },
            { x: -28, z: -28, colorIdx: 3, scale: 1.3, rot: 0 },

            // 구역 2 (북동)
            { x: 22, z: -22, colorIdx: 4, scale: 1.1, rot: 0 },
            { x: 14, z: -25, colorIdx: 5, scale: 1.2, rot: -Math.PI / 4 },
            { x: 25, z: -14, colorIdx: 0, scale: 1.0, rot: Math.PI / 6 },
            { x: 28, z: -28, colorIdx: 1, scale: 1.4, rot: 0 },

            // 구역 3 (남서)
            { x: -22, z: 22, colorIdx: 2, scale: 1.3, rot: 0 },
            { x: -14, z: 25, colorIdx: 3, scale: 1.0, rot: -Math.PI / 4 },
            { x: -25, z: 14, colorIdx: 4, scale: 1.2, rot: Math.PI / 4 },
            { x: -28, z: 28, colorIdx: 5, scale: 1.1, rot: 0 },

            // 구역 4 (남동)
            { x: 22, z: 22, colorIdx: 1, scale: 1.1, rot: 0 },
            { x: 14, z: 25, colorIdx: 2, scale: 1.3, rot: Math.PI / 4 },
            { x: 25, z: 14, colorIdx: 3, scale: 1.0, rot: -Math.PI / 4 },
            { x: 28, z: 28, colorIdx: 0, scale: 1.2, rot: 0 }
        ];

        housePositions.forEach(p => {
            const palette = houseColors[p.colorIdx];
            createHouse(p.x, p.z, palette.wall, palette.roof, p.scale, p.rot);
        });

        // 나무배치 좌표 생성 (도로변 및 구역 틈새)
        const treePositions = [
            { x: -8, z: -12 }, { x: 8, z: -12 }, { x: -8, z: 12 }, { x: 8, z: 12 },
            { x: -12, z: -8 }, { x: 12, z: -8 }, { x: -12, z: 8 }, { x: 12, z: 8 },
            { x: -20, z: -8 }, { x: 20, z: -8 }, { x: -20, z: 8 }, { x: 20, z: 8 },
            { x: -8, z: -20 }, { x: 8, z: -20 }, { x: -8, z: 20 }, { x: 8, z: 20 },
            { x: -35, z: -20 }, { x: 35, z: -20 }, { x: -35, z: 20 }, { x: 35, z: 20 },
            { x: -20, z: -35 }, { x: 20, z: -35 }, { x: -20, z: 35 }, { x: 20, z: 35 }
        ];

        treePositions.forEach(p => {
            createTree(p.x, p.z);
        });

        // 가로등 배치
        const lampPositions = [
            { x: -7, z: -7 }, { x: 7, z: -7 }, { x: -7, z: 7 }, { x: 7, z: 7 },
            { x: -25, z: -7 }, { x: 25, z: -7 }, { x: -25, z: 7 }, { x: 25, z: 7 }
        ];
        lampPositions.forEach(p => createStreetLamp(p.x, p.z));
    }

    /**
     * 장난감 집 생성 헬퍼
     */
    function createHouse(x, z, wallColor, roofColor, scale = 1.0, rotation = 0) {
        const houseGroup = new THREE.Group();
        houseGroup.position.set(x, 0, z);
        houseGroup.rotation.y = rotation;

        const w = 4 * scale;
        const h = 3.2 * scale;
        const d = 4 * scale;

        // 벽체 (본체)
        const wallGeo = new THREE.BoxGeometry(w, h, d);
        const wallMat = new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.5 });
        const wall = new THREE.Mesh(wallGeo, wallMat);
        wall.position.y = h / 2;
        wall.castShadow = true;
        wall.receiveShadow = true;
        houseGroup.add(wall);

        // 지붕 (피라미드 모양)
        const roofGeo = new THREE.ConeGeometry(w * 0.8, 2.5 * scale, 4);
        const roofMat = new THREE.MeshStandardMaterial({ color: roofColor, roughness: 0.4 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.y = h + (1.25 * scale);
        roof.rotation.y = Math.PI / 4;
        roof.castShadow = true;
        houseGroup.add(roof);

        // 문 (Door)
        const doorGeo = new THREE.BoxGeometry(1 * scale, 1.8 * scale, 0.2);
        const doorMat = new THREE.MeshStandardMaterial({ color: '#6b705c' });
        const door = new THREE.Mesh(doorGeo, doorMat);
        door.position.set(0, (1.8 * scale) / 2, d / 2 + 0.05);
        houseGroup.add(door);

        // 창문 (Windows)
        const winGeo = new THREE.BoxGeometry(0.9 * scale, 0.9 * scale, 0.1);
        const winMat = new THREE.MeshStandardMaterial({ color: '#e0f7fa', roughness: 0.2 });
        const win1 = new THREE.Mesh(winGeo, winMat);
        win1.position.set(-1.1 * scale, h * 0.65, d / 2 + 0.05);
        houseGroup.add(win1);

        const win2 = win1.clone();
        win2.position.x = 1.1 * scale;
        houseGroup.add(win2);

        // 굴뚝 (Chimney)
        const chimneyGeo = new THREE.BoxGeometry(0.6 * scale, 1.5 * scale, 0.6 * scale);
        const chimneyMat = new THREE.MeshStandardMaterial({ color: '#8d5b4c' });
        const chimney = new THREE.Mesh(chimneyGeo, chimneyMat);
        chimney.position.set(w * 0.25, h + 1.2 * scale, -d * 0.2);
        chimney.castShadow = true;
        houseGroup.add(chimney);

        scene.add(houseGroup);
        registerWrapObject(houseGroup, x, z);
    }

    /**
     * 장난감 나무 생성 헬퍼
     */
    function createTree(x, z) {
        const treeGroup = new THREE.Group();
        treeGroup.position.set(x, 0, z);

        const scale = 0.8 + Math.random() * 0.5;

        // 나무 기둥 (Trunk)
        const trunkGeo = new THREE.CylinderGeometry(0.4 * scale, 0.6 * scale, 2 * scale, 8);
        const trunkMat = new THREE.MeshStandardMaterial({ color: '#7f5539', roughness: 0.8 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1 * scale;
        trunk.castShadow = true;
        trunk.receiveShadow = true;
        treeGroup.add(trunk);

        // 나뭇잎 층 (Leaves)
        const leafColor = Math.random() > 0.5 ? '#52b788' : '#2a9d8f';
        const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.5 });

        const layer1Geo = new THREE.ConeGeometry(2.2 * scale, 2.5 * scale, 7);
        const layer1 = new THREE.Mesh(layer1Geo, leafMat);
        layer1.position.y = (2 + 1.25) * scale;
        layer1.castShadow = true;
        treeGroup.add(layer1);

        const layer2Geo = new THREE.ConeGeometry(1.6 * scale, 2.0 * scale, 7);
        const layer2 = new THREE.Mesh(layer2Geo, leafMat);
        layer2.position.y = (3.2 + 1.0) * scale;
        layer2.castShadow = true;
        treeGroup.add(layer2);

        treeLeavesList.push(layer1, layer2);

        scene.add(treeGroup);
        registerWrapObject(treeGroup, x, z);
    }

    /**
     * 가로등 생성 헬퍼
     */
    function createStreetLamp(x, z) {
        const lampGroup = new THREE.Group();
        lampGroup.position.set(x, 0, z);

        const poleGeo = new THREE.CylinderGeometry(0.12, 0.15, 4, 8);
        const poleMat = new THREE.MeshStandardMaterial({ color: '#2b2d42' });
        const pole = new THREE.Mesh(poleGeo, poleMat);
        pole.position.y = 2;
        pole.castShadow = true;
        lampGroup.add(pole);

        const bulbGeo = new THREE.SphereGeometry(0.45, 16, 16);
        const bulbMat = new THREE.MeshStandardMaterial({
            color: '#ffbe0b',
            emissive: '#ffbe0b',
            emissiveIntensity: 0.8
        });
        const bulb = new THREE.Mesh(bulbGeo, bulbMat);
        bulb.position.y = 4.2;
        lampGroup.add(bulb);

        scene.add(lampGroup);
        registerWrapObject(lampGroup, x, z);
    }

    let currentVehicleType = 'bus';

    /**
     * 공통 바퀴 생성 헬퍼
     */
    function createWheels(targetGroup, positions, radius = 0.42, width = 0.35) {
        wheels = [];
        const wheelGeo = new THREE.CylinderGeometry(radius, radius, width, 18);
        const wheelMat = new THREE.MeshStandardMaterial({ color: '#2f3542', roughness: 0.7 });
        const rimMat = new THREE.MeshStandardMaterial({ color: '#dfe4ea', roughness: 0.3 });

        positions.forEach(pos => {
            const wheelGroup = new THREE.Group();
            wheelGroup.position.set(pos.x, pos.y, pos.z);

            const tire = new THREE.Mesh(wheelGeo, wheelMat);
            tire.rotation.z = Math.PI / 2;
            tire.castShadow = true;
            wheelGroup.add(tire);

            const rimGeo = new THREE.CylinderGeometry(radius * 0.52, radius * 0.52, width + 0.02, 12);
            const rim = new THREE.Mesh(rimGeo, rimMat);
            rim.rotation.z = Math.PI / 2;
            wheelGroup.add(rim);

            targetGroup.add(wheelGroup);
            wheels.push(wheelGroup);
        });
    }

    /**
     * 1) 타요 버스 스타일의 비비드 파란색 꼬마 장난감 버스 메쉬 생성
     */
    function createBusMesh(targetGroup) {
        const bodyGroup = new THREE.Group();
        bodyGroup.position.set(0, 0.7, 0);

        const busBlueColor = '#0066ff';

        // 주 차체 (Relative Y = 0.3)
        const busBodyGeo = new THREE.BoxGeometry(2.3, 1.4, 4.3);
        const busBodyMat = new THREE.MeshStandardMaterial({ color: busBlueColor, roughness: 0.25, metalness: 0.1 });
        const busBody = new THREE.Mesh(busBodyGeo, busBodyMat);
        busBody.position.y = 0.3;
        busBody.castShadow = true;
        busBody.receiveShadow = true;
        bodyGroup.add(busBody);

        // 지붕 캡
        const roofGeo = new THREE.BoxGeometry(2.1, 0.25, 4.1);
        const roofMat = new THREE.MeshStandardMaterial({ color: busBlueColor, roughness: 0.25 });
        const roof = new THREE.Mesh(roofGeo, roofMat);
        roof.position.set(0, 1.1, 0);
        roof.castShadow = true;
        bodyGroup.add(roof);

        // 하단 띠 라인
        const stripeGeo = new THREE.BoxGeometry(2.34, 0.2, 4.34);
        const stripeMat = new THREE.MeshStandardMaterial({ color: '#0044cc' });
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.y = -0.15;
        bodyGroup.add(stripe);

        // 창문들
        const winMat = new THREE.MeshPhysicalMaterial({
            color: '#a0e7e5',
            transmission: 0.7,
            opacity: 0.9,
            transparent: true,
            roughness: 0.1
        });

        const frontWinGeo = new THREE.PlaneGeometry(1.9, 0.75);
        const frontWin = new THREE.Mesh(frontWinGeo, winMat);
        frontWin.position.set(0, 0.55, 2.16);
        bodyGroup.add(frontWin);

        const rearWin = frontWin.clone();
        rearWin.rotation.y = Math.PI;
        rearWin.position.set(0, 0.55, -2.16);
        bodyGroup.add(rearWin);

        const sideWinGeo = new THREE.PlaneGeometry(0.9, 0.65);
        const sideWinZPositions = [1.1, 0, -1.1];

        sideWinZPositions.forEach(zPos => {
            const winLeft = new THREE.Mesh(sideWinGeo, winMat);
            winLeft.rotation.y = -Math.PI / 2;
            winLeft.position.set(-1.16, 0.55, zPos);
            bodyGroup.add(winLeft);

            const winRight = new THREE.Mesh(sideWinGeo, winMat);
            winRight.rotation.y = Math.PI / 2;
            winRight.position.set(1.16, 0.55, zPos);
            bodyGroup.add(winRight);
        });

        // 헤드라이트 & 번호판 & 후미등
        const lightGeo = new THREE.SphereGeometry(0.24, 12, 12);
        const lightMat = new THREE.MeshStandardMaterial({ color: '#fffa65', emissive: '#fffa65', emissiveIntensity: 0.95 });

        const leftLight = new THREE.Mesh(lightGeo, lightMat);
        leftLight.position.set(-0.8, 0.05, 2.16);
        bodyGroup.add(leftLight);

        const rightLight = leftLight.clone();
        rightLight.position.x = 0.8;
        bodyGroup.add(rightLight);

        const signGeo = new THREE.BoxGeometry(1.0, 0.25, 0.08);
        const signMat = new THREE.MeshStandardMaterial({ color: busBlueColor });
        const sign = new THREE.Mesh(signGeo, signMat);
        sign.position.set(0, 1.0, 2.16);
        bodyGroup.add(sign);

        const tailLightMat = new THREE.MeshStandardMaterial({ color: '#ff3838', emissive: '#ff3838', emissiveIntensity: 0.8 });
        const leftTail = new THREE.Mesh(lightGeo, tailLightMat);
        leftTail.scale.set(0.8, 0.8, 0.5);
        leftTail.position.set(-0.8, 0.05, -2.16);
        bodyGroup.add(leftTail);

        const rightTail = leftTail.clone();
        rightTail.position.x = 0.8;
        bodyGroup.add(rightTail);

        targetGroup.add(bodyGroup);

        // 4 바퀴
        createWheels(targetGroup, [
            { x: -1.2, y: 0.42, z: 1.3 },
            { x: 1.2, y: 0.42, z: 1.3 },
            { x: -1.2, y: 0.42, z: -1.3 },
            { x: 1.2, y: 0.42, z: -1.3 }
        ]);
    }

    /**
     * 2) 빨간 3D 승용차 메쉬 생성
     */
    function createCarMesh(targetGroup) {
        const bodyGroup = new THREE.Group();
        bodyGroup.position.set(0, 0.7, 0);

        const carRed = '#ff2a2a';
        const darkRed = '#cc0000';

        // 하부 차체
        const lowerGeo = new THREE.BoxGeometry(2.1, 0.7, 3.8);
        const lowerMat = new THREE.MeshStandardMaterial({ color: carRed, roughness: 0.2, metalness: 0.1 });
        const lower = new THREE.Mesh(lowerGeo, lowerMat);
        lower.position.y = 0.0;
        lower.castShadow = true;
        lower.receiveShadow = true;
        bodyGroup.add(lower);

        // 상부 캐빈
        const cabinGeo = new THREE.BoxGeometry(1.7, 0.65, 2.0);
        const cabinMat = new THREE.MeshStandardMaterial({ color: carRed, roughness: 0.2 });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, 0.6, -0.2);
        cabin.castShadow = true;
        bodyGroup.add(cabin);

        // 유리창 (Windows)
        const winMat = new THREE.MeshPhysicalMaterial({
            color: '#a0e7e5',
            transmission: 0.7,
            opacity: 0.9,
            transparent: true,
            roughness: 0.1
        });

        // 경사 앞유리 (Windshield)
        const windshieldGeo = new THREE.PlaneGeometry(1.5, 0.7);
        const windshield = new THREE.Mesh(windshieldGeo, winMat);
        windshield.position.set(0, 0.65, 0.81);
        windshield.rotation.x = -Math.PI / 6;
        bodyGroup.add(windshield);

        // 뒷유리
        const rearWinGeo = new THREE.PlaneGeometry(1.5, 0.6);
        const rearWin = new THREE.Mesh(rearWinGeo, winMat);
        rearWin.position.set(0, 0.65, -1.21);
        rearWin.rotation.x = Math.PI / 6;
        rearWin.rotation.y = Math.PI;
        bodyGroup.add(rearWin);

        // 측면 창문
        const sideWinGeo = new THREE.PlaneGeometry(1.6, 0.5);
        const sideWinLeft = new THREE.Mesh(sideWinGeo, winMat);
        sideWinLeft.position.set(-0.86, 0.62, -0.2);
        sideWinLeft.rotation.y = -Math.PI / 2;
        bodyGroup.add(sideWinLeft);

        const sideWinRight = sideWinLeft.clone();
        sideWinRight.position.x = 0.86;
        sideWinRight.rotation.y = Math.PI / 2;
        bodyGroup.add(sideWinRight);

        // 범퍼 & 그릴
        const bumperGeo = new THREE.BoxGeometry(2.14, 0.2, 0.2);
        const bumperMat = new THREE.MeshStandardMaterial({ color: '#2f3542' });
        const frontBumper = new THREE.Mesh(bumperGeo, bumperMat);
        frontBumper.position.set(0, -0.25, 1.9);
        bodyGroup.add(frontBumper);

        const rearBumper = frontBumper.clone();
        rearBumper.position.z = -1.9;
        bodyGroup.add(rearBumper);

        const grillGeo = new THREE.BoxGeometry(1.2, 0.3, 0.05);
        const grillMat = new THREE.MeshStandardMaterial({ color: '#1e272e', roughness: 0.5 });
        const grill = new THREE.Mesh(grillGeo, grillMat);
        grill.position.set(0, -0.05, 1.91);
        bodyGroup.add(grill);

        // 헤드라이트 & 사이드 미러 & 후미등
        const lightGeo = new THREE.SphereGeometry(0.22, 12, 12);
        const lightMat = new THREE.MeshStandardMaterial({ color: '#fffa65', emissive: '#fffa65', emissiveIntensity: 0.95 });

        const leftLight = new THREE.Mesh(lightGeo, lightMat);
        leftLight.position.set(-0.7, 0.05, 1.88);
        bodyGroup.add(leftLight);

        const rightLight = leftLight.clone();
        rightLight.position.x = 0.7;
        bodyGroup.add(rightLight);

        const mirrorGeo = new THREE.BoxGeometry(0.25, 0.18, 0.25);
        const mirrorMat = new THREE.MeshStandardMaterial({ color: darkRed });
        const leftMirror = new THREE.Mesh(mirrorGeo, mirrorMat);
        leftMirror.position.set(-1.0, 0.5, 0.6);
        bodyGroup.add(leftMirror);

        const rightMirror = leftMirror.clone();
        rightMirror.position.x = 1.0;
        bodyGroup.add(rightMirror);

        const tailLightMat = new THREE.MeshStandardMaterial({ color: '#ff3838', emissive: '#ff3838', emissiveIntensity: 0.8 });
        const leftTail = new THREE.Mesh(lightGeo, tailLightMat);
        leftTail.scale.set(0.8, 0.8, 0.4);
        leftTail.position.set(-0.7, 0.05, -1.88);
        bodyGroup.add(leftTail);

        const rightTail = leftTail.clone();
        rightTail.position.x = 0.7;
        bodyGroup.add(rightTail);

        targetGroup.add(bodyGroup);

        // 스포티 4 바퀴
        createWheels(targetGroup, [
            { x: -1.15, y: 0.42, z: 1.15 },
            { x: 1.15, y: 0.42, z: 1.15 },
            { x: -1.15, y: 0.42, z: -1.15 },
            { x: 1.15, y: 0.42, z: -1.15 }
        ]);
    }

    /**
     * 3) 주황/노랑 덤프트럭 메쉬 생성 (짐칸 포함)
     */
    function createTruckMesh(targetGroup) {
        const bodyGroup = new THREE.Group();
        bodyGroup.position.set(0, 0.7, 0);

        const cabinOrange = '#ff6b35';
        const bedYellow = '#ffd166';
        const chassisColor = '#3a3b3c';

        // 하부 샤시 프레임
        const chassisGeo = new THREE.BoxGeometry(1.8, 0.35, 4.4);
        const chassisMat = new THREE.MeshStandardMaterial({ color: chassisColor, roughness: 0.6 });
        const chassis = new THREE.Mesh(chassisGeo, chassisMat);
        chassis.position.y = -0.15;
        chassis.castShadow = true;
        bodyGroup.add(chassis);

        // 운전석 캐빈
        const cabinGeo = new THREE.BoxGeometry(2.2, 1.4, 1.6);
        const cabinMat = new THREE.MeshStandardMaterial({ color: cabinOrange, roughness: 0.3 });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, 0.6, 1.25);
        cabin.castShadow = true;
        cabin.receiveShadow = true;
        bodyGroup.add(cabin);

        // 캐빈 캡
        const capGeo = new THREE.BoxGeometry(2.24, 0.2, 1.64);
        const cap = new THREE.Mesh(capGeo, cabinMat);
        cap.position.set(0, 1.35, 1.25);
        bodyGroup.add(cap);

        // 앞유리 & 측면창
        const winMat = new THREE.MeshPhysicalMaterial({
            color: '#a0e7e5',
            transmission: 0.7,
            opacity: 0.9,
            transparent: true,
            roughness: 0.1
        });

        const frontWinGeo = new THREE.PlaneGeometry(1.9, 0.65);
        const frontWin = new THREE.Mesh(frontWinGeo, winMat);
        frontWin.position.set(0, 0.8, 2.06);
        bodyGroup.add(frontWin);

        const sideWinGeo = new THREE.PlaneGeometry(0.9, 0.55);
        const sideWinLeft = new THREE.Mesh(sideWinGeo, winMat);
        sideWinLeft.position.set(-1.11, 0.8, 1.25);
        sideWinLeft.rotation.y = -Math.PI / 2;
        bodyGroup.add(sideWinLeft);

        const sideWinRight = sideWinLeft.clone();
        sideWinRight.position.x = 1.11;
        sideWinRight.rotation.y = Math.PI / 2;
        bodyGroup.add(sideWinRight);

        // 헤드라이트 & 그릴
        const lightGeo = new THREE.SphereGeometry(0.22, 12, 12);
        const lightMat = new THREE.MeshStandardMaterial({ color: '#fffa65', emissive: '#fffa65', emissiveIntensity: 0.95 });
        const leftLight = new THREE.Mesh(lightGeo, lightMat);
        leftLight.position.set(-0.8, 0.25, 2.06);
        bodyGroup.add(leftLight);

        const rightLight = leftLight.clone();
        rightLight.position.x = 0.8;
        bodyGroup.add(rightLight);

        const grillGeo = new THREE.BoxGeometry(1.4, 0.4, 0.06);
        const grillMat = new THREE.MeshStandardMaterial({ color: '#2b2d42' });
        const grill = new THREE.Mesh(grillGeo, grillMat);
        grill.position.set(0, 0.2, 2.06);
        bodyGroup.add(grill);

        // 배기 굴뚝 파이프
        const pipeGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.2, 8);
        const pipeMat = new THREE.MeshStandardMaterial({ color: '#4a4e69', metalness: 0.6, roughness: 0.3 });
        const pipe = new THREE.Mesh(pipeGeo, pipeMat);
        pipe.position.set(1.0, 1.2, 0.3);
        bodyGroup.add(pipe);

        // 덤프 짐칸 (Dump Bed Container)
        const bedGroup = new THREE.Group();
        bedGroup.position.set(0, 0.6, -0.6);

        const bedMat = new THREE.MeshStandardMaterial({ color: bedYellow, roughness: 0.3 });
        
        const bedBottomGeo = new THREE.BoxGeometry(2.2, 0.2, 2.4);
        const bedBottom = new THREE.Mesh(bedBottomGeo, bedMat);
        bedBottom.position.y = -0.2;
        bedBottom.castShadow = true;
        bedGroup.add(bedBottom);

        const sideWallGeo = new THREE.BoxGeometry(0.15, 0.9, 2.4);
        const wallLeft = new THREE.Mesh(sideWallGeo, bedMat);
        wallLeft.position.set(-1.025, 0.25, 0);
        wallLeft.castShadow = true;
        bedGroup.add(wallLeft);

        const wallRight = wallLeft.clone();
        wallRight.position.x = 1.025;
        bedGroup.add(wallRight);

        const frontWallGeo = new THREE.BoxGeometry(2.2, 0.9, 0.15);
        const wallFront = new THREE.Mesh(frontWallGeo, bedMat);
        wallFront.position.set(0, 0.25, 1.125);
        wallFront.castShadow = true;
        bedGroup.add(wallFront);

        const tailGateGeo = new THREE.BoxGeometry(2.2, 0.8, 0.15);
        const tailGate = new THREE.Mesh(tailGateGeo, bedMat);
        tailGate.position.set(0, 0.2, -1.125);
        tailGate.rotation.x = Math.PI / 12;
        tailGate.castShadow = true;
        bedGroup.add(tailGate);

        // 짐칸 속 자갈 블록
        const cargoGeo = new THREE.DodecahedronGeometry(0.7);
        const cargoMat = new THREE.MeshStandardMaterial({ color: '#8d5b4c', roughness: 0.9 });
        const cargo1 = new THREE.Mesh(cargoGeo, cargoMat);
        cargo1.position.set(-0.4, 0.1, 0.2);
        cargo1.scale.set(1, 0.6, 1.2);
        bedGroup.add(cargo1);

        const cargo2 = cargo1.clone();
        cargo2.position.set(0.3, 0.15, -0.3);
        cargo2.scale.set(0.9, 0.7, 1);
        bedGroup.add(cargo2);

        bodyGroup.add(bedGroup);
        targetGroup.add(bodyGroup);

        // 6 바퀴
        createWheels(targetGroup, [
            { x: -1.2, y: 0.45, z: 1.3 },
            { x: 1.2, y: 0.45, z: 1.3 },
            { x: -1.2, y: 0.45, z: -0.3 },
            { x: 1.2, y: 0.45, z: -0.3 },
            { x: -1.2, y: 0.45, z: -1.4 },
            { x: 1.2, y: 0.45, z: -1.4 }
        ], 0.45, 0.4);
    }

    /**
     * 4) 노란 포크레인 굴삭기 메쉬 생성 (관절 암 + 버킷 포함)
     */
    function createExcavatorMesh(targetGroup) {
        const bodyGroup = new THREE.Group();
        bodyGroup.position.set(0, 0.7, 0);

        const excavYellow = '#f7b801';
        const darkBase = '#2b2d42';

        // 하부 트랙 섀시
        const trackBaseGeo = new THREE.BoxGeometry(2.2, 0.4, 3.2);
        const trackBaseMat = new THREE.MeshStandardMaterial({ color: darkBase, roughness: 0.8 });
        const trackBase = new THREE.Mesh(trackBaseGeo, trackBaseMat);
        trackBase.position.y = -0.15;
        trackBase.castShadow = true;
        bodyGroup.add(trackBase);

        // 좌/우 무한궤도 띠 표현
        const treadGeo = new THREE.BoxGeometry(0.45, 0.55, 3.4);
        const treadMat = new THREE.MeshStandardMaterial({ color: '#1e272e', roughness: 0.9 });
        const leftTread = new THREE.Mesh(treadGeo, treadMat);
        leftTread.position.set(-1.15, -0.1, 0);
        leftTread.castShadow = true;
        bodyGroup.add(leftTread);

        const rightTread = leftTread.clone();
        rightTread.position.x = 1.15;
        bodyGroup.add(rightTread);

        // 상부 회전 캐빈 본체
        const upperCabGroup = new THREE.Group();
        upperCabGroup.position.set(0, 0.5, -0.1);

        const upperGeo = new THREE.BoxGeometry(2.0, 1.1, 2.2);
        const upperMat = new THREE.MeshStandardMaterial({ color: excavYellow, roughness: 0.3 });
        const upperBody = new THREE.Mesh(upperGeo, upperMat);
        upperBody.castShadow = true;
        upperBody.receiveShadow = true;
        upperCabGroup.add(upperBody);

        // 운전석 캡
        const winMat = new THREE.MeshPhysicalMaterial({
            color: '#a0e7e5',
            transmission: 0.75,
            opacity: 0.9,
            transparent: true,
            roughness: 0.1
        });
        const cockpitGeo = new THREE.BoxGeometry(0.95, 0.9, 1.2);
        const cockpit = new THREE.Mesh(cockpitGeo, winMat);
        cockpit.position.set(-0.45, 0.15, 0.4);
        upperCabGroup.add(cockpit);

        // 후부 카운터웨이트
        const counterGeo = new THREE.BoxGeometry(2.04, 1.0, 0.6);
        const counterMat = new THREE.MeshStandardMaterial({ color: darkBase });
        const counterWeight = new THREE.Mesh(counterGeo, counterMat);
        counterWeight.position.set(0, 0.05, -1.1);
        upperCabGroup.add(counterWeight);

        // 경고 등
        const sirenGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.25, 12);
        const sirenMat = new THREE.MeshStandardMaterial({ color: '#ff5722', emissive: '#ff5722', emissiveIntensity: 0.9 });
        const siren = new THREE.Mesh(sirenGeo, sirenMat);
        siren.position.set(-0.6, 0.7, 0.6);
        upperCabGroup.add(siren);

        // 관절 굴삭 암 + 버킷 (Articulated Arm & Bucket)
        const armGroup = new THREE.Group();
        armGroup.position.set(0.4, 0.2, 0.8);

        // 메인 붐
        const boomGeo = new THREE.BoxGeometry(0.3, 0.35, 1.8);
        const boomMat = new THREE.MeshStandardMaterial({ color: excavYellow, roughness: 0.3 });
        const boom = new THREE.Mesh(boomGeo, boomMat);
        boom.position.set(0, 0.6, 0.6);
        boom.rotation.x = -Math.PI / 4;
        boom.castShadow = true;
        armGroup.add(boom);

        // 디퍼 암
        const dipperGeo = new THREE.BoxGeometry(0.26, 0.3, 1.4);
        const dipper = new THREE.Mesh(dipperGeo, boomMat);
        dipper.position.set(0, 1.05, 1.7);
        dipper.rotation.x = Math.PI / 3;
        dipper.castShadow = true;
        armGroup.add(dipper);

        // 버킷
        const bucketGroup = new THREE.Group();
        bucketGroup.position.set(0, 0.55, 2.3);

        const bucketGeo = new THREE.BoxGeometry(0.5, 0.45, 0.5);
        const bucketMat = new THREE.MeshStandardMaterial({ color: darkBase, roughness: 0.5 });
        const bucketMesh = new THREE.Mesh(bucketGeo, bucketMat);
        bucketMesh.rotation.x = Math.PI / 6;
        bucketMesh.castShadow = true;
        bucketGroup.add(bucketMesh);

        // 버킷 톱니
        const teethGeo = new THREE.ConeGeometry(0.06, 0.2, 4);
        const teethMat = new THREE.MeshStandardMaterial({ color: '#ffd166' });
        for (let i = -0.18; i <= 0.18; i += 0.12) {
            const tooth = new THREE.Mesh(teethGeo, teethMat);
            tooth.rotation.x = -Math.PI / 2;
            tooth.position.set(i, -0.15, 0.28);
            bucketGroup.add(tooth);
        }

        armGroup.add(bucketGroup);

        // 유압 피스톤
        const pistonGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.0, 8);
        const pistonMat = new THREE.MeshStandardMaterial({ color: '#e0e0e0', metalness: 0.8, roughness: 0.2 });
        const piston = new THREE.Mesh(pistonGeo, pistonMat);
        piston.position.set(0, 0.45, 1.1);
        piston.rotation.x = -Math.PI / 6;
        armGroup.add(piston);

        upperCabGroup.add(armGroup);
        bodyGroup.add(upperCabGroup);

        targetGroup.add(bodyGroup);

        // 바퀴 / 트랙 롤러 4개
        createWheels(targetGroup, [
            { x: -1.2, y: 0.42, z: 1.1 },
            { x: 1.2, y: 0.42, z: 1.1 },
            { x: -1.2, y: 0.42, z: -1.1 },
            { x: 1.2, y: 0.42, z: -1.1 }
        ], 0.42, 0.4);
    }

    /**
     * 장난감 자동차/탈것 초기화 생성
     */
    function createToyCar() {
        if (!carGroup) {
            carGroup = new THREE.Group();
            carGroup.position.set(0, 0, 0);
            scene.add(carGroup);
        }
        switchVehicle('bus');
    }

    /**
     * 탈것 교체 (위치/방향 유지하며 3D 메쉬 교체)
     */
    function switchVehicle(type) {
        if (!carGroup) return;

        const currentPos = carGroup.position.clone();
        const currentRotY = carGroup.rotation.y;

        while (carGroup.children.length > 0) {
            carGroup.remove(carGroup.children[0]);
        }

        wheels = [];

        switch (type) {
            case 'car':
                createCarMesh(carGroup);
                break;
            case 'truck':
                createTruckMesh(carGroup);
                break;
            case 'excavator':
                createExcavatorMesh(carGroup);
                break;
            case 'bus':
            default:
                createBusMesh(carGroup);
                break;
        }

        carGroup.position.copy(currentPos);
        carGroup.rotation.y = currentRotY;

        currentVehicleType = type;
    }

    /**
     * 터치/클릭한 바닥 위치에 표시할 애니메이션 타겟 마커
     */
    function createTargetMarker() {
        targetMarker = new THREE.Group();
        targetMarker.position.set(0, 0.04, 0);
        targetMarker.visible = false;

        // 메인 링
        const ringGeo = new THREE.RingGeometry(0.8, 1.2, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: '#06d6a0',
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85
        });
        targetMarkerRing = new THREE.Mesh(ringGeo, ringMat);
        targetMarkerRing.rotation.x = -Math.PI / 2;
        targetMarker.add(targetMarkerRing);

        // 펄스 아우라
        const auraGeo = new THREE.RingGeometry(1.2, 1.8, 32);
        const auraMat = new THREE.MeshBasicMaterial({
            color: '#ffd166',
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.45
        });
        targetMarkerAura = new THREE.Mesh(auraGeo, auraMat);
        targetMarkerAura.rotation.x = -Math.PI / 2;
        targetMarker.add(targetMarkerAura);

        scene.add(targetMarker);
    }

    let wrapObjects = [];

    /**
     * 월드 래핑 오브젝트 등록 헬퍼
     */
    function registerWrapObject(obj, baseX, baseZ) {
        if (!obj) return;
        obj.userData = obj.userData || {};
        obj.userData.baseX = baseX;
        obj.userData.baseZ = baseZ;
        wrapObjects.push(obj);
    }

    /**
     * 모듈로 순환 래핑 함수
     */
    function wrapVal(val, centerVal, range) {
        let diff = val - centerVal;
        const half = range / 2;
        while (diff < -half) diff += range;
        while (diff > half) diff -= range;
        return centerVal + diff;
    }

    /**
     * Infinitown 스타일 무한 월드 타일 순환 (World Wrapping)
     */
    function updateWorldWrapping(carPos) {
        if (!carPos) return;

        // 1. 잔디 무한 지면 추적
        if (groundMesh) {
            groundMesh.position.x = carPos.x;
            groundMesh.position.z = carPos.z;
        }

        // 2. 도로, 집, 나무, 가로등 무한 순환 래핑 (범위 120m)
        const range = 120;
        wrapObjects.forEach(obj => {
            if (obj && obj.position && obj.userData && obj.userData.baseX !== undefined) {
                obj.position.x = wrapVal(obj.userData.baseX, carPos.x, range);
                obj.position.z = wrapVal(obj.userData.baseZ, carPos.z, range);
            }
        });
    }

    /**
     * 매 프레임 애니메이션 업데이터 (바퀴 회전, 타겟 마커 펄스)
     */
    function update(deltaTime, speed = 0) {
        // 이동 시 바퀴 회전
        if (wheels.length > 0 && Math.abs(speed) > 0.01) {
            wheels.forEach(w => {
                if (w.children && w.children[0]) {
                    w.children[0].rotation.x += speed * deltaTime * 2.5;
                }
            });
        }

        // 타겟 마커 펄스 회전 애니메이션
        if (targetMarker && targetMarker.visible) {
            const time = Date.now() * 0.005;
            const pulse = Math.sin(time * 2) * 0.15 + 1.0;
            targetMarkerAura.scale.set(pulse, pulse, 1);
            targetMarkerRing.rotation.z += deltaTime * 1.5;
        }
    }

    function setTargetMarkerPosition(x, z) {
        if (!targetMarker) return;
        targetMarker.position.set(x, 0.04, z);
        targetMarker.visible = true;
    }

    function hideTargetMarker() {
        if (!targetMarker) return;
        targetMarker.visible = false;
    }

    return {
        initScene,
        update,
        updateWorldWrapping,
        registerWrapObject,
        setTargetMarkerPosition,
        hideTargetMarker,
        switchVehicle,
        getScene: () => scene,
        getRenderer: () => renderer,
        getCarGroup: () => carGroup,
        getGroundMesh: () => groundMesh,
        getCurrentVehicleType: () => currentVehicleType
    };
})();
