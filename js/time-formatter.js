// 시간 입력 자동 포맷팅
// "1400" → "14:00", "930" → "09:30"

function formatTimeInput(input) {
    if (!input || !input.value) return;
    
    let value = input.value.replace(/[^0-9:]/g, ''); // 숫자와 콜론만 추출
    
    // 이미 올바른 형식이면 그대로 유지
    if (/^\d{2}:\d{2}$/.test(value)) {
        return;
    }
    
    // 콜론 제거
    value = value.replace(/:/g, '');
    
    if (value.length === 0) {
        input.value = '';
        return;
    }
    
    let hours = '';
    let minutes = '';
    
    // 3자리 또는 4자리 숫자 처리
    if (value.length === 3) {
        // 930 → 09:30
        hours = value.substring(0, 1).padStart(2, '0');
        minutes = value.substring(1, 3);
    } else if (value.length === 4) {
        // 1400 → 14:00
        hours = value.substring(0, 2);
        minutes = value.substring(2, 4);
    } else if (value.length === 2) {
        // 14 → 14:00 (시간만 입력한 경우)
        hours = value;
        minutes = '00';
    } else if (value.length === 1) {
        // 9 → 09:00
        hours = value.padStart(2, '0');
        minutes = '00';
    } else if (value.length > 4) {
        // 5자리 이상이면 처음 4자리만 사용
        hours = value.substring(0, 2);
        minutes = value.substring(2, 4);
    }
    
    // 유효성 검사
    let h = parseInt(hours);
    let m = parseInt(minutes);
    
    if (isNaN(h)) h = 0;
    if (isNaN(m)) m = 0;
    
    if (h > 23) h = 23;
    if (m > 59) m = 59;
    
    hours = String(h).padStart(2, '0');
    minutes = String(m).padStart(2, '0');
    
    input.value = `${hours}:${minutes}`;
    
    // change 이벤트 트리거
    try {
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);
    } catch (e) {
        // 이벤트 생성 실패 시 무시
    }
}

// 모든 time input에 이벤트 리스너 추가
function initTimeFormatters() {
    try {
        // blur 이벤트로 포맷팅 (입력 완료 시)
        document.addEventListener('blur', function(e) {
            if (e.target && (e.target.type === 'time' || e.target.classList.contains('time-input'))) {
                formatTimeInput(e.target);
            }
        }, true);
        
        // Enter 키 누르면 포맷팅
        document.addEventListener('keydown', function(e) {
            if (e.target && (e.target.type === 'time' || e.target.classList.contains('time-input')) && e.key === 'Enter') {
                formatTimeInput(e.target);
                e.target.blur();
            }
        }, true);
    } catch (error) {
        console.error('[TimeFormatter] 초기화 오류:', error);
    }
}

// DOM이 로드되면 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTimeFormatters);
} else {
    initTimeFormatters();
}

