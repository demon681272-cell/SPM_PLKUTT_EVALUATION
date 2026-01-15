// qa-report.js - Handles Area/Admin viewing and commenting on QA Evaluations (Refined UI)
// This version populates the Accordion View and handles Part-based feedback.

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

        // Setup Dropdowns
        await loadSchools();

        // UI Permission Check
        if (userType === 'area') {
            document.querySelectorAll('.feedback-admin').forEach(el => el.style.display = 'none');
            // document.querySelectorAll('.feedback-area').forEach(el => el.style.display = 'block'); // Default
        } else if (userType === 'admin') {
            // Admin can SEE Area feedback but CANNOT EDIT it
            document.querySelectorAll('.feedback-area textarea').forEach(el => {
                el.disabled = true;
                el.placeholder = "(สำหรับสหวิทยาเขต)";
                el.style.backgroundColor = "#e9ecef"; // Explicit disabled look
            });
        }
        // Admin sees all? Or maybe hide Area feedback boxes if they don't want to see?
        // Usually Admin wants to see what Area said. So Keep Area visible but maybe read-only?
        // Let's allow Admin to edit Admin fields only.

        if (userType !== 'area') {
            // If Admin, disable Area inputs?
            // Actually, Supabase RLS policies usually handle security, but UI should guide.
            // For now, let's keep it open or just distinct.
            // Let's assume Admin is "Superuser" and can edit Area if they want, or just focus on Admin.
        }
    }

    async function loadSchools() {
        try {
            // Fetch schools
            let query = window.supabaseClient
                .from('users')
                .select('id, school_name, area')
                .eq('user_type', 'school')
                .order('area').order('school_name');

            const { data, error } = await query;
            if (error) throw error;

            allSchools = data;

            // Filter if Area user
            if (userType === 'area' && loggedInArea) {
                allSchools = allSchools.filter(s => s.area === loggedInArea);
            }

            populateDropdowns();

        } catch (err) {
            console.error(err);
            alert("โหลดข้อมูลโรงเรียนไม่สำเร็จ");
        }
    }

    function populateDropdowns() {
        const areaSelect = document.getElementById('qa-area-select');
        const schoolSelect = document.getElementById('qa-school-select');

        // Extract Areas
        const areas = [...new Set(allSchools.map(s => s.area))].filter(Boolean).sort();

        areaSelect.innerHTML = '<option value="">-- เลือกสหวิทยาเขต --</option>';
        areas.forEach(a => {
            areaSelect.innerHTML += `<option value="${a}">${a}</option>`;
        });

        // Area Change Event
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

        // If user is 'area', auto-select?
        if (userType === 'area' && areas.length === 1) {
            areaSelect.value = areas[0];
            areaSelect.dispatchEvent(new Event('change'));
        }
    }

    window.loadQAReport = async function () {
        const schoolId = document.getElementById('qa-school-select').value;
        if (!schoolId) {
            alert("กรุณาเลือกโรงเรียน");
            return;
        }

        const schoolName = allSchools.find(s => s.id === schoolId)?.school_name;
        document.getElementById('school-title').innerText = schoolName;
        document.getElementById('qa-report-content').style.display = 'block';

        // Reset contents
        ['p1', 'p2', 'p3', 'p4', 'p5'].forEach(p => {
            document.getElementById(`${p}-content`).innerHTML = '<div class="text-center"><div class="spinner-border spinner-border-sm"></div></div>';
            // Reset textareas
            document.getElementById(`area-comment-${p}`).value = '';
            document.getElementById(`admin-comment-${p}`).value = '';
        });

        try {
            const { data, error } = await window.supabaseClient
                .from('qa_evaluations')
                .select('*')
                .eq('school_id', schoolId)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                currentEvaluationId = data.id;
                renderDetailedForm(data.form_data);

                // Load Part Comments form JSON?
                // Wait, in database we only created `area_comment` and `admin_comment` as TEXT.
                // WE DID NOT create separate columns for p1, p2, p3...
                // Solution: We will store the comments as a JSON object inside the TEXT column!
                // OR we just append them? JSON is better.
                // Let's try to parse the existing text as JSON. If it fails, treat as single string (legacy support).

                loadCommentsIntoFields(data.area_comment, 'area');
                loadCommentsIntoFields(data.admin_comment, 'admin');

                if (data.updated_at) {
                    document.getElementById('last-updated-badge').innerText = 'อัปเดต: ' + new Date(data.updated_at).toLocaleDateString('th-TH');
                }
            } else {
                currentEvaluationId = null;
                ['p1', 'p2', 'p3', 'p4', 'p5'].forEach(p => {
                    document.getElementById(`${p}-content`).innerHTML = '<div class="alert alert-secondary text-center small">ยังไม่มีข้อมูล</div>';
                });
                document.getElementById('last-updated-badge').innerText = 'ยังไม่มีข้อมูล';
            }

        } catch (err) {
            console.error("Load QA Report Error", err);
            alert("เกิดข้อผิดพลาด: " + err.message);
        }
    };

    function loadCommentsIntoFields(commentText, role) {
        if (!commentText) return;

        try {
            // Try parse as JSON
            const commentObj = JSON.parse(commentText);
            // Expect { p1: "...", p2: "..." }
            if (typeof commentObj === 'object' && commentObj !== null) {
                for (let i = 1; i <= 5; i++) {
                    const el = document.getElementById(`${role}-comment-p${i}`);
                    if (el) el.value = commentObj[`p${i}`] || '';
                }
                return;
            }
        } catch (e) {
            // Not JSON, assume it's a legacy single string
            // Put it all in Part 1 or a general box? 
            // Let's put it in Part 5 (summary) or Part 1.
            // Or just alert user?
            // Let's put in Part 5 as "General Feedback"
            const el = document.getElementById(`${role}-comment-p5`);
            if (el) el.value = commentText;
        }
    }

    function renderDetailedForm(formData) {
        if (!formData) return;

        // Helper to safely get value
        const val = (key) => formData[key];
        const isTrue = (key) => val(key) === true || val(key) === "true";
        const isFalse = (key) => val(key) === false || val(key) === "false";

        // Helper to check array values
        const has = (key, value) => {
            const arr = val(key);

            return Array.isArray(arr) && arr.includes(value);
        };

        // Render Checkbox/Radio Visual
        const radioParams = (key, trueVal, labelTrue, falseVal, labelFalse) => {
            const v = val(key);
            // Convert boolean to string if needed for comparison, or handle raw
            const isT = (v === trueVal || v === String(trueVal));
            const isF = (v === falseVal || v === String(falseVal));

            return `
                <div class="ms-3 mb-2">
                    <span class="me-3">
                        <i class="bi ${isT ? 'bi-check-square-fill text-success' : 'bi-square text-secondary'}"></i> ${labelTrue}
                    </span>
                    <span>
                        <i class="bi ${isF ? 'bi-check-square-fill text-danger' : 'bi-square text-secondary'}"></i> ${labelFalse}
                    </span>
                </div>`;
        };

        const checkbox = (label, checked) => {
            return `<div class="mb-2"><i class="bi ${checked ? 'bi-check-square-fill text-success' : 'bi-square text-secondary'}"></i> ${label}</div>`;
        };

        const note = (text) => text ? `<div class="alert alert-secondary py-1 small mt-2"><i class="bi bi-pencil"></i> ข้อค้นพบ: ${text}</div>` : '';


        // --- PART 1 ---
        let h1 = `
            <h6 class="fw-bold">1.1 การจัดทำแผนพัฒนาการจัดการศึกษา</h6>
            <div class="ps-3 mb-3">
                <div class="mb-2 fw-bold">• โรงเรียนมีแผนพัฒนาการจัดการศึกษา</div>
                ${radioParams('p1_1_has_plan', true, 'มี', false, 'ไม่มี')}
                
                <div class="mb-2 fw-bold mt-3">• ระยะเวลาในการดำเนินงานตามแผน</div>
                <div class="ps-3 mb-2 text-primary">
                    ตั้งแต่ พ.ศ. <u>${val('p1_1_start_year') || '...'}</u> ถึง พ.ศ. <u>${val('p1_1_end_year') || '...'}</u>
                </div>

                <div class="mb-2 fw-bold mt-3">• องค์ประกอบของแผน</div>
                <div class="ps-3">
                    ${checkbox('ข้อมูลและสารสนเทศพื้นฐานของสถานศึกษา', has('p1_1_composition', 'basic_info'))}
                    ${checkbox('การวิเคราะห์บริบท สภาพปัจจุบัน ปัญหา และความต้องการจำเป็น', has('p1_1_composition', 'analysis'))}
                    ${checkbox('วิสัยทัศน์ พันธกิจ เป้าประสงค์', has('p1_1_composition', 'vision'))}
                    ${checkbox('ยุทธศาสตร์/กลยุทธ์ และตัวชี้วัดความสำเร็จ', has('p1_1_composition', 'strategy'))}
                    ${checkbox('ค่าเป้าหมายความสำเร็จ (3-5 ปี)', has('p1_1_composition', 'targets'))}
                    ${checkbox('การกำหนดบทบาทหน้าที่ของผู้เกี่ยวข้อง', has('p1_1_composition', 'roles'))}
                    ${checkbox('การมีส่วนร่วมของผู้มีส่วนได้ส่วนเสีย', has('p1_1_composition', 'participation'))}
                    ${checkbox('ภาคผนวก (คำสั่งแต่งตั้งคณะกรรมการ/การอนุมัติแผน)', has('p1_1_composition', 'appendix'))}
                </div>
                ${note(val('p1_1_note'))}
            </div>
            
            <hr>
            
            <h6 class="fw-bold">1.2 การกำหนดมาตรฐานการศึกษาและค่าเป้าหมาย</h6>
            <div class="ps-3 mb-3">
                <div class="mb-2 fw-bold">• มีการกำหนดมาตรฐานการศึกษาและค่าเป้าหมายของสถานศึกษา</div>
                <div class="ms-3 mb-2">
                    <span class="me-3">
                        <i class="bi ${isTrue('p1_2_has_standard') ? 'bi-check-square-fill text-success' : 'bi-square text-secondary'}"></i> มี
                    </span>
                    <span>
                        <i class="bi ${!isTrue('p1_2_has_standard') ? 'bi-check-square-fill text-secondary' : 'bi-square text-secondary'}"></i> ไม่มี 
                    </span>
                </div>

                <div class="mb-2 fw-bold mt-3">• ค่าเป้าหมายสอดคล้องกับบริบทและสภาพ</div>
                ${radioParams('p1_2_target_consistency', 'consistent', 'สอดคล้อง', 'improve', 'ควรปรับปรุง')}
                
                ${note(val('p1_2_note'))}
            </div>
        `;
        document.getElementById('p1-content').innerHTML = h1;

        // --- PART 2 ---
        let h2 = `
            <h6 class="fw-bold">2.1 การจัดทำแผนปฏิบัติการประจำปี/แผนงบประมาณ</h6>
            <div class="ps-3 mb-3">
                 <div class="mb-2 fw-bold">• มีแผนปฏิบัติการประจำปี</div>
                 <div class="ms-3 mb-2">
                     <span class="me-3">
                        <i class="bi ${isTrue('p2_1_has_action_plan') ? 'bi-check-square-fill text-success' : 'bi-square text-secondary'}"></i> มี
                    </span>
                     <span>
                        <i class="bi ${!isTrue('p2_1_has_action_plan') ? 'bi-check-square-fill text-secondary' : 'bi-square text-secondary'}"></i> ไม่มี
                    </span>
                 </div>

                 <div class="mb-2 fw-bold mt-3">• แผนสอดคล้องกับ</div>
                 <div class="ps-3">
                     ${checkbox('แผนพัฒนาการจัดการศึกษา', has('p2_1_consistency', 'dev_plan'))}
                     ${checkbox('มาตรฐานการศึกษาของสถานศึกษา', has('p2_1_consistency', 'standards'))}
                     ${checkbox('ผลการประเมินตนเอง (SAR) ปีที่ผ่านมา', has('p2_1_consistency', 'sar'))}
                 </div>
            </div>

            <hr>

            <h6 class="fw-bold">2.2 การดำเนินงานตามแผน</h6>
            <div class="ps-3 mb-3">
                 ${checkbox('ดำเนินกิจกรรม/โครงการตามแผนครบถ้วน', isTrue('p2_2_activities_complete'))}
                 ${checkbox('มีการจัดสรรทรัพยากรอย่างเหมาะสม', isTrue('p2_2_resources_alloc'))}
                 ${checkbox('มีการบันทึกหลักฐาน/ร่องรอยการดำเนินงาน', isTrue('p2_2_record_evidence'))}
                 ${note(val('p2_2_note'))}
            </div>
        `;
        document.getElementById('p2-content').innerHTML = h2;

        // --- PART 3 ---
        let h3 = `
            <h6 class="fw-bold">3.1 การประเมินคุณภาพภายในและรายงาน SAR</h6>
            <div class="ps-3 mb-3">
                ${checkbox('มีการประเมินผลการดำเนินกิจกรรม/โครงการตามแผนปฏิบัติการประจำปีครบถ้วน', isTrue('p3_1_eval_complete'))}

                <div class="mb-2 fw-bold mt-3">• มีรายงานการประเมินตนเอง (SAR)</div>
                ${radioParams('p3_1_has_sar', true, 'มี', false, 'ไม่มี')}

                <div class="mb-2 fw-bold mt-3">• รูปแบบ SAR เป็นไปตามแนวทางที่ สพฐ./ต้นสังกัดกำหนด</div>
                ${radioParams('p3_1_sar_format_valid', true, 'ใช่', false, 'ไม่ใช่')}

                <div class="mb-2 fw-bold mt-3">• องค์ประกอบของ SAR</div>
                <div class="ps-3">
                    ${checkbox('ข้อมูลพื้นฐานของสถานศึกษา', has('p3_1_sar_composition', 'basic_info'))}
                    ${checkbox('ผลการประเมินรายมาตรฐานและภาพรวม', has('p3_1_sar_composition', 'standards_result'))}
                    ${checkbox('ระดับคุณภาพ (กำลังพัฒนา/ปานกลาง/ดี/ดีเลิศ/ยอดเยี่ยม)', has('p3_1_sar_composition', 'quality_level'))}
                    ${checkbox('หลักฐานสนับสนุนผลการประเมิน', has('p3_1_sar_composition', 'evidence'))}
                    ${checkbox('แนวทางพัฒนาคุณภาพให้สูงขึ้นอย่างน้อย 1 ระดับคุณภาพ', has('p3_1_sar_composition', 'improvement_guide'))}
                </div>
                ${note(val('p3_1_note'))}
            </div>
        `;
        document.getElementById('p3-content').innerHTML = h3;

        // --- PART 4 ---
        let h4 = `
            <h6 class="fw-bold">4.1 การนำผลการประเมินไปใช้</h6>
            <div class="ps-3 mb-3">
                ${checkbox('นำผล SAR ไปใช้ปรับปรุงแผนพัฒนาการจัดการศึกษา', isTrue('p4_1_use_sar_improve_plan'))}
                ${checkbox('นำผลไปกำหนดแผนปฏิบัติการปีถัดไป', isTrue('p4_1_use_sar_next_year'))}
                ${checkbox('มีการสื่อสารผลการประเมินและให้ข้อมูลย้อนกลับแก่ผู้เกี่ยวข้อง', isTrue('p4_1_communicate_results'))}
            </div>
            
            <h6 class="fw-bold mt-3">4.2 การพัฒนาคุณภาพการศึกษาอย่างต่อเนื่อง</h6>
            <div class="ps-3 mb-3">
                ${checkbox('มีแผนงาน/โครงการ/กิจกรรมพัฒนาต่อยอดนวัตกรรมการจัดการศึกษาอย่างเป็นระบบ', isTrue('p4_2_has_extension_plan'))}
                ${checkbox('มีการติดตามผลการพัฒนาคุณภาพการศึกษาอย่างต่อเนื่อง', isTrue('p4_2_continuous_monitoring'))}
                ${note(val('p4_2_note'))}
            </div>
        `;
        document.getElementById('p4-content').innerHTML = h4;

        // --- PART 5 ---
        let h5 = `
            <div class="mb-3">
                <div class="fw-bold text-danger">ปัญหา/อุปสรรคในการดำเนินงาน</div>
                <div class="p-3 bg-white border rounded mt-1">${val('p5_problems') || '-'}</div>
            </div>
            <div class="mb-3">
                <div class="fw-bold text-primary">ความต้องการรับการสนับสนุน/ช่วยเหลือจากหน่วยงานต้นสังกัด</div>
                 <div class="p-3 bg-white border rounded mt-1">${val('p5_support_needs') || '-'}</div>
            </div>
        `;
        document.getElementById('p5-content').innerHTML = h5;
    }

    window.saveAllFeedback = async function () {
        if (!currentEvaluationId) {
            alert("ไม่พบข้อมูลการประเมิน");
            return;
        }

        if (!confirm(`ยืนยันการบันทึกข้อเสนอแนะทั้งหมด?`)) return;

        // Collect data
        const role = userType; // 'area' or 'admin'

        // Build JSON object
        const commentObj = {};
        for (let i = 1; i <= 5; i++) {
            const el = document.getElementById(`${role}-comment-p${i}`);
            if (el) commentObj[`p${i}`] = el.value;
        }

        const commentJson = JSON.stringify(commentObj);

        try {
            const updateField = role === 'area' ? 'area_comment' : 'admin_comment';

            const { error } = await window.supabaseClient
                .from('qa_evaluations')
                .update({
                    [updateField]: commentJson, // Saving JSON string
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

    // Run
    init();

})();
