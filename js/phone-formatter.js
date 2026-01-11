// 연락처 자동 포맷팅
// "01012345678" → "010-1234-5678"

function formatPhoneInput(input) {
    if (!input || !input.value) return;
    
    // 숫자만 추출
    let value = input.value.replace(/[^0-9]/g, '');
    
    // 이미 올바른 형식이면 그대로 유지
    if (/^\d{3}-\d{3,4}-\d{4}$/.test(input.value)) {
        return;
    }
    
    if (value.length === 0) {
        input.value = '';
        return;
    }
    
    let formatted = '';
    
    // 010, 011, 016, 017, 018, 019 형태 (11자리)
    if (value.length === 11) {
        // 010-1234-5678
        formatted = value.substring(0, 3) + '-' + value.substring(3, 7) + '-' + value.substring(7, 11);
    }
    // 02 서울 지역번호 (10자리)
    else if (value.length === 10 && value.startsWith('02')) {
        // 02-1234-5678
        formatted = value.substring(0, 2) + '-' + value.substring(2, 6) + '-' + value.substring(6, 10);
    }
    // 지역번호 (10자리)
    else if (value.length === 10) {
        // 031-123-4567
        formatted = value.substring(0, 3) + '-' + value.substring(3, 6) + '-' + value.substring(6, 10);
    }
    // 9자리 (지역번호 + 7자리)
    else if (value.length === 9) {
        // 02-123-4567
        formatted = value.substring(0, 2) + '-' + value.substring(2, 5) + '-' + value.substring(5, 9);
    }
    // 그 외의 경우 (입력 중이거나 불완전한 번호)
    else if (value.length > 11) {
        // 11자리까지만 사용
        value = value.substring(0, 11);
        formatted = value.substring(0, 3) + '-' + value.substring(3, 7) + '-' + value.substring(7, 11);
    }
    else if (value.length > 7) {
        // 입력 중 - 8자리 이상
        if (value.startsWith('02')) {
            formatted = value.substring(0, 2) + '-' + value.substring(2, 6) + '-' + value.substring(6);
        } else {
            formatted = value.substring(0, 3) + '-' + value.substring(3, 7) + '-' + value.substring(7);
        }
    }
    else if (value.length > 3) {
        // 입력 중 - 4~7자리
        if (value.startsWith('02')) {
            formatted = value.substring(0, 2) + '-' + value.substring(2);
        } else {
            formatted = value.substring(0, 3) + '-' + value.substring(3);
        }
    }
    else {
        // 3자리 이하는 그대로
        formatted = value;
    }
    
    input.value = formatted;
    
    // change 이벤트 트리거
    try {
        const event = new Event('change', { bubbles: true });
        input.dispatchEvent(event);
    } catch (e) {
        // 이벤트 생성 실패 시 무시
    }
}

// 모든 연락처 input에 이벤트 리스너 추가
function initPhoneFormatters() {
    try {
        // blur 이벤트로 포맷팅 (입력 완료 시)
        document.addEventListener('blur', function(e) {
            if (e.target && 
                (e.target.type === 'tel' || 
                 e.target.classList.contains('phone-input') ||
                 e.target.id.includes('Phone') ||
                 e.target.id.includes('phone'))) {
                formatPhoneInput(e.target);
            }
        }, true);
        
        // Enter 키 누르면 포맷팅
        document.addEventListener('keydown', function(e) {
            if (e.target && 
                (e.target.type === 'tel' || 
                 e.target.classList.contains('phone-input') ||
                 e.target.id.includes('Phone') ||
                 e.target.id.includes('phone')) && 
                e.key === 'Enter') {
                formatPhoneInput(e.target);
                e.target.blur();
            }
        }, true);
    } catch (error) {
        console.error('[PhoneFormatter] 초기화 오류:', error);
    }
}

// DOM이 로드되면 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPhoneFormatters);
} else {
    initPhoneFormatters();
}
