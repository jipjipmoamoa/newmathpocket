// 인증 시스템
const Auth = {
    // 로그인 상태 확인
    isLoggedIn() {
        return localStorage.getItem('isLoggedIn') === 'true';
    },
    
    // 사용자 역할 가져오기
    getRole() {
        return localStorage.getItem('userRole') || '';
    },
    
    // 사용자 ID 가져오기
    getUserId() {
        return localStorage.getItem('userId') || '';
    },
    
    // 관리자인지 확인
    isAdmin() {
        return this.getRole() === 'admin';
    },
    
    // 부관리자인지 확인
    isSubAdmin() {
        return this.getRole() === 'subadmin';
    },
    
    // 선생님인지 확인
    isTeacher() {
        return this.getRole() === 'teacher';
    },
    
    // 관리자 또는 부관리자인지 확인
    isAdminOrSubAdmin() {
        return this.isAdmin() || this.isSubAdmin();
    },
    
    // 로그인
    async login(username, password) {
        try {
            // 1. 먼저 관리자 계정 확인
            const settingsResult = await API.getList('settings');
            console.log('Settings API response:', settingsResult);
            
            let settings;
            if (Array.isArray(settingsResult)) {
                if (settingsResult.length > 0) {
                    settings = settingsResult[0];
                }
            } else if (settingsResult.data && Array.isArray(settingsResult.data)) {
                if (settingsResult.data.length > 0) {
                    settings = settingsResult.data[0];
                }
            }
            
            // 관리자 계정 체크
            if (settings && settings.admin_username === username && settings.admin_password === password) {
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('username', username);
                localStorage.setItem('userRole', 'admin');
                localStorage.setItem('userId', 'admin');
                return { success: true, role: 'admin' };
            }
            
            // 2. teachers 테이블에서 선생님 계정 확인
            const teachersResult = await API.getList('teachers', { limit: 1000 });
            const teachers = Array.isArray(teachersResult) ? teachersResult : (teachersResult.data || []);
            
            // 먼저 아이디/비밀번호가 일치하는 선생님을 찾음
            const matchedTeacher = teachers.find(t => 
                t.username === username && 
                t.password === password
            );
            
            if (matchedTeacher) {
                // 상태 확인
                const status = matchedTeacher.status || '재직';
                if (status === '퇴직' || status === '퇴사') {
                    throw new Error('퇴직한 계정은 로그인할 수 없습니다');
                }
                
                // 재직 중이면 로그인 허용
                const role = matchedTeacher.role || 'teacher';
                localStorage.setItem('isLoggedIn', 'true');
                localStorage.setItem('username', matchedTeacher.name);
                localStorage.setItem('userRole', role);
                localStorage.setItem('userId', matchedTeacher.id);
                return { success: true, role: role, teacherId: matchedTeacher.id };
            }
            
            // 3. 로그인 실패
            throw new Error('아이디 또는 비밀번호가 일치하지 않습니다');
            
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    },
    
    // 로그아웃
    logout() {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('username');
        localStorage.removeItem('userRole');
        localStorage.removeItem('userId');
        updateUIBasedOnAuth();
        showPage('welcome');
    },
    
    // 사용자 이름 가져오기
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
        const result = await Auth.login(username, password);
        
        let roleText = '관리자';
        if (result.role === 'subadmin') roleText = '부관리자';
        else if (result.role === 'teacher') roleText = '선생님';
        
        Utils.showAlert(`${roleText}로 로그인 성공!`, 'success');
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
        
        // 설정 메뉴 표시/숨김 (관리자만 보기)
        updateSettingsMenuVisibility();
    } else {
        loginForm.style.display = 'flex';
        logoutArea.style.display = 'none';
    }
    
    // 모든 수정/삭제/추가 버튼 제어
    updateButtonStates();
}

// 설정 메뉴 표시/숨김 (관리자만 접근 가능)
function updateSettingsMenuVisibility() {
    const settingsMenuItem = document.querySelector('[data-menu="settings"]');
    if (settingsMenuItem) {
        if (Auth.isAdmin()) {
            settingsMenuItem.style.display = 'block';
        } else {
            settingsMenuItem.style.display = 'none';
        }
    }
    
    // 원비관리 메뉴 표시/숨김 (선생님은 접근 불가)
    const tuitionMenuItem = document.querySelector('[data-menu="tuition"]');
    if (tuitionMenuItem) {
        if (Auth.getRole() === 'teacher') {
            tuitionMenuItem.style.display = 'none';
        } else {
            tuitionMenuItem.style.display = 'block';
        }
    }
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
