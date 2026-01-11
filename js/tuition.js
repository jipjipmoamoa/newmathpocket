// 원비 관리 모듈

// 학생별 원비 관리 페이지
async function showTuitionStudentPage() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="page-container">
            <div class="page-header">
                <button class="btn btn-primary" onclick="openTuitionModal()">
                    <i class="fas fa-plus"></i> 원비 등록
                </button>
            </div>
            
            <div class="search-filter-bar">
                <div class="search-box">
                    <input type="text" id="tuitionSearch" placeholder="학생 이름으로 검색..." onkeyup="searchTuition()">
                    <i class="fas fa-search"></i>
                </div>
                <select id="tuitionPaidFilter" onchange="filterTuition()">
                    <option value="">전체</option>
                    <option value="paid">납부완료</option>
                    <option value="unpaid">미납</option>
                </select>
                <select id="tuitionYearFilter" onchange="filterTuition()">
                    <option value="">전체 연도</option>
                </select>
                <select id="tuitionMonthFilter" onchange="filterTuition()">
                    <option value="">전체 월</option>
                    <option value="1">1월</option>
                    <option value="2">2월</option>
                    <option value="3">3월</option>
                    <option value="4">4월</option>
                    <option value="5">5월</option>
                    <option value="6">6월</option>
                    <option value="7">7월</option>
                    <option value="8">8월</option>
                    <option value="9">9월</option>
                    <option value="10">10월</option>
                    <option value="11">11월</option>
                    <option value="12">12월</option>
                </select>
            </div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>학생명</th>
                            <th>학년</th>
                            <th>연도</th>
                            <th>월</th>
                            <th>금액</th>
                            <th>납부상태</th>
                            <th>납부일</th>
                            <th>관리</th>
                        </tr>
                    </thead>
                    <tbody id="tuitionTableBody">
                        <tr><td colspan="8" class="text-center">로딩 중...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
        
        <!-- 원비 등록/수정 모달 -->
        <div class="modal" id="tuitionModal">
            <div class="modal-content">
                <div class="modal-header">
                    <h3 id="tuitionModalTitle">원비 등록</h3>
                    <button class="modal-close" onclick="closeTuitionModal()">&times;</button>
                </div>
                <div class="modal-body">
                    <form id="tuitionForm" onsubmit="saveTuition(event)">
                        <input type="hidden" id="tuitionId">
                        <div class="form-group">
                            <label>학생 선택 *</label>
                            <select id="tuitionStudentId" required onchange="updateStudentInfo()">
                                <option value="">학생을 선택하세요</option>
                            </select>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>연도 *</label>
                                <input type="number" id="tuitionYear" min="2020" max="2100" required>
                            </div>
                            <div class="form-group">
                                <label>월 *</label>
                                <select id="tuitionMonth" required>
                                    <option value="">선택</option>
                                    ${[...Array(12)].map((_, i) => `<option value="${i+1}">${i+1}월</option>`).join('')}
                                </select>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>금액 *</label>
                            <input type="number" id="tuitionAmount" min="0" step="1000" placeholder="예: 200000" required>
                        </div>
                        <div class="form-group">
                            <label>납부 여부</label>
                            <select id="tuitionPaid" onchange="togglePaidDate()">
                                <option value="false">미납</option>
                                <option value="true">납부완료</option>
                            </select>
                        </div>
                        <div class="form-group" id="tuitionPaidDateGroup" style="display: none;">
                            <label>납부일</label>
                            <input type="date" id="tuitionPaidDate">
                        </div>
                        <div class="form-group">
                            <label>메모</label>
                            <textarea id="tuitionMemo" placeholder="메모를 입력하세요"></textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" onclick="closeTuitionModal()">취소</button>
                    <button class="btn btn-primary" onclick="document.getElementById('tuitionForm').requestSubmit()">저장</button>
                </div>
            </div>
        </div>
    `;
    
    loadTuition();
    initializeTuitionYearFilter();
    updateButtonStates();
}

// 원비 데이터 로드
let allTuition = [];

async function loadTuition() {
    try {
        const result = await API.getList('tuition', { limit: 1000 });
        allTuition = result.data || [];
        renderTuition(allTuition);
    } catch (error) {
        document.getElementById('tuitionTableBody').innerHTML = 
            '<tr><td colspan="8" class="text-center">데이터를 불러오는데 실패했습니다</td></tr>';
    }
}

// 원비 목록 렌더링
function renderTuition(tuitions) {
    const tbody = document.getElementById('tuitionTableBody');
    
    if (!tuitions || tuitions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center">등록된 원비 기록이 없습니다</td></tr>';
        return;
    }
    
    tbody.innerHTML = tuitions.map(t => `
        <tr>
            <td>${t.student_name}</td>
            <td>${getStudentGrade(t.student_id)}</td>
            <td>${t.year}년</td>
            <td>${t.month}월</td>
            <td>${Utils.formatMoney(t.amount)}</td>
            <td><span class="badge badge-${t.paid ? 'success' : 'danger'}">${t.paid ? '납부완료' : '미납'}</span></td>
            <td>${t.paid && t.paid_date ? Utils.formatDate(t.paid_date) : '-'}</td>
            <td>
                <button class="btn btn-primary btn-sm" onclick="editTuition('${t.id}')" style="padding: 0.4rem 0.8rem; margin-right: 0.5rem;">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-danger btn-sm" onclick="deleteTuition('${t.id}')" style="padding: 0.4rem 0.8rem;">
                    <i class="fas fa-trash"></i>
                </button>
            </td>
        </tr>
    `).join('');
    
    updateButtonStates();
}

// 원비 검색
function searchTuition() {
    const searchTerm = document.getElementById('tuitionSearch').value.toLowerCase();
    const paidFilter = document.getElementById('tuitionPaidFilter').value;
    const yearFilter = document.getElementById('tuitionYearFilter').value;
    const monthFilter = document.getElementById('tuitionMonthFilter').value;
    
    let filtered = allTuition;
    
    if (searchTerm) {
        filtered = filtered.filter(t => 
            t.student_name.toLowerCase().includes(searchTerm)
        );
    }
    
    if (paidFilter) {
        const isPaid = paidFilter === 'paid';
        filtered = filtered.filter(t => t.paid === isPaid);
    }
    
    if (yearFilter) {
        filtered = filtered.filter(t => t.year === parseInt(yearFilter));
    }
    
    if (monthFilter) {
        filtered = filtered.filter(t => t.month === parseInt(monthFilter));
    }
    
    renderTuition(filtered);
}

// 원비 필터
function filterTuition() {
    searchTuition();
}

// 연도 필터 초기화
function initializeTuitionYearFilter() {
    const currentYear = new Date().getFullYear();
    const yearFilter = document.getElementById('tuitionYearFilter');
    if (yearFilter) {
        const years = [];
        for (let i = currentYear - 2; i <= currentYear + 1; i++) {
            years.push(i);
        }
        yearFilter.innerHTML = '<option value="">전체 연도</option>' + 
            years.map(y => `<option value="${y}">${y}년</option>`).join('');
    }
}

// 원비 모달 열기
async function openTuitionModal(tuitionId = null) {
    if (!Auth.isLoggedIn()) {
        Utils.showAlert('로그인이 필요합니다', 'warning');
        return;
    }
    
    const modal = document.getElementById('tuitionModal');
    const title = document.getElementById('tuitionModalTitle');
    
    // 학생 목록 로드
    try {
        const result = await API.getList('students', { limit: 1000 });
        const students = (result.data || []).filter(s => s.status === '재학중');
        
        const select = document.getElementById('tuitionStudentId');
        select.innerHTML = '<option value="">학생을 선택하세요</option>' + 
            students.map(s => `<option value="${s.id}" data-name="${s.name}">${s.name} (${s.grade})</option>`).join('');
    } catch (error) {
        console.error('Failed to load students');
    }
    
    if (tuitionId) {
        title.textContent = '원비 수정';
        const tuition = allTuition.find(t => t.id === tuitionId);
        if (tuition) {
            document.getElementById('tuitionId').value = tuition.id;
            document.getElementById('tuitionStudentId').value = tuition.student_id;
            document.getElementById('tuitionYear').value = tuition.year;
            document.getElementById('tuitionMonth').value = tuition.month;
            document.getElementById('tuitionAmount').value = tuition.amount;
            document.getElementById('tuitionPaid').value = tuition.paid.toString();
            document.getElementById('tuitionPaidDate').value = tuition.paid_date ? Utils.formatDate(tuition.paid_date) : '';
            document.getElementById('tuitionMemo').value = tuition.memo || '';
            togglePaidDate();
        }
    } else {
        title.textContent = '원비 등록';
        document.getElementById('tuitionForm').reset();
        document.getElementById('tuitionId').value = '';
        const now = new Date();
        document.getElementById('tuitionYear').value = now.getFullYear();
        document.getElementById('tuitionMonth').value = now.getMonth() + 1;
        document.getElementById('tuitionPaid').value = 'false';
        togglePaidDate();
    }
    
    modal.classList.add('active');
}

// 원비 모달 닫기
function closeTuitionModal() {
    document.getElementById('tuitionModal').classList.remove('active');
    document.getElementById('tuitionForm').reset();
}

// 납부일 필드 토글
function togglePaidDate() {
    const paid = document.getElementById('tuitionPaid').value === 'true';
    const paidDateGroup = document.getElementById('tuitionPaidDateGroup');
    
    if (paid) {
        paidDateGroup.style.display = 'block';
        if (!document.getElementById('tuitionPaidDate').value) {
            document.getElementById('tuitionPaidDate').value = Utils.today();
        }
    } else {
        paidDateGroup.style.display = 'none';
    }
}

// 학생 정보 업데이트
function updateStudentInfo() {
    // 추가 기능 필요시 구현
}

// 원비 편집
function editTuition(tuitionId) {
    openTuitionModal(tuitionId);
}

// 원비 저장
async function saveTuition(event) {
    event.preventDefault();
    
    if (!Auth.isLoggedIn()) {
        Utils.showAlert('로그인이 필요합니다', 'warning');
        return;
    }
    
    const id = document.getElementById('tuitionId').value;
    const studentId = document.getElementById('tuitionStudentId').value;
    const studentSelect = document.getElementById('tuitionStudentId');
    const studentName = studentSelect.options[studentSelect.selectedIndex].getAttribute('data-name');
    const paid = document.getElementById('tuitionPaid').value === 'true';
    
    const data = {
        student_id: studentId,
        student_name: studentName,
        year: parseInt(document.getElementById('tuitionYear').value),
        month: parseInt(document.getElementById('tuitionMonth').value),
        amount: parseInt(document.getElementById('tuitionAmount').value),
        paid: paid,
        paid_date: paid ? new Date(document.getElementById('tuitionPaidDate').value).getTime() : null,
        memo: document.getElementById('tuitionMemo').value
    };
    
    try {
        if (id) {
            await API.update('tuition', id, data);
            Utils.showAlert('원비 정보가 수정되었습니다', 'success');
        } else {
            await API.create('tuition', data);
            Utils.showAlert('원비가 등록되었습니다', 'success');
        }
        
        closeTuitionModal();
        loadTuition();
    } catch (error) {
        Utils.showAlert('저장에 실패했습니다', 'danger');
    }
}

// 원비 삭제
async function deleteTuition(tuitionId) {
    if (!Auth.isLoggedIn()) {
        Utils.showAlert('로그인이 필요합니다', 'warning');
        return;
    }
    
    if (!Utils.confirm('정말 삭제하시겠습니까?')) return;
    
    try {
        await API.delete('tuition', tuitionId);
        Utils.showAlert('원비 기록이 삭제되었습니다', 'success');
        loadTuition();
    } catch (error) {
        Utils.showAlert('삭제에 실패했습니다', 'danger');
    }
}

// 월별 원비 관리 페이지
async function showTuitionMonthlyPage() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="page-container">`;
            
            <div class="form-row" style="max-width: 600px; margin-bottom: 1.5rem;">
                <div class="form-group">
                    <label>연도</label>
                    <select id="monthlyYear" onchange="loadMonthlyTuition()">
                        ${generateYearOptions()}
                    </select>
                </div>
                <div class="form-group">
                    <label>월</label>
                    <select id="monthlyMonth" onchange="loadMonthlyTuition()">
                        ${[...Array(12)].map((_, i) => `<option value="${i+1}">${i+1}월</option>`).join('')}
                    </select>
                </div>
            </div>
            
            <div id="monthlyStats" style="margin-bottom: 2rem;"></div>
            
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>학생명</th>
                            <th>학년</th>
                            <th>금액</th>
                            <th>납부상태</th>
                            <th>납부일</th>
                            <th>메모</th>
                        </tr>
                    </thead>
                    <tbody id="monthlyTuitionBody">
                        <tr><td colspan="6" class="text-center">로딩 중...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // 현재 연월로 초기화
    const now = new Date();
    document.getElementById('monthlyYear').value = now.getFullYear();
    document.getElementById('monthlyMonth').value = now.getMonth() + 1;
    
    loadMonthlyTuition();
}

// 연도 옵션 생성
function generateYearOptions() {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear - 2; i <= currentYear + 1; i++) {
        years.push(`<option value="${i}">${i}년</option>`);
    }
    return years.join('');
}

// 월별 원비 데이터 로드
async function loadMonthlyTuition() {
    try {
        const year = parseInt(document.getElementById('monthlyYear').value);
        const month = parseInt(document.getElementById('monthlyMonth').value);
        
        const result = await API.getList('tuition', { limit: 1000 });
        const filtered = (result.data || []).filter(t => t.year === year && t.month === month);
        
        renderMonthlyTuition(filtered);
        renderMonthlyStats(filtered);
    } catch (error) {
        document.getElementById('monthlyTuitionBody').innerHTML = 
            '<tr><td colspan="6" class="text-center">데이터를 불러오는데 실패했습니다</td></tr>';
    }
}

// 월별 원비 렌더링
function renderMonthlyTuition(tuitions) {
    const tbody = document.getElementById('monthlyTuitionBody');
    
    if (tuitions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center">해당 월의 원비 기록이 없습니다</td></tr>';
        return;
    }
    
    tbody.innerHTML = tuitions.map(t => `
        <tr>
            <td>${t.student_name}</td>
            <td>${getStudentGrade(t.student_id)}</td>
            <td>${Utils.formatMoney(t.amount)}</td>
            <td><span class="badge badge-${t.paid ? 'success' : 'danger'}">${t.paid ? '납부완료' : '미납'}</span></td>
            <td>${t.paid && t.paid_date ? Utils.formatDate(t.paid_date) : '-'}</td>
            <td>${t.memo || '-'}</td>
        </tr>
    `).join('');
}

// 월별 통계 렌더링
function renderMonthlyStats(tuitions) {
    const totalAmount = tuitions.reduce((sum, t) => sum + (t.amount || 0), 0);
    const paidAmount = tuitions.filter(t => t.paid).reduce((sum, t) => sum + (t.amount || 0), 0);
    const unpaidAmount = totalAmount - paidAmount;
    const paidCount = tuitions.filter(t => t.paid).length;
    const unpaidCount = tuitions.length - paidCount;
    
    const statsDiv = document.getElementById('monthlyStats');
    statsDiv.innerHTML = `
        <h3 style="margin-bottom: 1rem;">월별 통계</h3>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
            <div style="background: #EAFAF1; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #27AE60;">
                <div style="font-size: 0.9rem; color: #1E8449; margin-bottom: 0.5rem;">총 원비</div>
                <div style="font-size: 1.5rem; font-weight: 700; color: #27AE60;">${Utils.formatMoney(totalAmount)}</div>
            </div>
            <div style="background: #EBF5FB; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #3498DB;">
                <div style="font-size: 0.9rem; color: #2874A6; margin-bottom: 0.5rem;">납부완료 (${paidCount}명)</div>
                <div style="font-size: 1.5rem; font-weight: 700; color: #3498DB;">${Utils.formatMoney(paidAmount)}</div>
            </div>
            <div style="background: #FADBD8; padding: 1.5rem; border-radius: 8px; border-left: 4px solid #E74C3C;">
                <div style="font-size: 0.9rem; color: #A93226; margin-bottom: 0.5rem;">미납 (${unpaidCount}명)</div>
                <div style="font-size: 1.5rem; font-weight: 700; color: #E74C3C;">${Utils.formatMoney(unpaidAmount)}</div>
            </div>
        </div>
    `;
}
