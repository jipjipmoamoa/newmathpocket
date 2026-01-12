// ===== 시험점수 등록 함수 =====

async function addScore(studentId) {
    console.log('[addScore] 호출됨 - studentId:', studentId);
    
    // Auth 모듈을 사용한 로그인 확인
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다.');
        return;
    }
    
    console.log('[addScore] 로그인 확인 완료');

    
    // 입력값 가져오기
    const dateInput = document.getElementById(`new-score-date-${studentId}`).value.trim();
    const nameInput = document.getElementById(`new-score-name-${studentId}`).value.trim();
    const rangeInput = document.getElementById(`new-score-range-${studentId}`).value.trim();
    const valueInput = document.getElementById(`new-score-value-${studentId}`).value.trim();
    const notesInput = document.getElementById(`new-score-notes-${studentId}`).value.trim();
    
    console.log('[addScore] 입력값:', { dateInput, nameInput, rangeInput, valueInput, notesInput });
    
     // 필수 입력 검증
    if (!nameInput) {
        alert('시험명을 입력해주세요.');
        return;
    }
    
    if (!valueInput) {
        alert('점수를 입력해주세요.');
        return;
    }

    
      console.log('[addScore] 입력 검증 통과');
    
    // 날짜 포맷 변환 (비어있으면 오늘 날짜)
    const formattedDate = dateInput ? formatDateInput(dateInput) : new Date().toISOString().split('T')[0];

    
    // 시험명 자동 변환
    const formattedName = formatExamName(nameInput);
    
    // 시험범위 자동 변환
    const formattedRange = formatExamRange(rangeInput);
    
    console.log('[addScore] 포맷 변환 완료:', { formattedDate, formattedName, formattedRange });
    
      try {
        // 학생 데이터 가져오기 (allStudents에서 직접 찾기)
        console.log('[addScore] 학생 데이터 로드 시작...');
        const student = allStudents.find(s => s.id === studentId);
        
        if (!student) {
            alert('학생 정보를 찾을 수 없습니다.');
            return;
        }
        
        console.log('[addScore] 학생 정보 확인:', student.name);

        
        // 기존 scores 파싱
        let scores = [];
        try {
            if (student.scores && typeof student.scores === 'string' && student.scores.trim() !== '') {
                scores = JSON.parse(student.scores);
            } else if (Array.isArray(student.scores)) {
                scores = student.scores;
            }
        } catch (e) {
            scores = [];
        }
        
        console.log('[addScore] 기존 점수 개수:', scores.length);
        
        // 새 점수 추가
        const newScore = {
            id: Date.now().toString(),
            date: formattedDate,
            name: formattedName,
            range: formattedRange,
            value: valueInput,
            notes: notesInput
        };
        
        scores.push(newScore);
        
        console.log('[addScore] 새 점수 추가 완료:', newScore);
        
        // DB 업데이트
        console.log('[addScore] DB 업데이트 시작...');
        await API.update('students', studentId, {
            scores: JSON.stringify(scores)
        });
        
        console.log('[addScore] DB 업데이트 완료');
        
        // 입력 필드 초기화
        document.getElementById(`new-score-date-${studentId}`).value = '';
        document.getElementById(`new-score-name-${studentId}`).value = '';
        document.getElementById(`new-score-range-${studentId}`).value = '';
        document.getElementById(`new-score-value-${studentId}`).value = '';
        document.getElementById(`new-score-notes-${studentId}`).value = '';
        
        console.log('[addScore] 입력 필드 초기화 완료');
        
        // allStudents 배열 업데이트 (학생 데이터 갱신)
        const studentIndex = allStudents.findIndex(s => s.id === studentId);
        if (studentIndex !== -1) {
            allStudents[studentIndex].scores = JSON.stringify(scores);
        }
        
        // 화면 갱신 - 전체 상세 페이지 새로고침 (탭은 유지)
        currentStudentTab = 'scores'; // 시험점수 탭 유지
        console.log('[addScore] showStudentDetail 호출 시작...');
        await showStudentDetail(studentId);
        
        console.log('[addScore] 완료!');
        // alert('시험점수가 등록되었습니다.'); // 알림 제거
        
    } catch (error) {
        console.error('시험점수 등록 오류:', error);
        alert('시험점수 등록에 실패했습니다.');
    }
}

// ===== 시험점수 삭제 함수 =====

async function deleteScore(studentId, scoreId) {
    if (!confirm('이 시험점수를 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await API.getList('students', { limit: 1000 });
        const students = response.data || [];
        const student = students.find(s => s.id === studentId);
        
        if (!student) {
            alert('학생 정보를 찾을 수 없습니다.');
            return;
        }
        
        let scores = [];
        try {
            if (student.scores && typeof student.scores === 'string' && student.scores.trim() !== '') {
                scores = JSON.parse(student.scores);
            } else if (Array.isArray(student.scores)) {
                scores = student.scores;
            }
        } catch (e) {
            scores = [];
        }
        
        // 해당 점수 삭제
        scores = scores.filter(s => s.id !== scoreId);
        
        // DB 업데이트
        await API.update('students', studentId, {
            scores: JSON.stringify(scores)
        });
        
        // 화면 갱신
        showStudentDetail(studentId);
        
        alert('시험점수가 삭제되었습니다.');
        
    } catch (error) {
        console.error('시험점수 삭제 오류:', error);
        alert('시험점수 삭제에 실패했습니다.');
    }
}

// ===== 사용책 등록 함수 =====

async function addBook(studentId) {
    // Auth 모듈을 사용한 로그인 확인
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다.');
        return;
    }

    
    // 입력값 가져오기
    const dateInput = document.getElementById(`new-book-date-${studentId}`).value.trim();
    const conceptInput = document.getElementById(`new-book-concept-${studentId}`).value.trim();
    const reviewInput = document.getElementById(`new-book-review-${studentId}`).value.trim();
    const advancedInput = document.getElementById(`new-book-advanced-${studentId}`).value.trim();
    
    // 필수 입력 검증
    if (!dateInput) {
        alert('책 안내 날짜를 입력해주세요.');
        return;
    }
    
    // 날짜 포맷 변환
    const formattedDate = formatDateInput(dateInput);
    
    try {
        // 학생 데이터 가져오기
        const response = await API.getList('students', { limit: 1000 });
        const students = response.data || [];
        const student = students.find(s => s.id === studentId);
        
        if (!student) {
            alert('학생 정보를 찾을 수 없습니다.');
            return;
        }
        
        // 기존 books 파싱
        let books = [];
        try {
            if (student.books && typeof student.books === 'string' && student.books.trim() !== '') {
                books = JSON.parse(student.books);
            } else if (Array.isArray(student.books)) {
                books = student.books;
            }
        } catch (e) {
            books = [];
        }
        
        // 새 책 추가
        const newBook = {
            id: Date.now().toString(),
            date: formattedDate,
            concept: conceptInput,
            review: reviewInput,
            advanced: advancedInput
        };
        
        books.push(newBook);
        
        // DB 업데이트
        await API.update('students', studentId, {
            books: JSON.stringify(books)
        });
        
        // 입력 필드 초기화
        document.getElementById(`new-book-date-${studentId}`).value = '';
        document.getElementById(`new-book-concept-${studentId}`).value = '';
        document.getElementById(`new-book-review-${studentId}`).value = '';
        document.getElementById(`new-book-advanced-${studentId}`).value = '';
        
        // allStudents 배열 업데이트 (학생 데이터 갱신)
        const studentIndex = allStudents.findIndex(s => s.id === studentId);
        if (studentIndex !== -1) {
            allStudents[studentIndex].books = JSON.stringify(books);
        }
        
        // 화면 갱신 - 전체 상세 페이지 새로고침 (탭은 유지)
        currentStudentTab = 'books'; // 사용책 탭 유지
        await showStudentDetail(studentId);
        
        // 정보 탭의 선행개념/선행복습/현행심화도 업데이트됨 (showStudentDetail에서 처리)
        
        alert('사용책 정보가 등록되었습니다.');
        
    } catch (error) {
        console.error('사용책 등록 오류:', error);
        alert('사용책 등록에 실패했습니다.');
    }
}

// ===== 사용책 삭제 함수 =====

async function deleteBook(studentId, bookId) {
    if (!confirm('이 사용책 정보를 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await API.getList('students', { limit: 1000 });
        const students = response.data || [];
        const student = students.find(s => s.id === studentId);
        
        if (!student) {
            alert('학생 정보를 찾을 수 없습니다.');
            return;
        }
        
        let books = [];
        try {
            if (student.books && typeof student.books === 'string' && student.books.trim() !== '') {
                books = JSON.parse(student.books);
            } else if (Array.isArray(student.books)) {
                books = student.books;
            }
        } catch (e) {
            books = [];
        }
        
        // 해당 책 삭제
        books = books.filter(b => b.id !== bookId);
        
        // DB 업데이트
        await API.update('students', studentId, {
            books: JSON.stringify(books)
        });
        
        // 화면 갱신
        showStudentDetail(studentId);
        
        alert('사용책 정보가 삭제되었습니다.');
        
    } catch (error) {
        console.error('사용책 삭제 오류:', error);
        alert('사용책 삭제에 실패했습니다.');
    }
}

// ===== 상담내용 등록 함수 =====

async function addConsultation(studentId) {
    // Auth 모듈을 사용한 로그인 확인
    if (!Auth.isLoggedIn()) {
        alert('로그인이 필요합니다.');
        return;
    }

    
    // 입력값 가져오기
    const dateInput = document.getElementById(`new-consul-date-${studentId}`).value.trim();
    const personInput = document.getElementById(`new-consul-person-${studentId}`).value.trim();
    const contentInput = document.getElementById(`new-consul-content-${studentId}`).value.trim();
    
    // 필수 입력 검증
    if (!dateInput) {
        alert('상담 날짜를 입력해주세요.');
        return;
    }
    
    // 날짜 포맷 변환
    const formattedDate = formatDateInput(dateInput);
    
    try {
        // 학생 데이터 가져오기
        const response = await API.getList('students', { limit: 1000 });
        const students = response.data || [];
        const student = students.find(s => s.id === studentId);
        
        if (!student) {
            alert('학생 정보를 찾을 수 없습니다.');
            return;
        }
        
        // 기존 consultations 파싱
        let consultations = [];
        try {
            if (student.consultations && typeof student.consultations === 'string' && student.consultations.trim() !== '') {
                consultations = JSON.parse(student.consultations);
            } else if (Array.isArray(student.consultations)) {
                consultations = student.consultations;
            }
        } catch (e) {
            consultations = [];
        }
        
        // 새 상담 추가
        const newConsultation = {
            id: Date.now().toString(),
            date: formattedDate,
            person: personInput,
            content: contentInput
        };
        
        consultations.push(newConsultation);
        
        // DB 업데이트
        await API.update('students', studentId, {
            consultations: JSON.stringify(consultations)
        });
        
        // 입력 필드 초기화
        document.getElementById(`new-consul-date-${studentId}`).value = '';
        document.getElementById(`new-consul-person-${studentId}`).value = '모';
        document.getElementById(`new-consul-content-${studentId}`).value = '';
        
        // 화면 갱신
        showStudentDetail(studentId);
        
        alert('상담 내용이 등록되었습니다.');
        
    } catch (error) {
        console.error('상담 등록 오류:', error);
        alert('상담 등록에 실패했습니다.');
    }
}

// ===== 상담내용 삭제 함수 =====

async function deleteConsultation(studentId, consulId) {
    if (!confirm('이 상담 내용을 삭제하시겠습니까?')) {
        return;
    }
    
    try {
        const response = await API.getList('students', { limit: 1000 });
        const students = response.data || [];
        const student = students.find(s => s.id === studentId);
        
        if (!student) {
            alert('학생 정보를 찾을 수 없습니다.');
            return;
        }
        
        let consultations = [];
        try {
            if (student.consultations && typeof student.consultations === 'string' && student.consultations.trim() !== '') {
                consultations = JSON.parse(student.consultations);
            } else if (Array.isArray(student.consultations)) {
                consultations = student.consultations;
            }
        } catch (e) {
            consultations = [];
        }
        
        // 해당 상담 삭제
        consultations = consultations.filter(c => c.id !== consulId);
        
        // DB 업데이트
        await API.update('students', studentId, {
            consultations: JSON.stringify(consultations)
        });
        
        // 화면 갱신
        showStudentDetail(studentId);
        
        alert('상담 내용이 삭제되었습니다.');
        
    } catch (error) {
        console.error('상담 삭제 오류:', error);
        alert('상담 삭제에 실패했습니다.');
    }
}

// ===== 수정 함수들 (향후 구현) =====

function editScore(studentId, scoreId) {
    alert('수정 기능은 향후 구현 예정입니다.');
}

function editBook(studentId, bookId) {
    alert('수정 기능은 향후 구현 예정입니다.');
}

function editConsultation(studentId, consulId) {
    alert('수정 기능은 향후 구현 예정입니다.');
}

// ===== 정보 탭 교재 업데이트 함수 =====

function updateInfoTabBooks(studentId, books) {
    // 최신순 정렬
    const sortedBooks = [...books].sort((a, b) => {
        return (b.date || '').localeCompare(a.date || '');
    });
    
    // 선행개념 찾기: 최신 항목부터 내용이 있는 것 찾기
    let concept = '-';
    for (const book of sortedBooks) {
        if (book.concept && book.concept.trim() !== '') {
            concept = book.concept;
            break;
        }
    }
    
    // 선행복습 찾기
    let review = '-';
    for (const book of sortedBooks) {
        if (book.review && book.review.trim() !== '') {
            review = book.review;
            break;
        }
    }
    
    // 현행심화 찾기
    let advanced = '-';
    for (const book of sortedBooks) {
        if (book.advanced && book.advanced.trim() !== '') {
            advanced = book.advanced;
            break;
        }
    }
    
    // DOM 업데이트
    const conceptEl = document.getElementById(`book-concept-${studentId}`);
    const reviewEl = document.getElementById(`book-review-${studentId}`);
    const advancedEl = document.getElementById(`book-advanced-${studentId}`);
    
    if (conceptEl) conceptEl.textContent = concept;
    if (reviewEl) reviewEl.textContent = review;
    if (advancedEl) advancedEl.textContent = advanced;
}

