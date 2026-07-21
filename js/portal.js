// 포탈 화면 인터랙션 및 카드 이벤트 관리

document.addEventListener('DOMContentLoaded', () => {
    initPortalEvents();
});

let toastTimer = null;

/**
 * 포탈 화면 전용 커스텀 토스트 알림
 * @param {string} message - 표시할 안내 문구
 */
function showPortalToast(message) {
    const toast = document.getElementById('portalToast');
    if (!toast) return;
    
    toast.textContent = message;
    toast.classList.add('show');
    
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 2500);
}

/**
 * 포탈 카드 클릭 및 터치 이벤트 바인딩
 */
function initPortalEvents() {
    const cards = document.querySelectorAll('.portal-card');
    
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const gameType = card.getAttribute('data-game');
            const gameTitle = card.getAttribute('data-title') || '놀이';
            
            if (gameType === 'number') {
                // 1. 숫자 놀이 카드 선택 시
                if (window.showView) {
                    window.showView('number-game');
                }
                if (window.speak) {
                    window.speak("숫자 놀이를 시작해요!");
                }
            } else if (gameType === 'town') {
                // 2. 3D 마을 운전 놀이 카드 선택 시
                if (window.showView) {
                    window.showView('town-game');
                }
                if (window.speak) {
                    window.speak("마을 운전 놀이를 시작해요!");
                }
            } else if (gameType === 'color') {
                // 3. 색칠 놀이 카드 선택 시
                if (window.showView) {
                    window.showView('coloring-game');
                }
                if (window.speak) {
                    window.speak("색칠 놀이를 시작해요!");
                }
            } else {
                // 3. 잠긴 카드 선택 시 (색깔, 한글 등)
                // 흔들림 애니메이션 적용
                card.classList.remove('anim-shake');
                // DOM reflow 강제 발생으로 애니메이션 리셋
                void card.offsetWidth;
                card.classList.add('anim-shake');
                
                setTimeout(() => {
                    card.classList.remove('anim-shake');
                }, 500);
                
                const lockMsg = `${gameTitle}는 곧 준비될 거예요!`;
                showPortalToast(`🔒 ${lockMsg}`);
                
                if (window.speak) {
                    window.speak(lockMsg);
                }
            }
        });
    });
}
