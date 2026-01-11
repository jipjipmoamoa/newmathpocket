// 날짜 자동 포맷팅 (년월)
// "2511" → "2025.11" (점으로 구분)

function formatYearMonthInput(input) {
    if (!input || !input.value) return;
    
    // 숫자만 추출
    let value = input.value.replace(/[^0-9]/g, '');
    
    // 이미 올바른 형식이면 그대로 유지 (예: "2025.11")
    if (/^\d{4}\.\d{1,2}$/.test(input.value)) {
        return;
    }
    
    if (value.length === 0) {
        input.value = '';
        return;
    }
    
    let formatted = '';
    
    // 4자리: 2511 → 2025.11
    if (value.length === 4) {
        const year = '20' + value.substring(0, 2);
        const month = value.substring(2, 4);
        formatted = `${year}.${parseInt(month)}`;
    }
    // 6자리: 202511 → 2025.11
    else if (value.length === 6) {
        const year = value.substring(0, 4);
        const month = value.substring(4, 6);
        formatted = `${year}.${parseInt(month)}`;
    }
    // 3자리 이하나 5자리, 7자리 이상은 그대로
    else {
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

// 날짜 자동 포맷팅 (년월일)
// "251102" → "2025.11.02" (점으로 구분)
function formatYearMonthDayInput(input) {
    if (!input || !input.value) return;
    
    // 숫자만 추출
    let value = input.value.replace(/[^0-9]/g, '');
    
    // 이미 올바른 형식이면 그대로 유지
    if (/^\d{4}\.\d{1,2}(\.\d{1,2})?$/.test(input.value)) {
        return;
    }
    
    if (value.length === 0) {
        input.value = '';
        return;
    }
    
    let formatted = '';
    
    // 4자리: 2511 → 2025.11
    if (value.length === 4) {
        const year = '20' + value.substring(0, 2);
        const month = value.substring(2, 4);
        formatted = `${year}.${parseInt(month)}`;
    }
    // 6자리: 251102 → 2025.11.02
    else if (value.length === 6) {
        const year = '20' + value.substring(0, 2);
        const month = value.substring(2, 4);
        const day = value.substring(4, 6);
        formatted = `${year}.${parseInt(month)}.${parseInt(day)}`;
    }
    // 8자리: 20251102 → 2025.11.02
    else if (value.length === 8) {
        const year = value.substring(0, 4);
        const month = value.substring(4, 6);
        const day = value.substring(6, 8);
        formatted = `${year}.${parseInt(month)}.${parseInt(day)}`;
    }
    else {
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

// 모든 날짜 input에 이벤트 리스너 추가
function initDateFormatters() {
    try {
        // blur 이벤트로 포맷팅 (입력 완료 시)
        document.addEventListener('blur', function(e) {
            if (e.target && e.target.classList.contains('date-input')) {
                // 시험점수, 책, 상담 모두 년월일 형식 지원 (4자리도 지원)
                if (e.target.id && (e.target.id.includes('score-date') || 
                                    e.target.id.includes('book-date') || 
                                    e.target.id.includes('consul-date'))) {
                    formatYearMonthDayInput(e.target);
                }
                // 기타는 년월일
                else {
                    formatYearMonthDayInput(e.target);
                }
            }
        }, true);
        
        // Enter 키 누르면 포맷팅
        document.addEventListener('keydown', function(e) {
            if (e.target && e.target.classList.contains('date-input') && e.key === 'Enter') {
                if (e.target.id && (e.target.id.includes('score-date') || 
                                    e.target.id.includes('book-date') || 
                                    e.target.id.includes('consul-date'))) {
                    formatYearMonthDayInput(e.target);
                } else {
                    formatYearMonthDayInput(e.target);
                }
                e.target.blur();
            }
        }, true);
    } catch (error) {
        console.error('[DateFormatter] 초기화 오류:', error);
    }
}

// DOM이 로드되면 초기화
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDateFormatters);
} else {
    initDateFormatters();
}
