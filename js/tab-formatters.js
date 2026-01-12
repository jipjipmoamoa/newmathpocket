// ===== 날짜 포맷 변환 함수 =====

/**
 * 날짜 입력을 "YY.MM" 또는 "YY.MM.DD" 형식으로 변환
 * 예: "2511" -> "25.11" (2025년 11월)
 * 예: "251102" -> "25.11.02" (2025년 11월 2일)
 */
function formatDateInput(input) {
    if (!input) return '';
    
    const cleaned = input.replace(/[^0-9]/g, '');
    
    // 4자리: YYMM -> YY.MM
    if (cleaned.length === 4) {
        const year = cleaned.substring(0, 2);
        const month = cleaned.substring(2, 4);
        return `${year}.${month}`;
    }
    
    // 6자리: YYMMDD -> YY.MM.DD
    if (cleaned.length === 6) {
        const year = cleaned.substring(0, 2);
        const month = cleaned.substring(2, 4);
        const day = cleaned.substring(4, 6);
        return `${year}.${month}.${day}`;
    }
    
    return input;
}

// ===== 시험명 자동 변환 함수 =====

/**
 * 시험명 약어를 전체 이름으로 변환
 * 예: "1기" -> "1학기 기말고사"
 * 예: "2중" -> "2학기 중간고사"
 * 예: "학교" -> "학교 단원평가"
 */
function formatExamName(input) {
    if (!input) return '학원 단원평가';
    
    const cleaned = input.trim();
    
    // 패턴 매칭: "11중" -> "1-1 중간고사", "12기" -> "1-2 기말고사" 등
    const pattern = /^(\d)(\d)(중|기)$/;
    const match = cleaned.match(pattern);
    if (match) {
        const [, grade, semester, type] = match;
        const examType = type === '중' ? '중간고사' : '기말고사';
        return `${grade}-${semester} ${examType}`;
    }
    
    // 기존 패턴
    if (cleaned === '1기') return '1학기 기말고사';
    if (cleaned === '2기') return '2학기 기말고사';
    if (cleaned === '1중') return '1학기 중간고사';
    if (cleaned === '2중') return '2학기 중간고사';
    if (cleaned === '학교') return '학교 단원평가';
    
    return cleaned; // 그 외에는 입력 그대로 반환
}


// ===== 시험범위 자동 변환 함수 =====

/**
 * 시험범위 약어를 표준 형식으로 변환
 * 예: "중111" -> "중 1-1-1" (중학교 1학년 1학기 1단원)
 * 예: "중2-1-345" -> "중 2-1-3,4,5" (중학교 2학년 1학기 3,4,5단원)
 */
function formatExamRange(input) {
    if (!input) return '';
    
    const cleaned = input.trim();
    
    // 패턴 1: "중111" 형식 (학교급 + 학년 + 학기 + 단원)
    const pattern1 = /^(초|중|고)(\d)(\d)(\d)$/;
    const match1 = cleaned.match(pattern1);
    if (match1) {
        const [, schoolLevel, grade, semester, unit] = match1;
        return `${schoolLevel} ${grade}-${semester}-${unit}`;
    }
    
    // 패턴 2: "중2-1-345" 형식 (학교급 + 학년-학기-단원들)
    const pattern2 = /^(초|중|고)(\d)-(\d)-(\d+)$/;
    const match2 = cleaned.match(pattern2);
    if (match2) {
        const [, schoolLevel, grade, semester, units] = match2;
        const unitList = units.split('').join(',');
        return `${schoolLevel} ${grade}-${semester}-${unitList}`;
    }
    
    return cleaned; // 패턴에 맞지 않으면 입력 그대로 반환
}

// ===== 점수별 색상 CSS 클래스 반환 =====

/**
 * 점수에 따라 색상 CSS 클래스 반환
 * 70점 이하: 빨강
 * 90-99점: 초록
 * 100점: 파랑
 */
function getScoreColorClass(score) {
    const numScore = parseInt(score);
    
    if (isNaN(numScore)) return '';
    if (numScore <= 70) return 'score-red';
    if (numScore >= 90 && numScore <= 99) return 'score-green';
    if (numScore === 100) return 'score-blue';
    
    return ''; // 71-89점은 기본 색상
}

/**
 * 점수를 색상과 함께 HTML로 반환
 */
function formatScoreWithColor(score) {
    const colorClass = getScoreColorClass(score);
    return `<span class="${colorClass}">${score}점</span>`;
}
