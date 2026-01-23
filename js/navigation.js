// 네비게이션 관리
const Navigation = {
    currentMenu: null,
    currentSubMenu: null,
    
    subMenus: {
        members: [
            { id: 'students', label: '학생 관리' },
            { id: 'teachers', label: '선생님 관리' },
            { id: 'all-members', label: '전체 회원 관리' }
        ],
        attendance: [
            { id: 'attendance-check', label: '출석 체크' },
            { id: 'attendance-view', label: '출석 조회' }
        ],
        tuition: [
            { id: 'tuition-student', label: '학생별 원비 관리' },
            { id: 'tuition-monthly', label: '월별 원비 관리' }
        ],
        schedule: [
            { id: 'schedule-current', label: '이번달 스케줄표' }
        ],
        prints: [
            { id: 'print-distribute', label: '프린트물' },
            { id: 'print-list', label: '프린트 목록' }
        ]
    },
    
    // 권한별 접근 가능한 메뉴
    getAccessibleMenus: function() {
        if (!Auth.isLoggedIn()) {
            return [];
        }
        
        const role = Auth.getRole();
        
        if (role === 'admin') {
            // 관리자만 모든 메뉴 접근 가능
            return ['members', 'attendance', 'tuition', 'schedule', 'curriculum', 'prints', 'settings'];
        } else if (role === 'subadmin') {
            // 부관리자는 프린트 제외
            return ['members', 'attendance', 'tuition', 'schedule', 'curriculum', 'settings'];
        } else if (role === 'teacher') {
            // 선생님은 제한된 메뉴만 접근 가능
            return ['members', 'attendance', 'schedule', 'curriculum'];
        }
        
        return [];
    },
    
    // 권한별 접근 가능한 서브메뉴
    getAccessibleSubMenus: function(menuId) {
        if (!Auth.isLoggedIn()) {
            return [];
        }
        
        const role = Auth.getRole();
        
        if (role === 'admin') {
            // 관리자만 모든 서브메뉴 접근 가능
            return this.subMenus[menuId] || [];
        } else if (role === 'subadmin') {
            // 부관리자는 프린트 제외하고 모든 서브메뉴 접근 가능
            if (menuId === 'prints') {
                return [];
            }
            return this.subMenus[menuId] || [];
        } else if (role === 'teacher') {
            // 선생님은 제한된 서브메뉴만 접근 가능
            if (menuId === 'members') {
                return [
                    { id: 'students', label: '학생 관리' },
                    { id: 'all-members', label: '전체 회원 관리' }
                ];
            } else if (menuId === 'attendance') {
                return [
                    { id: 'attendance-check', label: '출석 체크' },
                    { id: 'attendance-view', label: '출석 조회' }
                ];
            } else if (menuId === 'schedule') {
                return [
                    { id: 'schedule-current', label: '이번달 스케줄표' }
                ];
            }
        }
        
        return [];
    }
};

// 서브메뉴 토글
function toggleSubMenu(event, menuId) {
    event.preventDefault();
    
    // 권한 체크
    const accessibleMenus = Navigation.getAccessibleMenus();
    if (!accessibleMenus.includes(menuId)) {
        alert('접근 권한이 없습니다.');
        return;
    }
    
    const subMenuContainer = document.getElementById('subMenuContainer');
    const subMenu = document.getElementById('subMenu');
    
    // 서브메뉴가 있는 경우
    const accessibleSubMenus = Navigation.getAccessibleSubMenus(menuId);
    
    // 스케줄 메뉴는 서브메뉴가 1개이므로 바로 페이지로 이동
    if (menuId === 'schedule' && accessibleSubMenus.length === 1) {
        subMenuContainer.style.display = 'none';
        Navigation.currentMenu = menuId;
        const menuItem = document.querySelector(`[data-menu="${menuId}"]`);
        removeActiveClass();
        if (menuItem) menuItem.classList.add('active');
        showPage(accessibleSubMenus[0].id);
        return;
    }
    
    if (accessibleSubMenus.length > 0) {
        Navigation.currentMenu = menuId;
        
        // 클릭된 메뉴의 위치 계산
        const menuItem = document.querySelector(`[data-menu="${menuId}"]`);
        const menuRect = menuItem.getBoundingClientRect();
        const mainMenu = document.getElementById('mainMenu');
        const mainMenuRect = mainMenu.getBoundingClientRect();
        
        // 메뉴 아이템의 왼쪽 오프셋 계산
        const leftOffset = menuRect.left - mainMenuRect.left;
        
        // 서브메뉴 생성 (권한에 따라 필터링)
        subMenu.innerHTML = accessibleSubMenus.map(item => `
            <li class="${Navigation.currentSubMenu === item.id ? 'active' : ''}">
                <a href="#" onclick="showPage('${item.id}'); return false;">${item.label}</a>
            </li>
        `).join('');
        
        // 서브메뉴를 해당 메뉴 아래에 정렬
        subMenu.style.paddingLeft = `${leftOffset}px`;
        
        subMenuContainer.style.display = 'block';
        
        // 활성 메뉴 표시
        removeActiveClass();
        if (menuItem) menuItem.classList.add('active');
        
        // 첫 번째 중카테고리 페이지를 자동으로 표시
        if (Navigation.subMenus[menuId].length > 0) {
            const firstSubMenu = Navigation.subMenus[menuId][0];
            showPage(firstSubMenu.id);
        }
    } else {
        subMenuContainer.style.display = 'none';
        Navigation.currentMenu = null;
    }
}

// 활성 클래스 제거
function removeActiveClass() {
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
    });
}

// 페이지 표시
function showPage(pageId) {
    Navigation.currentSubMenu = pageId;
    
    // 권한 체크
    if (!Permissions.canAccessPage(pageId)) {
        alert('접근 권한이 없습니다.');
        return;
    }
    
    // 스케줄 인쇄 CSS 제거 (스케줄 페이지가 아닐 때)
    if (pageId !== 'schedule-current') {
        const schedulePrintCSS = document.getElementById('schedulePrintCSS');
        if (schedulePrintCSS) {
            schedulePrintCSS.remove();
        }
    }
    
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = '<div class="page-container"><div class="loading"></div></div>';
    
    // 출석체크 페이지인 경우 서브메뉴 자동 표시
    if (pageId === 'attendance-check' || pageId === 'attendance-view') {
        Navigation.currentMenu = 'attendance';
        
        const subMenuContainer = document.getElementById('subMenuContainer');
        const subMenu = document.getElementById('subMenu');
        const menuItem = document.querySelector(`[data-menu="attendance"]`);
        
        if (menuItem && Navigation.subMenus.attendance) {
            const menuRect = menuItem.getBoundingClientRect();
            const mainMenu = document.getElementById('mainMenu');
            const mainMenuRect = mainMenu.getBoundingClientRect();
            const leftOffset = menuRect.left - mainMenuRect.left;
            
            // 서브메뉴 생성
            subMenu.innerHTML = Navigation.subMenus.attendance.map(item => `
                <li class="${item.id === pageId ? 'active' : ''}">
                    <a href="#" onclick="showPage('${item.id}'); return false;">${item.label}</a>
                </li>
            `).join('');
            
            subMenu.style.paddingLeft = `${leftOffset}px`;
            subMenuContainer.style.display = 'block';
            
            // 활성 메뉴 표시
            removeActiveClass();
            menuItem.classList.add('active');
        }
    }
    // 중카테고리가 없는 페이지인 경우 서브메뉴 닫기
    else if (pageId === 'curriculum' || pageId === 'settings') {
        const subMenuContainer = document.getElementById('subMenuContainer');
        subMenuContainer.style.display = 'none';
        Navigation.currentMenu = null;
        
        // 모든 메뉴의 active 클래스 제거
        removeActiveClass();
        
        // 현재 페이지의 메뉴에 active 클래스 추가
        const currentMenuItem = document.querySelector(`[data-menu="${pageId}"]`);
        if (currentMenuItem) {
            currentMenuItem.classList.add('active');
        }
    } else {
        // 서브메뉴 활성화
        document.querySelectorAll('.sub-menu li').forEach(item => {
            item.classList.remove('active');
        });
        const activeSubMenu = document.querySelector(`.sub-menu a[onclick*="${pageId}"]`);
        if (activeSubMenu) {
            activeSubMenu.parentElement.classList.add('active');
        }
    }
    
    // 페이지별 라우팅
    switch(pageId) {
        case 'students':
            showStudentsPage();
            break;
        case 'teachers':
            // 선생님은 선생님 관리 페이지 접근 불가
            if (Auth.getRole() === 'teacher') {
                alert('접근 권한이 없습니다.');
                showPage('students');
                return;
            }
            showTeachersPage();
            break;
        case 'all-members':
            showAllMembersPage();
            break;
        case 'attendance-check':
            if (typeof showAttendanceCheckPage === 'function') {
                showAttendanceCheckPage();
            } else {
                console.error('showAttendanceCheckPage is not defined');
                mainContent.innerHTML = '<div style="padding: 2rem; text-align: center;"><h2>출석체크 페이지를 불러오는 중...</h2><p>잠시 후 다시 시도해주세요.</p></div>';
            }
            break;
        case 'attendance-view':
            if (typeof showAttendanceViewPage === 'function') {
                showAttendanceViewPage();
            } else {
                console.error('showAttendanceViewPage is not defined');
                mainContent.innerHTML = '<div style="padding: 2rem; text-align: center;"><h2>출석조회 페이지를 불러오는 중...</h2><p>잠시 후 다시 시도해주세요.</p></div>';
            }
            break;
        case 'tuition-student':
            showTuitionStudentPage();
            break;
        case 'tuition-monthly':
            showTuitionMonthlyPage();
            break;
        case 'schedule-current':
            showScheduleCurrentPage();
            break;
        case 'schedule-view':
            showScheduleViewPage();
            break;
        case 'curriculum':
            showCurriculumPage();
            break;
        case 'print-distribute':
            if (typeof showPrintDistributePage === 'function') {
                showPrintDistributePage();
            } else {
                console.error('showPrintDistributePage is not defined');
                mainContent.innerHTML = '<div style="padding: 2rem; text-align: center;"><h2>프린트물 페이지를 불러오는 중...</h2><p>잠시 후 다시 시도해주세요.</p></div>';
            }
            break;
        case 'print-list':
            if (typeof showPrintListPage === 'function') {
                showPrintListPage();
            } else {
                console.error('showPrintListPage is not defined');
                mainContent.innerHTML = '<div style="padding: 2rem; text-align: center;"><h2>프린트 목록 페이지를 불러오는 중...</h2><p>잠시 후 다시 시도해주세요.</p></div>';
            }
            break;
        case 'settings':
            showSettingsPage();
            break;
        case 'welcome':
        default:
            showWelcomePage();
            break;
    }
    
    // 버튼 상태 업데이트
    setTimeout(updateButtonStates, 100);
}

// 웰컴 페이지
function showWelcomePage() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="welcome-section">
            <h1>매쓰포켓 학원 관리 시스템</h1>
            <p>학원 운영을 위한 통합 관리 시스템입니다.</p>
            <div class="feature-cards">
                <div class="feature-card">
                    <i class="fas fa-users"></i>
                    <h3>회원 관리</h3>
                    <p>학생과 선생님 정보를 체계적으로 관리하세요</p>
                </div>
                <div class="feature-card">
                    <i class="fas fa-calendar-check"></i>
                    <h3>출석 관리</h3>
                    <p>일일 출석 체크와 출결 현황을 한눈에</p>
                </div>
                <div class="feature-card">
                    <i class="fas fa-won-sign"></i>
                    <h3>원비 관리</h3>
                    <p>학생별/월별 원비 납부 현황 관리</p>
                </div>
                <div class="feature-card">
                    <i class="fas fa-calendar-alt"></i>
                    <h3>스케줄 관리</h3>
                    <p>월간 수업 일정과 이벤트 계획</p>
                </div>
            </div>
        </div>
    `;
}

// 초기화
document.addEventListener('DOMContentLoaded', () => {
    showWelcomePage();
});
