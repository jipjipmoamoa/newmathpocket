// 인증 시스템
const Auth = {
    // 로그인 상태 확인
    isLoggedIn() {
        return localStorage.getItem('isLoggedIn') === 'true';
    },
    
    // 로그인
       // 로그인
    async login(username, password) {
        try {
            // 설정에서 관리자 정보 가져오기
            const result = await API.getList('settings');
            console.log('Settings API response:', result);
            
            // Supabase는 배열을 직접 반환합니다
            let settings;
            if (Array.isArray(result)) {
                // 배열인 경우
                if (result.length === 0) {
                    throw new Error('관리자 설정을 찾을 수 없습니다');
                }
                settings = result[0];
            } else if (result.data && Array.isArray(result.data)) {
                // {data: []} 형식인 경우
                if (result.data.length === 0) {
                    throw new Error('관리자 설정을 찾을 수 없습니다');
                }
                settings = result.data[0];
            } else {
                throw new Error('관리자 설정을 찾을 수 없습니다');
            }
            
            console.log('Settings data:', settings);
            
            // 인증 확인
            if (settings.admin_username === username && settings.admin_password === password) {
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('username', username);
                return true;
            } else {
                throw new Error('아이디 또는 비밀번호가 일치하지 않습니다');
            }
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },

    
    // 로그아웃
    logout() {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
        updateUIBasedOnAuth();
        showPage('welcome');
    },
    
    // 관리자 정보 가져오기
    getUsername() {
        return localStorage.getItem('username') || '';
    }
};

// 로그인 함수
async function login() {
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (!username || !password) {
        Utils.showAlert('아이디와 비밀번호를 입력해주세요', 'warning');
        return;
    }
    
    try {
        await Auth.login(username, password);
        Utils.showAlert('로그인 성공!', 'success');
        updateUIBasedOnAuth();
        
        // 입력 필드 초기화
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
    } catch (error) {
        Utils.showAlert(error.message, 'danger');
    }
}

// 로그아웃 함수
function logout() {
    if (Utils.confirm('로그아웃 하시겠습니까?')) {
        Auth.logout();
        Utils.showAlert('로그아웃 되었습니다', 'info');
    }
}

// 인증 상태에 따라 UI 업데이트
function updateUIBasedOnAuth() {
    const isLoggedIn = Auth.isLoggedIn();
    const loginForm = document.getElementById('loginForm');
    const logoutArea = document.getElementById('logoutArea');
    
    if (isLoggedIn) {
        loginForm.style.display = 'none';
        logoutArea.style.display = 'flex';
        updateCurrentDate();  // 날짜 업데이트
    } else {
        loginForm.style.display = 'flex';
        logoutArea.style.display = 'none';
    }
    
    // 모든 수정/삭제/추가 버튼 제어
    updateButtonStates();
}

// 현재 날짜와 요일 업데이트
function updateCurrentDate() {
    const dateElement = document.getElementById('currentDate');
    if (!dateElement) return;
    
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
    const dayName = dayNames[now.getDay()];
    
    // 요일의 첫 글자 (예: "수")
    const dayChar = dayName.charAt(0);
    
    dateElement.innerHTML = `${year}년 ${month}월 <span class="highlight">${date}</span>일 (<span class="highlight">${dayChar}</span>요일)`;
}

// 버튼 상태 업데이트
function updateButtonStates() {
    const isLoggedIn = Auth.isLoggedIn();
    const buttons = document.querySelectorAll('.btn-primary, .btn-danger, .btn-add, .btn-edit, .btn-delete');
    
    buttons.forEach(button => {
        if (!isLoggedIn) {
            button.disabled = true;
            button.style.opacity = '0.5';
            button.style.cursor = 'not-allowed';
            button.title = '로그인이 필요합니다';
        } else {
            button.disabled = false;
            button.style.opacity = '1';
            button.style.cursor = 'pointer';
            button.title = '';
        }
    });
}

// Enter 키로 로그인
document.addEventListener('DOMContentLoaded', () => {
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                login();
            }
        });
    }
    
    // 초기 인증 상태 확인
    updateUIBasedOnAuth();
});
