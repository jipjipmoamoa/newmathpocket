// 메인 애플리케이션 초기화

// 페이지 로드시 초기화
document.addEventListener('DOMContentLoaded', () => {
    console.log('매쓰포켓 학원 관리 시스템 초기화');
    
    // 인증 상태 확인
    updateUIBasedOnAuth();
    
    // 선생님 색상 초기화
    initializeTeacherColors();
    
    // 출석체크 페이지 표시 (홈 화면)
    // attendance.js 로드를 기다리기 위해 약간 지연
    setTimeout(() => {
        if (typeof showAttendanceCheckPage === 'function') {
            showPage('attendance-check');
        } else {
            console.error('showAttendanceCheckPage is not loaded yet');
        }
    }, 100);
    
    // 전역 에러 핸들러
    window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
    });
    
    // 전역 Promise rejection 핸들러
    window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled promise rejection:', event.reason);
    });
});

// 페이지 새로고침시 로그인 상태 유지
window.addEventListener('load', () => {
    updateUIBasedOnAuth();
});

// CSS 스타일 추가 (동적)
const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    .btn-sm {
        font-size: 0.85rem;
    }
    
    .text-center {
        text-align: center;
    }
    
    .attendance-status-select {
        padding: 0.5rem;
        border: 1px solid var(--border-color);
        border-radius: 4px;
        font-size: 0.9rem;
    }
    
    .attendance-status-select:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }
`;
document.head.appendChild(additionalStyles);

// 유틸리티: 로그인 필요 확인
function requireLogin() {
    if (!Auth.isLoggedIn()) {
        Utils.showAlert('로그인이 필요합니다', 'warning');
        return false;
    }
    return true;
}

// 콘솔 환영 메시지
console.log('%c매쓰포켓 학원 관리 시스템', 'color: #FF6B35; font-size: 24px; font-weight: bold;');
console.log('%c버전 1.0.0', 'color: #7F8C8D; font-size: 12px;');
console.log('%c기본 관리자 계정 - 아이디: admin, 비밀번호: admin123', 'color: #3498DB; font-size: 14px;');
