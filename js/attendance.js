// ============================================
     2	// 출석 관리 모듈
     3	// ============================================
     4	
     5	// 전역 변수
     6	let todayAttendanceRecords = [];
     7	let attendanceStudents = [];
     8	let allMonthAttendance = [];
     9	
    10	// ============================================
    11	// 1. 출석 체크 페이지 표시
    12	// ============================================
    13	async function showAttendanceCheckPage() {
    14	    console.log('=== 출석 체크 페이지 로드 시작 ===');
    15	    
    16	    const mainContent = document.getElementById('mainContent');
    17	    if (!mainContent) {
    18	        console.error('mainContent 요소를 찾을 수 없습니다.');
    19	        return;
    20	    }
    21	
    22	    // 페이지 HTML 구조
    23	    mainContent.innerHTML = `
    24	        <div class="attendance-check-container">
    25	            <!-- 1단: 학생 선택 (드롭다운 또는 직접입력) -->
    26	            <div class="attendance-input-section">
    27	                <div class="input-group">
    28	                    <select 
    29	                        id="studentDropdown" 
    30	                        class="student-dropdown"
    31	                        onchange="handleStudentDropdownChange()"
    32	                    >
    33	                        <option value="">재원생 선택...</option>
    34	                    </select>
    35	                    <span class="input-separator">또는</span>
    36	                    <input 
    37	                        type="text" 
    38	                        id="manualNameInput" 
    39	                        class="manual-name-input"
    40	                        placeholder="이름 직접 입력"
    41	                        maxlength="20"
    42	                    />
    43	                    <button onclick="processAttendanceManualBtn()" class="btn-search">조회</button>
    44	                </div>
    45	            </div>
    46	
    47	            <!-- 2단: 출석 테이블 -->
    48	            <div class="attendance-table-section">
    49	                <div class="table-header">
    50	                    <h2>출석 현황</h2>
    51	                    <div class="date-selector">
    52	                        <button class="date-nav-btn" onclick="changeAttendanceDate(-1)" title="전날">◀</button>
    53	                        <span class="calendar-icon" onclick="document.getElementById('attendanceDateInput').showPicker()">🗓️</span>
    54	                        <input type="date" id="attendanceDateInput" class="date-input" onchange="loadAttendanceByDate()" />
    55	                        <span id="attendanceDateDisplay" class="date-display"></span>
    56	                        <button class="date-nav-btn" onclick="changeAttendanceDate(1)" title="다음날">▶</button>
    57	                    </div>
    58	                </div>
    59	                <table class="attendance-table">
    60	                    <thead>
    61	                        <tr>
    62	                            <th>이름 (출결번호)</th>
    63	                            <th>출석시간</th>
    64	                            <th>퇴실예정시간</th>
    65	                            <th>퇴실시간</th>
    66	                            <th>재실시간</th>
    67	                            <th>상태</th>
    68	                            <th>관리</th>
    69	                        </tr>
    70	                    </thead>
    71	                    <tbody id="attendanceTableBody">
    72	                        <tr>
    73	                            <td colspan="7" style="text-align: center; color: #999;">로딩 중...</td>
    74	                        </tr>
    75	                    </tbody>
    76	                </table>
    77	            </div>
    78	
    79	            <!-- 3단: 월별 출결 현황 -->
    80	            <div class="monthly-calendar-section">
    81	                <h2>월별 출결 현황</h2>
    82	                <div class="calendar-header">
    83	                    <h3 id="calendarMonthTitle"></h3>
    84	                </div>
    85	                <div id="monthlyCalendarContainer"></div>
    86	                
    87	                <!-- 학년별 통계 표 -->
    88	                <div id="attendanceStatsContainer"></div>
    89	            </div>
    90	        </div>
    91	    `;
    92	
    93	    // 이벤트 바인딩
    94	    const manualInput = document.getElementById('manualNameInput');
    95	    if (manualInput) {
    96	        manualInput.addEventListener('keypress', (e) => {
    97	            if (e.key === 'Enter') {
    98	                processAttendanceManualBtn();
    99	            }
   100	        });
   101	    }
   102	
   103	    const checkInInput = document.getElementById('registerCheckInTime');
   104	    if (checkInInput) {
   105	        checkInInput.addEventListener('change', calculateExpectedOutTime);
   106	    }
   107	
   108	    // 오늘 날짜 설정
   109	    const dateInput = document.getElementById('attendanceDateInput');
   110	    if (dateInput) {
   111	        dateInput.value = getTodayDateString();
   112	        updateDateDisplay(getTodayDateString());
   113	    }
   114	
   115	    // 데이터 로드
   116	    await loadAttendanceData();
   117	    await loadStudentDropdown(); // 드롭다운 로드
   118	    await renderMonthlyCalendar();
   119	    
   120	    console.log('=== 출석 체크 페이지 로드 완료 ===');
   121	}
   122	
   123	// ============================================
   124	// 2. 학생 선택 처리 (드롭다운 + 직접입력)
   125	// ============================================
   126	
   127	// 재원생 드롭다운 로드
   128	async function loadStudentDropdown() {
   129	    try {
   130	        const result = await API.getList('students', { limit: 1000 });
   131	        const students = result.data || result;
   132	        
   133	        // 재원생만 필터링
   134	        const activeStudents = students.filter(s => s.status === '재원');
   135	        
   136	        // 이름순 정렬
   137	        activeStudents.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'ko-KR'));
   138	        
   139	        const dropdown = document.getElementById('studentDropdown');
   140	        if (dropdown) {
   141	            // 기존 옵션 제거 (첫 번째 제외)
   142	            while (dropdown.options.length > 1) {
   143	                dropdown.remove(1);
   144	            }
   145	            
   146	            // 재원생 옵션 추가
   147	            activeStudents.forEach(student => {
   148	                const option = document.createElement('option');
   149	                option.value = student.id;
   150	                option.textContent = `${student.name}${student.attendance_number ? ' (' + student.attendance_number + ')' : ''}`;
   151	                option.dataset.studentData = JSON.stringify(student);
   152	                dropdown.appendChild(option);
   153	            });
   154	        }
   155	        
   156	        console.log(`[드롭다운] 재원생 ${activeStudents.length}명 로드 완료`);
   157	    } catch (error) {
   158	        console.error('재원생 로드 실패:', error);
   159	    }
   160	}
   161	
   162	// 드롭다운 선택 처리
   163	function handleStudentDropdownChange() {
   164	    const dropdown = document.getElementById('studentDropdown');
   165	    const selectedOption = dropdown.options[dropdown.selectedIndex];
   166	    
   167	    if (!selectedOption || !selectedOption.value) {
   168	        return;
   169	    }
   170	    
   171	    // 직접입력 필드 초기화
   172	    const manualInput = document.getElementById('manualNameInput');
   173	    if (manualInput) {
   174	        manualInput.value = '';
   175	    }
   176	    
   177	    // 학생 데이터 파싱
   178	    try {
   179	        const studentData = JSON.parse(selectedOption.dataset.studentData);
   180	        console.log('[드롭다운 선택]', studentData.name);
   181	        
   182	        // 출석 처리
   183	        processStudentAttendance(studentData, 'active');
   184	        
   185	        // 드롭다운 초기화
   186	        dropdown.selectedIndex = 0;
   187	    } catch (error) {
   188	        console.error('학생 데이터 파싱 실패:', error);
   189	        alert('학생 정보를 불러오는데 실패했습니다.');
   190	    }
   191	}
   192	
   193	// 직접입력 처리
   194	async function processAttendanceManualBtn() {
   195	    const manualInput = document.getElementById('manualNameInput');
   196	    const name = manualInput.value.trim();
   197	    
   198	    if (!name) {
   199	        alert('이름을 입력해주세요.');
   200	        return;
   201	    }
   202	    
   203	    // 드롭다운 초기화
   204	    const dropdown = document.getElementById('studentDropdown');
   205	    if (dropdown) {
   206	        dropdown.selectedIndex = 0;
   207	    }
   208	    
   209	    console.log('[직접입력]', name);
   210	    
   211	    try {
   212	        // 1. 전체 학생 검색 (재원/휴원/퇴원 모두)
   213	        const result = await API.getList('students', { limit: 1000 });
   214	        const students = result.data || result;
   215	        
   216	        // 이름으로 검색
   217	        const foundStudent = students.find(s => s.name === name);
   218	        
   219	        if (foundStudent) {
   220	            // 학생 정보 있음
   221	            console.log(`[정보 발견] ${foundStudent.name} (${foundStudent.status})`);
   222	            processStudentAttendance(foundStudent, foundStudent.status);
   223	        } else {
   224	            // 학생 정보 없음 - 출결만 저장
   225	            console.log(`[정보 없음] ${name} - 출결만 저장`);
   226	            processStudentAttendance({ 
   227	                name: name, 
   228	                id: null, 
   229	                status: 'unknown' 
   230	            }, 'unknown');
   231	        }
   232	        
   233	        // 입력 필드 초기화
   234	        manualInput.value = '';
   235	        
   236	    } catch (error) {
   237	        console.error('학생 검색 실패:', error);
   238	        alert('학생 정보를 검색하는데 실패했습니다.');
   239	    }
   240	}
   241	
   242	// 통합 출석 처리 함수
   243	async function processStudentAttendance(studentData, studentStatus) {
   244	    console.log('출석 처리:', studentData.name, studentStatus);
   245	    
   246	    // 로그인 확인
   247	    const currentUser = getCurrentUser();
   248	    if (!currentUser) {
   249	        alert('로그인이 필요합니다.');
   250	        return;
   251	    }
   252	
   253	    // 이미 출석 체크되었는지 확인 (ID가 있는 경우만)
   254	    if (studentData.id) {
   255	        const existingRecord = todayAttendanceRecords.find(r => r.student_id === studentData.id);
   256	        
   257	        if (existingRecord) {
   258	            alert(`${studentData.name} 학생은 이미 출석 체크되었습니다.`);
   259	            return;
   260	        }
   261	    } else {
   262	        // ID가 없는 경우 이름으로 중복 체크
   263	        const existingRecord = todayAttendanceRecords.find(r => 
   264	            r.student_name === studentData.name && !r.student_id
   265	        );
   266	        
   267	        if (existingRecord) {
   268	            alert(`${studentData.name} 학생은 이미 출석 체크되었습니다.`);
   269	            return;
   270	        }
   271	    }
   272	
   273	    // 현재 시간
   274	    const now = new Date();
   275	    const checkInTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
   276	    
   277	    // 퇴실 예정 시간 계산
   278	    const schedule = studentData.id ? getStudentTodaySchedule(studentData) : null;
   279	    const expectedOutTime = calculateExpectedTime(checkInTime, schedule ? schedule.duration : 90);
   280	
   281	    // 출석 데이터 생성
   282	    const attendanceData = {
   283	        student_id: studentData.id || null,
   284	        student_name: studentData.name,
   285	        attendance_number: studentData.attendance_number || '',
   286	        date: getSelectedDateString(),
   287	        check_in_time: checkInTime,
   288	        expected_out_time: expectedOutTime,
   289	        check_out_time: '',
   290	        status: '출석',
   291	        absence_reason: '',
   292	        makeup_date: '',
   293	        is_external: studentStatus === 'unknown' // 정보 없는 학생 플래그
   294	    };
   295	
   296	    try {
   297	        const result = await API.create('attendance', attendanceData);
   298	        console.log('출석 체크 성공:', result);
   299	        
   300	        // 상태별 메시지
   301	        let message = `${studentData.name} 학생 출석 체크 완료`;
   302	        if (studentStatus === 'unknown') {
   303	            message += ' (정보 없음 - 파란색 표시)';
   304	        } else if (studentStatus === '휴원' || studentStatus === '퇴원') {
   305	            message += ` (${studentStatus} 학생)`;
   306	        }
   307	        
   308	        alert(message);
   309	        
   310	        // 데이터 새로고침
   311	        await loadAttendanceData();
   312	        await renderMonthlyCalendar();
   313	    } catch (error) {
   314	        console.error('출석 체크 실패:', error);
   315	        alert('출석 체크에 실패했습니다.');
   316	    }
   317	}
   318	
   319	// ============================================
   320	// 3. 데이터 로드
   321	// ============================================
   322	async function loadAttendanceData() {
   323	    console.log('출석 데이터 로드 시작');
   324	    
   325	    try {
   326	        // 학생 목록 로드
   327	        const studentsResponse = await API.getList('students', { limit: 1000 });
   328	        // API 응답이 배열이면 그대로, 객체면 data 속성 사용
   329	        const allStudents = Array.isArray(studentsResponse) ? studentsResponse : (studentsResponse.data || []);
   330	        
   331	        console.log('전체 학생 수:', allStudents.length);
   332	        console.log('재원생 수:', allStudents.filter(s => s.status === '재원').length);
   333	        
   334	        // 선택된 날짜의 요일 확인
   335	        const selectedDate = getSelectedDateString();
   336	        console.log('선택된 날짜:', selectedDate);
   337	        
   338	        const dateObj = new Date(selectedDate);
   339	        console.log('날짜 객체:', dateObj);
   340	        
   341	        const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
   342	        const selectedDayKey = dayKeys[dateObj.getDay()];
   343	        console.log('선택된 요일 키:', selectedDayKey, '(인덱스:', dateObj.getDay(), ')');
   344	        
   345	        // 해당 날짜에 스케줄이 있는 학생만 필터링
   346	        attendanceStudents = allStudents.filter(student => {
   347	            // 재원생이거나, 휴원/퇴원 날짜가 선택된 날짜 이후인 경우
   348	            const isActive = student.status === '재원';
   349	            const isWithinActiveDate = checkStudentActiveOnDate(student, selectedDate);
   350	            
   351	            console.log(`[${student.name}] 상태: ${student.status}, 활성: ${isActive || isWithinActiveDate}`);
   352	            
   353	            if (!isActive && !isWithinActiveDate) {
   354	                return false;
   355	            }
   356	            
   357	            // 스케줄 등록/수정 날짜 확인 (해당 날짜가 스케줄 등록 시간 이후인지)
   358	            if (student.schedule_updated_at) {
   359	                const scheduleUpdatedDate = new Date(student.schedule_updated_at);
   360	                const selectedDateObj = new Date(selectedDate);
   361	                
   362	                // 스케줄 등록 날짜 00:00:00으로 설정
   363	                scheduleUpdatedDate.setHours(0, 0, 0, 0);
   364	                selectedDateObj.setHours(0, 0, 0, 0);
   365	                
   366	                if (selectedDateObj < scheduleUpdatedDate) {
   367	                    console.log(`[${student.name}] 스케줄 등록 전 날짜 (${selectedDate} < ${scheduleUpdatedDate.toISOString().split('T')[0]})`);
   368	                    return false;
   369	                }
   370	            } else {
   371	                // schedule_updated_at이 없으면 오늘 이후만 표시
   372	                console.log(`[${student.name}] schedule_updated_at 없음 - 오늘 이후만 표시`);
   373	                const today = new Date();
   374	                const selectedDateObj = new Date(selectedDate);
   375	                
   376	                today.setHours(0, 0, 0, 0);
   377	                selectedDateObj.setHours(0, 0, 0, 0);
   378	                
   379	                if (selectedDateObj < today) {
   380	                    console.log(`[${student.name}] 오늘 이전 날짜 (${selectedDate} < ${today.toISOString().split('T')[0]})`);
   381	                    return false;
   382	                }
   383	            }
   384	            
   385	            // schedule이 JSON 문자열이면 파싱
   386	            let schedule = student.schedule;
   387	            console.log(`[${student.name}] 원본 schedule 타입: ${typeof schedule}`, schedule);
   388	            
   389	            if (typeof schedule === 'string' && schedule.trim() !== '') {
   390	                try {
   391	                    schedule = JSON.parse(schedule);
   392	                    console.log(`[${student.name}] 파싱된 schedule:`, schedule);
   393	                } catch (e) {
   394	                    console.error('스케줄 파싱 오류:', e, 'student:', student.name, 'schedule:', student.schedule);
   395	                    return false;
   396	                }
   397	            }
   398	            
   399	            if (!schedule) {
   400	                console.log(`[${student.name}] 스케줄 데이터가 없음`);
   401	                return false;
   402	            }
   403	            
   404	            if (!schedule[selectedDayKey]) {
   405	                console.log(`[${student.name}] ${selectedDayKey} 요일 데이터가 없음. 스케줄 키:`, Object.keys(schedule));
   406	                return false;
   407	            }
   408	            
   409	            const daySchedule = schedule[selectedDayKey];
   410	            const isEnabled = daySchedule.enabled === true;
   411	            console.log(`[${student.name}] ${selectedDayKey} 스케줄:`, daySchedule, '| enabled:', isEnabled);
   412	            
   413	            return isEnabled;
   414	        });
   415	        
   416	        console.log(`선택 날짜(${selectedDayKey}) 스케줄이 있는 학생:`, attendanceStudents.length);
   417	        console.log('필터링된 학생:', attendanceStudents.map(s => s.name));
   418	        
   419	        // 선택된 날짜의 출석 기록 로드
   420	        const attendanceResponse = await API.getList('attendance', { limit: 1000 });
   421	        const allAttendance = Array.isArray(attendanceResponse) ? attendanceResponse : (attendanceResponse.data || []);
   422	        
   423	        todayAttendanceRecords = allAttendance.filter(record => record.date === selectedDate);
   424	        
   425	        console.log('선택 날짜 출석 기록:', todayAttendanceRecords.length);
   426	        
   427	        // 화면 렌더링
   428	        renderStudentSelect();
   429	        renderAttendanceTable();
   430	        
   431	    } catch (error) {
   432	        console.error('데이터 로드 실패:', error);
   433	        const tbody = document.getElementById('attendanceTableBody');
   434	        if (tbody) {
   435	            tbody.innerHTML = `
   436	                <tr>
   437	                    <td colspan="6" style="text-align: center; color: #f44336;">
   438	                        데이터를 불러오는데 실패했습니다.
   439	                    </td>
   440	                </tr>
   441	            `;
   442	        }
   443	    }
   444	}
   445	
   446	// 학생이 특정 날짜에 활동 중이었는지 확인
   447	function checkStudentActiveOnDate(student, dateString) {
   448	    if (student.status === '재원') return true;
   449	    
   450	    // 휴원일 또는 퇴원일이 있는지 확인
   451	    let statusChangeDate = null;
   452	    
   453	    if (student.status === '휴원' && student.withdrawal_date) {
   454	        statusChangeDate = student.withdrawal_date;
   455	    } else if (student.status === '퇴원' && student.withdrawal_date) {
   456	        statusChangeDate = student.withdrawal_date;
   457	    }
   458	    
   459	    // 상태 변경 날짜가 없거나, 조회 날짜가 상태 변경 날짜 이전이면 활동 중
   460	    if (!statusChangeDate) return student.status === '재원';
   461	    
   462	    return dateString < statusChangeDate;
   463	}
   464	
   465	// 날짜 변경 시 데이터 다시 로드
   466	async function loadAttendanceByDate() {
   467	    const selectedDate = document.getElementById('attendanceDateInput').value;
   468	    updateDateDisplay(selectedDate);
   469	    await loadAttendanceData();
   470	    await renderMonthlyCalendar();
   471	}
   472	
   473	// 날짜 변경 (전날/다음날)
   474	function changeAttendanceDate(days) {
   475	    const dateInput = document.getElementById('attendanceDateInput');
   476	    const currentDate = new Date(dateInput.value || new Date());
   477	    currentDate.setDate(currentDate.getDate() + days);
   478	    
   479	    const year = currentDate.getFullYear();
   480	    const month = String(currentDate.getMonth() + 1).padStart(2, '0');
   481	    const day = String(currentDate.getDate()).padStart(2, '0');
   482	    const newDateStr = `${year}-${month}-${day}`;
   483	    
   484	    dateInput.value = newDateStr;
   485	    loadAttendanceByDate();
   486	}
   487	
   488	// ============================================
   489	// 4. 학생 선택 드롭다운 렌더링
   490	// ============================================
   491	function renderStudentSelect() {
   492	    const select = document.getElementById('registerStudentSelect');
   493	    if (!select) return;
   494	    
   495	    select.innerHTML = '<option value="">학생 선택</option>';
   496	    
   497	    attendanceStudents.forEach(student => {
   498	        const option = document.createElement('option');
   499	        option.value = student.id;
   500	        option.textContent = `${student.name} (${student.attendance_number || '-'})`;
   501	        select.appendChild(option);
   502	    });
   503	}
   504	
   505	// ============================================
   506	// 5. 출석 테이블 렌더링 (스케줄 기반)
   507	// ============================================
   508	function renderAttendanceTable() {
   509	    const tbody = document.getElementById('attendanceTableBody');
   510	    if (!tbody) return;
   511	    
   512	    tbody.innerHTML = '';
   513	    
   514	    // 2행: 신규 출석 등록 행 추가
   515	    const registerRow = document.createElement('tr');
   516	    registerRow.className = 'register-row';
   517	    registerRow.style.backgroundColor = '#fffbf0';
   518	    registerRow.innerHTML = `
   519	        <td>
   520	            <select id="registerStudentSelect" class="form-select">
   521	                <option value="">학생 선택</option>
   522	            </select>
   523	        </td>
   524	        <td><input type="text" id="registerCheckInTime" class="form-input" placeholder="14:00" 
   525	            onblur="this.value = formatTimeInput(this.value)" /></td>
   526	        <td><input type="text" id="registerExpectedOutTime" class="form-input" placeholder="15:30" readonly /></td>
   527	        <td><input type="text" id="registerCheckOutTime" class="form-input" placeholder="15:30"
   528	            onblur="this.value = formatTimeInput(this.value)" /></td>
   529	        <td></td>
   530	        <td>
   531	            <select id="registerStatus" class="form-select">
   532	                <option value="">상태</option>
   533	                <option value="출석">출석</option>
   534	                <option value="결석">결석</option>
   535	                <option value="보강">보강</option>
   536	            </select>
   537	        </td>
   538	        <td>
   539	            <button class="btn-register" onclick="registerNewAttendance()">등록</button>
   540	        </td>
   541	    `;
   542	    tbody.appendChild(registerRow);
   543	    
   544	    // 등록 행의 학생 선택 드롭다운 채우기
   545	    renderStudentSelectForRegister();
   546	    
   547	    // 스케줄이 있는 학생이 없는 경우
   548	    if (attendanceStudents.length === 0) {
   549	        const emptyRow = document.createElement('tr');
   550	        emptyRow.innerHTML = `
   551	            <td colspan="7" style="text-align: center; color: #999;">
   552	                해당 날짜에 스케줄이 있는 학생이 없습니다.
   553	            </td>
   554	        `;
   555	        tbody.appendChild(emptyRow);
   556	        return;
   557	    }
   558	    
   559	    // 3행부터: 각 학생의 스케줄을 기반으로 출석 행 생성 (출석시간 빠른 순으로 정렬)
   560	    const sortedStudents = attendanceStudents.slice().sort((a, b) => {
   561	        // 각 학생의 해당 날짜 스케줄 가져오기
   562	        const selectedDate = getSelectedDateString();
   563	        const dateObj = new Date(selectedDate);
   564	        const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
   565	        const selectedDayKey = dayKeys[dateObj.getDay()];
   566	        
   567	        let scheduleA = a.schedule;
   568	        let scheduleB = b.schedule;
   569	        
   570	        // 스케줄 파싱
   571	        if (typeof scheduleA === 'string' && scheduleA.trim() !== '') {
   572	            try { scheduleA = JSON.parse(scheduleA); } catch (e) { scheduleA = {}; }
   573	        }
   574	        if (typeof scheduleB === 'string' && scheduleB.trim() !== '') {
   575	            try { scheduleB = JSON.parse(scheduleB); } catch (e) { scheduleB = {}; }
   576	        }
   577	        
   578	        const dayScheduleA = scheduleA[selectedDayKey] || {};
   579	        const dayScheduleB = scheduleB[selectedDayKey] || {};
   580	        
   581	        // 출석 기록이 있으면 실제 출석시간 사용, 없으면 스케줄 시간 사용
   582	        const existingRecordA = todayAttendanceRecords.find(r => r.student_id === a.id);
   583	        const existingRecordB = todayAttendanceRecords.find(r => r.student_id === b.id);
   584	        
   585	        const checkInA = existingRecordA?.check_in_time || dayScheduleA.checkIn || '23:59';
   586	        const checkInB = existingRecordB?.check_in_time || dayScheduleB.checkIn || '23:59';
   587	        
   588	        return checkInA.localeCompare(checkInB);
   589	    });
   590	    
   591	    sortedStudents.forEach(student => {
   592	        const selectedDate = getSelectedDateString();
   593	        
   594	        // 해당 날짜의 출석 기록 찾기
   595	        const existingRecord = todayAttendanceRecords.find(r => r.student_id === student.id);
   596	        
   597	        // 학생의 스케줄 가져오기
   598	        let schedule = student.schedule;
   599	        if (typeof schedule === 'string' && schedule.trim() !== '') {
   600	            try {
   601	                schedule = JSON.parse(schedule);
   602	            } catch (e) {
   603	                console.error('스케줄 파싱 오류:', e);
   604	                return;
   605	            }
   606	        }
   607	        
   608	        // 선택된 날짜의 요일 확인
   609	        const dateObj = new Date(selectedDate);
   610	        const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
   611	        const selectedDayKey = dayKeys[dateObj.getDay()];
   612	        
   613	        const daySchedule = schedule[selectedDayKey];
   614	        if (!daySchedule || !daySchedule.enabled) return;
   615	        
   616	        // 기본값: 스케줄의 입실/퇴실 시간
   617	        let checkInTime = daySchedule.checkIn || '';
   618	        let expectedOutTime = daySchedule.checkOut || '';
   619	        let checkOutTime = '';
   620	        let status = ''; // 상태는 비워둠
   621	        let actualDuration = '';
   622	        let scheduledDuration = parseInt(daySchedule.duration) || 90; // 스케줄의 재실시간(분)
   623	        
   624	        // 출석 기록이 있으면 실제 값 사용
   625	        let absenceReason = '';
   626	        let makeupDate = '';
   627	        
   628	        if (existingRecord) {
   629	            checkInTime = existingRecord.check_in_time || checkInTime;
   630	            expectedOutTime = existingRecord.expected_out_time || expectedOutTime;
   631	            checkOutTime = existingRecord.check_out_time || '';
   632	            status = existingRecord.status || '';
   633	            absenceReason = existingRecord.absence_reason || '';
   634	            makeupDate = existingRecord.makeup_date || '';
   635	            
   636	            // 재실시간 계산 (입실시간과 퇴실시간이 모두 있을 때)
   637	            if (checkInTime && checkOutTime) {
   638	                actualDuration = calculateDurationInMinutes(checkInTime, checkOutTime);
   639	            }
   640	        }
   641	        
   642	        const row = document.createElement('tr');
   643	        row.dataset.studentId = student.id;
   644	        row.dataset.recordId = existingRecord ? existingRecord.id : '';
   645	        row.dataset.scheduledDuration = scheduledDuration;
   646	        
   647	        // 재실시간 색상 결정
   648	        let durationColor = '';
   649	        let durationText = actualDuration ? `${actualDuration}분` : '';
   650	        if (actualDuration && actualDuration < scheduledDuration) {
   651	            durationColor = 'style="color: red; font-weight: bold;"';
   652	        }
   653	        
   654	        // 상태별 색상 및 텍스트
   655	        let statusColor = '';
   656	        let statusText = status || '';
   657	        let statusStyle = '';
   658	        
   659	        if (status === '출석') {
   660	            statusColor = 'style="color: #4CAF50; font-weight: 600;"';
   661	        } else if (status === '보강') {
   662	            statusColor = 'style="color: #f44336; font-weight: 600;"';
   663	        } else if (status === '결석') {
   664	            // 결석 사유 표시
   665	            if (absenceReason) {
   666	                statusText = `결석(${absenceReason})`;
   667	            }
   668	            statusColor = 'style="color: #000; font-weight: 600; text-decoration: line-through;"';
   669	        } else {
   670	            // 상태가 비어있으면 검정색
   671	            statusColor = 'style="color: #000;"';
   672	        }
   673	        
   674	        row.innerHTML = `
   675	            <td>${student.name} (${student.attendance_number || '-'})</td>
   676	            <td>
   677	                <span class="display-mode" id="display-checkin-${student.id}">${checkInTime || '-'}</span>
   678	                <input type="text" class="form-input edit-mode" id="edit-checkin-${student.id}" value="${checkInTime}" placeholder="14:00" style="display: none;"
   679	                    onblur="this.value = formatTimeInput(this.value)" />
   680	            </td>
   681	            <td>
   682	                <span class="display-mode" id="display-expected-${student.id}">${expectedOutTime || '-'}</span>
   683	                <input type="text" class="form-input edit-mode" id="edit-expected-${student.id}" value="${expectedOutTime}" placeholder="15:30" readonly style="display: none;" />
   684	            </td>
   685	            <td>
   686	                <span class="display-mode" id="display-checkout-${student.id}">${checkOutTime || '-'}</span>
   687	                <input type="text" class="form-input edit-mode" id="edit-checkout-${student.id}" value="${checkOutTime}" placeholder="15:30" style="display: none;"
   688	                    onblur="this.value = formatTimeInput(this.value)" />
   689	            </td>
   690	            <td class="duration-display" ${durationColor}>${durationText}</td>
   691	            <td>
   692	                <span class="display-mode" id="display-status-${student.id}" ${statusColor}>${statusText || '-'}</span>
   693	                <div class="edit-mode" id="edit-status-container-${student.id}" style="display: none;">
   694	                    <select class="form-select" id="status-${student.id}" onchange="handleStatusChange('${student.id}')">
   695	                        <option value="" ${status === '' ? 'selected' : ''}></option>
   696	                        <option value="출석" ${status === '출석' ? 'selected' : ''}>출석</option>
   697	                        <option value="결석" ${status === '결석' ? 'selected' : ''}>결석</option>
   698	                        <option value="보강" ${status === '보강' ? 'selected' : ''}>보강</option>
   699	                    </select>
   700	                    <select class="form-select" id="absence-reason-${student.id}" style="display: ${status === '결석' ? 'block' : 'none'}; margin-top: 5px;">
   701	                        <option value="">사유 선택</option>
   702	                        <option value="병결" ${absenceReason === '병결' ? 'selected' : ''}>병결</option>
   703	                        <option value="학교" ${absenceReason === '학교' ? 'selected' : ''}>학교</option>
   704	                        <option value="여행" ${absenceReason === '여행' ? 'selected' : ''}>여행</option>
   705	                        <option value="기타" ${absenceReason === '기타' ? 'selected' : ''}>기타</option>
   706	                    </select>
   707	                    <div id="makeup-date-${student.id}" style="display: ${status === '보강' ? 'block' : 'none'}; margin-top: 5px;">
   708	                        <input type="date" id="makeup-date-input-${student.id}" class="form-input" value="${makeupDate}" style="width: 100%;" placeholder="보강 날짜" />
   709	                    </div>
   710	                </div>
   711	            </td>
   712	            <td>
   713	                <button class="btn-icon btn-edit display-mode" id="btn-edit-${student.id}" onclick="enterEditMode('${student.id}')" title="수정">✏️</button>
   714	                ${existingRecord ? `<button class="btn-icon btn-delete display-mode" id="btn-delete-${student.id}" onclick="deleteAttendance('${student.id}', '${existingRecord.id}')" style="margin-left: 0.5rem;" title="삭제">✕</button>` : ''}
   715	                <div class="edit-mode" id="edit-buttons-${student.id}" style="display: none;">
   716	                    <button class="btn-save" onclick="saveAttendance('${student.id}')">저장</button>
   717	                    <button class="btn-cancel" onclick="cancelEditMode('${student.id}')">취소</button>
   718	                </div>
   719	            </td>
   720	        `;
   721	        
   722	        tbody.appendChild(row);
   723	    });
   724	}
   725	
   726	// 재실시간 계산 (분 단위로 반환)
   727	function calculateDurationInMinutes(startTime, endTime) {
   728	    if (!startTime || !endTime) return 0;
   729	    
   730	    const [startHour, startMin] = startTime.split(':').map(Number);
   731	    const [endHour, endMin] = endTime.split(':').map(Number);
   732	    
   733	    const startMinutes = startHour * 60 + startMin;
   734	    const endMinutes = endHour * 60 + endMin;
   735	    
   736	    const diffMinutes = endMinutes - startMinutes;
   737	    
   738	    return diffMinutes > 0 ? diffMinutes : 0;
   739	}
   740	
   741	// ============================================
   742	// 수정/취소 모드 전환
   743	// ============================================
   744	
   745	function enterEditMode(studentId) {
   746	    // Display 모드 숨기기
   747	    const displayElements = document.querySelectorAll(`#display-checkin-${studentId}, #display-expected-${studentId}, #display-checkout-${studentId}, #display-status-${studentId}, #btn-edit-${studentId}`);
   748	    displayElements.forEach(el => {
   749	        if (el) el.style.display = 'none';
   750	    });
   751	    
   752	    // Edit 모드 표시
   753	    const editElements = document.querySelectorAll(`#edit-checkin-${studentId}, #edit-expected-${studentId}, #edit-checkout-${studentId}, #edit-status-container-${studentId}, #edit-buttons-${studentId}`);
   754	    editElements.forEach(el => {
   755	        if (el) el.style.display = el.id.includes('container') ? 'block' : 'inline-block';
   756	    });
   757	}
   758	
   759	function cancelEditMode(studentId) {
   760	    // Edit 모드 숨기기
   761	    const editElements = document.querySelectorAll(`#edit-checkin-${studentId}, #edit-expected-${studentId}, #edit-checkout-${studentId}, #edit-status-container-${studentId}, #edit-buttons-${studentId}`);
   762	    editElements.forEach(el => {
   763	        if (el) el.style.display = 'none';
   764	    });
   765	    
   766	    // Display 모드 표시
   767	    const displayElements = document.querySelectorAll(`#display-checkin-${studentId}, #display-expected-${studentId}, #display-checkout-${studentId}, #display-status-${studentId}, #btn-edit-${studentId}`);
   768	    displayElements.forEach(el => {
   769	        if (el) el.style.display = 'inline-block';
   770	    });
   771	    
   772	    // 데이터 다시 로드하여 원래 값으로 복원
   773	    loadAttendanceData();
   774	}
   775	
   776	// 시간 형식 변환 함수 (1530 → 15:30)
   777	function formatTimeInput(value) {
   778	    if (!value) return '';
   779	    
   780	    // 숫자만 추출
   781	    const digits = value.replace(/\D/g, '');
   782	    
   783	    // 4자리 숫자인 경우 HH:MM 형식으로 변환
   784	    if (digits.length === 4) {
   785	        const hour = digits.substring(0, 2);
   786	        const minute = digits.substring(2, 4);
   787	        
   788	        // 유효성 검사
   789	        if (parseInt(hour) < 24 && parseInt(minute) < 60) {
   790	            return `${hour}:${minute}`;
   791	        }
   792	    }
   793	    
   794	    // 이미 HH:MM 형식이면 그대로 반환
   795	    if (/^\d{2}:\d{2}$/.test(value)) {
   796	        return value;
   797	    }
   798	    
   799	    return value;
   800	}
   801	
   802	// 출석 필드 업데이트
   803	async function updateAttendanceField(studentId, field, value) {
   804	    const row = document.querySelector(`tr[data-student-id="${studentId}"]`);
   805	    if (!row) return;
   806	    
   807	    const recordId = row.dataset.recordId;
   808	    
   809	    // 입실시간 변경 시 퇴실예정시간 자동 계산
   810	    if (field === 'check_in_time' && value) {
   811	        const student = attendanceStudents.find(s => s.id === studentId);
   812	        if (student) {
   813	            let schedule = student.schedule;
   814	            if (typeof schedule === 'string') {
   815	                try {
   816	                    schedule = JSON.parse(schedule);
   817	                } catch (e) {
   818	                    return;
   819	                }
   820	            }
   821	            
   822	            const selectedDate = getSelectedDateString();
   823	            const dateObj = new Date(selectedDate);
   824	            const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
   825	            const selectedDayKey = dayKeys[dateObj.getDay()];
   826	            
   827	            const daySchedule = schedule[selectedDayKey];
   828	            if (daySchedule) {
   829	                const duration = parseInt(daySchedule.duration) || 90;
   830	                const expectedOut = addMinutesToTime(value, duration);
   831	                
   832	                const expectedOutInput = row.querySelector('td:nth-child(3) input');
   833	                if (expectedOutInput) {
   834	                    expectedOutInput.value = expectedOut;
   835	                }
   836	            }
   837	        }
   838	    }
   839	    
   840	    // 퇴실시간 변경 시 재실시간 자동 계산 및 색상 처리
   841	    if (field === 'check_out_time') {
   842	        const checkInInput = row.querySelector('td:nth-child(2) input');
   843	        const durationCell = row.querySelector('.duration-display');
   844	        const scheduledDuration = parseInt(row.dataset.scheduledDuration) || 90;
   845	        
   846	        if (checkInInput && durationCell && value) {
   847	            const actualDuration = calculateDurationInMinutes(checkInInput.value, value);
   848	            
   849	            // 재실시간 표시
   850	            durationCell.textContent = `${actualDuration}분`;
   851	            
   852	            // 색상 처리: 스케줄보다 작으면 빨강, 이상이면 검정
   853	            if (actualDuration < scheduledDuration) {
   854	                durationCell.style.color = 'red';
   855	                durationCell.style.fontWeight = 'bold';
   856	            } else {
   857	                durationCell.style.color = '';
   858	                durationCell.style.fontWeight = '';
   859	            }
   860	        }
   861	    }
   862	    
   863	    // 상태를 "출석"으로 변경 시 스케줄 시간으로 자동 설정
   864	    if (field === 'status' && value === '출석') {
   865	        const student = attendanceStudents.find(s => s.id === studentId);
   866	        if (student) {
   867	            let schedule = student.schedule;
   868	            if (typeof schedule === 'string') {
   869	                try {
   870	                    schedule = JSON.parse(schedule);
   871	                } catch (e) {
   872	                    return;
   873	                }
   874	            }
   875	            
   876	            const selectedDate = getSelectedDateString();
   877	            const dateObj = new Date(selectedDate);
   878	            const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
   879	            const selectedDayKey = dayKeys[dateObj.getDay()];
   880	            
   881	            const daySchedule = schedule[selectedDayKey];
   882	            if (daySchedule) {
   883	                // 스케줄의 입실/퇴실 시간으로 설정
   884	                const checkInInput = row.querySelector('td:nth-child(2) input');
   885	                const checkOutInput = row.querySelector('td:nth-child(4) input');
   886	                const expectedOutInput = row.querySelector('td:nth-child(3) input');
   887	                const durationCell = row.querySelector('.duration-display');
   888	                
   889	                if (checkInInput && daySchedule.checkIn) {
   890	                    checkInInput.value = daySchedule.checkIn;
   891	                }
   892	                
   893	                if (expectedOutInput && daySchedule.checkOut) {
   894	                    expectedOutInput.value = daySchedule.checkOut;
   895	                }
   896	                
   897	                if (checkOutInput && daySchedule.checkOut) {
   898	                    checkOutInput.value = daySchedule.checkOut;
   899	                }
   900	                
   901	                // 재실시간 자동 계산 및 표시
   902	                if (durationCell && daySchedule.duration) {
   903	                    const scheduledDuration = parseInt(daySchedule.duration) || 90;
   904	                    durationCell.textContent = `${scheduledDuration}분`;
   905	                    durationCell.style.color = '';
   906	                    durationCell.style.fontWeight = '';
   907	                }
   908	            }
   909	        }
   910	    }
   911	}
   912	
   913	// 시간에 분 추가 (HH:MM 형식)
   914	function addMinutesToTime(time, minutes) {
   915	    if (!time) return '';
   916	    
   917	    const [hour, min] = time.split(':').map(Number);
   918	    const totalMinutes = hour * 60 + min + minutes;
   919	    
   920	    const newHour = Math.floor(totalMinutes / 60) % 24;
   921	    const newMin = totalMinutes % 60;
   922	    
   923	    return `${String(newHour).padStart(2, '0')}:${String(newMin).padStart(2, '0')}`;
   924	}
   925	
   926	// 출석 저장
   927	async function saveAttendance(studentId) {
   928	    const row = document.querySelector(`tr[data-student-id="${studentId}"]`);
   929	    if (!row) return;
   930	    
   931	    const recordId = row.dataset.recordId;
   932	    const selectedDate = getSelectedDateString();
   933	    
   934	    // 입력 필드에서 값 가져오기
   935	    let checkInTime = document.getElementById(`edit-checkin-${studentId}`)?.value || '';
   936	    const expectedOutTime = document.getElementById(`edit-expected-${studentId}`)?.value || '';
   937	    let checkOutTime = document.getElementById(`edit-checkout-${studentId}`)?.value || '';
   938	    let status = document.getElementById(`status-${studentId}`)?.value || '';
   939	    const absenceReason = document.getElementById(`absence-reason-${studentId}`)?.value || '';
   940	    const makeupDate = document.getElementById(`makeup-date-input-${studentId}`)?.value || '';
   941	    
   942	    // 스케줄에서 기본값 가져오기
   943	    const student = attendanceStudents.find(s => s.id === studentId);
   944	    if (student) {
   945	        let schedule = student.schedule;
   946	        if (typeof schedule === 'string' && schedule.trim() !== '') {
   947	            try {
   948	                schedule = JSON.parse(schedule);
   949	            } catch (e) {
   950	                schedule = {};
   951	            }
   952	        }
   953	        
   954	        const dateObj = new Date(selectedDate);
   955	        const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
   956	        const selectedDayKey = dayKeys[dateObj.getDay()];
   957	        const daySchedule = schedule[selectedDayKey];
   958	        
   959	        // 입력하지 않았으면 스케줄 시간 사용
   960	        if (!checkInTime && daySchedule) {
   961	            checkInTime = daySchedule.checkIn || '';
   962	        }
   963	        if (!checkOutTime && daySchedule) {
   964	            checkOutTime = daySchedule.checkOut || '';
   965	        }
   966	    }
   967	    
   968	    // 입실시간이 없으면 경고
   969	    if (!checkInTime) {
   970	        alert('출석시간을 입력하거나 스케줄을 등록해주세요.');
   971	        return;
   972	    }
   973	    
   974	    // 상태가 비어있으면 기본값 "출석"으로 설정
   975	    if (!status) {
   976	        status = '출석';
   977	    }
   978	    
   979	    // 학생 이름 가져오기
   980	    const studentName = student ? student.name : '';
   981	    
   982	    const attendanceData = {
   983	        student_id: studentId,
   984	        student_name: studentName,
   985	        date: selectedDate,
   986	        check_in_time: checkInTime,
   987	        expected_out_time: expectedOutTime,
   988	        check_out_time: checkOutTime,
   989	        status: status,
   990	        absence_reason: absenceReason,
   991	        makeup_date: makeupDate
   992	    };
   993	    
   994	    try {
   995	        if (recordId) {
   996	            // 기존 기록 업데이트
   997	            await API.update('attendance', recordId, attendanceData);
   998	            alert('출석이 수정되었습니다.');
   999	        } else {
  1000	            // 새 기록 생성
  1001	            await API.create('attendance', attendanceData);
  1002	            alert('출석이 저장되었습니다.');
  1003	        }
  1004	        
  1005	        // 데이터 다시 로드
  1006	        await loadAttendanceData();
  1007	        await renderMonthlyCalendar();
  1008	        
  1009	    } catch (error) {
  1010	        console.error('출석 저장 오류:', error);
  1011	        alert('출석 저장에 실패했습니다.');
  1012	    }
  1013	}
  1014	
  1015	// 출석 삭제 (확정된 출석만 삭제 가능)
  1016	async function deleteAttendance(studentId, recordId) {
  1017	    if (!confirm('이 출석 기록을 삭제하시겠습니까?\n\n※ 삭제 후에는 예정 스케줄로 돌아갑니다.')) {
  1018	        return;
  1019	    }
  1020	    
  1021	    try {
  1022	        await API.delete('attendance', recordId);
  1023	        alert('출석 기록이 삭제되었습니다.');
  1024	        
  1025	        // 데이터 다시 로드
  1026	        await loadAttendanceData();
  1027	        await renderMonthlyCalendar();
  1028	        
  1029	    } catch (error) {
  1030	        console.error('출석 삭제 오류:', error);
  1031	        alert('출석 삭제에 실패했습니다.');
  1032	    }
  1033	}
  1034	
  1035	// ============================================
  1036	// 6. 출석 등록
  1037	// ============================================
  1038	
  1039	// 상태 변경 핸들러
  1040	function handleStatusChange(studentId) {
  1041	    const statusSelect = document.getElementById(`status-${studentId}`);
  1042	    const reasonSelect = document.getElementById(`absence-reason-${studentId}`);
  1043	    const makeupDateDiv = document.getElementById(`makeup-date-${studentId}`);
  1044	    
  1045	    if (!statusSelect) return;
  1046	    
  1047	    const status = statusSelect.value;
  1048	    
  1049	    // 상태를 updateAttendanceField로 업데이트
  1050	    updateAttendanceField(studentId, 'status', status);
  1051	    
  1052	    if (status === '결석') {
  1053	        if (reasonSelect) reasonSelect.style.display = 'block';
  1054	        if (makeupDateDiv) makeupDateDiv.style.display = 'none';
  1055	    } else if (status === '보강') {
  1056	        if (reasonSelect) reasonSelect.style.display = 'none';
  1057	        if (makeupDateDiv) makeupDateDiv.style.display = 'block';
  1058	    } else {
  1059	        if (reasonSelect) reasonSelect.style.display = 'none';
  1060	        if (makeupDateDiv) makeupDateDiv.style.display = 'none';
  1061	    }
  1062	}
  1063	
  1064	async function registerAttendance() {
  1065	    console.log('출석 등록 시작');
  1066	    
  1067	    // 로그인 확인
  1068	    const currentUser = getCurrentUser();
  1069	    if (!currentUser) {
  1070	        alert('로그인이 필요합니다.');
  1071	        return;
  1072	    }
  1073	    
  1074	    // 입력값 가져오기
  1075	    const studentId = document.getElementById('registerStudentSelect').value;
  1076	    const checkInTime = document.getElementById('registerCheckInTime').value;
  1077	    const expectedOutTime = document.getElementById('registerExpectedOutTime').value;
  1078	    const checkOutTime = document.getElementById('registerCheckOutTime').value;
  1079	    const status = document.getElementById('registerStatus').value;
  1080	    const absenceReason = document.getElementById('registerAbsenceReason').value;
  1081	    const makeupDate = document.getElementById('registerMakeupDate').value;
  1082	    
  1083	    // 필수값 검증
  1084	    if (!studentId) {
  1085	        alert('학생을 선택해주세요.');
  1086	        return;
  1087	    }
  1088	    
  1089	    if (!checkInTime) {
  1090	        alert('출석시간을 입력해주세요.');
  1091	        return;
  1092	    }
  1093	    
  1094	    // 학생 정보 찾기
  1095	    const student = attendanceStudents.find(s => s.id === studentId);
  1096	    if (!student) {
  1097	        alert('학생 정보를 찾을 수 없습니다.');
  1098	        return;
  1099	    }
  1100	    
  1101	    // 이미 출석 체크되었는지 확인
  1102	    const existingRecord = todayAttendanceRecords.find(r => r.student_id === studentId);
  1103	    if (existingRecord) {
  1104	        alert(`${student.name} 학생은 이미 출석 체크되었습니다.`);
  1105	        return;
  1106	    }
  1107	    
  1108	    // 출석 데이터 생성
  1109	    const attendanceData = {
  1110	        student_id: studentId,
  1111	        student_name: student.name,
  1112	        attendance_number: student.attendance_number,
  1113	        date: getSelectedDateString(),
  1114	        check_in_time: checkInTime,
  1115	        expected_out_time: expectedOutTime,
  1116	        check_out_time: checkOutTime,
  1117	        status: status,
  1118	        absence_reason: status === '결석' ? absenceReason : '',
  1119	        makeup_date: status === '보강' ? makeupDate : ''
  1120	    };
  1121	    
  1122	    try {
  1123	        const result = await API.create('attendance', attendanceData);
  1124	        console.log('출석 등록 성공:', result);
  1125	        alert('출석이 등록되었습니다.');
  1126	        
  1127	        // 입력 폼 초기화
  1128	        document.getElementById('registerStudentSelect').value = '';
  1129	        document.getElementById('registerCheckInTime').value = '';
  1130	        document.getElementById('registerExpectedOutTime').value = '';
  1131	        document.getElementById('registerCheckOutTime').value = '';
  1132	        document.getElementById('registerStatus').value = '출석';
  1133	        document.getElementById('registerAbsenceReason').style.display = 'none';
  1134	        document.getElementById('registerMakeupDate').style.display = 'none';
  1135	        
  1136	        // 데이터 새로고침
  1137	        await loadAttendanceData();
  1138	        await renderMonthlyCalendar();
  1139	        
  1140	    } catch (error) {
  1141	        console.error('출석 등록 실패:', error);
  1142	        alert('출석 등록에 실패했습니다.');
  1143	    }
  1144	}
  1145	
  1146	// ============================================
  1147	// 7. 출석 수정
  1148	// ============================================
  1149	async function editAttendance(recordId) {
  1150	    console.log('출석 수정:', recordId);
  1151	    
  1152	    // 로그인 확인
  1153	    const currentUser = getCurrentUser();
  1154	    if (!currentUser) {
  1155	        alert('로그인이 필요합니다.');
  1156	        return;
  1157	    }
  1158	    
  1159	    // 기록 찾기
  1160	    const record = todayAttendanceRecords.find(r => r.id === recordId);
  1161	    if (!record) {
  1162	        alert('출석 기록을 찾을 수 없습니다.');
  1163	        return;
  1164	    }
  1165	    
  1166	    // 수정할 값 입력받기
  1167	    const newCheckIn = prompt('출석시간 (HH:MM)', record.check_in_time || '');
  1168	    if (newCheckIn === null) return; // 취소
  1169	    
  1170	    const newCheckOut = prompt('퇴실시간 (HH:MM)', record.check_out_time || '');
  1171	    if (newCheckOut === null) return; // 취소
  1172	    
  1173	    // 퇴실예정시간 재계산
  1174	    const student = attendanceStudents.find(s => s.id === record.student_id);
  1175	    const schedule = getStudentTodaySchedule(student);
  1176	    const newExpectedOut = calculateExpectedTime(newCheckIn, schedule ? schedule.duration : 90);
  1177	    
  1178	    try {
  1179	        await API.update('attendance', recordId, {
  1180	            ...record,
  1181	            check_in_time: newCheckIn,
  1182	            check_out_time: newCheckOut,
  1183	            expected_out_time: newExpectedOut
  1184	        });
  1185	        
  1186	        console.log('출석 수정 성공');
  1187	        alert('출석 정보가 수정되었습니다.');
  1188	        
  1189	        // 데이터 새로고침
  1190	        await loadAttendanceData();
  1191	        await renderMonthlyCalendar();
  1192	        
  1193	    } catch (error) {
  1194	        console.error('출석 수정 실패:', error);
  1195	        alert('출석 수정에 실패했습니다.');
  1196	    }
  1197	}
  1198	
  1199	// ============================================
  1200	// 8. 출석 삭제
  1201	// ============================================
  1202	async function deleteAttendance(recordId) {
  1203	    console.log('출석 삭제:', recordId);
  1204	    
  1205	    // 로그인 확인
  1206	    const currentUser = getCurrentUser();
  1207	    if (!currentUser) {
  1208	        alert('로그인이 필요합니다.');
  1209	        return;
  1210	    }
  1211	    
  1212	    if (!confirm('정말 삭제하시겠습니까?')) {
  1213	        return;
  1214	    }
  1215	    
  1216	    try {
  1217	        await API.delete('attendance', recordId);
  1218	        console.log('출석 삭제 성공');
  1219	        alert('출석 기록이 삭제되었습니다.');
  1220	        
  1221	        // 데이터 새로고침
  1222	        await loadAttendanceData();
  1223	        await renderMonthlyCalendar();
  1224	        
  1225	    } catch (error) {
  1226	        console.error('출석 삭제 실패:', error);
  1227	        alert('출석 삭제에 실패했습니다.');
  1228	    }
  1229	}
  1230	
  1231	// ============================================
  1232	// 9. 유틸리티 함수
  1233	// ============================================
  1234	
  1235	// 오늘 날짜 문자열 (YYYY-MM-DD)
  1236	function getTodayDateString() {
  1237	    const today = new Date();
  1238	    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  1239	}
  1240	
  1241	// 선택된 날짜 문자열 가져오기
  1242	function getSelectedDateString() {
  1243	    const dateInput = document.getElementById('attendanceDateInput');
  1244	    return dateInput ? dateInput.value : getTodayDateString();
  1245	}
  1246	
  1247	// 날짜 표시 업데이트 (YYYY-MM-DD (요일))
  1248	function updateDateDisplay(dateString) {
  1249	    const dateDisplay = document.getElementById('attendanceDateDisplay');
  1250	    if (!dateDisplay) return;
  1251	    
  1252	    const date = new Date(dateString);
  1253	    const dayNames = ['일', '월', '화', '수', '목', '금', '토'];
  1254	    const dayName = dayNames[date.getDay()];
  1255	    
  1256	    dateDisplay.textContent = `${dateString} (${dayName})`;
  1257	}
  1258	
  1259	// 학생의 선택된 날짜 스케줄 가져오기
  1260	function getStudentTodaySchedule(student) {
  1261	    if (!student || !student.schedule) return null;
  1262	    
  1263	    const selectedDate = getSelectedDateString();
  1264	    const dateObj = new Date(selectedDate);
  1265	    const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  1266	    const selectedDayKey = dayKeys[dateObj.getDay()];
  1267	    
  1268	    const scheduleForDay = student.schedule[selectedDayKey];
  1269	    if (!scheduleForDay || !scheduleForDay.enabled) return null;
  1270	    
  1271	    return scheduleForDay;
  1272	}
  1273	
  1274	// 퇴실 예정 시간 계산
  1275	function calculateExpectedTime(checkInTime, durationMinutes) {
  1276	    if (!checkInTime) return '';
  1277	    
  1278	    const [hours, minutes] = checkInTime.split(':').map(Number);
  1279	    const checkInDate = new Date();
  1280	    checkInDate.setHours(hours, minutes, 0, 0);
  1281	    
  1282	    const expectedOutDate = new Date(checkInDate.getTime() + durationMinutes * 60000);
  1283	    
  1284	    return `${String(expectedOutDate.getHours()).padStart(2, '0')}:${String(expectedOutDate.getMinutes()).padStart(2, '0')}`;
  1285	}
  1286	
  1287	// 등록 폼의 퇴실 예정 시간 계산
  1288	function calculateExpectedOutTime() {
  1289	    const checkInTime = document.getElementById('registerCheckInTime').value;
  1290	    const studentId = document.getElementById('registerStudentSelect').value;
  1291	    
  1292	    if (!checkInTime || !studentId) {
  1293	        document.getElementById('registerExpectedOutTime').value = '';
  1294	        return;
  1295	    }
  1296	    
  1297	    const student = attendanceStudents.find(s => s.id === studentId);
  1298	    const schedule = getStudentTodaySchedule(student);
  1299	    const duration = schedule ? schedule.duration : 90;
  1300	    
  1301	    const expectedTime = calculateExpectedTime(checkInTime, duration);
  1302	    document.getElementById('registerExpectedOutTime').value = expectedTime;
  1303	}
  1304	
  1305	// ============================================
  1306	// 월별 출결 현황 달력
  1307	// ============================================
  1308	
  1309	// 월별 달력 렌더링
  1310	async function renderMonthlyCalendar() {
  1311	    const container = document.getElementById('monthlyCalendarContainer');
  1312	    const title = document.getElementById('calendarMonthTitle');
  1313	    
  1314	    if (!container || !title) return;
  1315	    
  1316	    // 선택된 날짜의 연/월 사용 (출석현황에서 선택한 날짜 기준)
  1317	    const selectedDate = getSelectedDateString();
  1318	    const selectedDateObj = new Date(selectedDate);
  1319	    const currentYear = selectedDateObj.getFullYear();
  1320	    const currentMonth = selectedDateObj.getMonth();
  1321	    
  1322	    // 오늘 날짜
  1323	    const today = new Date();
  1324	    const todayDate = today.getDate();
  1325	    
  1326	    title.textContent = `${currentYear}년 ${currentMonth + 1}월`;
  1327	    
  1328	    // 해당 월의 출석 기록 로드
  1329	    await loadMonthAttendance(currentYear, currentMonth);
  1330	    
  1331	    // 달력 생성
  1332	    const firstDay = new Date(currentYear, currentMonth, 1);
  1333	    const lastDay = new Date(currentYear, currentMonth + 1, 0);
  1334	    
  1335	    // 월요일부터 시작하도록 조정
  1336	    let startDayOfWeek = firstDay.getDay();
  1337	    if (startDayOfWeek === 0) startDayOfWeek = 7;
  1338	    startDayOfWeek -= 1;
  1339	    
  1340	    // 항상 월~금요일만 표시 (5열)
  1341	    const maxDayOfWeek = 4; // 인덱스 0~4 (월~금)
  1342	    
  1343	    // 달력 테이블 생성
  1344	    let calendarHTML = '<table class="monthly-calendar">';
  1345	    
  1346	    // 요일 헤더
  1347	    calendarHTML += '<thead><tr>';
  1348	    const dayNames = ['월', '화', '수', '목', '금'];
  1349	    for (let i = 0; i <= maxDayOfWeek; i++) {
  1350	        calendarHTML += `<th>${dayNames[i]}</th>`;
  1351	    }
  1352	    calendarHTML += '</tr></thead><tbody>';
  1353	    
  1354	    // 날짜 셀 생성
  1355	    let currentDate = 1;
  1356	    let finished = false;
  1357	    
  1358	    while (!finished) {
  1359	        let rowHTML = '';
  1360	        let hasContent = false; // 이 행에 실제 날짜가 있는지 확인
  1361	        
  1362	        for (let dayOfWeek = 0; dayOfWeek <= maxDayOfWeek; dayOfWeek++) {
  1363	            if (currentDate > lastDay.getDate()) {
  1364	                rowHTML += '<td class="empty-cell"></td>';
  1365	                finished = true;
  1366	                continue;
  1367	            }
  1368	            
  1369	            // 실제 요일 확인 (0=일, 1=월, ..., 6=토)
  1370	            let actualDate = new Date(currentYear, currentMonth, currentDate);
  1371	            let actualDayOfWeek = actualDate.getDay();
  1372	            
  1373	            // 토요일(6) 또는 일요일(0)을 만나면 계속 건너뛰기
  1374	            while ((actualDayOfWeek === 0 || actualDayOfWeek === 6) && currentDate <= lastDay.getDate()) {
  1375	                currentDate++;
  1376	                if (currentDate > lastDay.getDate()) break;
  1377	                actualDate = new Date(currentYear, currentMonth, currentDate);
  1378	                actualDayOfWeek = actualDate.getDay();
  1379	            }
  1380	            
  1381	            if (currentDate > lastDay.getDate()) {
  1382	                rowHTML += '<td class="empty-cell"></td>';
  1383	                finished = true;
  1384	                continue;
  1385	            }
  1386	            
  1387	            if (currentDate === 1 && dayOfWeek < startDayOfWeek) {
  1388	                // 첫 주의 빈 칸
  1389	                rowHTML += '<td class="empty-cell"></td>';
  1390	            } else {
  1391	                hasContent = true; // 실제 날짜가 있음
  1392	                const dateString = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`;
  1393	                
  1394	                // 오늘 날짜와 비교
  1395	                const cellDateObj = new Date(currentYear, currentMonth, currentDate);
  1396	                const todayObj = new Date();
  1397	                todayObj.setHours(0, 0, 0, 0);
  1398	                cellDateObj.setHours(0, 0, 0, 0);
  1399	                
  1400	                const isToday = cellDateObj.getTime() === todayObj.getTime();
  1401	                
  1402	                let cellClass = 'calendar-cell';
  1403	                if (isToday) cellClass += ' today';
  1404	                
  1405	                rowHTML += `<td class="${cellClass}">`;
  1406	                rowHTML += `<div class="date-number">${currentDate}</div>`;
  1407	                
  1408	                // 상태가 확정된 출석이 있으면 언제든지 표시
  1409	                const schedules = getSchedulesForDate(dateString);
  1410	                if (schedules.length > 0) {
  1411	                    rowHTML += '<div class="schedule-list">';
  1412	                    schedules.forEach(schedule => {
  1413	                        rowHTML += renderScheduleItem(schedule);
  1414	                    });
  1415	                    rowHTML += '</div>';
  1416	                }
  1417	                
  1418	                rowHTML += '</td>';
  1419	                currentDate++;
  1420	            }
  1421	        }
  1422	        
  1423	        // 실제 날짜가 있는 행만 추가
  1424	        if (hasContent) {
  1425	            calendarHTML += '<tr>' + rowHTML + '</tr>';
  1426	        }
  1427	    }
  1428	    
  1429	    calendarHTML += '</tbody></table>';
  1430	    container.innerHTML = calendarHTML;
  1431	    
  1432	    // 통계 표 렌더링
  1433	    await renderAttendanceStats(currentYear, currentMonth);
  1434	}
  1435	
  1436	// 해당 월의 출석 기록 로드
  1437	async function loadMonthAttendance(year, month) {
  1438	    try {
  1439	        const response = await API.getList('attendance', { limit: 1000 });
  1440	        const allAttendance = Array.isArray(response) ? response : (response.data || []);
  1441	        
  1442	        // 해당 월의 데이터만 필터링
  1443	        const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  1444	        const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-31`;
  1445	        
  1446	        allMonthAttendance = allAttendance.filter(record => {
  1447	            return record.date >= monthStart && record.date <= monthEnd;
  1448	        });
  1449	        
  1450	        console.log(`${year}년 ${month + 1}월 출석 기록:`, allMonthAttendance.length);
  1451	        
  1452	    } catch (error) {
  1453	        console.error('월별 출석 기록 로드 실패:', error);
  1454	        allMonthAttendance = [];
  1455	    }
  1456	}
  1457	
  1458	// 특정 날짜의 스케줄 가져오기 (상태가 확정된 출석만)
  1459	function getSchedulesForDate(dateString) {
  1460	    const filtered = allMonthAttendance.filter(record => {
  1461	        const hasDate = record.date === dateString;
  1462	        const hasStatus = record.status && record.status !== '';
  1463	        
  1464	        // 날짜가 일치하고, 상태가 확정된 경우만 반환
  1465	        return hasDate && hasStatus;
  1466	    });
  1467	    
  1468	    if (filtered.length > 0) {
  1469	        console.log(`[getSchedulesForDate] ${dateString} 결과: ${filtered.length}개`);
  1470	        filtered.forEach((record, index) => {
  1471	            console.log(`  ${index + 1}. 학생: ${record.student_name}, 상태: ${record.status}, 입실: ${record.check_in_time}, 퇴실: ${record.check_out_time}, ID: ${record.id}`);
  1472	        });
  1473	    }
  1474	    
  1475	    return filtered;
  1476	}
  1477	
  1478	// 스케줄 아이템 렌더링
  1479	function renderScheduleItem(schedule) {
  1480	    let itemClass = 'schedule-item';
  1481	    let content = '';
  1482	    
  1483	    // 정보 없는 학생 (is_external) 플래그 확인
  1484	    const isExternal = schedule.is_external === true || schedule.is_external === 1;
  1485	    
  1486	    if (schedule.status === '결석') {
  1487	        // 결석: "입실시간, 이름, (사유)" - 검정색 + 가로선
  1488	        itemClass += ' absent';
  1489	        const reason = schedule.absence_reason ? `(${schedule.absence_reason})` : '';
  1490	        content = `${schedule.check_in_time || '-'} ${schedule.student_name} ${reason}`;
  1491	    } else if (schedule.status === '보강') {
  1492	        // 보강: "입실시간, 이름, 퇴실시간 (결석날짜)" - 빨간색
  1493	        itemClass += ' makeup';
  1494	        const makeupDateStr = schedule.makeup_date ? ` (${schedule.makeup_date.substring(5).replace('-', '/')})` : '';
  1495	        content = `${schedule.check_in_time || '-'} ${schedule.student_name} ${schedule.check_out_time || '-'}${makeupDateStr}`;
  1496	    } else {
  1497	        // 출석: "입실시간, 이름, 퇴실시간" - 검정색 (또는 파란색)
  1498	        itemClass += isExternal ? ' external' : ' attendance';
  1499	        content = `${schedule.check_in_time || '-'} ${schedule.student_name} ${schedule.check_out_time || '-'}`;
  1500	    }
  1501	    
  1502	    return `<div class="${itemClass}">${content}</div>`;
  1503	}
  1504	
  1505	// ============================================
  1506	// 학년별 출석 통계 표
  1507	// ============================================
  1508	
  1509	async function renderAttendanceStats(year, month) {
  1510	    const container = document.getElementById('attendanceStatsContainer');
  1511	    if (!container) return;
  1512	    
  1513	    try {
  1514	        // 학생 목록 로드
  1515	        const response = await API.getList('students', { limit: 1000 });
  1516	        // API 응답이 배열이면 그대로, 객체면 data 속성 사용
  1517	        const allStudents = Array.isArray(response) ? response : (response.data || []);
  1518	        
  1519	        // 재원생만 필터링 (항상 표시)
  1520	        const activeStudents = allStudents.filter(student => student.status === '재원');
  1521	        
  1522	        // 해당 월의 출석 기록이 있는 학생 확인
  1523	        let nonActiveWithAttendance = [];
  1524	        try {
  1525	            const startDate = new Date(year, month - 1, 1);
  1526	            const endDate = new Date(year, month, 0);
  1527	            const startDateStr = startDate.toISOString().split('T')[0];
  1528	            const endDateStr = endDate.toISOString().split('T')[0];
  1529	            
  1530	            const attendanceRecords = await API.getList('attendance');
  1531	            
  1532	            // 날짜 필터링 (클라이언트 측)
  1533	            const filteredRecords = (attendanceRecords.data || []).filter(record => 
  1534	                record.date >= startDateStr && record.date <= endDateStr
  1535	            );
  1536	            
  1537	            // 출석 기록이 있지만 재원생이 아닌 학생 찾기
  1538	            const attendedStudentIds = new Set(filteredRecords.map(r => r.student_id));
  1539	            nonActiveWithAttendance = allStudents.filter(student => 
  1540	                student.status !== '재원' && attendedStudentIds.has(student.id)
  1541	            );
  1542	        } catch (err) {
  1543	            console.warn('비재원생 출석자 조회 중 오류 (무시하고 계속):', err);
  1544	        }
  1545	        
  1546	        // 학교 유형별로 분류 및 정렬
  1547	        const elementary = activeStudents
  1548	            .filter(s => s.school_type === '초')
  1549	            .sort((a, b) => {
  1550	                // 학년 오름차순
  1551	                const gradeA = parseInt(a.grade) || 0;
  1552	                const gradeB = parseInt(b.grade) || 0;
  1553	                if (gradeA !== gradeB) return gradeA - gradeB;
  1554	                // 학년이 같으면 이름 가나다순
  1555	                return (a.name || '').localeCompare(b.name || '', 'ko');
  1556	            });
  1557	        
  1558	        const middle = activeStudents
  1559	            .filter(s => s.school_type === '중')
  1560	            .sort((a, b) => {
  1561	                const gradeA = parseInt(a.grade) || 0;
  1562	                const gradeB = parseInt(b.grade) || 0;
  1563	                if (gradeA !== gradeB) return gradeA - gradeB;
  1564	                return (a.name || '').localeCompare(b.name || '', 'ko');
  1565	            });
  1566	        
  1567	        let high = activeStudents
  1568	            .filter(s => s.school_type === '고')
  1569	            .sort((a, b) => {
  1570	                const gradeA = parseInt(a.grade) || 0;
  1571	                const gradeB = parseInt(b.grade) || 0;
  1572	                if (gradeA !== gradeB) return gradeA - gradeB;
  1573	                return (a.name || '').localeCompare(b.name || '', 'ko');
  1574	            });
  1575	        
  1576	        // 재원생이 아닌 확정 스케줄 학생을 고등학생 배열 오른쪽에 추가
  1577	        console.log('[renderAttendanceStats] 재원생 고등학생 수:', high.length);
  1578	        console.log('[renderAttendanceStats] 비재원생 출석자 수:', nonActiveWithAttendance.length);
  1579	        if (nonActiveWithAttendance.length > 0) {
  1580	            console.log('[renderAttendanceStats] 비재원생 출석자:', nonActiveWithAttendance.map(s => `${s.name}(${s.status})`));
  1581	        }
  1582	        high = [...high, ...nonActiveWithAttendance];
  1583	        console.log('[renderAttendanceStats] 통합 후 고등학생 수:', high.length);
  1584	        
  1585	        // 하나의 통합 표로 렌더링
  1586	        const statsHTML = renderUnifiedStatsTable(elementary, middle, high, year, month);
  1587	        
  1588	        container.innerHTML = statsHTML;
  1589	        
  1590	    } catch (error) {
  1591	        console.error('통계 표 렌더링 실패:', error);
  1592	        container.innerHTML = '<p style="text-align: center; color: #f44336;">통계를 불러오는데 실패했습니다.</p>';
  1593	    }
  1594	}
  1595	
  1596	// 학생이 해당 월에 활동했는지 확인
  1597	function checkStudentActiveInMonth(student, year, month) {
  1598	    if (!student.withdrawal_date) return false;
  1599	    
  1600	    const withdrawalDate = new Date(student.withdrawal_date);
  1601	    const monthStart = new Date(year, month - 1, 1);
  1602	    
  1603	    // 퇴원/휴원 날짜가 해당 월 이후면 활동한 것으로 간주
  1604	    return withdrawalDate >= monthStart;
  1605	}
  1606	
  1607	// 통합 통계표 렌더링 (초등/중등/고등을 세로로 붙임)
  1608	function renderUnifiedStatsTable(elementary, middle, high, year, month) {
  1609	    const MAX_COLUMNS = 9; // 학생 열 개수 (라벨 제외)
  1610	    
  1611	    let html = '<table class="stats-table">';
  1612	    
  1613	    // ===== 초등학생 섹션 (1-4행) =====
  1614	    // 1행: 헤더 (초등학생 + 학생 이름) - 연노랑색 (더 파스텔)
  1615	    html += '<thead><tr><th style="background-color: #fffef0; font-weight: 700;">초등학생</th>';
  1616	    
  1617	    for (let i = 0; i < MAX_COLUMNS; i++) {
  1618	        if (i < elementary.length) {
  1619	            const student = elementary[i];
  1620	            const schoolName = student.school || '-';
  1621	            const grade = student.grade || '-';
  1622	            html += `<th style="background-color: #fffef0;">
  1623	                <div class="student-name">${student.name}</div>
  1624	                <div class="student-info">${schoolName} ${grade}</div>
  1625	            </th>`;
  1626	        } else {
  1627	            html += '<th style="background-color: #fffef0;"></th>';
  1628	        }
  1629	    }
  1630	    html += '</tr></thead><tbody>';
  1631	    
  1632	    // 초등학생 통계 계산
  1633	    const elementaryStats = elementary.map(student => calculateStudentStats(student, year, month));
  1634	    
  1635	    // 2행: 출석(보강)/수업
  1636	    html += '<tr><td class="row-label">출석(보강)/수업</td>';
  1637	    for (let i = 0; i < MAX_COLUMNS; i++) {
  1638	        if (i < elementaryStats.length) {
  1639	            const attendance = elementaryStats[i].attendance;
  1640	            const makeup = elementaryStats[i].makeup;
  1641	            const expected = elementaryStats[i].expectedClasses;
  1642	            html += `<td>${attendance}(${makeup})/${expected}</td>`;
  1643	        } else {
  1644	            html += '<td></td>';
  1645	        }
  1646	    }
  1647	    html += '</tr>';
  1648	    
  1649	    // 3행: 보강예정
  1650	    html += '<tr><td class="row-label">보강예정</td>';
  1651	    for (let i = 0; i < MAX_COLUMNS; i++) {
  1652	        if (i < elementaryStats.length) {
  1653	            const attendance = elementaryStats[i].attendance;
  1654	            const makeup = elementaryStats[i].makeup;
  1655	            const expected = elementaryStats[i].expectedClasses;
  1656	            const remaining = expected - attendance - makeup;
  1657	            const color = remaining > 0 ? '#f44336' : '#000';
  1658	            html += `<td style="color: ${color}; font-weight: ${remaining > 0 ? '600' : 'normal'};">${remaining}</td>`;
  1659	        } else {
  1660	            html += '<td></td>';
  1661	        }
  1662	    }
  1663	    html += '</tr>';
  1664	    
  1665	    // ===== 중학생 섹션 (5-8행) =====
  1666	    // 5행: 헤더 (중학생 + 학생 이름) - 연두색 (더 파스텔)
  1667	    html += '<tr><th style="background-color: #f0faf4; font-weight: 700;">중학생</th>';
  1668	    
  1669	    for (let i = 0; i < MAX_COLUMNS; i++) {
  1670	        if (i < middle.length) {
  1671	            const student = middle[i];
  1672	            const schoolName = student.school || '-';
  1673	            const grade = student.grade || '-';
  1674	            html += `<th style="background-color: #f0faf4;">
  1675	                <div class="student-name">${student.name}</div>
  1676	                <div class="student-info">${schoolName} ${grade}</div>
  1677	            </th>`;
  1678	        } else {
  1679	            html += '<th style="background-color: #f0faf4;"></th>';
  1680	        }
  1681	    }
  1682	    html += '</tr>';
  1683	    
  1684	    // 중학생 통계 계산
  1685	    const middleStats = middle.map(student => calculateStudentStats(student, year, month));
  1686	    
  1687	    // 6행: 출석(보강)/수업
  1688	    html += '<tr><td class="row-label">출석(보강)/수업</td>';
  1689	    for (let i = 0; i < MAX_COLUMNS; i++) {
  1690	        if (i < middleStats.length) {
  1691	            const attendance = middleStats[i].attendance;
  1692	            const makeup = middleStats[i].makeup;
  1693	            const expected = middleStats[i].expectedClasses;
  1694	            html += `<td>${attendance}(${makeup})/${expected}</td>`;
  1695	        } else {
  1696	            html += '<td></td>';
  1697	        }
  1698	    }
  1699	    html += '</tr>';
  1700	    
  1701	    // 7행: 보강예정
  1702	    html += '<tr><td class="row-label">보강예정</td>';
  1703	    for (let i = 0; i < MAX_COLUMNS; i++) {
  1704	        if (i < middleStats.length) {
  1705	            const attendance = middleStats[i].attendance;
  1706	            const makeup = middleStats[i].makeup;
  1707	            const expected = middleStats[i].expectedClasses;
  1708	            const remaining = expected - attendance - makeup;
  1709	            const color = remaining > 0 ? '#f44336' : '#000';
  1710	            html += `<td style="color: ${color}; font-weight: ${remaining > 0 ? '600' : 'normal'};">${remaining}</td>`;
  1711	        } else {
  1712	            html += '<td></td>';
  1713	        }
  1714	    }
  1715	    html += '</tr>';
  1716	    
  1717	    // ===== 고등학생 섹션 (9-11행) =====
  1718	    // 9행: 헤더 (고등학생 + 학생 이름) - 연하늘색 (더 파스텔)
  1719	    html += '<tr><th style="background-color: #f0f8ff; font-weight: 700;">고등학생</th>';
  1720	    
  1721	    for (let i = 0; i < MAX_COLUMNS; i++) {
  1722	        if (i < high.length) {
  1723	            const student = high[i];
  1724	            const schoolName = student.school || '-';
  1725	            const grade = student.grade || '-';
  1726	            html += `<th style="background-color: #f0f8ff;">
  1727	                <div class="student-name">${student.name}</div>
  1728	                <div class="student-info">${schoolName} ${grade}</div>
  1729	            </th>`;
  1730	        } else {
  1731	            html += '<th style="background-color: #f0f8ff;"></th>';
  1732	        }
  1733	    }
  1734	    html += '</tr>';
  1735	    
  1736	    // 고등학생 통계 계산
  1737	    const highStats = high.map(student => calculateStudentStats(student, year, month));
  1738	    
  1739	    // 10행: 출석(보강)/수업
  1740	    html += '<tr><td class="row-label">출석(보강)/수업</td>';
  1741	    for (let i = 0; i < MAX_COLUMNS; i++) {
  1742	        if (i < highStats.length) {
  1743	            const attendance = highStats[i].attendance;
  1744	            const makeup = highStats[i].makeup;
  1745	            const expected = highStats[i].expectedClasses;
  1746	            html += `<td>${attendance}(${makeup})/${expected}</td>`;
  1747	        } else {
  1748	            html += '<td></td>';
  1749	        }
  1750	    }
  1751	    html += '</tr>';
  1752	    
  1753	    // 11행: 보강예정
  1754	    html += '<tr><td class="row-label">보강예정</td>';
  1755	    for (let i = 0; i < MAX_COLUMNS; i++) {
  1756	        if (i < highStats.length) {
  1757	            const attendance = highStats[i].attendance;
  1758	            const makeup = highStats[i].makeup;
  1759	            const expected = highStats[i].expectedClasses;
  1760	            const remaining = expected - attendance - makeup;
  1761	            const color = remaining > 0 ? '#f44336' : '#000';
  1762	            html += `<td style="color: ${color}; font-weight: ${remaining > 0 ? '600' : 'normal'};">${remaining}</td>`;
  1763	        } else {
  1764	            html += '<td></td>';
  1765	        }
  1766	    }
  1767	    html += '</tr>';
  1768	    
  1769	    html += '</tbody></table>';
  1770	    return html;
  1771	}
  1772	
  1773	// 기존 renderStatsTable 함수 (출결조회 페이지용으로 유지)
  1774	
  1775	function renderStatsTable(students, year, month, gradeLabel = '') {
  1776	    const MAX_COLUMNS = 9; // 학생 열 개수 (라벨 제외)
  1777	    let html = '<table class="stats-table">';
  1778	    
  1779	    // 1행: 학년 구분 + 학생 이름 + 학교/학년
  1780	    html += '<thead><tr><th>' + gradeLabel + '</th>';
  1781	    
  1782	    for (let i = 0; i < MAX_COLUMNS; i++) {
  1783	        if (i < students.length) {
  1784	            const student = students[i];
  1785	            const schoolName = student.school || '-';
  1786	            const grade = student.grade || '-';
  1787	            html += `<th>
  1788	                <div class="student-name">${student.name}</div>
  1789	                <div class="student-info">${schoolName} ${grade}</div>
  1790	            </th>`;
  1791	        } else {
  1792	            html += '<th></th>';
  1793	        }
  1794	    }
  1795	    html += '</tr></thead><tbody>';
  1796	    
  1797	    // 각 학생의 통계 계산
  1798	    const stats = students.map(student => calculateStudentStats(student, year, month));
  1799	    
  1800	    // 2행: 수업 횟수 (주당 스케줄 * 4주)
  1801	    html += '<tr><td class="row-label" style="text-align: center;">수업</td>';
  1802	    for (let i = 0; i < MAX_COLUMNS; i++) {
  1803	        if (i < stats.length) {
  1804	            html += `<td style="text-align: center;">${stats[i].expectedClasses}</td>`;
  1805	        } else {
  1806	            html += '<td></td>';
  1807	        }
  1808	    }
  1809	    html += '</tr>';
  1810	    
  1811	    // 3행: 출석(보강) 횟수
  1812	    html += '<tr><td class="row-label" style="text-align: center;">출석(보강)</td>';
  1813	    for (let i = 0; i < MAX_COLUMNS; i++) {
  1814	        if (i < stats.length) {
  1815	            const total = stats[i].attendance + stats[i].makeup;
  1816	            html += `<td style="text-align: center;">${total}</td>`;
  1817	        } else {
  1818	            html += '<td></td>';
  1819	        }
  1820	    }
  1821	    html += '</tr>';
  1822	    
  1823	    // 4행: 보강예정 (수업 - 출석(보강))
  1824	    html += '<tr><td class="row-label" style="background-color: #f8f9fa !important; text-align: center;">보강예정</td>';
  1825	    for (let i = 0; i < MAX_COLUMNS; i++) {
  1826	        if (i < stats.length) {
  1827	            const total = stats[i].attendance + stats[i].makeup;
  1828	            const remaining = stats[i].expectedClasses - total;
  1829	            const color = remaining > 0 ? '#f44336' : '#000';
  1830	            const style = `background-color: white !important; text-align: center; color: ${color}; font-weight: ${remaining > 0 ? '600' : 'normal'};`;
  1831	            html += `<td style="${style}">${remaining}</td>`;
  1832	        } else {
  1833	            html += '<td style="background-color: white !important;"></td>';
  1834	        }
  1835	    }
  1836	    html += '</tr>';
  1837	    
  1838	    html += '</tbody></table>';
  1839	    return html;
  1840	}
  1841	
  1842	function calculateStudentStats(student, year, month) {
  1843	    // 해당 학생의 이번 달 출석 기록
  1844	    const studentRecords = allMonthAttendance.filter(record => record.student_id === student.id);
  1845	    
  1846	    // 출석 횟수
  1847	    const attendanceCount = studentRecords.filter(r => r.status === '출석').length;
  1848	    
  1849	    // 보강 횟수
  1850	    const makeupCount = studentRecords.filter(r => r.status === '보강').length;
  1851	    
  1852	    // 수업 예정 횟수 계산 (주간 스케줄 기준)
  1853	    const weeklyScheduleCount = countWeeklySchedule(student.schedule);
  1854	    const weeksInMonth = 4; // 기본 4주
  1855	    const expectedClasses = weeklyScheduleCount * weeksInMonth;
  1856	    
  1857	    return {
  1858	        attendance: attendanceCount,
  1859	        makeup: makeupCount,
  1860	        expectedClasses: expectedClasses
  1861	    };
  1862	}
  1863	
  1864	function countWeeklySchedule(schedule) {
  1865	    if (!schedule) return 0;
  1866	    
  1867	    // schedule이 문자열이면 파싱
  1868	    let parsedSchedule = schedule;
  1869	    if (typeof schedule === 'string' && schedule.trim() !== '') {
  1870	        try {
  1871	            parsedSchedule = JSON.parse(schedule);
  1872	        } catch (e) {
  1873	            console.error('스케줄 파싱 오류:', e);
  1874	            return 0;
  1875	        }
  1876	    }
  1877	    
  1878	    if (!parsedSchedule || typeof parsedSchedule !== 'object') return 0;
  1879	    
  1880	    const dayKeys = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  1881	    let count = 0;
  1882	    
  1883	    dayKeys.forEach(key => {
  1884	        if (parsedSchedule[key] && parsedSchedule[key].enabled === true) {
  1885	            count++;
  1886	        }
  1887	    });
  1888	    
  1889	    return count;
  1890	}
  1891	
  1892	// ============================================
  1893	// 2행 등록 관련 함수
  1894	// ============================================
  1895	
  1896	// 등록 행의 학생 선택 드롭다운 채우기
  1897	function renderStudentSelectForRegister() {
  1898	    const select = document.getElementById('registerStudentSelect');
  1899	    if (!select) return;
  1900	    
  1901	    // 기존 옵션 유지 (학생 선택)
  1902	    select.innerHTML = '<option value="">학생 선택</option>';
  1903	    
  1904	    // 모든 재원생 추가
  1905	    attendanceStudents.forEach(student => {
  1906	        const option = document.createElement('option');
  1907	        option.value = student.id;
  1908	        option.textContent = `${student.name} (${student.attendance_number || '-'})`;
  1909	        select.appendChild(option);
  1910	    });
  1911	}
  1912	
  1913	// 신규 출석 등록
  1914	async function registerNewAttendance() {
  1915	    const studentId = document.getElementById('registerStudentSelect').value;
  1916	    const checkInTime = document.getElementById('registerCheckInTime').value;
  1917	    const checkOutTime = document.getElementById('registerCheckOutTime').value;
  1918	    const status = document.getElementById('registerStatus').value;
  1919	    
  1920	    if (!studentId) {
  1921	        alert('학생을 선택해주세요.');
  1922	        return;
  1923	    }
  1924	    
  1925	    if (!checkInTime) {
  1926	        alert('출석시간을 입력해주세요.');
  1927	        return;
  1928	    }
  1929	    
  1930	    // 출석 데이터 생성
  1931	    const attendanceData = {
  1932	        student_id: studentId,
  1933	        date: getSelectedDateString(),
  1934	        check_in_time: checkInTime,
  1935	        check_out_time: checkOutTime,
  1936	        status: status
  1937	    };
  1938	    
  1939	    // 퇴실 예정시간 자동 계산 (스케줄 기반)
  1940	    const student = attendanceStudents.find(s => s.id === studentId);
  1941	    if (student) {
  1942	        let schedule = student.schedule;
  1943	        if (typeof schedule === 'string' && schedule.trim() !== '') {
  1944	            try {
  1945	                schedule = JSON.parse(schedule);
  1946	            } catch (e) {
  1947	                schedule = {};
  1948	            }
  1949	        }
  1950	        
  1951	        const selectedDate = getSelectedDateString();
  1952	        const dateObj = new Date(selectedDate);
  1953	        const dayKeys = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  1954	        const selectedDayKey = dayKeys[dateObj.getDay()];
  1955	        const daySchedule = schedule[selectedDayKey];
  1956	        
  1957	        if (daySchedule && daySchedule.duration) {
  1958	            const duration = parseInt(daySchedule.duration) || 90;
  1959	            const [hour, min] = checkInTime.split(':').map(Number);
  1960	            const totalMinutes = hour * 60 + min + duration;
  1961	            const outHour = Math.floor(totalMinutes / 60);
  1962	            const outMin = totalMinutes % 60;
  1963	            attendanceData.expected_out_time = `${String(outHour).padStart(2, '0')}:${String(outMin).padStart(2, '0')}`;
  1964	        }
  1965	    }
  1966	    
  1967	    try {
  1968	        await API.create('attendance', attendanceData);
  1969	        alert('출석이 등록되었습니다.');
  1970	        
  1971	        // 입력 필드 초기화
  1972	        document.getElementById('registerStudentSelect').value = '';
  1973	        document.getElementById('registerCheckInTime').value = '';
  1974	        document.getElementById('registerExpectedOutTime').value = '';
  1975	        document.getElementById('registerCheckOutTime').value = '';
  1976	        document.getElementById('registerStatus').value = '';
  1977	        
  1978	        // 데이터 다시 로드
  1979	        await loadAttendanceData();
  1980	        await renderMonthlyCalendar();
  1981	        
  1982	    } catch (error) {
  1983	        console.error('출석 등록 오류:', error);
  1984	        alert('출석 등록에 실패했습니다.');
  1985	    }
  1986	}
  1987	
  1988	// ============================================
  1989	// 출석 조회 페이지
  1990	// ============================================
  1991	let currentViewYear = new Date().getFullYear();
  1992	let currentViewMonth = new Date().getMonth() + 1;
  1993	
  1994	async function showAttendanceViewPage() {
  1995	    const mainContent = document.getElementById('mainContent');
  1996	    if (!mainContent) return;
  1997	
  1998	    const today = new Date();
  1999	    currentViewYear = today.getFullYear();
  2000	    currentViewMonth = today.getMonth() + 1;
  2001	
  2002	    mainContent.innerHTML = `
  2003	        <div class="attendance-view-container">
  2004	            <div class="view-controls">
  2005	                <div class="controls-right">
  2006	                    <select id="viewMonthSelect" class="form-select" onchange="loadAttendanceViewData()">
  2007	                        ${generateMonthDropdownOptions()}
  2008	                    </select>
  2009	                    
  2010	                    <button onclick="loadAttendanceViewData()" class="btn-primary">조회</button>
  2011	                    
  2012	                    <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.3rem; margin-left: 0.5rem;">
  2013	                        <label style="display: flex; align-items: center; gap: 0.3rem; cursor: pointer; font-size: 0.85rem;">
  2014	                            <input type="checkbox" id="printStatsCheckbox" checked style="cursor: pointer;" />
  2015	                            <span>통계포함</span>
  2016	                        </label>
  2017	                        <button onclick="printAttendanceView()" class="btn-secondary">인쇄</button>
  2018	                    </div>
  2019	                </div>
  2020	            </div>
  2021	            
  2022	            <!-- 월별 출결 현황 달력 -->
  2023	            <div class="monthly-calendar-section">
  2024	                <div class="calendar-header">
  2025	                    <button onclick="changeViewMonthCalendar(-1)" class="btn-month-nav">◀</button>
  2026	                    <h3 id="viewCalendarMonthTitle"></h3>
  2027	                    <button onclick="changeViewMonthCalendar(1)" class="btn-month-nav">▶</button>
  2028	                </div>
  2029	                <div id="viewMonthlyCalendarContainer"></div>
  2030	                
  2031	                <!-- 학년별 통계 표 -->
  2032	                <div id="viewAttendanceStatsContainer"></div>
  2033	            </div>
  2034	        </div>
  2035	    `;
  2036	
  2037	    // 초기 조회
  2038	    await loadAttendanceViewData();
  2039	}
  2040	
  2041	function generateMonthDropdownOptions() {
  2042	    const today = new Date();
  2043	    const currentYear = today.getFullYear();
  2044	    const currentMonth = today.getMonth() + 1;
  2045	    
  2046	    let options = '';
  2047	    
  2048	    // 현재 월부터 과거 24개월까지
  2049	    for (let i = 0; i < 24; i++) {
  2050	        let year = currentYear;
  2051	        let month = currentMonth - i;
  2052	        
  2053	        while (month <= 0) {
  2054	            month += 12;
  2055	            year--;
  2056	        }
  2057	        
  2058	        const value = `${year}-${month}`;
  2059	        const display = `${year}년 ${month}월`;
  2060	        const selected = (year === currentYear && month === currentMonth) ? 'selected' : '';
  2061	        
  2062	        options += `<option value="${value}" ${selected}>${display}</option>`;
  2063	    }
  2064	    
  2065	    return options;
  2066	}
  2067	
  2068	function changeViewMonth(direction) {
  2069	    currentViewMonth += direction;
  2070	    
  2071	    if (currentViewMonth < 1) {
  2072	        currentViewMonth = 12;
  2073	        currentViewYear--;
  2074	    } else if (currentViewMonth > 12) {
  2075	        currentViewMonth = 1;
  2076	        currentViewYear++;
  2077	    }
  2078	    
  2079	    // 드롭다운 업데이트
  2080	    const select = document.getElementById('viewMonthSelect');
  2081	    const value = `${currentViewYear}-${currentViewMonth}`;
  2082	    select.value = value;
  2083	    
  2084	    loadAttendanceViewCalendar();
  2085	}
  2086	
  2087	// 출결조회 페이지의 달력 월 변경
  2088	function changeViewMonthCalendar(direction) {
  2089	    currentViewMonth += direction;
  2090	    
  2091	    if (currentViewMonth < 1) {
  2092	        currentViewMonth = 12;
  2093	        currentViewYear--;
  2094	    } else if (currentViewMonth > 12) {
  2095	        currentViewMonth = 1;
  2096	        currentViewYear++;
  2097	    }
  2098	    
  2099	    // 드롭다운 업데이트
  2100	    const select = document.getElementById('viewMonthSelect');
  2101	    const value = `${currentViewYear}-${currentViewMonth}`;
  2102	    select.value = value;
  2103	    
  2104	    loadAttendanceViewData();
  2105	}
  2106	
  2107	// 출결조회 페이지 데이터 로드
  2108	async function loadAttendanceViewData() {
  2109	    const select = document.getElementById('viewMonthSelect');
  2110	    const selectedValue = select.value;
  2111	    const [year, month] = selectedValue.split('-').map(Number);
  2112	    
  2113	    currentViewYear = year;
  2114	    currentViewMonth = month;
  2115	    
  2116	    const titleElement = document.getElementById('viewCalendarMonthTitle');
  2117	    const calendarContainer = document.getElementById('viewMonthlyCalendarContainer');
  2118	    const statsContainer = document.getElementById('viewAttendanceStatsContainer');
  2119	    
  2120	    if (!titleElement || !calendarContainer || !statsContainer) {
  2121	        console.error('출결조회 컨테이너를 찾을 수 없습니다.');
  2122	        return;
  2123	    }
  2124	    
  2125	    titleElement.textContent = `${year}년 ${month}월`;
  2126	    calendarContainer.innerHTML = '<p style="text-align: center;">로딩 중...</p>';
  2127	    statsContainer.innerHTML = '';
  2128	    
  2129	    try {
  2130	        // 해당 월의 출석 기록 로드
  2131	        await loadMonthAttendance(year, month - 1); // month는 0-based
  2132	        
  2133	        // 달력 렌더링
  2134	        renderViewMonthlyCalendar(year, month - 1);
  2135	        
  2136	        // 통계 렌더링
  2137	        await renderViewAttendanceStats(year, month - 1);
  2138	        
  2139	    } catch (error) {
  2140	        console.error('출결조회 로드 실패:', error);
  2141	        calendarContainer.innerHTML = '<p style="text-align: center; color: red;">데이터 로드에 실패했습니다.</p>';
  2142	    }
  2143	}
  2144	
  2145	// 출결조회 페이지의 월별 달력 렌더링
  2146	function renderViewMonthlyCalendar(year, month) {
  2147	    const container = document.getElementById('viewMonthlyCalendarContainer');
  2148	    if (!container) return;
  2149	    
  2150	    // 오늘 날짜
  2151	    const today = new Date();
  2152	    
  2153	    // 달력 생성
  2154	    const firstDay = new Date(year, month, 1);
  2155	    const lastDay = new Date(year, month + 1, 0);
  2156	    
  2157	    // 월요일부터 시작하도록 조정
  2158	    let startDayOfWeek = firstDay.getDay();
  2159	    if (startDayOfWeek === 0) startDayOfWeek = 7;
  2160	    startDayOfWeek -= 1;
  2161	    
  2162	    // 항상 월~금요일만 표시 (5열)
  2163	    const maxDayOfWeek = 4; // 인덱스 0~4 (월~금)
  2164	    
  2165	    // 달력 테이블 생성
  2166	    let calendarHTML = '<table class="monthly-calendar">';
  2167	    
  2168	    // 요일 헤더
  2169	    calendarHTML += '<thead><tr>';
  2170	    const dayNames = ['월', '화', '수', '목', '금'];
  2171	    for (let i = 0; i <= maxDayOfWeek; i++) {
  2172	        calendarHTML += `<th>${dayNames[i]}</th>`;
  2173	    }
  2174	    calendarHTML += '</tr></thead><tbody>';
  2175	    
  2176	    // 날짜 셀 생성
  2177	    let currentDate = 1;
  2178	    let finished = false;
  2179	    
  2180	    while (!finished) {
  2181	        let rowHTML = '';
  2182	        let hasContent = false; // 이 행에 실제 날짜가 있는지 확인
  2183	        
  2184	        for (let dayOfWeek = 0; dayOfWeek <= maxDayOfWeek; dayOfWeek++) {
  2185	            if (currentDate > lastDay.getDate()) {
  2186	                rowHTML += '<td class="empty-cell"></td>';
  2187	                finished = true;
  2188	                continue;
  2189	            }
  2190	            
  2191	            // 실제 요일 확인 (0=일, 1=월, ..., 6=토)
  2192	            let actualDate = new Date(year, month, currentDate);
  2193	            let actualDayOfWeek = actualDate.getDay();
  2194	            
  2195	            // 토요일(6) 또는 일요일(0)을 만나면 계속 건너뛰기
  2196	            while ((actualDayOfWeek === 0 || actualDayOfWeek === 6) && currentDate <= lastDay.getDate()) {
  2197	                currentDate++;
  2198	                if (currentDate > lastDay.getDate()) break;
  2199	                actualDate = new Date(year, month, currentDate);
  2200	                actualDayOfWeek = actualDate.getDay();
  2201	            }
  2202	            
  2203	            if (currentDate > lastDay.getDate()) {
  2204	                rowHTML += '<td class="empty-cell"></td>';
  2205	                finished = true;
  2206	                continue;
  2207	            }
  2208	            
  2209	            if (currentDate === 1 && dayOfWeek < startDayOfWeek) {
  2210	                // 첫 주의 빈 칸
  2211	                rowHTML += '<td class="empty-cell"></td>';
  2212	            } else {
  2213	                hasContent = true; // 실제 날짜가 있음
  2214	                const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`;
  2215	                
  2216	                // 오늘 날짜와 비교
  2217	                const cellDateObj = new Date(year, month, currentDate);
  2218	                const todayObj = new Date();
  2219	                todayObj.setHours(0, 0, 0, 0);
  2220	                cellDateObj.setHours(0, 0, 0, 0);
  2221	                
  2222	                const isToday = cellDateObj.getTime() === todayObj.getTime();
  2223	                
  2224	                let cellClass = 'calendar-cell';
  2225	                if (isToday) cellClass += ' today';
  2226	                
  2227	                rowHTML += `<td class="${cellClass}">`;
  2228	                rowHTML += `<div class="date-number">${currentDate}</div>`;
  2229	                
  2230	                // 상태가 확정된 출석이 있으면 언제든지 표시
  2231	                const schedules = getSchedulesForDate(dateString);
  2232	                if (schedules.length > 0) {
  2233	                    rowHTML += '<div class="schedule-list">';
  2234	                    schedules.forEach(schedule => {
  2235	                        rowHTML += renderScheduleItem(schedule);
  2236	                    });
  2237	                    rowHTML += '</div>';
  2238	                }
  2239	                
  2240	                rowHTML += '</td>';
  2241	                currentDate++;
  2242	            }
  2243	        }
  2244	        
  2245	        // 실제 날짜가 있는 행만 추가
  2246	        if (hasContent) {
  2247	            calendarHTML += '<tr>' + rowHTML + '</tr>';
  2248	        }
  2249	    }
  2250	    
  2251	    calendarHTML += '</tbody></table>';
  2252	    container.innerHTML = calendarHTML;
  2253	}
  2254	
  2255	// 출결조회 페이지의 통계 렌더링
  2256	async function renderViewAttendanceStats(year, month) {
  2257	    const container = document.getElementById('viewAttendanceStatsContainer');
  2258	    if (!container) return;
  2259	    
  2260	    try {
  2261	        // 학생 목록 로드
  2262	        const response = await API.getList('students', { limit: 1000 });
  2263	        // API 응답이 배열이면 그대로, 객체면 data 속성 사용
  2264	        const allStudents = Array.isArray(response) ? response : (response.data || []);
  2265	        
  2266	        // 재원생만 필터링
  2267	        const activeStudents = allStudents.filter(student => student.status === '재원');
  2268	        
  2269	        // 해당 월의 출석 기록이 있는 학생 확인
  2270	        let nonActiveWithAttendance = [];
  2271	        try {
  2272	            const startDate = new Date(year, month, 1);
  2273	            const endDate = new Date(year, month + 1, 0);
  2274	            const startDateStr = startDate.toISOString().split('T')[0];
  2275	            const endDateStr = endDate.toISOString().split('T')[0];
  2276	            
  2277	            const attendanceRecords = await API.getList('attendance');
  2278	            
  2279	            // 날짜 필터링 (클라이언트 측)
  2280	            const filteredRecords = (attendanceRecords.data || []).filter(record => 
  2281	                record.date >= startDateStr && record.date <= endDateStr
  2282	            );
  2283	            
  2284	            // 출석 기록이 있지만 재원생이 아닌 학생 찾기
  2285	            const attendedStudentIds = new Set(filteredRecords.map(r => r.student_id));
  2286	            nonActiveWithAttendance = allStudents.filter(student => 
  2287	                student.status !== '재원' && attendedStudentIds.has(student.id)
  2288	            );
  2289	        } catch (err) {
  2290	            console.warn('비재원생 출석자 조회 중 오류 (무시하고 계속):', err);
  2291	        }
  2292	        
  2293	        // 학교 유형별로 분류 및 정렬
  2294	        const elementary = activeStudents
  2295	            .filter(s => s.school_type === '초')
  2296	            .sort((a, b) => {
  2297	                const gradeA = parseInt(a.grade) || 0;
  2298	                const gradeB = parseInt(b.grade) || 0;
  2299	                if (gradeA !== gradeB) return gradeA - gradeB;
  2300	                return (a.name || '').localeCompare(b.name || '', 'ko');
  2301	            });
  2302	        
  2303	        const middle = activeStudents
  2304	            .filter(s => s.school_type === '중')
  2305	            .sort((a, b) => {
  2306	                const gradeA = parseInt(a.grade) || 0;
  2307	                const gradeB = parseInt(b.grade) || 0;
  2308	                if (gradeA !== gradeB) return gradeA - gradeB;
  2309	                return (a.name || '').localeCompare(b.name || '', 'ko');
  2310	            });
  2311	        
  2312	        let high = activeStudents
  2313	            .filter(s => s.school_type === '고')
  2314	            .sort((a, b) => {
  2315	                const gradeA = parseInt(a.grade) || 0;
  2316	                const gradeB = parseInt(b.grade) || 0;
  2317	                if (gradeA !== gradeB) return gradeA - gradeB;
  2318	                return (a.name || '').localeCompare(b.name || '', 'ko');
  2319	            });
  2320	        
  2321	        // 재원생이 아닌 확정 스케줄 학생을 고등학생 배열 오른쪽에 추가
  2322	        console.log('[renderAttendanceStats] 재원생 고등학생 수:', high.length);
  2323	        console.log('[renderAttendanceStats] 비재원생 출석자 수:', nonActiveWithAttendance.length);
  2324	        if (nonActiveWithAttendance.length > 0) {
  2325	            console.log('[renderAttendanceStats] 비재원생 출석자:', nonActiveWithAttendance.map(s => `${s.name}(${s.status})`));
  2326	        }
  2327	        high = [...high, ...nonActiveWithAttendance];
  2328	        console.log('[renderAttendanceStats] 통합 후 고등학생 수:', high.length);
  2329	        
  2330	        // 하나의 통합 표로 렌더링
  2331	        const statsHTML = renderUnifiedStatsTable(elementary, middle, high, year, month + 1);
  2332	        
  2333	        container.innerHTML = statsHTML;
  2334	        
  2335	    } catch (error) {
  2336	        console.error('통계 렌더링 실패:', error);
  2337	        container.innerHTML = '<p style="color: red;">통계 로드에 실패했습니다.</p>';
  2338	    }
  2339	}
  2340	
  2341	async function loadAttendanceViewCalendar() {
  2342	    const select = document.getElementById('viewMonthSelect');
  2343	    const selectedValue = select.value;
  2344	    const [year, month] = selectedValue.split('-').map(Number);
  2345	    
  2346	    currentViewYear = year;
  2347	    currentViewMonth = month;
  2348	    
  2349	    const studentId = document.getElementById('viewStudentFilter').value;
  2350	    
  2351	    const container = document.getElementById('viewCalendarContainer');
  2352	    const title = document.getElementById('viewCalendarTitle');
  2353	    
  2354	    container.innerHTML = '<p style="text-align: center;">로딩 중...</p>';
  2355	    title.textContent = `${year}년 ${month}월`;
  2356	    
  2357	    try {
  2358	        // 해당 월의 출석 기록 로드
  2359	        const response = await API.getList('attendance', { limit: 1000 });
  2360	        let allAttendance = Array.isArray(response) ? response : (response.data || []);
  2361	        
  2362	        // 해당 월 필터링
  2363	        const monthStart = `${year}-${String(month).padStart(2, '0')}-01`;
  2364	        const lastDay = new Date(year, month, 0).getDate();
  2365	        const monthEnd = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;
  2366	        
  2367	        let filteredAttendance = allAttendance.filter(record => {
  2368	            return record.date >= monthStart && record.date <= monthEnd;
  2369	        });
  2370	        
  2371	        // 학생 필터링
  2372	        if (studentId) {
  2373	            filteredAttendance = filteredAttendance.filter(record => record.student_id === studentId);
  2374	        }
  2375	        
  2376	        // 달력 렌더링 (출석 기록이 없어도 표시)
  2377	        renderViewCalendar(year, month, filteredAttendance);
  2378	        
  2379	    } catch (error) {
  2380	        console.error('출석 조회 실패:', error);
  2381	        // 오류가 발생해도 빈 달력은 표시
  2382	        renderViewCalendar(year, month, []);
  2383	    }
  2384	}
  2385	
  2386	function printAttendanceView() {
  2387	    // 체크박스 상태 확인
  2388	    const printStatsCheckbox = document.getElementById('printStatsCheckbox');
  2389	    const includeStats = printStatsCheckbox ? printStatsCheckbox.checked : true;
  2390	    
  2391	    // 통계표 숨김 클래스 추가/제거
  2392	    if (!includeStats) {
  2393	        document.body.classList.add('hide-stats-print');
  2394	    } else {
  2395	        document.body.classList.remove('hide-stats-print');
  2396	    }
  2397	    
  2398	    // 인쇄 실행
  2399	    window.print();
  2400	    
  2401	    // 인쇄 후 클래스 제거
  2402	    setTimeout(() => {
  2403	        document.body.classList.remove('hide-stats-print');
  2404	    }, 100);
  2405	}
  2406	
  2407	function renderViewCalendar(year, month, attendanceRecords) {
  2408	    const container = document.getElementById('viewCalendarContainer');
  2409	    
  2410	    const firstDay = new Date(year, month - 1, 1);
  2411	    const lastDay = new Date(year, month, 0);
  2412	    
  2413	    // 월요일부터 시작하도록 조정
  2414	    let startDayOfWeek = firstDay.getDay();
  2415	    if (startDayOfWeek === 0) startDayOfWeek = 7;
  2416	    startDayOfWeek -= 1;
  2417	    
  2418	    // 토요일 출석이 있는지 확인
  2419	    const hasSaturday = attendanceRecords.some(record => {
  2420	        const recordDate = new Date(record.date);
  2421	        return recordDate.getDay() === 6;
  2422	    });
  2423	    
  2424	    const maxDayOfWeek = hasSaturday ? 6 : 5;
  2425	    
  2426	    let html = `
  2427	        <div class="calendar-view-section">
  2428	            <table class="monthly-calendar">
  2429	                <thead><tr>
  2430	    `;
  2431	    
  2432	    const dayNames = ['월', '화', '수', '목', '금', '토'];
  2433	    for (let i = 0; i <= maxDayOfWeek; i++) {
  2434	        html += `<th>${dayNames[i]}</th>`;
  2435	    }
  2436	    html += '</tr></thead><tbody>';
  2437	    
  2438	    let currentDate = 1;
  2439	    let finished = false;
  2440	    
  2441	    while (!finished) {
  2442	        html += '<tr>';
  2443	        
  2444	        for (let dayOfWeek = 0; dayOfWeek <= maxDayOfWeek; dayOfWeek++) {
  2445	            if ((currentDate === 1 && dayOfWeek < startDayOfWeek) || currentDate > lastDay.getDate()) {
  2446	                html += '<td class="empty-cell"></td>';
  2447	                if (currentDate > lastDay.getDate()) finished = true;
  2448	            } else {
  2449	                const dateString = `${year}-${String(month).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`;
  2450	                const schedules = attendanceRecords.filter(r => r.date === dateString);
  2451	                
  2452	                html += `<td class="calendar-cell">`;
  2453	                html += `<div class="date-number">${currentDate}</div>`;
  2454	                
  2455	                if (schedules.length > 0) {
  2456	                    html += '<div class="schedule-list">';
  2457	                    schedules.forEach(schedule => {
  2458	                        html += renderScheduleItem(schedule);
  2459	                    });
  2460	                    html += '</div>';
  2461	                }
  2462	                
  2463	                html += '</td>';
  2464	                currentDate++;
  2465	            }
  2466	        }
  2467	        
  2468	        html += '</tr>';
  2469	    }
  2470	    
  2471	    html += '</tbody></table></div>';
  2472	    container.innerHTML = html;
  2473	}
  2474	
