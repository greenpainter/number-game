/**
 * 아기 코끼리 문질문질 색칠 놀이 (ColoringGame)
 * 스케치북 감성의 터치/드래그 문질문질 캔버스 색칠 인터랙션 게임
 */

const ColoringGame = (() => {
    // 캔버스 및 Context 참조
    let canvas = null;
    let ctx = null;
    
    // 오프스크린 캔버스 (사용자가 칠한 물감 레이어)
    let paintCanvas = null;
    let paintCtx = null;
    
    let logicalWidth = 0;
    let logicalHeight = 0;
    
    let isDrawing = false;
    let currentColor = '#ff70a6'; // 기본 선택 색상 (아기 핑크)
    let currentColorName = '아기 핑크';
    
    let isVictory = false;
    let isRunning = false;
    let animationFrameId = null;
    
    // 파티클 시스템
    let rubParticles = [];
    let fireworks = [];
    let confetti = [];
    
    // 색상별 한글명 매핑
    const colorNames = {
        '#ff70a6': '아기 핑크',
        '#ffb703': '개나리 노랑',
        '#06d6a0': '새싹 민트',
        '#4ea8de': '하늘 블루',
        '#b5179e': '바이올렛',
        '#ff9f1c': '감귤 주황',
        '#ff4d6d': '체리 핑크',
        '#ffffff': '밀크 백색'
    };
    
    // 아기 코끼리 조각(Segments) 정의
    // 10개의 파트: 귀(좌/우), 머리, 코, 몸통, 다리(4개), 볼터치, 풍선
    let segments = [];
    
    /**
     * 조각 생성 및 스케일링 설정
     */
    let lastHintTime = 0;

    /**
     * 조각 생성 및 스케일링 설정 (귀여운 아기 코끼리 3등신 파트)
     */
    function initSegments(w, h) {
        const minDim = Math.min(w, h);
        const scale = minDim / 500;
        const cx = w * 0.5;
        const cy = h * 0.48;

        segments = [
            // 1. 왼쪽 큰 둥근 귀
            {
                id: 'leftEar',
                name: '왼쪽 귀',
                targetColor: '#ff70a6', // 아기 핑크
                hintColor: 'rgba(255, 112, 166, 0.35)',
                createPath: () => {
                    const p = new Path2D();
                    p.arc(cx - 85 * scale, cy - 35 * scale, 55 * scale, 0, Math.PI * 2);
                    return p;
                },
                samples: generateCircleSamples(cx - 85 * scale, cy - 35 * scale, 45 * scale, 16)
            },
            // 2. 오른쪽 큰 둥근 귀
            {
                id: 'rightEar',
                name: '오른쪽 귀',
                targetColor: '#ff70a6', // 아기 핑크
                hintColor: 'rgba(255, 112, 166, 0.35)',
                createPath: () => {
                    const p = new Path2D();
                    p.arc(cx + 85 * scale, cy - 35 * scale, 55 * scale, 0, Math.PI * 2);
                    return p;
                },
                samples: generateCircleSamples(cx + 85 * scale, cy - 35 * scale, 45 * scale, 16)
            },
            // 3. 통통한 앞/뒷 다리 (4개 세트)
            {
                id: 'legs',
                name: '아기 다리',
                targetColor: '#06d6a0', // 새싹 민트
                hintColor: 'rgba(6, 214, 160, 0.35)',
                createPath: () => {
                    const p = new Path2D();
                    // 왼다리
                    p.roundRect(cx - 65 * scale, cy + 70 * scale, 40 * scale, 75 * scale, 20 * scale);
                    // 오른다리
                    p.roundRect(cx + 25 * scale, cy + 70 * scale, 40 * scale, 75 * scale, 20 * scale);
                    return p;
                },
                samples: [
                    ...generateSamplesInBox(cx - 60 * scale, cy + 80 * scale, cx - 30 * scale, cy + 135 * scale, 8),
                    ...generateSamplesInBox(cx + 30 * scale, cy + 80 * scale, cx + 60 * scale, cy + 135 * scale, 8)
                ]
            },
            // 4. 통통한 동글 몸통
            {
                id: 'body',
                name: '아기 몸통',
                targetColor: '#4ea8de', // 하늘 블루
                hintColor: 'rgba(78, 168, 222, 0.35)',
                createPath: () => {
                    const p = new Path2D();
                    p.arc(cx, cy + 50 * scale, 75 * scale, 0, Math.PI * 2);
                    return p;
                },
                samples: generateCircleSamples(cx, cy + 50 * scale, 65 * scale, 22)
            },
            // 5. 동글동글 머리
            {
                id: 'head',
                name: '동글 머리',
                targetColor: '#b5179e', // 바이올렛
                hintColor: 'rgba(181, 23, 158, 0.35)',
                createPath: () => {
                    const p = new Path2D();
                    p.arc(cx, cy - 35 * scale, 68 * scale, 0, Math.PI * 2);
                    return p;
                },
                samples: generateCircleSamples(cx, cy - 35 * scale, 58 * scale, 20)
            },
            // 6. 앙증맞은 긴 코 (위로 뿅 말린 모양)
            {
                id: 'trunk',
                name: '긴 코',
                targetColor: '#ff9f1c', // 감귤 주황
                hintColor: 'rgba(255, 159, 28, 0.38)',
                createPath: () => {
                    const p = new Path2D();
                    p.moveTo(cx - 12 * scale, cy - 10 * scale);
                    p.bezierCurveTo(cx - 20 * scale, cy + 30 * scale, cx - 65 * scale, cy + 25 * scale, cx - 65 * scale, cy - 5 * scale);
                    p.bezierCurveTo(cx - 65 * scale, cy - 25 * scale, cx - 40 * scale, cy - 25 * scale, cx - 40 * scale, cy - 5 * scale);
                    p.bezierCurveTo(cx - 40 * scale, cy + 10 * scale, cx - 10 * scale, cy + 10 * scale, cx + 12 * scale, cy - 10 * scale);
                    p.closePath();
                    return p;
                },
                samples: generateSamplesInBox(cx - 60 * scale, cy - 15 * scale, cx - 5 * scale, cy + 20 * scale, 14)
            },
            // 7. 발그레 볼터치 (좌/우)
            {
                id: 'cheeks',
                name: '발그레 볼',
                targetColor: '#ff4d6d', // 체리 핑크
                hintColor: 'rgba(255, 77, 109, 0.45)',
                createPath: () => {
                    const p = new Path2D();
                    p.arc(cx - 40 * scale, cy - 22 * scale, 14 * scale, 0, Math.PI * 2);
                    p.arc(cx + 40 * scale, cy - 22 * scale, 14 * scale, 0, Math.PI * 2);
                    return p;
                },
                samples: [
                    { x: cx - 40 * scale, y: cy - 22 * scale, covered: false },
                    { x: cx + 40 * scale, y: cy - 22 * scale, covered: false }
                ]
            },
            // 8. 노란 하트 풍선
            {
                id: 'balloon',
                name: '하트 풍선',
                targetColor: '#ffb703', // 개나리 노랑
                hintColor: 'rgba(255, 183, 3, 0.40)',
                createPath: () => {
                    const p = new Path2D();
                    const bx = cx - 110 * scale;
                    const by = cy - 130 * scale;
                    const bs = 42 * scale;
                    
                    p.moveTo(bx, by + bs * 0.3);
                    p.bezierCurveTo(bx, by, bx - bs * 0.5, by, bx - bs * 0.5, by + bs * 0.3);
                    p.bezierCurveTo(bx - bs * 0.5, by + bs * 0.6, bx, by + bs * 0.9, bx, by + bs * 1.1);
                    p.bezierCurveTo(bx, by + bs * 0.9, bx + bs * 0.5, by + bs * 0.6, bx + bs * 0.5, by + bs * 0.3);
                    p.bezierCurveTo(bx + bs * 0.5, by, bx, by, bx, by + bs * 0.3);
                    p.closePath();
                    return p;
                },
                samples: generateSamplesInBox(cx - 130 * scale, cy - 150 * scale, cx - 90 * scale, cy - 90 * scale, 10)
            }
        ];

        // 각 조각 상태 초기화
        segments.forEach(seg => {
            seg.path = seg.createPath();
            seg.coverage = 0;
            seg.completed = false;
        });
    }

    // 샘플링 헬퍼 함수들
    function generateSamplesInBox(minX, minY, maxX, maxY, count) {
        const list = [];
        const rows = Math.ceil(Math.sqrt(count));
        const cols = Math.ceil(count / rows);
        const dx = (maxX - minX) / (cols + 1);
        const dy = (maxY - minY) / (rows + 1);

        for (let r = 1; r <= rows; r++) {
            for (let c = 1; c <= cols; c++) {
                list.push({
                    x: minX + c * dx,
                    y: minY + r * dy,
                    covered: false
                });
            }
        }
        return list;
    }

    function generateCircleSamples(cx, cy, radius, count) {
        const list = [{ x: cx, y: cy, covered: false }];
        const rings = 2;
        for (let r = 1; r <= rings; r++) {
            const currentR = (radius / rings) * r * 0.75;
            const pointsInRing = Math.floor(count / rings);
            for (let i = 0; i < pointsInRing; i++) {
                const angle = (i / pointsInRing) * Math.PI * 2;
                list.push({
                    x: cx + Math.cos(angle) * currentR,
                    y: cy + Math.sin(angle) * currentR,
                    covered: false
                });
            }
        }
        return list;
    }

    /**
     * 캔버스 크기 조절 및 반응형 대응
     */
    function resize() {
        const container = document.getElementById('coloringCanvasContainer');
        if (!container || !canvas) return;

        const rect = container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

        const dpr = window.devicePixelRatio || 1;
        
        // 크기가 달라졌을 때만 갱신하거나 initial 갱신
        if (logicalWidth !== rect.width || logicalHeight !== rect.height || canvas.width === 0) {
            logicalWidth = rect.width;
            logicalHeight = rect.height;

            canvas.width = Math.floor(logicalWidth * dpr);
            canvas.height = Math.floor(logicalHeight * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

            // 오프스크린 캔버스 동기화
            if (!paintCanvas) {
                paintCanvas = document.createElement('canvas');
            }
            paintCanvas.width = Math.floor(logicalWidth * dpr);
            paintCanvas.height = Math.floor(logicalHeight * dpr);
            paintCtx = paintCanvas.getContext('2d');
            paintCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
            paintCtx.lineCap = 'round';
            paintCtx.lineJoin = 'round';

            // 조각 재설정
            initSegments(logicalWidth, logicalHeight);
        }

        render();
    }

    /**
     * 게임 초기화 및 시작
     */
    function init() {
        canvas = document.getElementById('coloringCanvas');
        if (!canvas) return;
        ctx = canvas.getContext('2d');

        bindEvents();
        setupPalette();
        resize();

        isRunning = true;
        animate();
    }

    /**
     * 팔레트 UI 이벤트 바인딩
     */
    function setupPalette() {
        const paletteContainer = document.getElementById('coloringPalette');
        if (!paletteContainer) return;

        const swatches = paletteContainer.querySelectorAll('.color-swatch');
        swatches.forEach(swatch => {
            const handleSelect = (e) => {
                e.preventDefault();
                swatches.forEach(s => s.classList.remove('active'));
                swatch.classList.add('active');

                const color = swatch.getAttribute('data-color');
                if (color) {
                    currentColor = color;
                    currentColorName = colorNames[color] || '예쁜 물감';
                    if (window.speak) {
                        window.speak(`${currentColorName}!`);
                    }
                }
            };

            swatch.addEventListener('click', handleSelect);
            swatch.addEventListener('touchstart', handleSelect, { passive: false });
        });
    }

    /**
     * 터치/마우스 드래그 입력 바인딩
     */
    function bindEvents() {
        if (!canvas) return;

        // 마우스 이벤트
        canvas.addEventListener('mousedown', startRubbing);
        canvas.addEventListener('mousemove', rubMove);
        window.addEventListener('mouseup', stopRubbing);

        // 터치 이벤트 (아이패드/태블릿 최적화)
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            startRubbing(e);
        }, { passive: false });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            rubMove(e);
        }, { passive: false });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            stopRubbing();
        }, { passive: false });
    }

    function getCoords(e) {
        const rect = canvas.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const clientY = e.touches ? e.touches[0].clientY : e.clientY;
        return {
            x: (clientX - rect.left) * (logicalWidth / rect.width),
            y: (clientY - rect.top) * (logicalHeight / rect.height)
        };
    }

    function startRubbing(e) {
        if (isVictory) return;
        isDrawing = true;
        const coords = getCoords(e);
        applyPaint(coords.x, coords.y);
    }

    function rubMove(e) {
        if (!isDrawing || isVictory) return;
        const coords = getCoords(e);
        applyPaint(coords.x, coords.y);
    }

    function stopRubbing() {
        isDrawing = false;
    }

    let lastWrongHintTime = 0;

    /**
     * 문질문질 페인팅 알고리즘 (정답 음영 색상 매칭 검증 포함)
     */
    function applyPaint(x, y) {
        const brushRadius = Math.min(logicalWidth, logicalHeight) * 0.05;

        let hitSegment = null;

        // 전면부터 감지하여 해당 조각 내에 클리핑하여 칠함
        for (let i = segments.length - 1; i >= 0; i--) {
            const seg = segments[i];
            if (ctx.isPointInPath(seg.path, x, y)) {
                hitSegment = seg;
                break;
            }
        }

        // 코끼리 그림 외부는 칠해지지 않음
        if (!hitSegment) return;

        // [정답 색상 매칭 규칙] 음영 힌트 지정 색상과 현재 물감이 다르면 칠해지지 않음!
        if (hitSegment.targetColor && hitSegment.targetColor.toLowerCase() !== currentColor.toLowerCase()) {
            const now = Date.now();
            if (now - lastWrongHintTime > 2500) {
                lastWrongHintTime = now;
                const correctColorName = colorNames[hitSegment.targetColor] || '맞는';
                if (window.speak) {
                    window.speak(`${hitSegment.name}는 ${correctColorName} 물감으로 칠해보아요!`);
                }
            }
            return; // 칠하기 차단
        }

        paintCtx.save();
        paintCtx.clip(hitSegment.path);

        // 문질문질 붓 터치 렌더링
        paintCtx.beginPath();
        paintCtx.arc(x, y, brushRadius, 0, Math.PI * 2);
        paintCtx.fillStyle = currentColor;
        paintCtx.globalAlpha = 0.85;
        paintCtx.fill();
        paintCtx.restore();

        // 퐁퐁 파티클 튀김 연출
        for (let i = 0; i < 2; i++) {
            rubParticles.push(new RubParticle(x, y, currentColor));
        }

        // 체크포인트 및 completion 비율 체크
        checkSegmentCoverage(hitSegment, x, y, brushRadius);
    }

    /**
     * 조각 완성도 계산
     */
    function checkSegmentCoverage(seg, x, y, radius) {
        if (seg.completed) return;

        let coveredCount = 0;
        seg.samples.forEach(sample => {
            const dist = Math.hypot(sample.x - x, sample.y - y);
            if (dist < radius * 1.1) {
                sample.covered = true;
            }
            if (sample.covered) {
                coveredCount++;
            }
        });

        seg.coverage = coveredCount / seg.samples.length;

        // 75% 이상 문지르면 자동 깔끔 채우기 완성 및 칭찬 피드백
        if (seg.coverage >= 0.75) {
            seg.completed = true;
            
            // 조각 채우기 깔끔하게 마감
            paintCtx.save();
            paintCtx.clip(seg.path);
            paintCtx.fillStyle = currentColor;
            paintCtx.globalAlpha = 1.0;
            paintCtx.fill(seg.path);
            paintCtx.restore();

            // 완료 파티클 팡!
            const sampleCenter = seg.samples[Math.floor(seg.samples.length / 2)] || { x, y };
            for (let k = 0; k < 12; k++) {
                rubParticles.push(new RubParticle(sampleCenter.x, sampleCenter.y, currentColor, true));
            }
        }

        checkOverallVictory();
    }

    /**
     * 전체 코끼리 색칠 완성 검사
     */
    function checkOverallVictory() {
        if (isVictory) return;

        const totalSegments = segments.length;
        const completedSegments = segments.filter(s => s.completed || s.coverage >= 0.65).length;

        if (completedSegments >= Math.ceil(totalSegments * 0.85)) {
            triggerVictory();
        }
    }

    /**
     * 축하 폭죽 세레모니 & TTS
     */
    function triggerVictory() {
        isVictory = true;

        // UI 승리 메시지 뱃지 노출
        const successMsg = document.getElementById('coloringSuccessMessage');
        if (successMsg) {
            successMsg.classList.add('show');
        }

        // 음성 안내 출력 ("와~ 코끼리가 정말 알록달록 예뻐졌어요!")
        if (window.speak) {
            window.speak("와~ 코끼리가 정말 알록달록 예뻐졌어요!");
        }

        // 폭죽 및 색종이 대량 생성
        for (let i = 0; i < 6; i++) {
            const startX = Math.random() * logicalWidth;
            const targetX = Math.random() * (logicalWidth * 0.8) + (logicalWidth * 0.1);
            const targetY = Math.random() * (logicalHeight * 0.4) + (logicalHeight * 0.1);
            fireworks.push(new Firework(startX, logicalHeight, targetX, targetY));
        }

        for (let i = 0; i < 90; i++) {
            confetti.push(new Confetto());
        }
    }

    /**
     * 메인 캔버스 렌더링 루프
     */
    function render() {
        if (!ctx || logicalWidth === 0) return;

        // 1. 바탕 클리어
        ctx.clearRect(0, 0, logicalWidth, logicalHeight);

        // 2. 각 조각 바탕 연한 파스텔 음영(힌트 색상) 가이드 렌더링
        segments.forEach(seg => {
            ctx.save();
            ctx.fillStyle = seg.hintColor;
            ctx.fill(seg.path);

            // 테두리 안내 가이드 선
            ctx.strokeStyle = 'rgba(180, 195, 210, 0.45)';
            ctx.lineWidth = 2.5;
            ctx.setLineDash([8, 6]);
            ctx.stroke(seg.path);
            ctx.restore();
        });

        // 3. 풍선 실(줄) 안내선 렌더링
        ctx.save();
        ctx.beginPath();
        const minDim = Math.min(logicalWidth, logicalHeight);
        const scale = minDim / 500;
        const cx = logicalWidth * 0.5;
        const cy = logicalHeight * 0.48;
        ctx.moveTo(cx - 110 * scale, cy - 100 * scale);
        ctx.quadraticCurveTo(cx - 90 * scale, cy - 40 * scale, cx - 60 * scale, cy - 20 * scale);
        ctx.strokeStyle = '#a0a0a0';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.stroke();
        ctx.restore();

        // 4. 사용자가 문질문질 칠한 오프스크린 물감 레이어 합성
        if (paintCanvas) {
            ctx.drawImage(paintCanvas, 0, 0, logicalWidth, logicalHeight);
        }

        // 5. 아기 코끼리 귀여운 이목구비 & 외곽 아웃라인 렌더링 (항상 선명하게 위쪽에 표시)
        drawElephantDetails(cx, cy, scale);

        // 6. 퐁퐁 문질문질 파티클 렌더링
        for (let i = rubParticles.length - 1; i >= 0; i--) {
            rubParticles[i].update(i, rubParticles);
            if (rubParticles[i]) rubParticles[i].draw(ctx);
        }

        // 7. 폭죽 & 색종이 렌더링 (승리 세레모니 중)
        if (isVictory) {
            if (Math.random() < 0.05 && fireworks.length < 5) {
                const startX = Math.random() * logicalWidth;
                const targetX = Math.random() * (logicalWidth * 0.8) + (logicalWidth * 0.1);
                const targetY = Math.random() * (logicalHeight * 0.4) + (logicalHeight * 0.1);
                fireworks.push(new Firework(startX, logicalHeight, targetX, targetY));
            }

            for (let i = fireworks.length - 1; i >= 0; i--) {
                fireworks[i].update(i, fireworks);
                if (fireworks[i]) fireworks[i].draw(ctx);
            }

            for (let i = confetti.length - 1; i >= 0; i--) {
                confetti[i].update(i, confetti);
                if (confetti[i]) confetti[i].draw(ctx);
            }
        }
    }

    /**
     * 코끼리 선명한 선 & 귀여운 이목구비 상세 렌더링
     */
    function drawElephantDetails(cx, cy, scale) {
        ctx.save();
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = '#3d405b';
        ctx.lineWidth = 3.5;

        // 모든 조각 테두리 선 보정
        segments.forEach(seg => {
            ctx.stroke(seg.path);
        });

        // 초롱초롱 귀여운 눈 (좌/우)
        const eyeY = cy - 50 * scale;
        const eyeR = 8 * scale;

        // 왼쪽 눈
        ctx.beginPath();
        ctx.arc(cx - 32 * scale, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fillStyle = '#3d405b';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx - 30 * scale, eyeY - 2 * scale, eyeR * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // 오른쪽 눈
        ctx.beginPath();
        ctx.arc(cx + 32 * scale, eyeY, eyeR, 0, Math.PI * 2);
        ctx.fillStyle = '#3d405b';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(cx + 34 * scale, eyeY - 2 * scale, eyeR * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();

        // 긴 코 귀여운 주름선
        ctx.beginPath();
        ctx.arc(cx - 40 * scale, cy - 12 * scale, 12 * scale, -0.4, 0.8);
        ctx.arc(cx - 52 * scale, cy - 2 * scale, 10 * scale, -0.4, 0.8);
        ctx.stroke();

        // 앞발 발톱 (귀여운 하얀 반원 3개씩)
        const drawToeNails = (footX, footY) => {
            ctx.fillStyle = '#ffffff';
            ctx.strokeStyle = '#3d405b';
            ctx.lineWidth = 2;
            for (let i = -1; i <= 1; i++) {
                ctx.beginPath();
                ctx.arc(footX + i * 11 * scale, footY + 70 * scale, 5 * scale, Math.PI, 0);
                ctx.fill();
                ctx.stroke();
            }
        };

        drawToeNails(cx - 32.5 * scale, cy + 100 * scale);
        drawToeNails(cx + 32.5 * scale, cy + 100 * scale);

        // 하트 풍선 반사광 데코
        ctx.beginPath();
        ctx.arc(cx - 122 * scale, cy - 142 * scale, 4 * scale, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
        ctx.fill();

        ctx.restore();
    }

    /**
     * 프레임 애니메이션 루프
     */
    function animate() {
        if (!isRunning) return;
        render();
        animationFrameId = requestAnimationFrame(animate);
    }

    /**
     * 리셋 (다시 칠하기)
     */
    function reset() {
        isVictory = false;
        isDrawing = false;
        rubParticles = [];
        fireworks = [];
        confetti = [];

        if (paintCtx && paintCanvas) {
            paintCtx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
        }

        const successMsg = document.getElementById('coloringSuccessMessage');
        if (successMsg) {
            successMsg.classList.remove('show');
        }

        if (logicalWidth > 0) {
            initSegments(logicalWidth, logicalHeight);
        }

        if (window.speak) {
            window.speak("다시 예쁘게 칠해보아요!");
        }

        render();
    }

    function start() {
        if (!canvas) {
            init();
        }
        isRunning = true;
        // 캔버스 크기 재계산 및 렌더링 강제 수행
        resize();
        render();
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
        reset,
        start,
        pause
    };

    window.ColoringGame = obj;
    return obj;
})();

// DOM 로드 완료 시 전역 가동 준비
document.addEventListener('DOMContentLoaded', () => {
    window.ColoringGame.init();
});
