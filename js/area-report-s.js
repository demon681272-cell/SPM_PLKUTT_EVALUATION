// ✅ area-report-s.js (Simplified Single Textarea Version)
(() => {
  console.log("🚀 area-report.js loaded (Supabase Version)");
  const area = localStorage.getItem("Area");
  const userType = localStorage.getItem("UserType");
  const selectedSchool = { userID: "" };

  console.log("🔍 UserType:", userType);
  console.log("🔍 Area:", area);

  // 1. ดึงข้อมูลรายชื่อโรงเรียนใน Area จาก Supabase
  if (!area) {
    alert("ไม่พบข้อมูล Area ของคุณ กรุณา Login ใหม่");
  } else {
    loadSchoolsInArea();
  }

  async function loadSchoolsInArea() {
    // Note: Database stores area in Thai presumably? "สหวิทยาเขต..."
    // Ensure the area variable matches what is in the DB 'users' table.

    try {
      const { data: schools, error } = await window.supabaseClient
        .from('users')
        .select('id, school_name') // Select specific columns based on new schema
        .eq('user_type', 'school')
        .eq('area', area); // Filter by logged-in user's area

      if (error) throw error;

      console.log("📦 ได้ข้อมูลโรงเรียน:", schools);
      const dropdown = document.getElementById("schoolDropdown");
      dropdown.innerHTML = `<option value="">--เลือกโรงเรียน --</option>`;

      schools.forEach(school => { // Supabase 'users' table uses 'school_name' snake_case
        const opt = document.createElement("option");
        opt.value = school.id;
        opt.textContent = school.school_name;
        dropdown.appendChild(opt);
      });

    } catch (err) {
      console.error("❌ โหลดรายชื่อโรงเรียนล้มเหลว:", err);
      // alert("ไม่สามารถโหลดรายชื่อโรงเรียนได้: " + err.message);
    }
  }

  // Event เมื่อเลือกโรงเรียน
  window.onSchoolChange = function (userID) {
    console.log("📍 เรียก onSchoolChange แล้ว ID:", userID);
    if (!userID) return;
    selectedSchool.userID = userID;

    // Clear old tabs
    $('#policyTabs').empty();
    $('#policyContent').empty();

    // Generate UI from area_policies (which should be 12 items now)
    area_policies.forEach((policy, i) => {
      // 1. Tab Nav
      $('#policyTabs').append(`<li class="nav-item"> <a class="nav-link ${i === 0 ? 'active' : ''}" data-bs-toggle="tab" href="#policy${i}">${policy.title}</a></li>`);

      // 2. Content Pane
      let content = `<div class="tab-pane fade ${i === 0 ? 'show active' : ''}" id="policy${i}">`;
      content += `<h5 class="mb-3">${policy.head1}</h5>`;

      // 3. Questions Loop
      if (policy.items && Array.isArray(policy.items)) {
        policy.items.forEach((item, j) => {
          content += `
            <div class="card mb-3">
              <div class="card-header fw-bold">${item.text}</div>
              <div class="card-body">
                <form id="form${i}_${j}">
                  <input type="hidden" name="Eva_ID" value="${item.evaId}">
                  <!-- Legacy fields (WriteSheet, ReadSheet) are removed or ignored -->

                  <div class="row">
                    <!-- ฝั่งซ้าย: ข้อมูลจากโรงเรียน (Read Only) -->
                    <div class="col-md-6">
                      <div class="school-report-container-${i}_${j}">
                         <div class="mb-3">
                            <label class="form-label text-primary">ผลการดำเนินงานของโรงเรียน</label>
                            <textarea name="School_Report_Detail" class="form-control" rows="6" readonly placeholder="โรงเรียนยังไม่บันทึกข้อมูล" style="background-color: #f8f9fa;"></textarea>
                         </div>
                      </div>
                      <div class="mb-3">
                        <label class="form-label">ไฟล์แนบจากโรงเรียน</label>
                        <div class="form-control bg-light">
                          <a class="AttachFile btn btn-sm btn-outline-info" target="_blank" style="display:none">
                            <i class="bi bi-file-earmark-pdf"></i> เปิดไฟล์แนบ
                          </a>
                          <span class="NoFile text-muted">ไม่พบไฟล์แนบ</span>
                        </div>
                      </div>
                    </div>
                    
                    <!-- ฝั่งขวา: ข้อเสนอแนะจากเขต (Editable) -->
                    <div class="col-md-6 border-start">
                      <div class="mb-3">
                        <label class="form-label text-success">ข้อเสนอแนะจากเขตพื้นที่</label>
                        <textarea name="Eva_Comment_Detail" class="form-control" rows="6" placeholder="ระบุข้อเสนอแนะ..."></textarea>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>`;
        });
      }

      // Button to save feedback for WHOLE policy
      content += `
        <div class="text-frist mb-4">
          <button class="btn btn-success" id="saveBtn${i}" onclick="window.submitFeedbackByPolicy(${i}, ${policy.title.replace('ประเด็นที่ ', '')})">
            <i class="bi bi-save"></i> บันทึกข้อเสนอแนะ ${policy.title}
          </button>
        </div>
      </div>`;

      $('#policyContent').append(content);

      // Load Data for this policy (School Report + Existing Feedback)
      const policyId = policy.title.replace('ประเด็นที่ ', '');
      loadPolicyData(i, policyId, userID);
    });
  };

  // Function to load BOTH School Data AND Area Feedback
  async function loadPolicyData(policyIndex, policyId, schoolID) {
    try {
      const { data: evaluations, error } = await window.supabaseClient
        .from('evaluations')
        .select('*')
        .eq('school_id', schoolID) // Supabase handles TEXT comparison correctly
        .eq('policy_id', policyId);

      if (error) throw error;

      const forms = document.querySelectorAll(`#policy${policyIndex} form`);
      let allChecked = true;
      let hasAnyData = false;

      forms.forEach(form => {
        const evaId = form.querySelector('input[name="Eva_ID"]').value;
        const matchingData = evaluations.find(e => e.eva_id === evaId);

        if (matchingData) {
          hasAnyData = true;
          // 1. Fill School Data (Single Field)
          form.querySelector('textarea[name="School_Report_Detail"]').value = matchingData.school_report_process || "ยังไม่มีข้อมูล";

          const fileLink = form.querySelector(".AttachFile");
          const noFileSpan = form.querySelector(".NoFile");

          if (matchingData.pdf_url) {
            fileLink.href = matchingData.pdf_url;
            fileLink.style.display = 'inline-block';
            noFileSpan.style.display = 'none';
          } else {
            fileLink.style.display = 'none';
            noFileSpan.style.display = 'inline';
          }

          // 2. Fill Existing Area Feedback (Single Field in 'area_comment_process')
          form.querySelector('textarea[name="Eva_Comment_Detail"]').value = matchingData.area_comment_process || "";

          // 3. Status Check
          if (!matchingData.is_checked) {
            allChecked = false;
          } else {
            // If checked, disable editing feedback? (Optional, user might want to edit later)
            // Let's keep it editable but show status
          }
        } else {
          // No data for this item yet
          allChecked = false;
          // Clear fields just in case
          form.querySelector('textarea[name="School_Report_Detail"]').value = "ยังไม่มีข้อมูล";
        }
      });

      // Update Button State
      const saveBtn = document.querySelector(`#saveBtn${policyIndex}`);
      if (allChecked && hasAnyData) {
        saveBtn.innerText = "✅ บันทึกแล้ว (แก้ไขได้)";
        saveBtn.classList.remove("btn-success");
        saveBtn.classList.add("btn-outline-success");
      }

    } catch (err) {
      console.error(`Error loading policy ${policyId}:`, err);
    }
  }

  // Save Feedback
  window.submitFeedbackByPolicy = async function (policyIndex, policyId) {
    if (!confirm("ยืนยันการบันทึกข้อเสนอแนะ?")) return;

    const forms = document.querySelectorAll(`#policy${policyIndex} form`);
    const schoolID = selectedSchool.userID;

    // Change Button State
    const saveBtn = document.querySelector(`#saveBtn${policyIndex}`);
    const originalText = saveBtn.innerText;
    saveBtn.innerText = "กำลังบันทึก...";
    saveBtn.disabled = true;

    for (const form of forms) {
      const evaId = form.querySelector('input[name="Eva_ID"]').value;

      // Get Feedback Values
      const commentDetail = form.querySelector('textarea[name="Eva_Comment_Detail"]').value;

      // Skip empty updates if no school data exists? No, maybe they want to comment on 'no data'.

      try {
        // Update Supabase
        const { error } = await window.supabaseClient
          .from('evaluations')
          .update({
            area_comment_innovation: "-",
            area_comment_process: commentDetail, // Save main comment here
            area_comment_output: "-",
            is_checked: true, // Mark as checked/reviewed
            updated_at: new Date().toISOString()
          })
          .eq('school_id', schoolID)
          .eq('policy_id', policyId)
          .eq('eva_id', evaId);

        if (error) throw error;

      } catch (err) {
        console.error(`Save failed for ${evaId}:`, err);
        alert(`บันทึกล้มเหลวบางรายการ(${evaId}): ${err.message}`);
        saveBtn.innerText = originalText;
        saveBtn.disabled = false;
        return;
      }
    }

    alert("✅ บันทึกข้อเสนอแนะเรียบร้อยแล้ว");
    saveBtn.innerText = "✅ บันทึกแล้ว";
    saveBtn.disabled = false;
    saveBtn.classList.remove("btn-success");
    saveBtn.classList.add("btn-secondary"); // Change style to indicate success
  };

})();