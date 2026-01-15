// sexuality-report.js - Logic for Area/Admin to view Sexuality Education Reports

(() => {
    let allSchools = [];
    let currentEvaluationId = null;

    // Check Auth
    const userType = localStorage.getItem("UserType"); // 'area' or 'admin' 
    const loggedInArea = localStorage.getItem("Area");

    // Init
    async function init() {
        if (!window.supabaseClient) {
            setTimeout(init, 300);
            return;
        }

        generatePart4Report();
        await loadSchools();

        // UI Permission Check
        if (userType === 'area') {
            document.querySelectorAll('.feedback-admin').forEach(el => el.style.display = 'none');
        } else if (userType === 'admin') {
            // Admin can SEE Area feedback but CANNOT EDIT it
            document.querySelectorAll('.feedback-area textarea').forEach(el => {
                el.disabled = true;
                el.placeholder = "(สำหรับสหวิทยาเขต)";
                el.style.backgroundColor = "#e9ecef";
            });
        }
    }

    function generatePart4Report() {
        const tabContent = document.getElementById('reportGradeTabContent');
        const grades = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];

        let html = '';
        grades.forEach((g, index) => {
            const active = index === 0 ? 'show active' : '';

            html += `
            <div class="tab-pane fade ${active}" id="r-${g}-pane" role="tabpanel">
                <div class="table-responsive">
                    <table class="table table-bordered table-sm align-middle">
                        <thead class="table-secondary">
                            <tr>
                                <th style="width:50%">การจัดการเรียนรู้</th>
                                <th style="width:50%">เอกสาร/หลักฐาน</th>
                            </tr>
                        </thead>
                        <tbody id="r-tbody-${g}">
                            <!-- Populated by JS -->
                        </tbody>
                    </table>
                </div>
            </div>`;
        });
        tabContent.innerHTML = html;

        // After structure is ready, we need to populate rows differently during render
        // But here we just build skeleton. The population happens in valid 'renderReport' which we must update.
    }

    // ... inside renderReport or helpers ...
    // We need to re-write the part that populates tbody for Part 4

    // Let's UPDATE the logic inside renderReport's grades loop



    async function loadSchools() {
        try {
            let query = window.supabaseClient
                .from('users')
                .select('id, school_name, area')
                .eq('user_type', 'school')
                .order('area').order('school_name');

            const { data, error } = await query;
            if (error) throw error;

            console.log('📚 Total Schools Loaded:', data?.length || 0);
            allSchools = data;

            if (userType === 'area' && loggedInArea) {
                allSchools = allSchools.filter(s => s.area === loggedInArea);
                console.log(`🔍 Filtered for Area "${loggedInArea}":`, allSchools.length, 'schools');
            }

            console.log('✅ Schools ready:', allSchools.length);
            populateDropdowns();

        } catch (err) {
            console.error('❌ Load Schools Error:', err);
            alert("โหลดข้อมูลโรงเรียนไม่สำเร็จ: " + err.message);
        }
    }

    function populateDropdowns() {
        const areaSelect = document.getElementById('report-area-select');
        const schoolSelect = document.getElementById('report-school-select');

        const areas = [...new Set(allSchools.map(s => s.area))].filter(Boolean).sort();

        areaSelect.innerHTML = '<option value="">-- เลือกสหวิทยาเขต --</option>';
        areas.forEach(a => {
            areaSelect.innerHTML += `<option value="${a}">${a}</option>`;
        });

        areaSelect.addEventListener('change', () => {
            const selectedArea = areaSelect.value;
            schoolSelect.innerHTML = '<option value="">-- เลือกโรงเรียน --</option>';

            if (selectedArea) {
                const filtered = allSchools.filter(s => s.area === selectedArea);
                filtered.forEach(s => {
                    schoolSelect.innerHTML += `<option value="${s.id}">${s.school_name}</option>`;
                });
                schoolSelect.disabled = false;
            } else {
                schoolSelect.disabled = true;
            }
        });

        if (userType === 'area' && areas.length === 1) {
            areaSelect.value = areas[0];
            areaSelect.dispatchEvent(new Event('change'));
        }
    }

    window.loadSexualityReport = async function () {
        const schoolId = document.getElementById('report-school-select').value;
        if (!schoolId) {
            alert("กรุณาเลือกโรงเรียน");
            return;
        }

        const schoolName = allSchools.find(s => s.id === schoolId)?.school_name;
        document.getElementById('school-title').innerText = schoolName;
        document.getElementById('report-content').style.display = 'block';

        // Reset Texts
        ['p1', 'p2', 'p3', 'p4', 'p5'].forEach(p => {
            if (document.getElementById(`${p}-content`))
                document.getElementById(`${p}-content`).innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm"></div></div>';

            document.getElementById(`area-comment-${p}`).value = '';
            document.getElementById(`admin-comment-${p}`).value = '';
        });

        try {
            const { data, error } = await window.supabaseClient
                .from('sexuality_evaluations')
                .select('*')
                .eq('school_id', schoolId)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                currentEvaluationId = data.id;
                renderReport(data.form_data);
                loadComments(data.area_comment, 'area');
                loadComments(data.admin_comment, 'admin');

                if (data.updated_at) {
                    document.getElementById('last-updated-badge').innerText = 'อัปเดต: ' + new Date(data.updated_at).toLocaleDateString('th-TH');
                }
            } else {
                currentEvaluationId = null;
                ['p1', 'p2', 'p3', 'p4', 'p5'].forEach(p => {
                    if (document.getElementById(`${p}-content`))
                        document.getElementById(`${p}-content`).innerHTML = '<div class="alert alert-secondary text-center small">ยังไม่มีข้อมูล</div>';
                });
                document.getElementById('last-updated-badge').innerText = 'ยังไม่มีข้อมูล';
            }

        } catch (err) {
            console.error("Load Report Error", err);
            alert("เกิดข้อผิดพลาด: " + err.message);
        }
    };

    function loadComments(commentText, role) {
        if (!commentText) return;
        try {
            const commentObj = JSON.parse(commentText);
            if (typeof commentObj === 'object' && commentObj !== null) {
                for (let i = 1; i <= 5; i++) {
                    const el = document.getElementById(`${role}-comment-p${i}`);
                    if (el) el.value = commentObj[`p${i}`] || '';
                }
            }
        } catch (e) {
            // Legacy/Plain text fallback
            const el = document.getElementById(`${role}-comment-p5`); // Put in last box?
            if (el) el.value = commentText;
        }
    }

    function renderReport(formData) {
        if (!formData) return;

        const val = (k) => formData[k];
        const isTrue = (k) => val(k) === true || val(k) === "true";

        const checkIcon = (checked) => `<i class="bi ${checked ? 'bi-check-square-fill text-success' : 'bi-square text-secondary'}"></i>`;
        const radioIcon = (checked) => `<i class="bi ${checked ? 'bi-check-circle-fill text-success' : 'bi-circle text-secondary'}"></i>`;

        // P1
        const p1 = `
            <div class="mb-2">
                ${radioIcon(val('p1_status') === 'not_implemented')} ไม่ได้ดำเนินการ
                ${val('p1_reason') ? `<div class="ms-4 text-muted small">เหตุผล: ${val('p1_reason')}</div>` : ''}
            </div>
            <div class="mb-2">
                ${radioIcon(val('p1_status') === 'implemented')} จัดกิจกรรมเสริมหลักสูตร
                ${val('p1_project_names') ? `<div class="ms-4 text-primary small">รายละเอียด: ${val('p1_project_names')}</div>` : ''}
            </div>
        `;
        document.getElementById('p1-content').innerHTML = p1;

        // P2
        const p2 = `
            <div class="mb-2">
                ${radioIcon(val('p2_status') === 'not_implemented')} ไม่ได้ดำเนินการ
                 ${val('p2_reason') ? `<div class="ms-4 text-muted small">เหตุผล: ${val('p2_reason')}</div>` : ''}
            </div>
            <div class="mb-2">
                ${radioIcon(val('p2_status') === 'implemented')} วิธีการจัดหาและพัฒนาครู
                 ${val('p2_method') ? `<div class="ms-4 text-primary small">วิธีการ: ${val('p2_method')}</div>` : ''}
            </div>
        `;
        document.getElementById('p2-content').innerHTML = p2;

        // P3
        let p3 = `
            <div class="mb-2">
                ${radioIcon(val('p3_status') === 'not_implemented')} ไม่ได้ดำเนินการ
                 ${val('p3_reason') ? `<div class="ms-4 text-muted small">เหตุผล: ${val('p3_reason')}</div>` : ''}
            </div>
            <div class="mb-2">
                ${radioIcon(val('p3_status') === 'implemented')} ลงทะเบียน/อยู่ระหว่างอบรม
                 <span class="ms-2 fw-bold">จำนวน: ${val('p3_training_count') || '-'} คน</span>
            </div>
        `;
        // T1
        if (val('p3_table1') && val('p3_table1').length > 0) {
            p3 += `<div class="table-responsive ms-4 mb-2"><table class="table table-bordered table-sm small bg-white"><thead><tr class="table-light"><th>ชื่อ</th><th>ตำแหน่ง</th><th>หน่วยที่จบ</th><th>แผนที่ส่ง</th></tr></thead><tbody>`;
            val('p3_table1').forEach(r => {
                p3 += `<tr><td>${r.name}</td><td>${r.pos}</td><td>${r.units}</td><td>${r.plans}</td></tr>`;
            });
            p3 += `</tbody></table></div>`;
        }

        p3 += `
            <div class="mb-2 mt-3">
                ${checkIcon(val('p3_passed'))} ผ่านการอบรมแล้ว
                 <span class="ms-2 fw-bold">จำนวน: ${val('p3_passed_count') || '-'} คน</span>
            </div>
        `;
        // T2
        if (val('p3_table2') && val('p3_table2').length > 0) {
            p3 += `<div class="table-responsive ms-4 mb-2"><table class="table table-bordered table-sm small bg-white"><thead><tr class="table-light"><th>ชื่อ</th><th>ตำแหน่ง</th></tr></thead><tbody>`;
            val('p3_table2').forEach(r => {
                p3 += `<tr><td>${r.name}</td><td>${r.pos}</td></tr>`;
            });
            p3 += `</tbody></table></div>`;
        }
        document.getElementById('p3-content').innerHTML = p3;

        // Part 4 (Tables per grade)
        const grades = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];
        grades.forEach(g => {
            const tbody = document.getElementById(`r-tbody-${g}`);
            let html = '';

            // Generate Evidence Cell Content
            const evidenceItems = [
                { k: 'e1', l: 'โครงสร้างหลักสูตรสถานศึกษา' },
                { k: 'e2', l: 'คำอธิบายรายวิชา' },
                { k: 'e3', l: 'แผนการจัดการเรียนรู้' },
                { k: 'e4', l: 'หลักฐานอื่น ๆ (ระบุ)' }
            ];
            let evidenceHtml = '<div class="d-flex flex-column gap-2">';
            evidenceItems.forEach(item => {
                const checked = isTrue(`p4_${g}_${item.k}`);
                const text = val(`p4_${g}_${item.k}_text`) || '';
                const fileUrl = val(`p4_${g}_${item.k}_file_url`) || ''; // Check for uploaded file URL

                evidenceHtml += `
                <div class="p-2 border rounded bg-white">
                    <div>${checkIcon(checked)} ${item.l}</div>
                    ${text ? `<div class="ms-4 small text-muted">${text}</div>` : ''}
                    ${fileUrl ? `<div class="ms-4 mt-1"><a href="${fileUrl}" target="_blank" class="btn btn-sm btn-success"><i class="bi bi-download"></i> ดาวน์โหลดไฟล์</a></div>` : (checked ? `<div class="ms-4 mt-1 small text-muted">ไม่มีไฟล์แนบ</div>` : '')} 
                </div>`;
            });
            evidenceHtml += '</div>';
            const evidenceCell = `<td rowspan="6" class="align-top bg-light">${evidenceHtml}</td>`;


            // Helper for rows
            const rRow = (key, label, isFirstRow) => {
                const id = `p4_${g}_${key}`;
                const checked = isTrue(`${id}_check`);
                const detail = val(`${id}_detail`) || val(`${id}_reason`) || '';

                return `
                <tr>
                    <td>
                        <div>${checkIcon(checked)} ${label}</div>
                        ${detail ? `<div class="ms-4 text-primary small">(${detail})</div>` : ''}
                    </td>
                    ${isFirstRow ? evidenceCell : ''}
                </tr>
                `;
            };

            html += rRow('not_implemented', 'ไม่ได้จัดการเรียนการสอน', true);
            html += rRow('basic_subject', 'วิชาพื้นฐาน', false);
            html += rRow('additional_subject', 'วิชาเพิ่มเติม', false);
            html += rRow('integration', 'บูรณาการ', false);
            html += rRow('activity', 'กิจกรรมพัฒนาผู้เรียน', false);
            html += rRow('extra', 'สอดแทรก/หลักสูตรระยะสั้น', false);

            tbody.innerHTML = html;
        });

        // P5
        const p5 = `
             <div class="mb-3">
                <div class="fw-bold text-danger">ปัญหา/อุปสรรค</div>
                <div class="p-2 bg-white border rounded mt-1">${val('p5_problems') || '-'}</div>
            </div>
            <div class="mb-3">
                <div class="fw-bold text-primary">ความต้องการสนับสนุน</div>
                 <div class="p-2 bg-white border rounded mt-1">${val('p5_needs') || '-'}</div>
            </div>
        `;
        document.getElementById('p5-content').innerHTML = p5;
    }


    window.saveSexualityFeedback = async function () {
        if (!currentEvaluationId) { alert("ไม่พบข้อมูล"); return; }
        if (!confirm(`ยืนยันการบันทึกข้อเสนอแนะทั้งหมด?`)) return;

        const role = userType;
        const commentObj = {};
        for (let i = 1; i <= 5; i++) {
            const el = document.getElementById(`${role}-comment-p${i}`);
            if (el) commentObj[`p${i}`] = el.value;
        }

        try {
            const updateField = role === 'area' ? 'area_comment' : 'admin_comment';
            const { error } = await window.supabaseClient
                .from('sexuality_evaluations')
                .update({
                    [updateField]: JSON.stringify(commentObj),
                    updated_at: new Date().toISOString()
                })
                .eq('id', currentEvaluationId);

            if (error) throw error;
            alert("บันทึกเรียบร้อย");

        } catch (err) {
            console.error(err);
            alert("บันทึกไม่สำเร็จ: " + err.message);
        }
    };

    init();
})();
