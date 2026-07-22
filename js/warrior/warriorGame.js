/**
 * 어른 놀이 - 바람의 무사 (WarriorGame)
 * SD 넨도로이드 2.5등신 피규어 감성 2D 캔버스 무술 수련장 게임
 */

const WarriorGame = (() => {
    // 캔버스 및 Context 참조
    let canvas = null;
    let ctx = null;

    let logicalWidth = 0;
    let logicalHeight = 0;

    let isRunning = false;
    let animationFrameId = null;

    // 카메라 오프셋 (플레이어 추적)
    let camera = { x: 0, y: 0 };

    // 필드 월드 크기 (2D 그리드 영토)
    const WORLD_WIDTH = 1600;
    const WORLD_HEIGHT = 1200;
    const TILE_SIZE = 48;

    // 플레이어 (SD 무사) 정보
    const player = {
        x: 800,
        y: 600,
        vx: 0,
        vy: 0,
        speed: 3.8,
        baseSpeed: 3.8,
        direction: 'down', // 'down', 'left', 'right', 'up'
        isMoving: false,
        isAttacking: false,
        attackTimer: 0,
        attackType: 'normal', // 'normal', 'dash', 'ultimate'
        walkFrame: 0,
        animTimer: 0,
        hp: 100,
        maxHp: 100,
        energy: 100,
        maxEnergy: 100,
        level: 1,
        exp: 0,
        maxExp: 100,
        killCount: 0,
        dashTimer: 0,
        shadowTrails: []
    };

    // 타겟 지점 (터치/클릭 이동용)
    let targetPos = null;

    // 키보드 입력 상태
    const keys = {
        ArrowUp: false,
        ArrowDown: false,
        ArrowLeft: false,
        ArrowRight: false,
        w: false,
        s: false,
        a: false,
        d: false,
        Space: false
    };

    // 게임 오브젝트 리스트
    let dummies = []; // 수련용 목인
    let slashEffects = []; // 검기 이펙트
    let damageTexts = []; // 플로팅 데미지 텍스트
    let particles = []; // 대나무 잎사귀 / 검기 이펙트 파티클
    let fireworks = []; // 축하 폭죽 파티클

    // 대나무 잎사귀 바람 파티클
    let windLeaves = [];

    /**
     * 초기화
     */
    function init() {
        canvas = document.getElementById('warriorCanvas');
        if (!canvas) return;

        ctx = canvas.getContext('2d');
        resize();

        initDummies();
        initWindLeaves();
        bindEvents();
    }

    /**
     * 캔버스 리사이즈 처리
     */
    function resize() {
        if (!canvas) return;
        const container = canvas.parentElement;
        if (!container) return;

        const dpr = window.devicePixelRatio || 1;
        logicalWidth = container.clientWidth;
        logicalHeight = container.clientHeight;

        canvas.width = Math.floor(logicalWidth * dpr);
        canvas.height = Math.floor(logicalHeight * dpr);

        ctx.imageSmoothingEnabled = true;
    }

    /**
     * 수련용 목인/허수아비 배치 (SD 무사 크기에 맞는 알맞은 스케일)
     */
    function initDummies() {
        dummies = [];
        const dummyCoords = [
            { x: 620, y: 500, type: 'dummy', name: '수련 목인' },
            { x: 980, y: 500, type: 'dummy', name: '수련 목인' },
            { x: 620, y: 700, type: 'dummy', name: '강철 목인' },
            { x: 980, y: 700, type: 'dummy', name: '강철 목인' },
            { x: 800, y: 420, type: 'boss', name: '대련 사형' },
            { x: 480, y: 600, type: 'dummy', name: '바람 목인' },
            { x: 1120, y: 600, type: 'dummy', name: '바람 목인' },
            { x: 800, y: 800, type: 'dummy', name: '수련 목인' }
        ];

        dummyCoords.forEach((coord, i) => {
            dummies.push({
                id: i,
                x: coord.x,
                y: coord.y,
                type: coord.type,
                name: coord.name,
                hp: coord.type === 'boss' ? 500 : 150,
                maxHp: coord.type === 'boss' ? 500 : 150,
                wobble: 0,
                hitTimer: 0,
                respawnTimer: 0
            });
        });
    }

    /**
     * 배경 대나무 잎사귀 파티클 초기화
     */
    function initWindLeaves() {
        windLeaves = [];
        for (let i = 0; i < 35; i++) {
            windLeaves.push({
                x: Math.random() * WORLD_WIDTH,
                y: Math.random() * WORLD_HEIGHT,
                speedX: 1 + Math.random() * 2,
                speedY: 0.5 + Math.random() * 1,
                size: 4 + Math.random() * 4,
                angle: Math.random() * Math.PI * 2,
                rotSpeed: 0.02 + Math.random() * 0.04,
                color: Math.random() > 0.3 ? '#4d8b46' : '#88b04b'
            });
        }
    }

    /**
     * 이벤트 바인딩 (키보드, 터치, UI 버튼)
     */
    function bindEvents() {
        window.addEventListener('resize', resize);

        // 키보드 이동
        window.addEventListener('keydown', (e) => {
            if (!isRunning) return;
            if (e.key in keys) keys[e.key] = true;
            if (e.key === 'w' || e.key === 'W') keys.w = true;
            if (e.key === 's' || e.key === 'S') keys.s = true;
            if (e.key === 'a' || e.key === 'A') keys.a = true;
            if (e.key === 'd' || e.key === 'D') keys.d = true;

            if (e.code === 'Space') {
                e.preventDefault();
                triggerSlash();
            }
            if (e.key === '1') triggerSlash();
            if (e.key === '2') triggerDash();
            if (e.key === '3') triggerUltimate();
        });

        window.addEventListener('keyup', (e) => {
            if (e.key in keys) keys[e.key] = false;
            if (e.key === 'w' || e.key === 'W') keys.w = false;
            if (e.key === 's' || e.key === 'S') keys.s = false;
            if (e.key === 'a' || e.key === 'A') keys.a = false;
            if (e.key === 'd' || e.key === 'D') keys.d = false;
        });

        // 캔버스 직접 터치/클릭 이동
        if (canvas) {
            canvas.addEventListener('pointerdown', (e) => {
                if (!isRunning) return;
                if (e.target !== canvas) return;

                const rect = canvas.getBoundingClientRect();
                const dpr = window.devicePixelRatio || 1;
                const clickX = (e.clientX - rect.left) * (logicalWidth / rect.width);
                const clickY = (e.clientY - rect.top) * (logicalHeight / rect.height);

                const worldX = clickX + camera.x;
                const worldY = clickY + camera.y;

                targetPos = { x: worldX, y: worldY };
                addTouchRipples(worldX, worldY);
            });
        }

        bindUIButtons();
    }

    /**
     * UI 버튼 조작 바인딩
     */
    function bindUIButtons() {
        const dpadUp = document.getElementById('warriorDpadUp');
        const dpadDown = document.getElementById('warriorDpadDown');
        const dpadLeft = document.getElementById('warriorDpadLeft');
        const dpadRight = document.getElementById('warriorDpadRight');

        const btnSlash = document.getElementById('btnWarriorSlash');
        const btnDash = document.getElementById('btnWarriorDash');
        const btnUltimate = document.getElementById('btnWarriorUltimate');
        const btnReset = document.getElementById('warriorResetBtn');

        const attachHoldEvent = (elem, keyName) => {
            if (!elem) return;
            const start = (e) => {
                e.preventDefault();
                keys[keyName] = true;
                targetPos = null;
            };
            const end = (e) => {
                e.preventDefault();
                keys[keyName] = false;
            };

            elem.addEventListener('pointerdown', start);
            elem.addEventListener('pointerup', end);
            elem.addEventListener('pointerleave', end);
            elem.addEventListener('pointercancel', end);
        };

        attachHoldEvent(dpadUp, 'ArrowUp');
        attachHoldEvent(dpadDown, 'ArrowDown');
        attachHoldEvent(dpadLeft, 'ArrowLeft');
        attachHoldEvent(dpadRight, 'ArrowRight');

        if (btnSlash) {
            btnSlash.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                triggerSlash();
            });
        }
        if (btnDash) {
            btnDash.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                triggerDash();
            });
        }
        if (btnUltimate) {
            btnUltimate.addEventListener('pointerdown', (e) => {
                e.preventDefault();
                triggerUltimate();
            });
        }
        if (btnReset) {
            btnReset.addEventListener('click', () => {
                resetCourtyard();
            });
        }
    }

    /**
     * 터치 이펙트 링 추가
     */
    function addTouchRipples(wx, wy) {
        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            particles.push({
                x: wx,
                y: wy,
                vx: Math.cos(angle) * 2,
                vy: Math.sin(angle) * 2,
                size: 3,
                color: '#64dfdf',
                life: 1,
                decay: 0.05
            });
        }
    }

    /**
     * 1. 기본 베기 스킬 (소리 없이 시각 검기 발사)
     */
    function triggerSlash() {
        if (player.isAttacking && player.attackType === 'ultimate') return;

        player.isAttacking = true;
        player.attackTimer = 14;
        player.attackType = 'normal';

        let dirX = 0;
        let dirY = 0;
        let angle = 0;

        if (player.direction === 'right') { dirX = 1; angle = 0; }
        else if (player.direction === 'left') { dirX = -1; angle = Math.PI; }
        else if (player.direction === 'up') { dirY = -1; angle = -Math.PI / 2; }
        else { dirY = 1; angle = Math.PI / 2; }

        slashEffects.push({
            x: player.x + dirX * 25,
            y: player.y + dirY * 25,
            vx: dirX * 12,
            vy: dirY * 12,
            angle: angle,
            width: 70,
            height: 40,
            life: 1,
            decay: 0.06,
            damage: 40 + player.level * 10,
            hitTargets: new Set()
        });

        for (let i = 0; i < 12; i++) {
            const pAngle = angle + (Math.random() - 0.5) * 0.8;
            const speed = 4 + Math.random() * 6;
            particles.push({
                x: player.x + dirX * 20,
                y: player.y + dirY * 20,
                vx: Math.cos(pAngle) * speed,
                vy: Math.sin(pAngle) * speed,
                size: 3 + Math.random() * 3,
                color: Math.random() > 0.5 ? '#72efdd' : '#560bad',
                life: 1,
                decay: 0.08
            });
        }
    }

    /**
     * 2. 초상비 (Fast Dash)
     */
    function triggerDash() {
        if (player.dashTimer > 0) return;
        player.dashTimer = 20;
        player.speed = player.baseSpeed * 2.5;

        for (let i = 0; i < 20; i++) {
            particles.push({
                x: player.x + (Math.random() - 0.5) * 30,
                y: player.y + (Math.random() - 0.5) * 30,
                vx: (Math.random() - 0.5) * 2,
                vy: (Math.random() - 0.5) * 2,
                size: 4 + Math.random() * 4,
                color: '#4cc9f0',
                life: 1,
                decay: 0.05
            });
        }
    }

    /**
     * 3. 필살검무 (Ultimate Sword Dance)
     */
    function triggerUltimate() {
        if (player.energy < 30) {
            addDamageText(player.x, player.y - 40, "내력 부족!", "#ff4d6d");
            return;
        }

        player.energy = Math.max(0, player.energy - 30);
        player.isAttacking = true;
        player.attackTimer = 40;
        player.attackType = 'ultimate';

        for (let i = 0; i < 8; i++) {
            const angle = (Math.PI * 2 / 8) * i;
            const dirX = Math.cos(angle);
            const dirY = Math.sin(angle);

            slashEffects.push({
                x: player.x,
                y: player.y,
                vx: dirX * 10,
                vy: dirY * 10,
                angle: angle,
                width: 80,
                height: 45,
                life: 1,
                decay: 0.04,
                damage: 80 + player.level * 20,
                hitTargets: new Set()
            });
        }

        spawnFireworks(player.x, player.y);
    }

    /**
     * 폭죽 파티클 스폰
     */
    function spawnFireworks(x, y) {
        const colors = ['#ff007f', '#7f00ff', '#00f0ff', '#ffeb3b', '#ff5722', '#76ff03'];
        for (let i = 0; i < 40; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 3 + Math.random() * 8;
            fireworks.push({
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 3 + Math.random() * 4,
                color: colors[Math.floor(Math.random() * colors.length)],
                life: 1,
                decay: 0.03 + Math.random() * 0.02
            });
        }
    }

    /**
     * 수련장 리셋
     */
    function resetCourtyard() {
        player.x = 800;
        player.y = 600;
        player.hp = player.maxHp;
        player.energy = player.maxEnergy;
        targetPos = null;
        initDummies();
        addDamageText(player.x, player.y - 50, "수련장 재정비!", "#4cc9f0");
    }

    /**
     * 메인 프레임 업데이트
     */
    function update() {
        updatePlayer();
        updateSlashEffects();
        updateDummies();
        updateParticles();
        updateCamera();
        updateUI();
    }

    /**
     * 플레이어 상태 업데이트
     */
    function updatePlayer() {
        if (player.energy < player.maxEnergy) {
            player.energy = Math.min(player.maxEnergy, player.energy + 0.15);
        }

        if (player.dashTimer > 0) {
            player.dashTimer--;
            if (player.dashTimer === 0) {
                player.speed = player.baseSpeed;
            }
            player.shadowTrails.push({
                x: player.x,
                y: player.y,
                direction: player.direction,
                life: 1.0
            });
        }

        player.shadowTrails.forEach(st => st.life -= 0.1);
        player.shadowTrails = player.shadowTrails.filter(st => st.life > 0);

        if (player.isAttacking) {
            player.attackTimer--;
            if (player.attackTimer <= 0) {
                player.isAttacking = false;
            }
        }

        let moveX = 0;
        let moveY = 0;

        if (keys.ArrowUp || keys.w) moveY -= 1;
        if (keys.ArrowDown || keys.s) moveY += 1;
        if (keys.ArrowLeft || keys.a) moveX -= 1;
        if (keys.ArrowRight || keys.d) moveX += 1;

        if (moveX !== 0 || moveY !== 0) {
            targetPos = null;
            if (Math.abs(moveX) > Math.abs(moveY)) {
                player.direction = moveX > 0 ? 'right' : 'left';
            } else {
                player.direction = moveY > 0 ? 'down' : 'up';
            }

            const len = Math.hypot(moveX, moveY);
            player.vx = (moveX / len) * player.speed;
            player.vy = (moveY / len) * player.speed;
            player.isMoving = true;
        } else if (targetPos) {
            const dx = targetPos.x - player.x;
            const dy = targetPos.y - player.y;
            const dist = Math.hypot(dx, dy);

            if (dist > 6) {
                if (Math.abs(dx) > Math.abs(dy)) {
                    player.direction = dx > 0 ? 'right' : 'left';
                } else {
                    player.direction = dy > 0 ? 'down' : 'up';
                }
                player.vx = (dx / dist) * player.speed;
                player.vy = (dy / dist) * player.speed;
                player.isMoving = true;
            } else {
                targetPos = null;
                player.vx = 0;
                player.vy = 0;
                player.isMoving = false;
            }
        } else {
            player.vx = 0;
            player.vy = 0;
            player.isMoving = false;
        }

        player.x = Math.max(60, Math.min(WORLD_WIDTH - 60, player.x + player.vx));
        player.y = Math.max(60, Math.min(WORLD_HEIGHT - 60, player.y + player.vy));

        if (player.isMoving) {
            player.animTimer++;
            if (player.animTimer % 8 === 0) {
                player.walkFrame = (player.walkFrame + 1) % 4;
            }
        } else {
            player.walkFrame = 0;
        }
    }

    /**
     * 검기 이펙트 및 충돌 처리
     */
    function updateSlashEffects() {
        for (let i = slashEffects.length - 1; i >= 0; i--) {
            const se = slashEffects[i];
            se.x += se.vx;
            se.y += se.vy;
            se.life -= se.decay;

            dummies.forEach(d => {
                if (d.hp > 0 && !se.hitTargets.has(d.id)) {
                    const dist = Math.hypot(se.x - d.x, se.y - d.y);
                    if (dist < 40) {
                        se.hitTargets.add(d.id);
                        hitDummy(d, se.damage);
                    }
                }
            });

            if (se.life <= 0) {
                slashEffects.splice(i, 1);
            }
        }
    }

    /**
     * 목인 피격 처리
     */
    function hitDummy(dummy, damage) {
        dummy.hp -= damage;
        dummy.wobble = 15;
        dummy.hitTimer = 10;

        for (let i = 0; i < 10; i++) {
            const angle = Math.random() * Math.PI * 2;
            particles.push({
                x: dummy.x,
                y: dummy.y - 15,
                vx: Math.cos(angle) * (3 + Math.random() * 4),
                vy: Math.sin(angle) * (3 + Math.random() * 4),
                size: 3 + Math.random() * 3,
                color: Math.random() > 0.5 ? '#ffb703' : '#ff4d6d',
                life: 1,
                decay: 0.08
            });
        }

        const isCrit = Math.random() > 0.6;
        const finalDamage = isCrit ? Math.floor(damage * 1.5) : Math.floor(damage);
        const textStr = isCrit ? `크리티컬 ${finalDamage}! 💥` : `${finalDamage}`;
        const color = isCrit ? '#ff006e' : '#ffd166';
        addDamageText(dummy.x + (Math.random() - 0.5) * 20, dummy.y - 35, textStr, color, isCrit ? 22 : 18);

        if (dummy.hp <= 0) {
            dummy.respawnTimer = 180;
            player.killCount++;
            addExp(dummy.type === 'boss' ? 80 : 35);
            spawnFireworks(dummy.x, dummy.y);
        }
    }

    /**
     * 경험치 획득 및 레벨업
     */
    function addExp(amount) {
        player.exp += amount;
        if (player.exp >= player.maxExp) {
            player.level++;
            player.exp -= player.maxExp;
            player.maxExp = Math.floor(player.maxExp * 1.3);
            player.hp = player.maxHp;
            player.energy = player.maxEnergy;

            addDamageText(player.x, player.y - 65, `LEVEL UP! Lv.${player.level} ⭐️`, '#06d6a0', 24);
            spawnFireworks(player.x, player.y);
        }
    }

    /**
     * 목인 상태 및 리스폰
     */
    function updateDummies() {
        dummies.forEach(d => {
            if (d.wobble > 0) d.wobble *= 0.85;
            if (d.hitTimer > 0) d.hitTimer--;

            if (d.hp <= 0) {
                d.respawnTimer--;
                if (d.respawnTimer <= 0) {
                    d.hp = d.maxHp;
                    addDamageText(d.x, d.y - 30, "목인 재등장!", "#4cc9f0");
                }
            }
        });
    }

    /**
     * 파티클 업데이트
     */
    function updateParticles() {
        for (let i = damageTexts.length - 1; i >= 0; i--) {
            const dt = damageTexts[i];
            dt.y -= 1.2;
            dt.life -= dt.decay;
            if (dt.life <= 0) damageTexts.splice(i, 1);
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            const p = particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.life -= p.decay;
            if (p.life <= 0) particles.splice(i, 1);
        }

        for (let i = fireworks.length - 1; i >= 0; i--) {
            const fw = fireworks[i];
            fw.x += fw.vx;
            fw.y += fw.vy;
            fw.vy += 0.15;
            fw.life -= fw.decay;
            if (fw.life <= 0) fireworks.splice(i, 1);
        }

        windLeaves.forEach(leaf => {
            leaf.x += leaf.speedX;
            leaf.y += leaf.speedY;
            leaf.angle += leaf.rotSpeed;

            if (leaf.x > WORLD_WIDTH) leaf.x = 0;
            if (leaf.y > WORLD_HEIGHT) leaf.y = 0;
        });
    }

    function addDamageText(x, y, text, color = '#ffffff', fontSize = 18) {
        damageTexts.push({
            x: x,
            y: y,
            text: text,
            color: color,
            fontSize: fontSize,
            life: 1,
            decay: 0.02
        });
    }

    function updateCamera() {
        camera.x = player.x - logicalWidth / 2;
        camera.y = player.y - logicalHeight / 2;

        camera.x = Math.max(0, Math.min(WORLD_WIDTH - logicalWidth, camera.x));
        camera.y = Math.max(0, Math.min(WORLD_HEIGHT - logicalHeight, camera.y));
    }

    function updateUI() {
        const warriorLevel = document.getElementById('warriorLevel');
        const warriorKills = document.getElementById('warriorKills');
        const warriorEnergyFill = document.getElementById('warriorEnergyFill');

        if (warriorLevel) warriorLevel.textContent = player.level;
        if (warriorKills) warriorKills.textContent = player.killCount;

        if (warriorEnergyFill) {
            const pct = Math.floor((player.energy / player.maxEnergy) * 100);
            warriorEnergyFill.style.width = `${pct}%`;
        }
    }

    /**
     * ==========================================
     * 렌더링 시스템 (Rendering Subsystem)
     * ==========================================
     */

    function render() {
        if (!ctx) return;
        const dpr = window.devicePixelRatio || 1;

        ctx.save();
        ctx.scale(dpr, dpr);

        ctx.fillStyle = '#1e242b';
        ctx.fillRect(0, 0, logicalWidth, logicalHeight);

        ctx.save();
        ctx.translate(-camera.x, -camera.y);

        renderCourtyardMap();
        renderDummies();
        renderPlayerShadows();
        renderPlayer();
        renderSlashEffects();
        renderParticles();
        renderWindLeaves();
        renderDamageTexts();

        ctx.restore();
        ctx.restore();
    }

    /**
     * 수련장 필드 및 밸런스 조정된 태극 문양 무술 연무장
     */
    function renderCourtyardMap() {
        ctx.fillStyle = '#2d382e';
        ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

        ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
        ctx.lineWidth = 1;
        for (let x = 0; x < WORLD_WIDTH; x += TILE_SIZE) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, WORLD_HEIGHT);
            ctx.stroke();
        }
        for (let y = 0; y < WORLD_HEIGHT; y += TILE_SIZE) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(WORLD_WIDTH, y);
            ctx.stroke();
        }

        // 중앙 연무장 (적절한 스케일)
        ctx.fillStyle = '#3a4440';
        ctx.fillRect(400, 320, 800, 560);

        ctx.strokeStyle = '#647568';
        ctx.lineWidth = 6;
        ctx.strokeRect(400, 320, 800, 560);

        // 중앙 전통 원형 링 문양 (알맞은 스케일 90px)
        ctx.strokeStyle = 'rgba(255, 215, 0, 0.2)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(800, 600, 95, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = 'rgba(255, 215, 0, 0.06)';
        ctx.fill();

        // 석등
        const lanterns = [
            { x: 380, y: 300 }, { x: 1220, y: 300 },
            { x: 380, y: 900 }, { x: 1220, y: 900 }
        ];

        lanterns.forEach(l => {
            ctx.fillStyle = '#525b56';
            ctx.fillRect(l.x - 10, l.y - 15, 20, 30);
            ctx.fillStyle = 'rgba(255, 183, 3, 0.25)';
            ctx.beginPath();
            ctx.arc(l.x, l.y - 15, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#ffa726';
            ctx.beginPath();
            ctx.arc(l.x, l.y - 15, 8, 0, Math.PI * 2);
            ctx.fill();
        });

        // 대나무 장식
        ctx.fillStyle = '#1e4d2b';
        for (let x = 40; x < WORLD_WIDTH; x += 100) {
            ctx.fillRect(x, 10, 14, 100);
            ctx.fillRect(x + 20, WORLD_HEIGHT - 110, 14, 100);
        }
    }

    /**
     * 수련용 목인 (SD 캐릭터 비율과 맞춘 깔끔한 50px 크기)
     */
    function renderDummies() {
        dummies.forEach(d => {
            if (d.hp <= 0) return;

            ctx.save();
            ctx.translate(d.x, d.y);

            if (d.wobble > 0.5) {
                const angle = Math.sin(Date.now() * 0.05) * (d.wobble * 0.03);
                ctx.rotate(angle);
            }

            // 그림자
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.beginPath();
            ctx.ellipse(0, 12, 16, 7, 0, 0, Math.PI * 2);
            ctx.fill();

            const isHit = d.hitTimer > 0;

            if (d.type === 'boss') {
                // 대련 사형
                ctx.fillStyle = isHit ? '#ffffff' : '#9c6644';
                ctx.fillRect(-14, -32, 28, 40);

                ctx.fillStyle = '#e63946';
                ctx.fillRect(-14, -18, 28, 7);
            } else {
                // 일반 목인
                ctx.fillStyle = isHit ? '#ffffff' : '#b07d62';
                ctx.fillRect(-11, -28, 22, 36);

                ctx.fillStyle = isHit ? '#ffffff' : '#7f5539';
                ctx.fillRect(-22, -20, 44, 7);
            }

            // 머리 (목인 원형 짚단)
            ctx.fillStyle = isHit ? '#ffffff' : '#ddb892';
            ctx.beginPath();
            ctx.arc(0, -36, 12, 0, Math.PI * 2);
            ctx.fill();

            // 눈
            ctx.fillStyle = '#2b2d42';
            ctx.fillRect(-5, -39, 3, 3);
            ctx.fillRect(2, -39, 3, 3);

            // HP 바
            if (d.hp < d.maxHp) {
                const barW = 36;
                const barH = 5;
                const pct = Math.max(0, d.hp / d.maxHp);

                ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
                ctx.fillRect(-barW / 2, -56, barW, barH);

                ctx.fillStyle = pct > 0.4 ? '#06d6a0' : '#ff4d6d';
                ctx.fillRect(-barW / 2, -56, barW * pct, barH);
            }

            // 이름 라벨
            ctx.fillStyle = '#e2e8f0';
            ctx.font = 'bold 12px Gaegu, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(d.name, 0, -62);

            ctx.restore();
        });
    }

    /**
     * 플레이어 대시 잔상 렌더링
     */
    function renderPlayerShadows() {
        player.shadowTrails.forEach(st => {
            ctx.save();
            ctx.globalAlpha = st.life * 0.4;
            drawWarriorSprite(st.x, st.y, st.direction, 0, false, '#4cc9f0');
            ctx.restore();
        });
    }

    /**
     * 무사 캐릭터 메인 렌더링
     */
    function renderPlayer() {
        // 무사 발밑 그림자
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.beginPath();
        ctx.ellipse(player.x, player.y + 8, 18, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // 무사 본체 SD 렌더링
        drawWarriorSprite(player.x, player.y, player.direction, player.walkFrame, player.isAttacking);

        // 플레이어 이름 및 레벨 태그
        ctx.fillStyle = '#ffd166';
        ctx.font = 'bold 14px Gaegu, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Lv.${player.level} 바람의 무사`, player.x, player.y - 65);
    }

    /**
     * =========================================================================
     * PURE CANVAS SD NENDOROID CHIBI WARRIOR RENDERER (100% Vector 2.5등신 피규어)
     * (전달해주신 하이큐 넨도로이드 피규어 비율 감성을 100% 반영한 고품질 캔버스 벡터)
     * =========================================================================
     */
    function drawWarriorSprite(x, y, dir, step, isAttacking, tintColor = null) {
        ctx.save();
        ctx.translate(x, y);

        // 보행 시 상하 아장아장 튀는 애니메이션
        const bobY = (step % 2 === 1) ? -4 : 0;
        ctx.translate(0, bobY);

        // 좌우 방향 반전
        if (dir === 'left') {
            ctx.scale(-1, 1);
        }

        // 공격 시 청록색 검기 에어후광
        if (isAttacking) {
            ctx.shadowColor = '#72efdd';
            ctx.shadowBlur = 22;
        }

        if (tintColor) {
            ctx.globalAlpha = 0.5;
        }

        // -------------------------------------------------------------
        // 1. 귀여운 SD 무사 신발 & 아장아장 다리
        // -------------------------------------------------------------
        const legWalk = (step % 2 === 1) ? 3 : -3;

        // 왼발
        ctx.fillStyle = tintColor || '#1e293b';
        ctx.beginPath();
        ctx.ellipse(-8 + (player.isMoving ? legWalk : 0), -2, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // 오른발
        ctx.beginPath();
        ctx.ellipse(8 - (player.isMoving ? legWalk : 0), -2, 5, 4, 0, 0, Math.PI * 2);
        ctx.fill();

        // -------------------------------------------------------------
        // 2. 귀여운 SD 미니 도포 한복 (Navy / Dark Blue)
        // -------------------------------------------------------------
        ctx.fillStyle = tintColor || '#0d1b2a';
        ctx.beginPath();
        ctx.moveTo(-14, -6);
        ctx.lineTo(14, -6);
        ctx.lineTo(17, -26);
        ctx.lineTo(-17, -26);
        ctx.closePath();
        ctx.fill();

        // 도포 주름 딥 블루 음영
        ctx.fillStyle = tintColor || '#1b263b';
        ctx.fillRect(-12, -26, 24, 12);

        // 하얀 V자 동정 깃
        ctx.strokeStyle = tintColor || '#ffffff';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(-9, -26);
        ctx.lineTo(0, -14);
        ctx.lineTo(9, -26);
        ctx.stroke();

        // 허리 띠 (Gold Sash Belt)
        ctx.fillStyle = tintColor || '#ffd166';
        ctx.fillRect(-15, -15, 30, 4);

        // 허리 옆 미니 칼집 & 칼자루
        ctx.fillStyle = tintColor || '#774936';
        ctx.save();
        ctx.rotate(-0.3);
        ctx.fillRect(-20, -16, 5, 20);
        ctx.fillStyle = tintColor || '#ffd166';
        ctx.fillRect(-21, -19, 7, 3);
        ctx.restore();

        // -------------------------------------------------------------
        // 3. 귀여운 SD 넨도로이드 대형 머리 (전체 비율의 45% - 2.5등신)
        // -------------------------------------------------------------
        const headY = -42;

        // 머리 피부톤 (밝은 뽀얀 피부)
        ctx.fillStyle = tintColor || '#fde2d4';
        ctx.beginPath();
        ctx.arc(0, headY, 20, 0, Math.PI * 2);
        ctx.fill();

        // 핑크 볼터치 (Cute Cheek Blush)
        ctx.fillStyle = tintColor ? 'transparent' : 'rgba(255, 120, 150, 0.65)';
        ctx.beginPath();
        ctx.ellipse(-12, headY + 5, 4.5, 2.5, 0, 0, Math.PI * 2);
        ctx.ellipse(12, headY + 5, 4.5, 2.5, 0, 0, Math.PI * 2);
        ctx.fill();

        // -------------------------------------------------------------
        // 4. 귀여운 에니메 SD 눈망울 & 입 표정
        // -------------------------------------------------------------
        // 눈 (동글동글한 다크 칠 초콜릿 색)
        ctx.fillStyle = tintColor || '#211815';
        ctx.beginPath();
        ctx.ellipse(-8, headY - 2, 3.5, 6, 0, 0, Math.PI * 2);
        ctx.ellipse(8, headY - 2, 3.5, 6, 0, 0, Math.PI * 2);
        ctx.fill();

        // 눈 반짝이 눈동자 하이라이트 (White Double Shine Dots)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(-9, headY - 4, 1.4, 0, Math.PI * 2);
        ctx.arc(7, headY - 4, 1.4, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(-7, headY, 0.8, 0, Math.PI * 2);
        ctx.arc(9, headY, 0.8, 0, Math.PI * 2);
        ctx.fill();

        // 귀여운 웃는 입 (Cute Open Mouth :D)
        ctx.fillStyle = tintColor || '#ff4d6d';
        ctx.beginPath();
        ctx.arc(0, headY + 8, 3.5, 0, Math.PI);
        ctx.fill();

        // -------------------------------------------------------------
        // 5. 넨도로이드 피규어 뻗침 머리칼 (Spiky Chibi Anime Hair)
        // -------------------------------------------------------------
        ctx.fillStyle = tintColor || '#141115';

        // 윗머리 덮개
        ctx.beginPath();
        ctx.arc(0, headY - 3, 21, Math.PI * 0.9, Math.PI * 2.1);
        ctx.fill();

        // 머리 상단 스파이크 가닥 (Front Bangs & Top Spikes)
        const spikes = [
            { x: -16, y: headY - 14, r: 8 },
            { x: -8, y: headY - 20, r: 10 },
            { x: 0, y: headY - 22, r: 11 },
            { x: 8, y: headY - 20, r: 10 },
            { x: 16, y: headY - 14, r: 8 },
            { x: -21, y: headY - 4, r: 7 },
            { x: 21, y: headY - 4, r: 7 }
        ];

        spikes.forEach(sp => {
            ctx.beginPath();
            ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
            ctx.fill();
        });

        // 은은한 머릿결 딥 블루 하이라이트
        ctx.fillStyle = tintColor ? 'transparent' : 'rgba(67, 97, 238, 0.35)';
        ctx.beginPath();
        ctx.arc(0, headY - 15, 14, Math.PI * 1.1, Math.PI * 1.9);
        ctx.fill();

        // -------------------------------------------------------------
        // 6. 무사 강철 검 (Katana Blade)
        // -------------------------------------------------------------
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;

        ctx.save();
        if (isAttacking) {
            // 공격 휘두르기 포즈 (Slash Pose)
            ctx.rotate(1.2);
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(10, -32, 5, 40);
            ctx.shadowColor = '#4cc9f0';
            ctx.shadowBlur = 15;
            ctx.strokeStyle = '#4cc9f0';
            ctx.strokeRect(9, -33, 7, 42);
        } else {
            // 대기 포즈 (Cute Sword Stance)
            ctx.fillStyle = '#cbd5e1';
            ctx.fillRect(14, -26, 4, 26);
            ctx.fillStyle = '#ffd166';
            ctx.fillRect(11, -12, 10, 3);
        }
        ctx.restore();

        ctx.restore();
    }

    /**
     * 검기 파동 이펙트 렌더링
     */
    function renderSlashEffects() {
        slashEffects.forEach(se => {
            ctx.save();
            ctx.translate(se.x, se.y);
            ctx.rotate(se.angle);

            ctx.fillStyle = `rgba(114, 239, 221, ${se.life})`;
            ctx.shadowColor = '#560bad';
            ctx.shadowBlur = 12;

            ctx.beginPath();
            ctx.arc(0, 0, se.width / 2, -Math.PI / 3, Math.PI / 3);
            ctx.arc(-15, 0, se.width / 2 - 10, Math.PI / 3, -Math.PI / 3, true);
            ctx.closePath();
            ctx.fill();

            ctx.restore();
        });
    }

    function renderParticles() {
        particles.forEach(p => {
            ctx.fillStyle = p.color;
            ctx.globalAlpha = p.life;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        });

        fireworks.forEach(fw => {
            ctx.fillStyle = fw.color;
            ctx.globalAlpha = fw.life;
            ctx.shadowColor = fw.color;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.arc(fw.x, fw.y, fw.size, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
    }

    function renderWindLeaves() {
        windLeaves.forEach(l => {
            ctx.save();
            ctx.translate(l.x, l.y);
            ctx.rotate(l.angle);

            ctx.fillStyle = l.color;
            ctx.beginPath();
            ctx.ellipse(0, 0, l.size * 2, l.size * 0.7, 0, 0, Math.PI * 2);
            ctx.fill();

            ctx.restore();
        });
    }

    function renderDamageTexts() {
        damageTexts.forEach(dt => {
            ctx.save();
            ctx.globalAlpha = dt.life;
            ctx.fillStyle = dt.color;
            ctx.font = `bold ${dt.fontSize}px Gaegu, sans-serif`;
            ctx.textAlign = 'center';
            ctx.shadowColor = '#000000';
            ctx.shadowBlur = 4;
            ctx.fillText(dt.text, dt.x, dt.y);
            ctx.restore();
        });
    }

    function animate() {
        if (!isRunning) return;

        update();
        render();

        animationFrameId = requestAnimationFrame(animate);
    }

    function start() {
        if (!canvas) {
            init();
        }
        isRunning = true;
        resize();
        if (!animationFrameId) {
            animate();
        }
    }

    function pause() {
        isRunning = false;
        if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
            animationFrameId = null;
        }
    }

    const obj = {
        init,
        resize,
        start,
        pause,
        reset: resetCourtyard
    };

    window.WarriorGame = obj;
    return obj;
})();

// DOM 준비 완료 시 가동 준비
document.addEventListener('DOMContentLoaded', () => {
    window.WarriorGame.init();
});
