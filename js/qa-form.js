// qa-form.js - Handles the School side of QA Evaluation

(() => {
    // Check Auth
    const userID = localStorage.getItem("UserID");
    const userType = localStorage.getItem("UserType");
    const area = localStorage.getItem("Area");

    // Elements
    const form = document.getElementById('qaForm');
    const statusSpan = document.getElementById('form-status');
    const lastUpdatedSpan = document.getElementById('last-updated');

    if (!userID) {
        alert("กรุณาเข้าสู่ระบบ");
        return;
    }

    if (userType !== 'school') {
        // If Area/Admin views this, strictly read-only mode (or redirect to report page)
        // For now, let's allow them to see but not save (handled by RLS anyway)
        // But ideally they should use qa-report.html 
    }

    // Initialize
    async function init() {
        if (!window.supabaseClient) {
            setTimeout(init, 300);
            return;
        }
        await loadData();
    }

    // Load Data
    async function loadData() {
        try {
            statusSpan.innerText = "กำลังโหลด...";

            // Fetch existing data for this school
            const { data, error } = await window.supabaseClient
                .from('qa_evaluations')
                .select('*')
                .eq('school_id', userID)
                .maybeSingle();

            if (error) throw error;

            if (data) {
                // Populate Form
                populateForm(data.form_data || {});

                // Show Feedback if available
                if (data.area_comment || data.admin_comment) {
                    document.getElementById('feedback-section').style.display = 'block';
                    document.getElementById('display-area-comment').innerText = data.area_comment || '-';
                    document.getElementById('display-admin-comment').innerText = data.admin_comment || '-';
                }

                statusSpan.innerText = "โหลดข้อมูลสำเร็จ";
                statusSpan.className = "alert alert-success";

                if (data.updated_at) {
                    const date = new Date(data.updated_at);
                    lastUpdatedSpan.innerText = `อัปเดตล่าสุด: ${date.toLocaleString('th-TH')}`;
                }

            } else {
                statusSpan.innerText = "ยังไม่มีการบันทึกข้อมูล (เริ่มทำแบบประเมิน)";
                statusSpan.className = "alert alert-warning";
            }

        } catch (err) {
            console.error("Load QA Error:", err);
            statusSpan.innerText = "เกิดข้อผิดพลาดในการโหลดข้อมูล";
            statusSpan.className = "alert alert-danger";
        }
    }

    // Populate Form Helper
    function populateForm(formData) {
        for (const [key, value] of Object.entries(formData)) {
            const input = form.elements[key];
            if (!input) continue;

            // Handle Checkbox Arrays (e.g., p1_1_composition)
            // If the input is a NodeList (radios/checkboxes with same name)
            if (input instanceof RadioNodeList) {
                // If it's a checkbox group (value is array in JSON)
                if (Array.isArray(value)) {
                    // Check matching checkboxes
                    const checkboxes = document.querySelectorAll(`input[name="${key}"]`);
                    checkboxes.forEach(cb => {
                        cb.checked = value.includes(cb.value);
                    });
                } else {
                    // It's a radio group or single value
                    input.value = value.toString();
                }
            } else if (input.type === 'checkbox') {
                // Single checkbox (boolean)
                input.checked = !!value;
            } else {
                // Text/Textarea
                input.value = value;
            }
        }
    }

    // Collect Data Helper
    function getFormData() {
        const formData = new FormData(form);
        const data = {};

        // Iterate over form entries
        for (const [key, value] of formData.entries()) {
            // Check if this key corresponds to a multi-value checkbox
            const inputElements = document.querySelectorAll(`input[name="${key}"]`);
            const isMultiCheckbox = inputElements.length > 1 && inputElements[0].type === 'checkbox';

            if (isMultiCheckbox) {
                if (!data[key]) data[key] = [];
                data[key].push(value);
            } else if (inputElements.length > 0 && inputElements[0].type === 'checkbox') {
                // Single checkbox hack: FormData only sends if checked. 
                // However, we handle unchecked via standard DOM check below or default values.
                // Actually FormData logic:
                // - If checked, it's included.
                // - If unchecked, it's NOT included.
                // So we must iterate inputs manually for uncheckeds if we want strict false? 
                // Or just trust what's in 'data' is true. 
                // Let's use a simpler approach: Read input states directly for booleans.
                data[key] = value;
            } else {
                data[key] = value;
            }
        }

        // Fix: Explicitly handle unchecked single checkboxes (booleans)
        const allSingleCheckboxes = document.querySelectorAll('input[type="checkbox"]:not([name*="composition"]):not([name*="consistency"]):not([name*="sar_"]):not([name*="standard"])'); // Improve selector if needed, or just loop all unique names
        // Better strategy: Loop through form.elements
        for (let i = 0; i < form.elements.length; i++) {
            const el = form.elements[i];
            if (el.type === 'checkbox' && !el.name.includes('composition') && !el.name.includes('consistency')) {
                // It is likely a boolean toggle
                // Actually, simpler to just store what we have. JSONB can handle missing keys as false if we want.
                // But let's be explicit for "switches"
                if (el.checked) {
                    data[el.name] = true;
                } else {
                    // If it was not in formData (unchecked), set to false? 
                    // Or just leave it out. Let's set true/false.
                    if (!data[el.name]) data[el.name] = false;
                }
            }
        }

        return data;
    }

    // Save Function (Global Window)
    window.saveQAForm = async function () {
        const payload = getFormData();
        const btn = document.querySelector('button[type="submit"]');

        if (!confirm("ยืนยันการบันทึกข้อมูล?")) return;

        try {
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังบันทึก...';

            // Check if row exists
            const { data: existing } = await window.supabaseClient
                .from('qa_evaluations')
                .select('id')
                .eq('school_id', userID)
                .maybeSingle();

            let error;
            if (existing) {
                // Update
                const { error: updateError } = await window.supabaseClient
                    .from('qa_evaluations')
                    .update({
                        form_data: payload,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', existing.id);
                error = updateError;
            } else {
                // Insert
                const { error: insertError } = await window.supabaseClient
                    .from('qa_evaluations')
                    .insert([{
                        school_id: userID,
                        area: area,
                        form_data: payload
                    }]);
                error = insertError;
            }

            if (error) throw error;

            alert('✅ บันทึกข้อมูลเรียบร้อยแล้ว');
            await loadData(); // Reload to reflect changes

        } catch (err) {
            console.error("Save Error:", err);
            alert("❌ เกิดข้อผิดพลาด: " + err.message);
        } finally {
            btn.disabled = false;
            btn.innerHTML = '<i class="bi bi-save"></i> บันทึกข้อมูล';
        }
    };

    // Run
    init();

})();
