// 1. 숫자 경로 및 학습용 라벨 정의 (relative coordinates: 0.0 ~ 1.0)
const numberPaths = {
    '1': {
        label: "하나~",
        paths: [
            [{x: 0.42, y: 0.28}, {x: 0.5, y: 0.2}, {x: 0.5, y: 0.4}, {x: 0.5, y: 0.6}, {x: 0.5, y: 0.8}]
        ]
    },
    '2': {
        label: "둘~",
        paths: [
            [{x: 0.35, y: 0.32}, {x: 0.42, y: 0.23}, {x: 0.58, y: 0.23}, {x: 0.65, y: 0.32}, {x: 0.58, y: 0.48}, {x: 0.46, y: 0.64}, {x: 0.35, y: 0.78}, {x: 0.5, y: 0.78}, {x: 0.65, y: 0.78}]
        ]
    },
    '3': {
        label: "셋~",
        paths: [
            [{x: 0.36, y: 0.3}, {x: 0.46, y: 0.22}, {x: 0.62, y: 0.26}, {x: 0.58, y: 0.42}, {x: 0.48, y: 0.48}, {x: 0.58, y: 0.54}, {x: 0.64, y: 0.7}, {x: 0.5, y: 0.78}, {x: 0.36, y: 0.72}]
        ]
    },
    '4': {
        label: "넷~",
        paths: [
            [{x: 0.58, y: 0.22}, {x: 0.42, y: 0.48}, {x: 0.32, y: 0.62}, {x: 0.5, y: 0.62}, {x: 0.68, y: 0.62}],
            [{x: 0.58, y: 0.42}, {x: 0.58, y: 0.62}, {x: 0.58, y: 0.8}]
        ]
    },
    '5': {
        label: "다섯~",
        paths: [
            [{x: 0.62, y: 0.24}, {x: 0.42, y: 0.24}, {x: 0.38, y: 0.48}, {x: 0.54, y: 0.48}, {x: 0.65, y: 0.58}, {x: 0.62, y: 0.72}, {x: 0.45, y: 0.78}, {x: 0.35, y: 0.72}]
        ]
    },
    '6': {
        label: "여섯~",
        paths: [
            [{x: 0.58, y: 0.22}, {x: 0.45, y: 0.32}, {x: 0.36, y: 0.48}, {x: 0.36, y: 0.66}, {x: 0.45, y: 0.78}, {x: 0.58, y: 0.78}, {x: 0.64, y: 0.66}, {x: 0.58, y: 0.54}, {x: 0.45, y: 0.54}, {x: 0.36, y: 0.66}]
        ]
    },
    '7': {
        label: "일곱~",
        paths: [
            [{x: 0.35, y: 0.24}, {x: 0.5, y: 0.24}, {x: 0.65, y: 0.24}, {x: 0.55, y: 0.46}, {x: 0.46, y: 0.68}, {x: 0.4, y: 0.8}]
        ]
    },
    '8': {
        label: "여덟~",
        paths: [
            [{x: 0.5, y: 0.46}, {x: 0.4, y: 0.34}, {x: 0.42, y: 0.22}, {x: 0.5, y: 0.2}, {x: 0.58, y: 0.22}, {x: 0.6, y: 0.34}, {x: 0.5, y: 0.46}, {x: 0.38, y: 0.58}, {x: 0.38, y: 0.72}, {x: 0.5, y: 0.8}, {x: 0.62, y: 0.72}, {x: 0.62, y: 0.58}, {x: 0.5, y: 0.46}]
        ]
    },
    '9': {
        label: "아홉~",
        paths: [
            [{x: 0.58, y: 0.5}, {x: 0.45, y: 0.5}, {x: 0.38, y: 0.38}, {x: 0.44, y: 0.24}, {x: 0.56, y: 0.24}, {x: 0.64, y: 0.36}, {x: 0.62, y: 0.5}, {x: 0.55, y: 0.64}, {x: 0.46, y: 0.78}]
        ]
    },
    '0': {
        label: "하나도 없네~",
        paths: [
            [{x: 0.5, y: 0.2}, {x: 0.38, y: 0.3}, {x: 0.34, y: 0.5}, {x: 0.38, y: 0.7}, {x: 0.5, y: 0.8}, {x: 0.62, y: 0.7}, {x: 0.66, y: 0.5}, {x: 0.62, y: 0.3}, {x: 0.5, y: 0.2}]
        ]
    }
};

// 숫자별 대표 색상 매핑
const numberColors = {
    '1': '#ff9f1c',
    '2': '#ffbf69',
    '3': '#ffd166',
    '4': '#06d6a0',
    '5': '#118ab2',
    '6': '#8338ec',
    '7': '#3a86c8',
    '8': '#ff006e',
    '9': '#38b000',
    '0': '#f77f00'
};

// 2. 변수 정의 및 초기화
const canvas = document.getElementById('drawingCanvas');
const ctx = canvas.getContext('2d');

let canvasLogicalWidth = 0;
let canvasLogicalHeight = 0;

let currentNumber = '1';
let checkpoints = []; // 검증 대상 체크포인트 리스트
let currentCheckpointIndex = 0;

let userLines = []; // 이전 획들의 모음 [[{x, y}, ...], ...]
let currentLine = []; // 현재 그리고 있는 획

let isDrawing = false;
let isRainbowMode = false;
let rainbowHue = 0;

let successActive = false;

// 파티클 시스템 변수
let fireworks = [];
let explosionParticles = [];
let confetti = [];
let drawingParticles = [];

// 3. 한국어 TTS 설정 (Siri 여성 및 여성 보이스 우선 매칭)
let koVoice = null;

function loadVoices() {
    if (!window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    
    // 한국어 목소리 필터링
    const koVoices = voices.filter(voice => voice.lang === 'ko-KR' || voice.lang.startsWith('ko'));
    
    let selectedVoice = null;
    
    // 1. Siri 여성 또는 Siri 1 (Apple 기기의 여성 음성)
    selectedVoice = koVoices.find(v => v.name.includes('Siri') && (v.name.includes('여성') || v.name.includes('Female') || v.name.includes('1')));
    
    // 2. Yuna (Apple 고품질 여성)
    if (!selectedVoice) {
        selectedVoice = koVoices.find(v => v.name.includes('Yuna') || v.name.includes('yuna'));
    }
    
    // 3. 혜현 (Google / MS 여성)
    if (!selectedVoice) {
        selectedVoice = koVoices.find(v => v.name.includes('Hye-hyeon') || v.name.includes('Hyehyeon') || v.name.includes('혜현'));
    }
    
    // 4. 일반 Google 한국어 (기본 여성 보이스)
    if (!selectedVoice) {
        selectedVoice = koVoices.find(v => v.name.includes('Google') || v.name.includes('google'));
    }
    
    // 5. 남성 및 로봇(남성, Male, 2) 음성 피하기
    if (!selectedVoice) {
        selectedVoice = koVoices.find(v => !v.name.includes('남성') && !v.name.includes('Male') && !v.name.includes('2'));
    }
    
    // 6. 그래도 없으면 첫 번째 한국어 음성 사용
    if (!selectedVoice && koVoices.length > 0) {
        selectedVoice = koVoices[0];
    }
    
    koVoice = selectedVoice;
    console.log("선택된 한국어 음성:", koVoice ? koVoice.name : "없음 (기본값 사용)");
}

if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
}

function speak(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel(); // 진행 중인 음성 즉시 취소
    
    const utterance = new SpeechSynthesisUtterance(text);
    if (koVoice) {
        utterance.voice = koVoice;
    }
    utterance.lang = 'ko-KR';
    utterance.pitch = 1.0; // 시리 여성 본연의 자연스러운 음높이 적용
    utterance.rate = 0.9;  // 어린이가 잘 들을 수 있게 표준보다 약간만 느리게 설정
    window.speechSynthesis.speak(utterance);
}

// 4. 숫자 상태 변경 함수
function initNumber(num) {
    currentNumber = num;
    const numberData = numberPaths[num];
    checkpoints = [];
    
    // 다중 획을 포함한 모든 좌표를 검증 리스트로 직렬화
    numberData.paths.forEach((path, pathIndex) => {
        path.forEach((pt, ptIndex) => {
            checkpoints.push({
                x: pt.x,
                y: pt.y,
                pathIndex: pathIndex,
                ptIndex: ptIndex
            });
        });
    });
    
    currentCheckpointIndex = 0;
    userLines = [];
    currentLine = [];
    isDrawing = false;
    successActive = false;
    
    // 폭죽 및 파티클 리셋
    fireworks = [];
    explosionParticles = [];
    confetti = [];
    
    // UI 클래스 제어 및 애니메이션 클래스 제거
    document.getElementById('successMessage').classList.remove('show');
    
    draw();
    
    // 안내 음성 출력
    const numName = num === '0' ? '영' : num;
    speak(`${numName}! 따라 그려보아요!`);
}

// 5. 그리기 화면 렌더링
function draw() {
    // 캔버스 비우기
    ctx.clearRect(0, 0, canvasLogicalWidth, canvasLogicalHeight);
    
    const numberData = numberPaths[currentNumber];
    const baseColor = numberColors[currentNumber];
    
    // A. 숫자 음영 가이드 라인 그리기
    numberData.paths.forEach(path => {
        // 연한 바탕 트랙
        ctx.beginPath();
        path.forEach((pt, idx) => {
            const lx = pt.x * canvasLogicalWidth;
            const ly = pt.y * canvasLogicalHeight;
            if (idx === 0) ctx.moveTo(lx, ly);
            else ctx.lineTo(lx, ly);
        });
        ctx.strokeStyle = 'rgba(219, 205, 184, 0.25)'; // 부드러운 음영 회색 트랙
        ctx.lineWidth = 45;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
        
        // 중앙 흰색 점선 가이드
        ctx.beginPath();
        path.forEach((pt, idx) => {
            const lx = pt.x * canvasLogicalWidth;
            const ly = pt.y * canvasLogicalHeight;
            if (idx === 0) ctx.moveTo(lx, ly);
            else ctx.lineTo(lx, ly);
        });
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 4;
        ctx.setLineDash([12, 10]);
        ctx.stroke();
        ctx.setLineDash([]); // 대시 설정 초기화
    });
    
    // B. 사용자가 그린 선 그리기 (그림자 효과로 네온/크레파스 질감 표현)
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 16;
    
    // 완료된 이전 획들 그리기
    userLines.forEach(line => {
        if (line.length < 2) return;
        ctx.beginPath();
        ctx.moveTo(line[0].x, line[0].y);
        for (let i = 1; i < line.length; i++) {
            ctx.lineTo(line[i].x, line[i].y);
        }
        ctx.strokeStyle = line[0].color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = line[0].color;
        ctx.stroke();
    });
    
    // 현재 진행 중인 획 그리기
    if (currentLine.length >= 2) {
        ctx.beginPath();
        ctx.moveTo(currentLine[0].x, currentLine[0].y);
        for (let i = 1; i < currentLine.length; i++) {
            ctx.lineTo(currentLine[i].x, currentLine[i].y);
        }
        ctx.strokeStyle = currentLine[0].color;
        ctx.shadowBlur = 6;
        ctx.shadowColor = currentLine[0].color;
        ctx.stroke();
    }
    ctx.restore();
    
    // C. 가이드 점 및 펄스 효과 렌더링 (성공 완료 상태가 아닐 때만)
    if (!successActive && currentCheckpointIndex < checkpoints.length) {
        const activePt = checkpoints[currentCheckpointIndex];
        const ax = activePt.x * canvasLogicalWidth;
        const ay = activePt.y * canvasLogicalHeight;
        
        // 펄스 애니메이션 반경 계산
        const pulse = Math.sin(Date.now() / 150) * 4;
        const innerRad = 15 + pulse;
        const outerRad = 22 + pulse;
        
        // 바깥쪽 부드러운 아우라
        ctx.beginPath();
        ctx.arc(ax, ay, outerRad, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(132, 165, 157, 0.25)';
        ctx.fill();
        
        // 메인 민트색 가이드 링
        ctx.beginPath();
        ctx.arc(ax, ay, innerRad, 0, Math.PI * 2);
        ctx.fillStyle = '#84a59d';
        ctx.fill();
        
        // 중앙 별모양 또는 하얀 구멍 데코레이션
        ctx.beginPath();
        ctx.arc(ax, ay, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        
        // 다음에 통과해야 할 다음 포인트(힌트)를 반투명하게 가볍게 보여주기
        for (let i = currentCheckpointIndex + 1; i < checkpoints.length; i++) {
            const nextPt = checkpoints[i];
            // 동일한 획의 다음 좌표만 시각화하여 혼란 방지
            if (nextPt.pathIndex === activePt.pathIndex) {
                const nx = nextPt.x * canvasLogicalWidth;
                const ny = nextPt.y * canvasLogicalHeight;
                ctx.beginPath();
                ctx.arc(nx, ny, 8, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(180, 180, 180, 0.4)';
                ctx.fill();
                break; // 직후의 하나만 노출
            }
        }
    }
}

// 6. 터치 및 마우스 좌표 추출
function getCanvasCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    
    // CSS 크기와 캔버스 좌표 크기 비례 맵핑
    const x = (clientX - rect.left) * (canvasLogicalWidth / rect.width);
    const y = (clientY - rect.top) * (canvasLogicalHeight / rect.height);
    return { x, y };
}

// 7. 체크포인트 획득 감지 로직
function checkCheckpoint(x, y) {
    if (successActive || currentCheckpointIndex >= checkpoints.length) return;
    
    const target = checkpoints[currentCheckpointIndex];
    const tx = target.x * canvasLogicalWidth;
    const ty = target.y * canvasLogicalHeight;
    
    // 점과 점 사이의 거리 계산
    const dist = Math.hypot(x - tx, y - ty);
    
    // 오차 한계선: 42px 내외로 터치하면 획득
    if (dist < 42) {
        // 체크포인트 획득 시 미니 피드백 스파클 생성
        for (let i = 0; i < 8; i++) {
            drawingParticles.push(new DrawingSparkle(tx, ty, '#84a59d'));
        }
        
        currentCheckpointIndex++;
        
        // 최종 완료 상태 검증
        if (currentCheckpointIndex === checkpoints.length) {
            triggerSuccess();
        }
    }
}

// 8. 그리기 입력 감지 이벤트 바인딩
function startDrawing(e) {
    if (successActive) return;
    
    const coords = getCanvasCoords(e);
    isDrawing = true;
    
    // 무지개 펜 모드 혹은 해당 숫자 기본 색상 지정
    const strokeColor = isRainbowMode ? `hsl(${rainbowHue}, 100%, 60%)` : numberColors[currentNumber];
    
    currentLine = [{ x: coords.x, y: coords.y, color: strokeColor }];
    
    // 첫 지점부터 그렸는지 검사
    checkCheckpoint(coords.x, coords.y);
}

function drawMove(e) {
    if (!isDrawing || successActive) return;
    
    const coords = getCanvasCoords(e);
    
    // 무지개 펜 모드일 시 각 프레임마다 색상 휠 회전
    let strokeColor = numberColors[currentNumber];
    if (isRainbowMode) {
        rainbowHue = (rainbowHue + 2) % 360;
        strokeColor = `hsl(${rainbowHue}, 100%, 60%)`;
    }
    
    currentLine.push({ x: coords.x, y: coords.y, color: strokeColor });
    
    // 마법 꼬리 효과 파티클 생성
    if (Math.random() < 0.4) {
        drawingParticles.push(new DrawingSparkle(coords.x, coords.y, strokeColor));
    }
    
    // 이동 궤적 확인 및 체크포인트 획득 감지
    checkCheckpoint(coords.x, coords.y);
    
    draw();
}

function stopDrawing() {
    if (!isDrawing) return;
    isDrawing = false;
    
    if (currentLine.length > 0) {
        userLines.push(currentLine);
        currentLine = [];
    }
    draw();
}

// 마우스 & 터치 이벤트 리스너 추가
canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', drawMove);
window.addEventListener('mouseup', stopDrawing);

canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    startDrawing(e);
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    drawMove(e);
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
    e.preventDefault();
    stopDrawing();
}, { passive: false });

// 9. 성공 애니메이션 및 오디오 재생
function triggerSuccess() {
    successActive = true;
    
    // UI 피드백 뱃지 띄우기
    const successMsg = document.getElementById('successMessage');
    successMsg.classList.add('show');
    
    // 축하 멘트 출력 ("1은 하나~", "2는 둘~")
    const speakNum = currentNumber === '0' ? '영' : currentNumber;
    const desc = numberPaths[currentNumber].label;
    speak(`${speakNum}은 ${desc}`);
    
    // 폭죽(Fireworks) 사방 발포
    for (let i = 0; i < 5; i++) {
        const startX = Math.random() * canvasLogicalWidth;
        const targetX = Math.random() * (canvasLogicalWidth * 0.8) + (canvasLogicalWidth * 0.1);
        const targetY = Math.random() * (canvasLogicalHeight * 0.35) + (canvasLogicalHeight * 0.15);
        fireworks.push(new Firework(startX, canvasLogicalHeight, targetX, targetY));
    }
    
    // 공중 흩날리는 색종이(Confetti) 생성
    for (let i = 0; i < 80; i++) {
        confetti.push(new Confetto());
    }
    
    // 4.5초 뒤 자동 다음 숫자로 이동
    setTimeout(() => {
        if (!successActive) return; // 중간에 숫자가 수동 클릭되면 작동 중지
        
        const numOrder = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'];
        const currentIdx = numOrder.indexOf(currentNumber);
        const nextIdx = (currentIdx + 1) % numOrder.length;
        const nextNum = numOrder[nextIdx];
        
        // 상단 네비게이션 액티브 갱신
        document.querySelectorAll('.num-btn').forEach(btn => {
            if (btn.getAttribute('data-num') === nextNum) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        
        initNumber(nextNum);
    }, 4500);
}

// 10. 파티클 물리 클래스 모음
class DrawingSparkle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 1.5;
        this.vy = (Math.random() - 0.5) * 1.5 - 0.4;
        this.size = Math.random() * 5 + 3;
        this.color = color;
        this.alpha = 1;
        this.decay = Math.random() * 0.03 + 0.02;
    }
    update(index, array) {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= this.decay;
        if (this.alpha <= this.decay) {
            array.splice(index, 1);
        }
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        // 귀여운 원형 별가루 효과
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

class Firework {
    constructor(startX, startY, targetX, targetY) {
        this.x = startX;
        this.y = startY;
        this.targetX = targetX;
        this.targetY = targetY;
        this.coordinates = [];
        this.coordinateCount = 3;
        while (this.coordinateCount--) {
            this.coordinates.push([this.x, this.y]);
        }
        this.angle = Math.atan2(targetY - startY, targetX - startX);
        this.speed = 4.5;
        this.acceleration = 1.035;
        this.brightness = Math.random() * 20 + 55;
        this.hue = Math.random() * 360;
    }
    update(index) {
        this.coordinates.pop();
        this.coordinates.unshift([this.x, this.y]);
        this.speed *= this.acceleration;
        let vx = Math.cos(this.angle) * this.speed;
        let vy = Math.sin(this.angle) * this.speed;
        
        if (this.y <= this.targetY) {
            // 목푯값 지점에 다다르면 폭발 파티클 생성 후 폭죽 제거
            createExplosion(this.targetX, this.targetY, this.hue);
            fireworks.splice(index, 1);
        } else {
            this.x += vx;
            this.y += vy;
        }
    }
    draw() {
        ctx.beginPath();
        ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = `hsl(${this.hue}, 100%, ${this.brightness}%)`;
        ctx.lineWidth = 3;
        ctx.stroke();
    }
}

class FireworkParticle {
    constructor(x, y, hue) {
        this.x = x;
        this.y = y;
        this.coordinates = [];
        this.coordinateCount = 5;
        while (this.coordinateCount--) {
            this.coordinates.push([this.x, this.y]);
        }
        this.angle = Math.random() * Math.PI * 2;
        this.speed = Math.random() * 7 + 3;
        this.friction = 0.95;
        this.gravity = 0.12;
        this.hue = hue + (Math.random() * 30 - 15);
        this.brightness = Math.random() * 20 + 60;
        this.alpha = 1;
        this.decay = Math.random() * 0.016 + 0.012;
    }
    update(index, array) {
        this.coordinates.pop();
        this.coordinates.unshift([this.x, this.y]);
        this.speed *= this.friction;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed + this.gravity;
        this.alpha -= this.decay;
        
        if (this.alpha <= this.decay) {
            array.splice(index, 1);
        }
    }
    draw() {
        ctx.beginPath();
        ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = `hsla(${this.hue}, 100%, ${this.brightness}%, ${this.alpha})`;
        ctx.lineWidth = 2.5;
        ctx.stroke();
    }
}

class Confetto {
    constructor() {
        this.x = Math.random() * canvasLogicalWidth;
        this.y = Math.random() * -60 - 20;
        this.size = Math.random() * 8 + 6;
        this.width = this.size;
        this.height = this.size * 0.6;
        this.color = `hsl(${Math.random() * 360}, 90%, 65%)`;
        this.speedY = Math.random() * 1.8 + 1.2;
        this.speedX = Math.random() * 1.6 - 0.8;
        this.rotation = Math.random() * 360;
        this.rotationSpeed = Math.random() * 4 + 2;
    }
    update(index) {
        this.y += this.speedY;
        this.x += this.speedX + Math.sin(this.y / 25) * 0.4;
        this.rotation += this.rotationSpeed;
        if (this.y > canvasLogicalHeight) {
            confetti.splice(index, 1);
        }
    }
    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }
}

function createExplosion(x, y, hue) {
    let count = 55;
    while (count--) {
        explosionParticles.push(new FireworkParticle(x, y, hue));
    }
}

// 11. 애니메이션 엔진 루프
function animate() {
    // 1단계: 기본 도화지 및 선 그리기
    draw();
    
    // 2단계: 자동 폭죽 시드 발포 (성공 세레모니 도중)
    if (successActive) {
        if (Math.random() < 0.04 && fireworks.length < 4) {
            const startX = Math.random() * canvasLogicalWidth;
            const targetX = Math.random() * (canvasLogicalWidth * 0.8) + (canvasLogicalWidth * 0.1);
            const targetY = Math.random() * (canvasLogicalHeight * 0.35) + (canvasLogicalHeight * 0.15);
            fireworks.push(new Firework(startX, canvasLogicalHeight, targetX, targetY));
        }
    }
    
    // 3단계: 파티클 물리 업데이트 및 드로잉
    for (let i = fireworks.length - 1; i >= 0; i--) {
        fireworks[i].update(i);
        if (fireworks[i]) fireworks[i].draw();
    }
    
    for (let i = explosionParticles.length - 1; i >= 0; i--) {
        explosionParticles[i].update(i, explosionParticles);
        if (explosionParticles[i]) explosionParticles[i].draw();
    }
    
    for (let i = confetti.length - 1; i >= 0; i--) {
        confetti[i].update(i);
        if (confetti[i]) confetti[i].draw();
    }
    
    for (let i = drawingParticles.length - 1; i >= 0; i--) {
        drawingParticles[i].update(i, drawingParticles);
        if (drawingParticles[i]) drawingParticles[i].draw();
    }
    
    requestAnimationFrame(animate);
}

// 12. 컨트롤 제어 및 오디오 잠금 해제 이벤트 바인딩
const startOverlay = document.getElementById('startOverlay');
const startBtn = document.getElementById('startBtn');

startBtn.addEventListener('click', () => {
    // iOS/태블릿 오디오 세션 활성화를 위한 초기 1회 실행
    speak("숫자 놀이 시작!");
    
    // 페이드 아웃 후 모달 비활성화
    startOverlay.style.opacity = '0';
    setTimeout(() => {
        startOverlay.style.display = 'none';
        // 첫 번째 숫자 로드
        initNumber('1');
    }, 500);
});

// 하단 컨트롤 패널 바인딩
document.getElementById('clearBtn').addEventListener('click', () => {
    initNumber(currentNumber);
});

document.getElementById('speechBtn').addEventListener('click', () => {
    const speakNum = currentNumber === '0' ? '영' : currentNumber;
    const desc = numberPaths[currentNumber].label;
    speak(`${speakNum}은 ${desc}`);
});

const penModeBtn = document.getElementById('penModeBtn');
penModeBtn.addEventListener('click', () => {
    isRainbowMode = !isRainbowMode;
    if (isRainbowMode) {
        penModeBtn.classList.add('rainbow-active');
    } else {
        penModeBtn.classList.remove('rainbow-active');
    }
});

// 상단 숫자판 이벤트 바인딩
document.querySelectorAll('.num-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.num-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        initNumber(e.target.getAttribute('data-num'));
    });
});

// 13. 반응형 캔버스 크기 제어
function resizeCanvas() {
    const container = canvas.parentElement;
    const rect = container.getBoundingClientRect();
    
    // 캔버스 자체 픽셀 고해상도 대응 (Device Pixel Ratio 반영)
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    // Context 스케일링 설정
    ctx.scale(dpr, dpr);
    
    // 논리적 해상도(좌표 계산용) 저장
    canvasLogicalWidth = rect.width;
    canvasLogicalHeight = rect.height;
    
    draw();
}

// 리사이즈 리스너 등록
window.addEventListener('resize', resizeCanvas);

// 14. 전체화면 제어 로직 (iOS/iPad 크롬 가상 전체화면 지원)
const fullscreenBtn = document.getElementById('fullscreenBtn');
const sketchbook = document.querySelector('.sketchbook');

function toggleFullscreen() {
    // A. 네이티브 전체화면을 지원하는 브라우저인 경우 (PC, 안드로이드 등)
    if (document.documentElement.requestFullscreen) {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(err => {
                console.warn("네이티브 전체화면 활성화 실패, 가상 전체화면으로 전환합니다:", err);
                toggleVirtualFullscreen();
            });
        } else {
            document.exitFullscreen();
        }
    } else {
        // B. iOS Safari/Chrome 등 네이티브 전체화면 API가 없는 경우 가상 전체화면 작동
        toggleVirtualFullscreen();
    }
}

function toggleVirtualFullscreen() {
    const isVirtual = sketchbook.classList.toggle('virtual-fullscreen');
    if (isVirtual) {
        fullscreenBtn.innerHTML = '<span class="icon">🖥️</span> 원래대로';
    } else {
        fullscreenBtn.innerHTML = '<span class="icon">🖥️</span> 전체화면';
    }
    // 레이아웃 변경 완료 후 캔버스 리사이즈
    setTimeout(resizeCanvas, 150);
}

fullscreenBtn.addEventListener('click', toggleFullscreen);

// 네이티브 전체화면 상태 감지 및 버튼 레이블 업데이트
document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
        fullscreenBtn.innerHTML = '<span class="icon">🖥️</span> 원래대로';
    } else {
        fullscreenBtn.innerHTML = '<span class="icon">🖥️</span> 전체화면';
    }
    setTimeout(resizeCanvas, 150);
});

// 15. 모바일/태블릿 핀치 줌 및 더블 탭 확대 강제 방지 로직
document.addEventListener('touchmove', (e) => {
    // 두 손가락 이상 핀치 제스처 방지
    if (e.touches.length > 1 || (e.scale !== undefined && e.scale !== 1)) {
        e.preventDefault();
    }
}, { passive: false });

let lastTouchTime = 0;
document.addEventListener('touchstart', (e) => {
    // 핀치 줌 제스처 차단
    if (e.touches.length > 1) {
        e.preventDefault();
        return;
    }
    
    // 더블 탭 확대 방지 (더블 클릭 간격이 300ms 이내일 때 버튼/링크가 아닌 곳은 줌 이벤트 차단)
    const now = Date.now();
    if (now - lastTouchTime <= 300) {
        if (!e.target.closest('button') && !e.target.closest('a') && !e.target.closest('.num-btn')) {
            e.preventDefault();
        }
    }
    lastTouchTime = now;
}, { passive: false });

// 최초 캔버스 사이즈 설정 및 렌더링 엔진 가동
resizeCanvas();
requestAnimationFrame(animate);
