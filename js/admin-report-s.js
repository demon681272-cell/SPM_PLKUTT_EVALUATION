// ✅ admin-report-s.js (Supabase Version - Interactive Admin Feedback)
(() => {
  console.log("📋 Admin Report Page Loaded");

  let allSchools = [];
  let selectedSchoolId = '';
  let selectedPolicyIndex = null;

  // Initialize
  async function init() {
    if (!window.supabaseClient) {
      setTimeout(init, 500);
      return;
    }

    try {
      // Fetch All Schools
      const { data: schools, error } = await window.supabaseClient
        .from('users')
        .select('id, school_name, area')
        .eq('user_type', 'school')
        .order('area', { ascending: true })
        .order('school_name', { ascending: true });

      if (error) throw error;

      allSchools = schools;
      loadAreaDropdown();

    } catch (err) {
      console.error("❌ Load data error:", err);
      alert("เกิดข้อผิดพลาดในการโหลดข้อมูลโรงเรียน");
    }
  }

  // 1. Area Dropdown
  function loadAreaDropdown() {
    const areaSelect = document.getElementById('area-select');
    if (!areaSelect) return;

    const areas = [...new Set(allSchools.map(s => s.area).filter(a => a))].sort();

    let html = '<option value="">-- เลือกสหวิทยาเขต --</option>';
    areas.forEach(area => {
      const schoolCount = allSchools.filter(s => s.area === area).length;
      html += `<option value="${area}">${area} (${schoolCount} โรงเรียน)</option>`;
    });

    areaSelect.innerHTML = html;

    areaSelect.addEventListener('change', (e) => {
      const selectedArea = e.target.value;
      loadSchoolDropdown(selectedArea);

      // Reset
      selectedSchoolId = '';
      document.getElementById('policy-buttons').innerHTML = '';
      document.getElementById('report-container').innerHTML = '';
    });
  }

  // 2. School Dropdown
  function loadSchoolDropdown(area) {
    const schoolSelect = document.getElementById('school-select');
    if (!schoolSelect) return;

    if (!area) {
      schoolSelect.disabled = true;
      schoolSelect.innerHTML = '<option value="">-- กรุณาเลือกสหวิทยาเขตก่อน --</option>';
      return;
    }

    const schoolsInArea = allSchools.filter(s => s.area === area);

    let html = '<option value="">-- เลือกโรงเรียน --</option>';
    schoolsInArea.forEach(school => {
      html += `<option value="${school.id}">${school.school_name}</option>`;
    });

    schoolSelect.innerHTML = html;
    schoolSelect.disabled = false;

    schoolSelect.addEventListener('change', (e) => {
      selectedSchoolId = e.target.value;
      if (selectedSchoolId) {
        loadPolicyButtons();
      } else {
        document.getElementById('policy-buttons').innerHTML = '';
        document.getElementById('report-container').innerHTML = '';
      }
    });
  }

  // 3. Policy Buttons (Tabs)
  function loadPolicyButtons() {
    if (typeof policies === 'undefined') {
      console.error("Policies data not loaded");
      return;
    }

    const container = document.getElementById('policy-buttons');
    if (!container) return;

    let html = '<ul class="nav nav-tabs mb-3" id="policyTabs">';
    policies.forEach((policy, index) => {
      // Use policy.title (e.g., "ประเด็นที่ 1") as requested
      html += `
        <li class="nav-item">
          <a class="nav-link ${index === 0 ? '' : ''}" 
             id="tab-policy-${index}"
             href="#" 
             onclick="event.preventDefault(); window.loadPolicyReport(${index});">
             ${policy.title}
          </a>
        </li>
      `;
    });
    html += '</ul>';

    container.innerHTML = html;
  }

  // 4. Load Report Data
  window.loadPolicyReport = async function (policyIndex) {
    if (!selectedSchoolId) {
      alert("กรุณาเลือกโรงเรียนก่อน");
      return;
    }

    // Update Active Tab UI
    document.querySelectorAll('#policyTabs .nav-link').forEach(link => link.classList.remove('active'));
    const activeTab = document.getElementById(`tab-policy-${policyIndex}`);
    if (activeTab) activeTab.classList.add('active');

    selectedPolicyIndex = policyIndex;
    const policy = policies[policyIndex];
    const policyId = policyIndex + 1;

    // Show Loading
    document.getElementById('report-container').innerHTML = '<div class="text-center p-5"><div class="spinner-border text-primary"></div><p class="mt-2">กำลังโหลดข้อมูล...</p></div>';

    try {
      const { data: evaluations, error } = await window.supabaseClient
        .from('evaluations')
        .select('*')
        .eq('school_id', selectedSchoolId)
        .eq('policy_id', policyId);

      if (error) throw error;

      displayReports(policy, evaluations);

    } catch (err) {
      console.error("❌ Load reports error:", err);
      alert("เกิดข้อผิดพลาดในการโหลดรายงาน: " + err.message);
    }
  };

  // 5. Render Report & Feedback Form
  function displayReports(policy, evaluations) {
    const container = document.getElementById('report-container');
    if (!container) return;

    let html = `<div class="p-3 mb-4 bg-light border rounded">
        <h3><i class="bi bi-clipboard-data"></i> ${policy.head1}</h3>
        <p class="text-muted mb-0">โรงเรียน: ${getSchoolName(selectedSchoolId)}</p>
      </div>`;

    if (!policy.items || policy.items.length === 0) {
      container.innerHTML = '<div class="alert alert-info">ไม่มีรายการในนโยบายนี้</div>';
      return;
    }

    policy.items.forEach((item) => {
      const evaluation = evaluations.find(e => e.eva_id === item.evaId);

      // Data extraction
      const schoolDetail = evaluation ? evaluation.school_report_process : '';
      const pdfUrl = evaluation ? evaluation.pdf_url : '';
      const areaComment = evaluation ? evaluation.area_comment_process : ''; // Correct field name
      const adminComment = evaluation ? evaluation.admin_comment_process : ''; // Admin field

      // Status checks
      const hasSchoolData = !!schoolDetail;
      const hasAreaComment = !!areaComment;

      // 1. School Section
      let schoolSectionHtml = '';
      if (schoolDetail) {
        schoolSectionHtml = `<textarea class="form-control mb-2" rows="5" readonly style="background:#f8f9fa">${schoolDetail}</textarea>`;
      } else {
        schoolSectionHtml = `<div class="alert alert-secondary py-2">โรงเรียนยังไม่บันทึกข้อมูล</div>`;
      }

      const pdfHtml = pdfUrl
        ? `<a href="${pdfUrl}" target="_blank" class="btn btn-sm btn-outline-primary mb-2"><i class="bi bi-file-earmark-pdf"></i> ดูไฟล์แนบ</a>`
        : `<span class="badge bg-secondary mb-2">ไม่มีไฟล์แนบ</span>`;

      // 2. Area Section
      let areaSectionHtml = '';
      if (areaComment) {
        areaSectionHtml = `
               <div class="alert alert-success bg-opacity-10 border-success mb-2">
                 <strong><i class="bi bi-chat-dots"></i> ข้อเสนอแนะจากสหวิทยาเขต:</strong><br>
                 ${areaComment}
               </div>`;
      } else {
        areaSectionHtml = `<div class="text-muted small mb-2"><i class="bi bi-dash-circle"></i> ยังไม่มีข้อเสนอแนะจากสหวิทยาเขต</div>`;
      }

      // 3. Admin Section (Editable)
      const adminSectionHtml = `
          <div class="mt-3">
             <label class="form-label fw-bold text-primary"><i class="bi bi-person-workspace"></i> ข้อเสนอแนะจากเขตพื้นที่ (Admin)</label>
             <textarea id="admin-comment-${item.evaId}" class="form-control" rows="4" placeholder="ระบุข้อเสนอแนะ...">${adminComment || ''}</textarea>
          </div>
        `;

      html += `
          <div class="card mb-4 shadow-sm">
            <div class="card-header fw-bold">
              ${item.text}
            </div>
            <div class="card-body">
              <div class="row">
                <!-- Left: School & Area Data -->
                <div class="col-md-7 border-end">
                  <h6 class="text-muted">ข้อมูลจากโรงเรียน</h6>
                  ${schoolSectionHtml}
                  ${pdfHtml}
                  <hr class="my-3">
                  ${areaSectionHtml}
                </div>
  
                <!-- Right: Admin Input -->
                <div class="col-md-5 bg-light p-3">
                    ${adminSectionHtml}
                </div>
              </div>
            </div>
          </div>
        `;
    });

    // Global Save Button for this Policy
    html += `
        <div class="d-grid gap-2 d-md-flex justify-content-md-end mt-4 mb-5">
           <button class="btn btn-primary btn-lg" onclick="window.saveAdminFeedback(${selectedPolicyIndex})">
             <i class="bi bi-save"></i> บันทึกข้อเสนอแนะทั้งหมดในหมวดนี้
           </button>
        </div>
      `;

    container.innerHTML = html;
  }

  // 6. Save Function
  window.saveAdminFeedback = async function (policyIndex) {
    const policy = policies[policyIndex];
    const policyId = policyIndex + 1;
    const saveBtn = document.querySelector('button[onclick*="saveAdminFeedback"]');

    if (!confirm("ยืนยันการบันทึกข้อเสนอแนะ?")) return;

    try {
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> กำลังบันทึก...';
      }

      // Loop through all items in this policy
      for (const item of policy.items) {
        const commentBox = document.getElementById(`admin-comment-${item.evaId}`);
        if (commentBox) {
          const comment = commentBox.value;

          // Perform Upsert/Update
          // Note: Ideally we update existing rows. If row doesn't exist (school hasn't submitted), 
          // we might need to insert? Usually Admin comments on existing submissions.
          // We will update where school_id, policy_id, eva_id matches.

          const { error } = await window.supabaseClient
            .from('evaluations')
            .update({
              admin_comment_process: comment,
              updated_at: new Date().toISOString()
            })
            .eq('school_id', selectedSchoolId)
            .eq('policy_id', policyId)
            .eq('eva_id', item.evaId);

          if (error) {
            console.error(`Failed to save ${item.evaId}`, error);
          }
        }
      }

      alert("✅ บันทึกข้อมูลเรียบร้อยแล้ว");
      // Reload to show latest state
      window.loadPolicyReport(policyIndex);

    } catch (err) {
      console.error("Save Error:", err);
      alert("เกิดข้อผิดพลาดในการบันทึก: " + err.message);
    } finally {
      if (saveBtn) {
        saveBtn.disabled = false;
        saveBtn.innerHTML = '<i class="bi bi-save"></i> บันทึกข้อเสนอแนะทั้งหมดในหมวดนี้';
      }
    }
  }

  // Helper
  function getSchoolName(id) {
    const s = allSchools.find(x => x.id === id);
    return s ? s.school_name : id;
  }

  // Start
  init();

})();

