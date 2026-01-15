// sexuality-form.js - Logic for School users to fill Sexuality Education Form

(() => {
    let currentEvaluationId = null;

    // --- INIT ---
    async function init() {
        if (!window.supabaseClient) {
            setTimeout(init, 300);
            return;
        }

        // Generate Part 4 Tabs
        generatePart4();

        // Event Listeners for Radios to toggle inputs
        setupRadioToggles();

        // Load Data
        await loadFormData();
    }

    // --- HTML GENERATORS ---
    function generatePart4() {
        const tabContent = document.getElementById('gradeTabContent');
        const grades = ['m1', 'm2', 'm3', 'm4', 'm5', 'm6'];

        let html = '';
        grades.forEach((g, index) => {
            const active = index === 0 ? 'show active' : '';

            // Generate rows
            // Row 1: has the Rowspan Evidence Cell
            const r1 = p4Row(g, 'not_implemented', 'ไม่ได้จัดการเรียนการสอนเพศวิถีศึกษา', true, false, true);
            // Other rows: Do NOT generate the middle cell
            const r2 = p4Row(g, 'basic_subject', 'จัดเป็นรายวิชาพื้นฐาน ในกลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา', false, true);
            const r3 = p4Row(g, 'additional_subject', 'จัดเป็นรายวิชาเพิ่มเติม ในกลุ่มสาระการเรียนรู้สุขศึกษาและพลศึกษา', false, true);
            const r4 = p4Row(g, 'integration', 'บูรณาการกับรายวิชา (ระบุรายวิชา)', false, true);
            const r5 = p4Row(g, 'activity', 'จัดในกิจกรรมพัฒนาผู้เรียน (ระบุกิจกรรม)', false, true);
            const r6 = p4Row(g, 'extra', 'สอดแทรกในรายวิชาอื่น ๆ หรือจัดเป็นหลักสูตรระยะสั้น (ระบุรายวิชาและกิจกรรม)', false, true);

            html += `
            <div class="tab-pane fade ${active}" id="${g}-pane" role="tabpanel">
                <div class="table-responsive">
                    <table class="table table-bordered align-middle">
                        <thead class="table-secondary">
                            <tr>
                                <th style="width:50%">การจัดการเรียนรู้เพศวิถีศึกษาและทักษะชีวิต</th>
                                <th style="width:50%">เอกสาร/หลักฐานอ้างอิง (แนบไฟล์ตัวอย่าง)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${r1}
                            ${r2}
                            ${r3}
                            ${r4}
                            ${r5}
                            ${r6}
                        </tbody>
                    </table>
                </div>
            </div>`;
        });
        tabContent.innerHTML = html;
    }

    function p4Row(grade, key, label, isReason = false, isCode = false, isFirstRow = false) {
        const id = `p4_${grade}_${key}`;

        let detailInput = '';
        if (isReason) {
            detailInput = `<input type="text" class="form-control form-control-sm mt-1" name="${id}_reason" placeholder="ระบุเหตุผลความจำเป็น">`;
        } else if (isCode) {
            detailInput = `<input type="text" class="form-control form-control-sm mt-1" name="${id}_detail" placeholder="ระบุรายละเอียด/รหัสวิชา">`;
        }

        // Evidence Column (Only for First Row, Rowspan=6)
        let evidenceCell = '';
        if (isFirstRow) {
            const evidenceItems = [
                { k: 'e1', l: 'โครงสร้างหลักสูตรสถานศึกษา' },
                { k: 'e2', l: 'คำอธิบายรายวิชา' },
                { k: 'e3', l: 'แผนการจัดการเรียนรู้' },
                { k: 'e4', l: 'หลักฐานอื่น ๆ (ระบุ)' }
            ];

            let evidenceHtml = '<div class="d-flex flex-column gap-3">';
            evidenceItems.forEach(item => {
                const eid = `p4_${grade}_${item.k}`;
                const isOther = item.k === 'e4';

                evidenceHtml += `
                <div class="p-2 border rounded bg-light">
                    <div class="form-check">
                         <input class="form-check-input" type="checkbox" name="${eid}" id="${eid}">
                         <label class="form-check-label fw-bold" for="${eid}">${item.l}</label>
                    </div>
                    ${isOther ? `<input type="text" class="form-control form-control-sm mb-2 mt-1" name="${eid}_text" placeholder="ระบุชื่อหลักฐาน">` : ''}
                    <div class="mt-1">
                        <label class="form-label small text-muted mb-0"><i class="bi bi-paperclip"></i> แนบไฟล์ตัวอย่าง</label>
                        <input type="file" class="form-control form-control-sm" name="${eid}_file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx">
                        <input type="hidden" name="${eid}_file_url"> <!-- Store URL after upload -->
                    </div>
                </div>`;
            });
            evidenceHtml += '</div>';

            evidenceCell = `<td rowspan="6" class="align-top">${evidenceHtml}</td>`;
        }

        return `
        <tr>
            <td>
                <div class="form-check">
                    <input class="form-check-input" type="checkbox" name="${id}_check" id="${id}_check">
                    <label class="form-check-label" for="${id}_check">${label}</label>
                </div>
                ${detailInput}
            </td>
            ${evidenceCell}
        </tr>
        `;
    }


    // --- LOAD DATA ---
    async function loadFormData() {
        try {
            const userId = localStorage.getItem("UserID");
            if (!userId) {
                console.error("No UserID found in localStorage");
                return;
            }

            // Find existing evaluation
            const { data, error } = await window.supabaseClient
                .from('sexuality_evaluations')
                .select('*')
                .eq('school_id', userId)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                currentEvaluationId = data.id;
                populateForm(data.form_data);
            }
        } catch (err) {
            console.error("Load Error", err);
        }
    }

    function populateForm(data) {
        if (!data) return;

        // Radios
        setRadio('p1_status', data.p1_status);
        setRadio('p2_status', data.p2_status);
        setRadio('p3_status', data.p3_status);

        // Text inputs
        setText('p1_reason', data.p1_reason);
        setText('p1_project_names', data.p1_project_names);
        setText('p2_reason', data.p2_reason);
        setText('p2_method', data.p2_method);
        setText('p3_reason', data.p3_reason);
        setText('p3_training_count', data.p3_training_count);
        setText('p3_passed_count', data.p3_passed_count);
        setText('p5_problems', data.p5_problems);
        setText('p5_needs', data.p5_needs);

        // Checkbox
        if (data.p3_passed) document.querySelector('[name="p3_passed"]').checked = true;

        // Tables (Part 3)
        if (data.p3_table1) {
            const tbody = document.querySelector('#p3_table1 tbody');
            tbody.innerHTML = '';
            data.p3_table1.forEach(row => addP3Row1(row));
        }
        if (data.p3_table2) {
            const tbody = document.querySelector('#p3_table2 tbody');
            tbody.innerHTML = '';
            data.p3_table2.forEach(row => addP3Row2(row));
        }

        // Part 4 (Dynamic Inputs)
        // Iterate all inputs starting with p4_
        for (const [key, value] of Object.entries(data)) {
            if (key.startsWith('p4_')) {
                const el = document.querySelector(`[name="${key}"]`);
                if (el) {
                    if (el.type === 'checkbox') el.checked = value;
                    else if (el.type === 'file') {
                        // Skip the file input itself, but check for URL
                        // File URL is stored as key + '_url'
                    } else {
                        el.value = value;
                    }
                }

                // Show uploaded file link if exists
                if (key.endsWith('_file_url') && value) {
                    const fileInputName = key.replace('_url', ''); // e.g., p4_m1_e1_file
                    const fileInput = document.querySelector(`[name="${fileInputName}"]`);
                    if (fileInput) {
                        // Create link element
                        let linkDiv = fileInput.parentElement.querySelector('.uploaded-file-link');
                        if (!linkDiv) {
                            linkDiv = document.createElement('div');
                            linkDiv.className = 'uploaded-file-link mt-1';
                            fileInput.parentElement.appendChild(linkDiv);
                        }
                        linkDiv.innerHTML = `<a href="${value}" target="_blank" class="btn btn-sm btn-outline-success"><i class="bi bi-file-earmark-check"></i> ดูไฟล์ที่อัพโหลดแล้ว</a>`;
                    }
                }
            }
        }

        // Trigger generic change events for toggles
        document.querySelectorAll('input[type=radio]:checked').forEach(el => el.dispatchEvent(new Event('change')));
    }

    // --- SAVE ---
    window.saveSexualityForm = async function () {
        if (!confirm("ยืนยันการบันทึกข้อมูล?")) return;

        const userId = localStorage.getItem("UserID");
        if (!userId) { alert("กรุณาเข้าสู่ระบบใหม่"); return; }

        // Show loading indicator
        const saveBtn = document.querySelector('button[onclick="saveSexualityForm()"]');
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังบันทึก...';
        }

        try {
            // Collect Data
            const formData = {};

            // 1. Text/Radio/Checkbox Inputs (Simple)
            const fileInputs = []; // Store file inputs for upload
            document.querySelectorAll('#sexualityForm input, #sexualityForm textarea').forEach(el => {
                if (!el.name) return;
                if (el.type === 'button' || el.type === 'submit') return;

                if (el.type === 'radio') {
                    if (el.checked) formData[el.name] = el.value;
                } else if (el.type === 'checkbox') {
                    formData[el.name] = el.checked;
                } else if (el.type === 'file') {
                    // Collect file inputs for later upload
                    if (el.files && el.files[0]) {
                        fileInputs.push({ name: el.name, file: el.files[0] });
                    }
                } else {
                    formData[el.name] = el.value;
                }
            });

            // 2. Tables (Part 3)
            formData.p3_table1 = getTableData('#p3_table1');
            formData.p3_table2 = getTableData('#p3_table2');

            // 3. Upload Files to Google Drive
            for (const input of fileInputs) {
                try {
                    const fileUrl = await uploadFileToGAS(input.file, userId, input.name);
                    if (fileUrl) {
                        // Store URL with _url suffix
                        formData[input.name + '_url'] = fileUrl;
                        console.log(`✅ อัพโหลด ${input.name} สำเร็จ:`, fileUrl);
                    }
                } catch (err) {
                    console.error(`❌ อัพโหลด ${input.name} ล้มเหลว:`, err);
                    // Continue with others even if one fails
                }
            }

            // 4. Save to Supabase
            const payload = {
                school_id: userId,
                area: localStorage.getItem('Area') || '',
                form_data: formData,
                updated_at: new Date().toISOString()
            };

            let result;
            if (currentEvaluationId) {
                result = await window.supabaseClient
                    .from('sexuality_evaluations')
                    .update(payload)
                    .eq('id', currentEvaluationId);
            } else {
                result = await window.supabaseClient
                    .from('sexuality_evaluations')
                    .insert([payload]);
            }

            if (result.error) throw result.error;

            alert("✅ บันทึกข้อมูลเรียบร้อย");
            if (!currentEvaluationId && result.data) currentEvaluationId = result.data[0].id;

        } catch (err) {
            console.error(err);
            alert("❌ บันทึกไม่สำเร็จ: " + err.message);
        } finally {
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="bi bi-save"></i> บันทึกข้อมูล';
            }
        }
    };

    // Helper: Upload File to Google Apps Script
    async function uploadFileToGAS(file, userId, fieldName) {
        const base64 = await toBase64(file);
        const formData = new FormData();

        formData.append("action", "submitEvaluation");
        formData.append("UserID", userId);
        formData.append("Eva_ID", `SEXUALITY_${fieldName}_${Date.now()}`);
        formData.append("Eva_PDF", base64);

        // Dummy fields to satisfy GAS validation
        formData.append("School_Report_Detail", `Evidence File: ${fieldName}`);
        formData.append("School_Report_Innovation", file.name);
        formData.append("School_Report_Process", "-");
        formData.append("School_Report_Output", "-");

        const res = await fetch(CONFIG.API_URL, { method: "POST", body: formData });
        const json = await res.json();

        return json.url || null;
    }

    // Helper: Convert File to Base64
    const toBase64 = file => new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });

    // --- HELPERS ---

    function setupRadioToggles() {
        // P1
        document.querySelectorAll('input[name="p1_status"]').forEach(el => {
            el.addEventListener('change', () => {
                const val = document.querySelector('input[name="p1_status"]:checked').value;
                document.getElementById('p1_reason_div').style.display = (val === 'not_implemented') ? 'block' : 'none';
                document.getElementById('p1_detail_div').style.display = (val === 'implemented') ? 'block' : 'none';
            });
        });

        // P2
        document.querySelectorAll('input[name="p2_status"]').forEach(el => {
            el.addEventListener('change', () => {
                const val = document.querySelector('input[name="p2_status"]:checked').value;
                document.getElementById('p2_reason_div').style.display = (val === 'not_implemented') ? 'block' : 'none';
                document.getElementById('p2_detail_div').style.display = (val === 'implemented') ? 'block' : 'none';
            });
        });

        // P3
        document.querySelectorAll('input[name="p3_status"]').forEach(el => {
            el.addEventListener('change', () => {
                const val = document.querySelector('input[name="p3_status"]:checked').value;
                document.getElementById('p3_reason_div').style.display = (val === 'not_implemented') ? 'block' : 'none';
                document.getElementById('p3_tables').style.display = (val === 'implemented') ? 'block' : 'none';
            });
        });
    }

    window.addP3Row1 = (data = {}) => {
        const tbody = document.querySelector('#p3_table1 tbody');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="form-control form-control-sm" name="t1_name" value="${data.name || ''}"></td>
            <td><input type="text" class="form-control form-control-sm" name="t1_pos" value="${data.pos || ''}"></td>
            <td><input type="number" class="form-control form-control-sm" name="t1_units" value="${data.units || ''}"></td>
            <td><input type="number" class="form-control form-control-sm" name="t1_plans" value="${data.plans || ''}"></td>
            <td><button type="button" class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()"><i class="bi bi-trash"></i></button></td>
        `;
        tbody.appendChild(tr);
    };

    window.addP3Row2 = (data = {}) => {
        const tbody = document.querySelector('#p3_table2 tbody');
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><input type="text" class="form-control form-control-sm" name="t2_name" value="${data.name || ''}"></td>
             <td><input type="text" class="form-control form-control-sm" name="t2_pos" value="${data.pos || ''}"></td>
            <td><button type="button" class="btn btn-sm btn-danger" onclick="this.closest('tr').remove()"><i class="bi bi-trash"></i></button></td>
        `;
        tbody.appendChild(tr);
    };

    function getTableData(selector) {
        const rows = [];
        document.querySelectorAll(`${selector} tbody tr`).forEach(tr => {
            const rowData = {};
            // Determine table type by input names
            if (selector.includes('table1')) {
                rowData.name = tr.querySelector('[name="t1_name"]').value;
                rowData.pos = tr.querySelector('[name="t1_pos"]').value;
                rowData.units = tr.querySelector('[name="t1_units"]').value;
                rowData.plans = tr.querySelector('[name="t1_plans"]').value;
            } else {
                rowData.name = tr.querySelector('[name="t2_name"]').value;
                rowData.pos = tr.querySelector('[name="t2_pos"]').value;
            }
            // Only add if at least name is present (simple valid check)
            if (rowData.name) rows.push(rowData);
        });
        return rows;
    }

    function setRadio(name, val) {
        if (!val) return;
        const el = document.querySelector(`input[name="${name}"][value="${val}"]`);
        if (el) el.checked = true;
    }

    function setText(name, val) {
        const el = document.querySelector(`[name="${name}"]`);
        if (el) el.value = val || '';
    }

    init();
})();
