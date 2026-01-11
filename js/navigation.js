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
            { id: 'attendance-check', label: '출석체크' },
            { id: 'attendance-view', label: '출석 조회' }
        ],
        tuition: [
            { id: 'tuition-student', label: '학생별 원비 관리' },
            { id: 'tuition-monthly', label: '월별 원비 관리' }
        ],
        schedule: [
            { id: 'schedule-current', label: '이번달 스케줄표' },
            { id: 'schedule-view', label: '스케줄표 조회' }
        ]
    }
};

// 서브메뉴 토글
function toggleSubMenu(event, menuId) {
    event.preventDefault();
    
    const subMenuContainer = document.getElementById('subMenuContainer');
    const subMenu = document.getElementById('subMenu');
    
    // 서브메뉴가 있는 경우
    if (Navigation.subMenus[menuId]) {
        Navigation.currentMenu = menuId;
        
        // 클릭된 메뉴의 위치 계산
        const menuItem = document.querySelector(`[data-menu="${menuId}"]`);
        const menuRect = menuItem.getBoundingClientRect();
        const mainMenu = document.getElementById('mainMenu');
        const mainMenuRect = mainMenu.getBoundingClientRect();
        
        // 메뉴 아이템의 왼쪽 오프셋 계산
        const leftOffset = menuRect.left - mainMenuRect.left;
        
        // 서브메뉴 생성
        subMenu.innerHTML = Navigation.subMenus[menuId].map(item => `
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
            showTeachersPage();
            break;
        case 'all-members':
            showAllMembersPage();
            break;
        case 'attendance-check':
            showAttendanceCheckPage();
            break;
        case 'attendance-view':
            showAttendanceViewPage();
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
