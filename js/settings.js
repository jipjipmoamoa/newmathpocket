// 설정 관리 모듈

async function showSettingsPage() {
    const mainContent = document.getElementById('mainContent');
    
    if (!Auth.isLoggedIn()) {
        mainContent.innerHTML = `
            <div class="page-container">
                <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle"></i>
                    <span>설정 페이지는 로그인이 필요합니다</span>
                </div>
            </div>
        `;
        return;
    }
    
    mainContent.innerHTML = `
        <div class="page-container">
            <div style="max-width: 900px;">
                <!-- 학원 정보 섹션 (최상단) -->
                <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: var(--shadow); margin-bottom: 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                        <i class="fas fa-school" style="color: var(--menu-brown); font-size: 1.2rem;"></i>
                        <h3 style="margin: 0; color: var(--menu-brown); font-weight: 700;">학원 정보</h3>
                    </div>
                    <form id="instituteForm" onsubmit="saveInstituteSettings(event)">
                        <div style="display: flex; align-items: flex-end; gap: 1rem;">
                            <div style="flex: 1;">
                                <label style="display: block; font-size: 0.85rem; color: var(--text-light); margin-bottom: 0.25rem;">학원명</label>
                                <input type="text" id="instituteName" placeholder="학원명" style="width: 100%; padding: 0.6rem; border: 1px solid var(--border-color); border-radius: 4px;">
                            </div>
                            <div style="flex: 1;">
                                <label style="display: block; font-size: 0.85rem; color: var(--text-light); margin-bottom: 0.25rem;">학원 연락처</label>
                                <input type="tel" id="institutePhone" placeholder="010-0000-0000" style="width: 100%; padding: 0.6rem; border: 1px solid var(--border-color); border-radius: 4px;">
                            </div>
                            <div style="flex: 0 0 auto;">
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save"></i> 저장
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
                
                <!-- 관리자 계정 섹션 -->
                <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: var(--shadow); margin-bottom: 1.5rem;">
                    <div style="display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem;">
                        <i class="fas fa-user-shield" style="color: var(--menu-brown); font-size: 1.2rem;"></i>
                        <h3 style="margin: 0; color: var(--menu-brown); font-weight: 700;">관리자 계정</h3>
                    </div>
                    <form id="adminForm" onsubmit="saveAdminSettings(event)">
                        <div style="display: flex; align-items: flex-end; gap: 1rem;">
                            <div style="flex: 1;">
                                <label style="display: block; font-size: 0.85rem; color: var(--text-light); margin-bottom: 0.25rem;">아이디</label>
                                <input type="text" id="adminUsername" placeholder="관리자 아이디" required style="width: 100%; padding: 0.6rem; border: 1px solid var(--border-color); border-radius: 4px;">
                            </div>
                            <div style="flex: 1;">
                                <label style="display: block; font-size: 0.85rem; color: var(--text-light); margin-bottom: 0.25rem;">비밀번호</label>
                                <input type="password" id="adminPassword" placeholder="변경하려면 입력" style="width: 100%; padding: 0.6rem; border: 1px solid var(--border-color); border-radius: 4px;">
                            </div>
                            <div style="flex: 0 0 auto;">
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save"></i> 저장
                                </button>
                            </div>
                        </div>
                    </form>
                </div>
                
                <!-- 데이터 관리 섹션 (최하단) -->
                <div style="background: white; padding: 1.5rem; border-radius: 8px; box-shadow: var(--shadow);">
                    <div style="display: flex; align-items: center; gap: 1rem;">
                        <div style="flex: 0 0 auto;">
                            <i class="fas fa-database" style="color: var(--primary-color); font-size: 1.2rem;"></i>
                        </div>
                        <div style="flex: 1;">
                            <strong style="color: var(--text-dark);">데이터 관리</strong>
                            <small style="display: block; color: var(--text-light); margin-top: 0.25rem;">
                                이름이 없거나 잘못된 학생/선생님 데이터를 삭제합니다
                            </small>
                        </div>
                        <div style="flex: 0 0 auto;">
                            <button onclick="cleanupInvalidRecords()" class="btn btn-warning">
                                <i class="fas fa-broom"></i> 정리
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    loadSettings();
}

// 설정 로드
async function loadSettings() {
    try {
        const result = await API.getList('settings', { limit: 1 });
        
        if (result.data && result.data.length > 0) {
            const settings = result.data[0];
            
            // 관리자 정보
            if (settings.admin_username) {
                document.getElementById('adminUsername').value = settings.admin_username;
            }
            
            // 학원 정보
            if (settings.institute_name) {
                document.getElementById('instituteName').value = settings.institute_name;
            }
            if (settings.institute_phone) {
                document.getElementById('institutePhone').value = settings.institute_phone;
            }
        }
    } catch (error) {
        console.error('설정 로드 실패:', error);
    }
}

// 관리자 정보 저장
async function saveAdminSettings(event) {
    event.preventDefault();
    
    if (!Auth.isLoggedIn()) {
        Utils.showAlert('로그인이 필요합니다.');
        return;
    }
    
    const username = document.getElementById('adminUsername').value.trim();
    const password = document.getElementById('adminPassword').value;
    
    if (!username) {
        Utils.showAlert('관리자 아이디를 입력해주세요.');
        return;
    }
    
    // 비밀번호 변경 시 검증
    if (password) {
        if (password.length < 4) {
            Utils.showAlert('비밀번호는 최소 4자 이상이어야 합니다.');
            return;
        }
    }
    
    try {
        const result = await API.getList('settings', { limit: 1 });
        let settingsId = null;
        let existingData = {};
        
        if (result.data && result.data.length > 0) {
            settingsId = result.data[0].id;
            existingData = result.data[0];
        }
        
        const updateData = {
            ...existingData,
            admin_username: username
        };
        
        // 비밀번호가 입력된 경우에만 업데이트
        if (password) {
            updateData.admin_password = password;
        }
        
        if (settingsId) {
            await API.update('settings', settingsId, updateData);
        } else {
            // settings 데이터가 없으면 생성 (비밀번호 필수)
            if (!password) {
                Utils.showAlert('최초 설정 시 비밀번호는 필수입니다.');
                return;
            }
            await API.create('settings', updateData);
        }
        
        Utils.showAlert('관리자 정보가 저장되었습니다.');
        
        // 비밀번호가 변경된 경우 로그아웃
        if (password) {
            Utils.showAlert('비밀번호가 변경되었습니다. 다시 로그인해주세요.');
            setTimeout(() => {
                Auth.logout();
                Navigation.showPage('welcome');
            }, 1500);
        }
        
        // 입력 필드 초기화 (비밀번호만)
        document.getElementById('adminPassword').value = '';
        
    } catch (error) {
        console.error('관리자 정보 저장 실패:', error);
        Utils.showAlert('관리자 정보 저장에 실패했습니다.');
    }
}

// 학원 정보 저장
async function saveInstituteSettings(event) {
    event.preventDefault();
    
    if (!Auth.isLoggedIn()) {
        Utils.showAlert('로그인이 필요합니다.');
        return;
    }
    
    const name = document.getElementById('instituteName').value.trim();
    const phone = document.getElementById('institutePhone').value.trim();
    
    try {
        const result = await API.getList('settings', { limit: 1 });
        let settingsId = null;
        let existingData = {};
        
        if (result.data && result.data.length > 0) {
            settingsId = result.data[0].id;
            existingData = result.data[0];
        }
        
        const updateData = {
            ...existingData,
            institute_name: name,
            institute_phone: phone
        };
        
        if (settingsId) {
            await API.update('settings', settingsId, updateData);
        } else {
            await API.create('settings', updateData);
        }
        
        Utils.showAlert('학원 정보가 저장되었습니다.');
        
    } catch (error) {
        console.error('학원 정보 저장 실패:', error);
        Utils.showAlert('학원 정보 저장에 실패했습니다.');
    }
}

// 잘못된 데이터 정리
async function cleanupInvalidRecords() {
    if (!Auth.isLoggedIn()) {
        Utils.showAlert('로그인이 필요합니다.');
        return;
    }
    
    if (!confirm('이름이 없거나 잘못된 데이터를 정리하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
        return;
    }
    
    try {
        let deletedCount = 0;
        
        // 학생 데이터 정리
        const studentsResult = await API.getList('students', { limit: 1000 });
        if (studentsResult.data) {
            for (const student of studentsResult.data) {
                if (!student.name || student.name === 'undefined' || student.name.trim() === '') {
                    await API.delete('students', student.id);
                    deletedCount++;
                }
            }
        }
        
        // 선생님 데이터 정리
        const teachersResult = await API.getList('teachers', { limit: 1000 });
        if (teachersResult.data) {
            for (const teacher of teachersResult.data) {
                if (!teacher.name || teacher.name === 'undefined' || teacher.name.trim() === '') {
                    await API.delete('teachers', teacher.id);
                    deletedCount++;
                }
            }
        }
        
        Utils.showAlert(`${deletedCount}개의 잘못된 데이터가 삭제되었습니다.`);
        
    } catch (error) {
        console.error('데이터 정리 실패:', error);
        Utils.showAlert('데이터 정리에 실패했습니다.');
    }
}
