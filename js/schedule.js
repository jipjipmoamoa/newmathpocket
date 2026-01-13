// 스케줄 관리 모듈
     2	
     3	// 학생별 고유 색상 (연한 파스텔톤)
     4	const studentColors = [
     5	    '#FFE5E5', // 연분홍
     6	    '#FFF4CC', // 연노랑
     7	    '#E5F5E5', // 연두
     8	    '#E5F2FF', // 연하늘
     9	    '#F0E5FF', // 연보라
    10	    '#FFE5F0', // 연핑크
    11	    '#E5FFE5', // 연민트
    12	    '#FFEEE5', // 연주황
    13	    '#F5F5F5', // 연회색
    14	    '#E5F9FF', // 연청록
    15	];
    16	
    17	let studentColorMap = {}; // 학생 ID -> 색상 매핑
    18	let currentTeacherFilter = 'all'; // 현재 선생님 필터
    19	
    20	// 이번달 스케줄표 페이지
    21	async function showScheduleCurrentPage() {
    22	    const mainContent = document.getElementById('mainContent');
    23	    
    24	    // 스케줄 인쇄 CSS 추가
    25	    let schedulePrintCSS = document.getElementById('schedulePrintCSS');
    26	    if (!schedulePrintCSS) {
    27	        schedulePrintCSS = document.createElement('link');
    28	        schedulePrintCSS.id = 'schedulePrintCSS';
    29	        schedulePrintCSS.rel = 'stylesheet';
    30	        schedulePrintCSS.href = 'css/schedule-print.css';
    31	        document.head.appendChild(schedulePrintCSS);
    32	    }
    33	    
    34	    mainContent.innerHTML = `
    35	        <div class="page-container" id="schedulePageContainer" style="max-width: 98%; margin: 0 auto;">
    36	            <div class="page-header" style="display: flex; justify-content: flex-end; gap: 1rem; margin-bottom: 1rem;">
    37	                <select id="teacherFilter" onchange="filterByTeacher()" style="padding: 0.5rem; border: 1px solid var(--border-color); border-radius: 4px;">
    38	                    <option value="all">전체 선생님</option>
    39	                </select>
    40	                <button class="btn btn-primary" onclick="printScheduleTable()">
    41	                    <i class="fas fa-print"></i> 인쇄
    42	                </button>
    43	            </div>
    44	            <div id="weeklyScheduleTable" style="transform-origin: top left;"></div>
    45	        </div>
    46	    `;
    47	    
    48	    await loadTeachersForFilter();
    49	    await loadWeeklySchedule();
    50	    
    51	    // 테이블 크기에 맞춰 자동 스케일 조정
    52	    adjustTableScale();
    53	}
    54	
    55	// 테이블 스케일 자동 조정
    56	function adjustTableScale() {
    57	    const container = document.getElementById('weeklyScheduleTable');
    58	    if (!container) return;
    59	    
    60	    const table = container.querySelector('table');
    61	    if (!table) return;
    62	    
    63	    const containerWidth = container.parentElement.offsetWidth;
    64	    const tableWidth = table.offsetWidth;
    65	    
    66	    if (tableWidth > containerWidth) {
    67	        const scale = containerWidth / tableWidth; // 100%로 꽉 채우기
    68	        container.style.transform = `scale(${scale})`;
    69	        container.style.transformOrigin = 'top left';
    70	        container.style.marginBottom = `${(table.offsetHeight * scale - table.offsetHeight) + 20}px`;
    71	    } else {
    72	        // 테이블이 컨테이너보다 작으면 100% 채우기
    73	        container.style.transform = 'scale(1)';
    74	        container.style.width = '100%';
    75	    }
    76	}
    77	
    78	// 선생님 필터 목록 로드
    79	async function loadTeachersForFilter() {
    80	    try {
    81	        const result = await API.getList('teachers', { limit: 1000 });
    82	        const allTeachers = Array.isArray(result) ? result : (result.data || []);
    83	        const teachers = allTeachers.filter(t => (t.status || '재직') === '재직');
    84	        
    85	        const selectElement = document.getElementById('teacherFilter');
    86	        if (!selectElement) return;
    87	        
    88	        teachers.forEach(teacher => {
    89	            const option = document.createElement('option');
    90	            option.value = teacher.id;
    91	            option.textContent = teacher.name;
    92	            selectElement.appendChild(option);
    93	        });
    94	    } catch (error) {
    95	        console.error('선생님 목록 로드 실패:', error);
    96	    }
    97	}
    98	
    99	// 선생님 필터 변경
   100	function filterByTeacher() {
   101	    const selectElement = document.getElementById('teacherFilter');
   102	    currentTeacherFilter = selectElement.value;
   103	    loadWeeklySchedule();
   104	}
   105	
   106	// 주간 스케줄 로드 및 렌더링
   107	async function loadWeeklySchedule() {
   108	    try {
   109	        console.log('[loadWeeklySchedule] 시작');
   110	        
   111	        // 학생 데이터 로드 (재원생만)
   112	        const studentsResult = await API.getList('students', { limit: 1000 });
   113	        console.log('[loadWeeklySchedule] API 응답:', studentsResult);
   114	        
   115	        // API 응답이 배열이면 그대로, 객체면 data 속성 사용
   116	        const allStudents = Array.isArray(studentsResult) ? studentsResult : (studentsResult.data || []);
   117	        console.log('[loadWeeklySchedule] 전체 학생 수:', allStudents.length);
   118	        
   119	        let students = allStudents.filter(s => s.status === '재원');
   120	        console.log('[loadWeeklySchedule] 재원생 수:', students.length);
   121	        
   122	        // 각 학생의 상태 확인
   123	        students.forEach(s => {
   124	            console.log(`[학생 확인] 이름: ${s.name}, 상태: ${s.status}, ID: ${s.id}`);
   125	        });
   126	        
   127	        // 선생님 필터 적용
   128	        if (currentTeacherFilter !== 'all') {
   129	            students = students.filter(s => s.teacher_id === currentTeacherFilter);
   130	            console.log('[loadWeeklySchedule] 필터링 후 학생 수:', students.length);
   131	        }
   132	        
   133	        // 학생들에게 색상 할당
   134	        assignStudentColors(students);
   135	        
   136	        // 요일별 스케줄 데이터 구성
   137	        const scheduleData = buildScheduleData(students);
   138	        
   139	        // 테이블 렌더링
   140	        renderWeeklyScheduleTable(scheduleData);
   141	        
   142	    } catch (error) {
   143	        console.error('스케줄 로드 실패:', error);
   144	        document.getElementById('weeklyScheduleTable').innerHTML = 
   145	            '<div class="alert alert-danger">스케줄을 불러오는데 실패했습니다.</div>';
   146	    }
   147	}
   148	
   149	// 학생들에게 고유 색상 할당
   150	function assignStudentColors(students) {
   151	    students.forEach((student, index) => {
   152	        if (!studentColorMap[student.id]) {
   153	            studentColorMap[student.id] = studentColors[index % studentColors.length];
   154	        }
   155	    });
   156	}
   157	
   158	// 스케줄 데이터 구성
   159	function buildScheduleData(students) {
   160	    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
   161	    const dayLabels = ['월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];
   162	    
   163	    const scheduleData = {};
   164	    let hasSaturday = false;
   165	    const maxColumnsPerDay = {}; // 각 요일의 최대 열 개수
   166	    
   167	    days.forEach((day, dayIndex) => {
   168	        scheduleData[day] = {
   169	            label: dayLabels[dayIndex],
   170	            columns: [] // 열 기반 데이터 구조로 변경
   171	        };
   172	        
   173	        maxColumnsPerDay[day] = 0;
   174	        
   175	        // 학생들의 스케줄을 열에 배치
   176	        students.forEach(student => {
   177	            // schedule이 JSON 문자열이면 파싱
   178	            let schedule = student.schedule;
   179	            
   180	            if (typeof schedule === 'string' && schedule.trim() !== '') {
   181	                try {
   182	                    schedule = JSON.parse(schedule);
   183	                } catch (e) {
   184	                    console.error('[buildScheduleData] 스케줄 파싱 오류:', e, 'student:', student.name);
   185	                    schedule = null;
   186	                }
   187	            }
   188	            
   189	            if (schedule && schedule[day] && schedule[day].enabled) {
   190	                const daySchedule = schedule[day];
   191	                const checkIn = daySchedule.checkIn;
   192	                const duration = parseInt(daySchedule.duration) || 90;
   193	                const checkOut = daySchedule.checkOut;
   194	                
   195	                if (checkIn) {
   196	                    // 토요일 스케줄이 있으면 표시
   197	                    if (day === 'saturday') {
   198	                        hasSaturday = true;
   199	                    }
   200	                    
   201	                    // 시간을 분으로 변환
   202	                    const [inHour, inMin] = checkIn.split(':').map(Number);
   203	                    const [outHour, outMin] = checkOut.split(':').map(Number);
   204	                    const startMinutes = inHour * 60 + inMin;
   205	                    const endMinutes = outHour * 60 + outMin;
   206	                    
   207	                    // 사용 가능한 열 찾기
   208	                    let assignedCol = -1;
   209	                    for (let col = 0; col < scheduleData[day].columns.length; col++) {
   210	                        const column = scheduleData[day].columns[col];
   211	                        // 이 열에서 시간이 겹치는 수업이 있는지 확인
   212	                        let hasConflict = false;
   213	                        for (let item of column) {
   214	                            const [itemInHour, itemInMin] = item.checkIn.split(':').map(Number);
   215	                            const [itemOutHour, itemOutMin] = item.checkOut.split(':').map(Number);
   216	                            const itemStart = itemInHour * 60 + itemInMin;
   217	                            const itemEnd = itemOutHour * 60 + itemOutMin;
   218	                            
   219	                            // 시간 겹침 확인
   220	                            if (!(endMinutes <= itemStart || startMinutes >= itemEnd)) {
   221	                                hasConflict = true;
   222	                                break;
   223	                            }
   224	                        }
   225	                        
   226	                        if (!hasConflict) {
   227	                            assignedCol = col;
   228	                            break;
   229	                        }
   230	                    }
   231	                    
   232	                    // 사용 가능한 열이 없으면 새 열 추가
   233	                    if (assignedCol === -1) {
   234	                        assignedCol = scheduleData[day].columns.length;
   235	                        scheduleData[day].columns.push([]);
   236	                    }
   237	                    
   238	                    // 학생을 열에 추가
   239	                    scheduleData[day].columns[assignedCol].push({
   240	                        student: student,
   241	                        duration: duration,
   242	                        checkIn: checkIn,
   243	                        checkOut: checkOut
   244	                    });
   245	                    
   246	                    console.log(`[buildScheduleData] ✅ ${student.name} ${day} - 열 ${assignedCol}에 배치: ${checkIn}~${checkOut}`);
   247	                    
   248	                    // 최대 열 개수 업데이트
   249	                    if (scheduleData[day].columns.length > maxColumnsPerDay[day]) {
   250	                        maxColumnsPerDay[day] = scheduleData[day].columns.length;
   251	                    }
   252	                }
   253	            }
   254	        });
   255	    });
   256	    
   257	    return { scheduleData, hasSaturday, maxColumnsPerDay };
   258	}
   259	
   260	// 주간 스케줄 테이블 렌더링
   261	function renderWeeklyScheduleTable(data) {
   262	    const { scheduleData, hasSaturday, maxColumnsPerDay } = data;
   263	    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
   264	    if (hasSaturday) {
   265	        days.push('saturday');
   266	    }
   267	    
   268	    const container = document.getElementById('weeklyScheduleTable');
   269	    
   270	    // 시간대 배열 (14:00 ~ 19:30, 30분 단위)
   271	    const times = [];
   272	    for (let hour = 14; hour <= 19; hour++) {
   273	        for (let min = 0; min < 60; min += 30) {
   274	            if (hour === 19 && min > 30) break; // 19:30까지만
   275	            times.push(`${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
   276	        }
   277	    }
   278	    
   279	    // 각 요일/열/시간의 셀이 이미 렌더링되었는지 추적
   280	    const renderedCells = {};
   281	    
   282	    // 요일 레이블 간단히 (월, 화, 수, 목, 금)
   283	    const dayLabelsShort = {
   284	        'monday': '월',
   285	        'tuesday': '화',
   286	        'wednesday': '수',
   287	        'thursday': '목',
   288	        'friday': '금',
   289	        'saturday': '토'
   290	    };
   291	    
   292	    let html = `
   293	        <table class="weekly-schedule-table">
   294	            <thead>
   295	                <tr>
   296	                    <th class="time-header-cell" rowspan="1"></th>
   297	    `;
   298	    
   299	    // 요일 헤더 (실제 열 개수만큼)
   300	    days.forEach(day => {
   301	        const colCount = Math.max(maxColumnsPerDay[day], 1);
   302	        html += `<th colspan="${colCount}" class="day-header">${dayLabelsShort[day]}</th>`;
   303	    });
   304	    
   305	    html += `
   306	                    </tr>
   307	                </thead>
   308	                <tbody>
   309	    `;
   310	    
   311	    // 시간대별 행
   312	    times.forEach((time, timeIndex) => {
   313	        // 정각인지 확인
   314	        const isHourMark = time.endsWith(':00');
   315	        const rowClass = isHourMark ? 'hour-mark-row' : '';
   316	        
   317	        html += `<tr class="${rowClass}">`;
   318	        
   319	        // 시간 열
   320	        html += `<td class="time-cell">${time}</td>`;
   321	        
   322	        // 각 요일의 열
   323	        days.forEach((day, dayIndex) => {
   324	            const columns = scheduleData[day].columns;
   325	            const colCount = Math.max(columns.length, 1);
   326	            
   327	            // 각 열을 렌더링
   328	            for (let col = 0; col < colCount; col++) {
   329	                const cellKey = `${dayIndex}-${col}-${timeIndex}`;
   330	                
   331	                // 요일의 마지막 열인지 확인
   332	                const isLastColOfDay = (col === colCount - 1);
   333	                
   334	                // 이미 rowspan으로 렌더링된 셀이면 건너뛰기
   335	                if (renderedCells[cellKey]) {
   336	                    continue;
   337	                }
   338	                
   339	                // 이 열에서 이 시간에 시작하는 수업 찾기
   340	                let studentSchedule = null;
   341	                if (columns[col]) {
   342	                    studentSchedule = columns[col].find(item => item.checkIn === time);
   343	                }
   344	                
   345	                if (studentSchedule) {
   346	                    const { student, duration, checkIn, checkOut } = studentSchedule;
   347	                    const slots = Math.ceil(duration / 30); // 30분당 1칸
   348	                    const color = studentColorMap[student.id];
   349	                    
   350	                    // 이 셀이 차지하는 모든 시간대를 렌더링됨으로 표시
   351	                    for (let s = 0; s < slots; s++) {
   352	                        const key = `${dayIndex}-${col}-${timeIndex + s}`;
   353	                        renderedCells[key] = true;
   354	                    }
   355	                    
   356	                    html += `
   357	                        <td rowspan="${slots}" class="student-cell ${isLastColOfDay ? 'last-col' : ''}" style="background: ${color}; vertical-align: top; padding: 0.4rem;">
   358	                            <div style="font-weight: 600; color: #333; font-size: 0.85rem;">${student.name}</div>
   359	                            <div style="font-size: 0.7rem; color: #555; margin-top: 0.2rem;">(${checkIn}-${checkOut})</div>
   360	                        </td>
   361	                    `;
   362	                } else {
   363	                    // 빈 셀
   364	                    html += `<td class="empty-cell ${isLastColOfDay ? 'last-col' : ''}"></td>`;
   365	                }
   366	            }
   367	        });
   368	        
   369	        html += `</tr>`;
   370	    });
   371	    
   372	    html += `
   373	                </tbody>
   374	            </table>
   375	    `;
   376	    
   377	    container.innerHTML = html;
   378	}
   379	
   380	// 스케줄표 인쇄
   381	function printScheduleTable() {
   382	    window.print();
   383	}
   384	
   385	// 스케줄 조회 페이지 (기존 코드 유지)
   386	async function showScheduleViewPage() {
   387	    const mainContent = document.getElementById('mainContent');
   388	    const now = new Date();
   389	    const year = now.getFullYear();
   390	    
   391	    mainContent.innerHTML = `
   392	        <div class="page-container">
   393	            <div class="page-header">
   394	                <div class="form-row" style="max-width: 400px;">
   395	                    <select id="viewScheduleYear" onchange="updateViewScheduleMonth()">
   396	                        ${generateScheduleYearOptions(year)}
   397	                    </select>
   398	                    <select id="viewScheduleMonth" onchange="loadViewSchedules()">
   399	                        ${Array.from({length: 12}, (_, i) => i + 1).map(m => 
   400	                            `<option value="${m}" ${m === now.getMonth() + 1 ? 'selected' : ''}>${m}월</option>`
   401	                        ).join('')}
   402	                    </select>
   403	                </div>
   404	            </div>
   405	            
   406	            <div id="viewCalendarView" style="margin-top: 1.5rem;"></div>
   407	            
   408	            <div style="margin-top: 2rem;">
   409	                <h3 style="margin-bottom: 1rem;">일정 목록</h3>
   410	                <div id="viewScheduleList"></div>
   411	            </div>
   412	        </div>
   413	    `;
   414	    
   415	    loadViewSchedules();
   416	}
   417	
   418	function generateScheduleYearOptions(currentYear) {
   419	    let html = '';
   420	    for (let y = currentYear - 1; y <= currentYear + 1; y++) {
   421	        html += `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}년</option>`;
   422	    }
   423	    return html;
   424	}
   425	
   426	function updateViewScheduleMonth() {
   427	    loadViewSchedules();
   428	}
   429	
   430	async function loadViewSchedules() {
   431	    const year = parseInt(document.getElementById('viewScheduleYear').value);
   432	    const month = parseInt(document.getElementById('viewScheduleMonth').value);
   433	    
   434	    try {
   435	        const result = await API.getList('schedules', { limit: 1000 });
   436	        const schedules = Array.isArray(result) ? result : (result.data || []);
   437	        
   438	        const filtered = schedules.filter(s => {
   439	            const date = new Date(s.date);
   440	            return date.getFullYear() === year && date.getMonth() + 1 === month;
   441	        });
   442	        
   443	        renderViewCalendar(year, month, filtered);
   444	        renderViewScheduleList(filtered);
   445	    } catch (error) {
   446	        document.getElementById('viewScheduleList').innerHTML = 
   447	            '<div class="alert alert-danger">데이터를 불러오는데 실패했습니다</div>';
   448	    }
   449	}
   450	
   451	function renderViewCalendar(year, month, schedules) {
   452	    document.getElementById('viewCalendarView').innerHTML = '<p>캘린더 기능은 추후 구현 예정입니다.</p>';
   453	}
   454	
   455	function renderViewScheduleList(schedules) {
   456	    const container = document.getElementById('viewScheduleList');
   457	    
   458	    if (schedules.length === 0) {
   459	        container.innerHTML = '<div class="empty-state">등록된 일정이 없습니다</div>';
   460	        return;
   461	    }
   462	    
   463	    schedules.sort((a, b) => new Date(a.date) - new Date(b.date));
   464	    
   465	    let html = '<div class="schedule-list">';
   466	    schedules.forEach(schedule => {
   467	        const date = new Date(schedule.date);
   468	        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
   469	        
   470	        html += `
   471	            <div class="schedule-item">
   472	                <div class="schedule-date">${dateStr} ${schedule.time || ''}</div>
   473	                <div class="schedule-title">${schedule.title}</div>
   474	                ${schedule.description ? `<div class="schedule-desc">${schedule.description}</div>` : ''}
   475	            </div>
   476	        `;
   477	    });
   478	    html += '</div>';
   479	    
   480	    container.innerHTML = html;
   481	}
   482	
