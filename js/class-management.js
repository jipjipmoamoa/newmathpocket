// 수업 관리 페이지
window.showClassManagementPage = function() {
    const mainContent = document.getElementById('mainContent');
    
    mainContent.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <h2><i class="fas fa-chalkboard-teacher"></i> 수업 관리</h2>
            </div>
            
            <div class="welcome-section">
                <p style="font-size: 1.1rem; color: #666; margin-bottom: 2rem;">수업과 관련된 모든 기능을 관리하는 페이지입니다.</p>
                
                <div class="feature-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem;">
                    <div class="feature-card" onclick="showPage('schedule-weekly')" style="cursor: pointer; transition: transform 0.2s;">
                        <i class="fas fa-calendar-week" style="font-size: 3rem; color: #FF6B35; margin-bottom: 1rem;"></i>
                        <h3>주간 스케줄표</h3>
                        <p>이번 주의 수업 스케줄을 한눈에 확인하세요</p>
                    </div>
                    
                    <div class="feature-card" onclick="showPage('schedule-monthly')" style="cursor: pointer; transition: transform 0.2s;">
                        <i class="fas fa-calendar-alt" style="font-size: 3rem; color: #FF6B35; margin-bottom: 1rem;"></i>
                        <h3>월간 스케줄표</h3>
                        <p>월간 수업 일정과 빈 자리를 확인하세요</p>
                    </div>
                    
                    <div class="feature-card" onclick="showPage('attendance-check')" style="cursor: pointer; transition: transform 0.2s;">
                        <i class="fas fa-user-check" style="font-size: 3rem; color: #4CAF50; margin-bottom: 1rem;"></i>
                        <h3>출석 체크</h3>
                        <p>학생들의 출석을 체크하고 관리하세요</p>
                    </div>
                    
                    <div class="feature-card" onclick="showPage('attendance-view')" style="cursor: pointer; transition: transform 0.2s;">
                        <i class="fas fa-list-check" style="font-size: 3rem; color: #4CAF50; margin-bottom: 1rem;"></i>
                        <h3>출석 조회</h3>
                        <p>출석 현황과 통계를 조회하세요</p>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // 카드 호버 효과
    const cards = document.querySelectorAll('.feature-card[onclick]');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-5px)';
            this.style.boxShadow = '0 8px 16px rgba(0,0,0,0.1)';
        });
        card.addEventListener('mouseleave', function() {
            this.style.transform = 'translateY(0)';
            this.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        });
    });
}
