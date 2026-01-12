// 교육과정 관리 모듈

let curriculumData = [];
let expandedUnits = new Set(); // 펼쳐진 단원 추적
let editingUnitId = null; // 현재 편집 중인 단원 ID
let isEditMode = false; // 수정 모드 여부

async function showCurriculumPage() {
    const mainContent = document.getElementById('mainContent');
    mainContent.innerHTML = `
        <div class="page-container">
            <div style="display: flex; justify-content: flex-end; margin-bottom: 1rem;">
                <button class="btn btn-secondary" onclick="toggleEditMode()" id="editModeBtn">
                    <i class="fas fa-edit"></i> 수정
                </button>
            </div>
            <div class="curriculum-three-columns">
                <!-- 1단: 초등학교 -->
                <div class="curriculum-column">
                    <h3 class="curriculum-column-title">초등학교</h3>
                    <div class="curriculum-grades" id="elementary-curriculum">
                        <!-- 동적으로 로드됨 -->
                    </div>
                </div>
                
                <!-- 2단: 중학교 -->
                <div class="curriculum-column">
                    <h3 class="curriculum-column-title">중학교</h3>
                    <div class="curriculum-grades" id="middle-curriculum">
                        <!-- 동적으로 로드됨 -->
                    </div>
                </div>
                
                <!-- 3단: 고등학교 -->
                <div class="curriculum-column">
                    <h3 class="curriculum-column-title">고등학교</h3>
                    <div class="curriculum-grades" id="high-curriculum">
                        <!-- 동적으로 로드됨 -->
                    </div>
                </div>
            </div>
        </div>
    `;
    
    await loadCurriculumData();
}

// 수정 모드 토글
function toggleEditMode() {
    isEditMode = !isEditMode;
    const btn = document.getElementById('editModeBtn');
    
    if (isEditMode) {
        btn.innerHTML = '<i class="fas fa-save"></i> 저장';
        btn.classList.remove('btn-secondary');
        btn.classList.add('btn-primary');
    } else {
        btn.innerHTML = '<i class="fas fa-edit"></i> 수정';
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
        // TODO: 저장 로직 구현
    }
    
    renderCurriculum();
}

// 교육과정 데이터 로드
async function loadCurriculumData() {
    try {
        const result = await API.getList('curriculum_units', { limit: 1000 });
        curriculumData = result.data || [];
        
        renderCurriculum();
    } catch (error) {
        console.error('교육과정 데이터 로드 실패:', error);
    }
}

// 교육과정 렌더링
function renderCurriculum() {
    // 초등학교
    renderSchoolType('초', 'elementary-curriculum', [1, 2, 3, 4, 5, 6]);
    // 중학교
    renderSchoolType('중', 'middle-curriculum', [1, 2, 3]);
    // 고등학교
    renderSchoolType('고', 'high-curriculum', [1, 2, 3]);
}

// 학교급별 렌더링
function renderSchoolType(schoolType, containerId, grades) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    let html = '';
    
    for (const grade of grades) {
        html += `<div class="curriculum-grade-section">`;
        html += `<h4 class="grade-header">${grade}학년</h4>`;
        
        // 고등학교 1학년: 공통수학1, 공통수학2
        if (schoolType === '고' && grade === 1) {
            html += renderSemester(schoolType, grade, '공통수학1');
            html += renderSemester(schoolType, grade, '공통수학2');
        }
        // 고등학교 2학년: 대수, 미적분1, 확률과통계
        else if (schoolType === '고' && grade === 2) {
            html += renderSemester(schoolType, grade, '대수');
            html += renderSemester(schoolType, grade, '미적분1');
            html += renderSemester(schoolType, grade, '확률과통계');
        }
        // 고등학교 3학년: 미적분2, 기하와벡터
        else if (schoolType === '고' && grade === 3) {
            html += renderSemester(schoolType, grade, '미적분2');
            html += renderSemester(schoolType, grade, '기하와벡터');
        }
        // 초등/중학교: 1학기, 2학기
        else {
            html += renderSemester(schoolType, grade, '1학기');
            html += renderSemester(schoolType, grade, '2학기');
        }
        
        html += `</div>`;
    }
    
    container.innerHTML = html;
}

// 학기별 렌더링
function renderSemester(schoolType, grade, semester) {
    const units = curriculumData.filter(u => 
        u.school_type === schoolType && 
        u.grade === grade && 
        u.semester === semester &&
        !u.parent_id
    ).sort((a, b) => (a.order || 0) - (b.order || 0));
    
    const containerId = `semester-${schoolType}-${grade}-${semester}`;
    
    let html = `
        <div class="semester-wrapper">
            <div class="semester-header">
                <span class="semester-title">${semester}</span>
                <button class="btn-icon-orange" onclick="showInlineInput('${containerId}', 'major', '${schoolType}', ${grade}, '${semester}', null)" title="대단원 추가">
                    <i class="fas fa-plus"></i>
                </button>
            </div>
            <div class="units-container" id="${containerId}">
    `;
    
    units.forEach((unit, index) => {
        html += renderUnit(unit, 'major', index + 1);
    });
    
    html += `
            </div>
        </div>
    `;
    
    return html;
}

// 단원 렌더링 (재귀적)
// 단원 렌더링 (재귀적)
function renderUnit(unit, level, number) {
    const isExpanded = expandedUnits.has(unit.id);
    const children = curriculumData.filter(u => u.parent_id === unit.id)
        .sort((a, b) => (a.order || 0) - (b.order || 0));
    
    // level이 숫자로 저장되어 있을 수 있으므로 문자열로 변환
    if (typeof level === 'number') {
        level = level === 1 ? 'major' : level === 2 ? 'middle' : 'minor';
    }
    
    let numberDisplay = '';
    let className = 'unit-item';
    
    if (level === 'major') {
        numberDisplay = `${number}.`;
        className += ' unit-major';
    } else if (level === 'middle') {
        numberDisplay = `${number})`;
        className += ' unit-middle';
    } else if (level === 'minor') {
        numberDisplay = getCircledNumber(number);
        className += ' unit-minor';
    }

    
    let html = `
        <div class="${className}" id="unit-${unit.id}">
            <div class="unit-header" onclick="toggleUnit('${unit.id}')">
                <span class="unit-number">${numberDisplay}</span>
                <span class="unit-name">${unit.name}</span>
                <div class="unit-actions" onclick="event.stopPropagation()">
    `;
    
    // 대단원과 중단원에만 하위 항목 추가 버튼 표시
    if (level !== 'minor') {
        const nextLevel = level === 'major' ? 'middle' : 'minor';
        html += `<button class="btn-icon-orange" onclick="showInlineInputChild('${unit.id}', '${nextLevel}')" title="하위 항목 추가">
            <i class="fas fa-plus"></i>
        </button>`;
    }
    
    html += `
                    <button class="btn-icon-orange" onclick="editUnitInline('${unit.id}')" title="수정">
                        <i class="fas fa-pencil-alt"></i>
                    </button>
                    <button class="btn-icon-orange" onclick="deleteUnit('${unit.id}')" title="삭제">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>
    `;
    
    // 하위 항목이 있고 펼쳐진 상태면 표시
    if (children.length > 0 && isExpanded) {
        html += `<div class="unit-children" id="children-${unit.id}">`;
        const nextLevel = level === 'major' ? 'middle' : 'minor';
        children.forEach((child, index) => {
            // 자식 단원의 level을 DB에서 가져온 값 또는 계산된 값 사용
            const childLevel = child.level || nextLevel;
            html += renderUnit(child, childLevel, index + 1);
        });
        html += `</div>`;
    }

    
    html += `</div>`;
    
    return html;
}

// 원 안에 숫자 (①②③...)
function getCircledNumber(num) {
    const circledNumbers = ['①', '②', '③', '④', '⑤', '⑥', '⑦', '⑧', '⑨', '⑩',
                           '⑪', '⑫', '⑬', '⑭', '⑮', '⑯', '⑰', '⑱', '⑲', '⑳'];
    return circledNumbers[num - 1] || `(${num})`;
}

// 단원 펼침/접힘 토글
function toggleUnit(unitId) {
    if (expandedUnits.has(unitId)) {
        expandedUnits.delete(unitId);
    } else {
        expandedUnits.add(unitId);
    }
    renderCurriculum();
}

// 인라인 입력창 표시 (학기 하위 - 대단원 추가)
function showInlineInput(containerId, level, schoolType, grade, semester, parentId) {
    if (!Auth.isLoggedIn()) {
        Utils.showAlert('로그인이 필요합니다.');
        return;
    }
    
    // 기존 입력창이 있으면 제거
    const existingInput = document.querySelector('.inline-input-row');
    if (existingInput) {
        existingInput.remove();
    }
    
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const inputRow = document.createElement('div');
    inputRow.className = 'inline-input-row';
    inputRow.innerHTML = `
        <div class="inline-input-wrapper">
            <input type="text" 
                   class="inline-input" 
                   placeholder="단원명을 입력하고 엔터를 누르세요" 
                   id="inlineInput"
                   onkeypress="handleInlineInputKeyPress(event, '${level}', '${schoolType}', ${grade}, '${semester}', ${parentId})"
                   autofocus>
            <button class="btn-icon-orange" onclick="saveInlineUnit('${level}', '${schoolType}', ${grade}, '${semester}', ${parentId})" title="저장">
                <i class="fas fa-check"></i>
            </button>
            <button class="btn-icon-orange" onclick="cancelInlineInput()" title="취소">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    container.insertBefore(inputRow, container.firstChild);
    document.getElementById('inlineInput').focus();
}

// 인라인 입력창 표시 (단원 하위 - 중단원/소단원 추가)
function showInlineInputChild(parentId, level) {
    if (!Auth.isLoggedIn()) {
        Utils.showAlert('로그인이 필요합니다.');
        return;
    }
    
    const parent = curriculumData.find(u => u.id === parentId);
    if (!parent) return;
    
    // 부모 단원을 펼침
    if (!expandedUnits.has(parentId)) {
        expandedUnits.add(parentId);
        renderCurriculum();
        
        // 렌더링 후 다시 입력창 표시
        setTimeout(() => {
            showInlineInputChild(parentId, level);
        }, 100);
        return;
    }
    
    // 기존 입력창이 있으면 제거
    const existingInput = document.querySelector('.inline-input-row');
    if (existingInput) {
        existingInput.remove();
    }
    
    const container = document.getElementById(`children-${parentId}`);
    if (!container) return;
    
    const inputRow = document.createElement('div');
    inputRow.className = 'inline-input-row';
    inputRow.innerHTML = `
        <div class="inline-input-wrapper">
            <input type="text" 
                   class="inline-input" 
                   placeholder="단원명을 입력하고 엔터를 누르세요" 
                   id="inlineInput"
                   onkeypress="handleInlineInputChildKeyPress(event, '${parentId}', '${level}')"
                   autofocus>
            <button class="btn-icon-orange" onclick="saveInlineChildUnit('${parentId}', '${level}')" title="저장">
                <i class="fas fa-check"></i>
            </button>
            <button class="btn-icon-orange" onclick="cancelInlineInput()" title="취소">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;
    
    container.insertBefore(inputRow, container.firstChild);
    document.getElementById('inlineInput').focus();
}

// 엔터 키 처리 (학기 하위)
function handleInlineInputKeyPress(event, level, schoolType, grade, semester, parentId) {
    if (event.key === 'Enter') {
        event.preventDefault();
        saveInlineUnit(level, schoolType, grade, semester, parentId);
    }
}

// 엔터 키 처리 (단원 하위)
function handleInlineInputChildKeyPress(event, parentId, level) {
    if (event.key === 'Enter') {
        event.preventDefault();
        saveInlineChildUnit(parentId, level);
    }
}

// 인라인 단원 저장 (학기 하위)
async function saveInlineUnit(level, schoolType, grade, semester, parentId) {
    const input = document.getElementById('inlineInput');
    if (!input) return;
    
    const name = input.value.trim();
    if (!name) {
        Utils.showAlert('단원명을 입력해주세요.');
        input.focus();
        return;
    }
    
    // 같은 레벨에서 순서 계산
    // 같은 레벨에서 순서 계산
    const siblings = curriculumData.filter(u => u.parent_id === parentId);
    const order = siblings.length + 1;
    
    // level을 숫자로 변환 (major=1, middle=2, minor=3)
    const levelNumber = level === 'major' ? 1 : level === 'middle' ? 2 : level === 'minor' ? 3 : parseInt(level) || 1;
    
    const data = {
        school_type: parent.school_type,
        grade: parent.grade,
        semester: parent.semester,
        parent_id: parentId,
        level: levelNumber,
        name: name,
        content: '',
        order: order
    };

    
    try {
        await API.create('curriculum_units', data);
        
        // 스크롤 위치 저장
        const scrollPos = window.pageYOffset || document.documentElement.scrollTop;
        
        // 데이터 다시 로드
        await loadCurriculumData();
        
        // 스크롤 위치 복원
        window.scrollTo(0, scrollPos);
        
    } catch (error) {
        console.error('단원 저장 실패:', error);
        Utils.showAlert('단원 저장에 실패했습니다.');
    }
}

// 인라인 단원 저장 (단원 하위)
async function saveInlineChildUnit(parentId, level) {
    const input = document.getElementById('inlineInput');
    if (!input) return;
    
    const name = input.value.trim();
    if (!name) {
        Utils.showAlert('단원명을 입력해주세요.');
        input.focus();
        return;
    }
    
    const parent = curriculumData.find(u => u.id === parentId);
    if (!parent) return;
    
    // 같은 레벨에서 순서 계산
    const siblings = curriculumData.filter(u => u.parent_id === parentId);
    const order = siblings.length + 1;
    
    const data = {
        school_type: parent.school_type,
        grade: parent.grade,
        semester: parent.semester,
        parent_id: parentId,
        level: level,
        name: name,
        content: '',
        order: order
    };
    
    try {
        await API.create('curriculum_units', data);
        
        // 스크롤 위치 저장
        const scrollPos = window.pageYOffset || document.documentElement.scrollTop;
        
        // 부모를 펼친 상태로 유지
        expandedUnits.add(parentId);
        
        // 데이터 다시 로드
        await loadCurriculumData();
        
        // 스크롤 위치 복원
        window.scrollTo(0, scrollPos);
        
    } catch (error) {
        console.error('단원 저장 실패:', error);
        Utils.showAlert('단원 저장에 실패했습니다.');
    }
}

// 인라인 입력 취소
function cancelInlineInput() {
    const inputRow = document.querySelector('.inline-input-row');
    if (inputRow) {
        inputRow.remove();
    }
}

// 단원 인라인 수정
function editUnitInline(unitId) {
    // TODO: 인라인 수정 기능 구현
    Utils.showAlert('수정 기능은 추후 구현 예정입니다.');
}

// 단원 삭제
async function deleteUnit(unitId) {
    if (!Auth.isLoggedIn()) {
        Utils.showAlert('로그인이 필요합니다.');
        return;
    }
    
    // 하위 항목이 있는지 확인
    const hasChildren = curriculumData.some(u => u.parent_id === unitId);
    if (hasChildren) {
        Utils.showAlert('하위 항목이 있는 단원은 삭제할 수 없습니다.\n먼저 하위 항목을 삭제해주세요.');
        return;
    }
    
    if (!confirm('이 단원을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        // 스크롤 위치 저장
        const scrollPos = window.pageYOffset || document.documentElement.scrollTop;
        
        await API.delete('curriculum_units', unitId);
        
        await loadCurriculumData();
        
        // 스크롤 위치 복원
        window.scrollTo(0, scrollPos);
        
    } catch (error) {
        console.error('단원 삭제 실패:', error);
        Utils.showAlert('단원 삭제에 실패했습니다.');
    }
}
