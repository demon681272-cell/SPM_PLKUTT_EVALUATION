// ✅ form-report-s.js (Enhanced with Table Support for Policy 5)
(() => {
  // We used to rely on window.scriptURL for everything.
  // Now we use Supabase for data, and Google Script (CONFIG.API_URL) ONLY for file upload.
  const googleScriptURL = CONFIG.API_URL;
  const userID = localStorage.getItem("UserID");

  $(function () {
    // Check if policies exist
    if (typeof policies === 'undefined') {
      console.error("Policies data not found!");
      return;
    }

    policies.forEach((policy, i) => {
      // Create Tabs
      $('#policyTabs').append(`<li class="nav-item"><a class="nav-link ${i === 0 ? 'active' : ''}" data-bs-toggle="tab" href="#policy${i}">${policy.title}</a></li>`);

      // Create Content Container
      let content = `<div class="tab-pane fade ${i === 0 ? 'show active' : ''}" id="policy${i}">`;
      content += `<h5 class="mb-3">${policy.head1}</h5>`;

      if (policy.items && Array.isArray(policy.items)) {
        policy.items.forEach((item, j) => {
          const isSpecialTableItem = ["5.1.2", "5.2.2", "5.3.2"].includes(item.evaId);

          content += `
            <div class="card mb-3">
              <div class="card-header fw-bold">${item.text}</div>
              <div class="card-body">
                <form id="form${i}_${j}" enctype="multipart/form-data" data-evaid="${item.evaId}">
                  <input type="hidden" name="Eva_ID" value="${item.evaId}">
                  
                  <div class="mb-3">
                    <label class="form-label">รายละเอียดการดำเนินงาน</label>
                    ${isSpecialTableItem ? renderAwardTableHTML(item.evaId) : `
                    <textarea name="school_report_detail" class="form-control" rows="6" placeholder="ระบุวิธีดำเนินงาน ผลการดำเนินงาน และปัญหา/อุปสรรค..."></textarea>
                    `}
                  </div>
                  
                  <div class="mb-3">
                    <label class="form-label">แนบไฟล์ (PDF/รูปภาพ)</label>
                    <input type="file" class="form-control" name="Eva_PDF" accept="application/pdf,image/*">
                  </div>
                  <div class="mb-3 pdf-preview"></div>
                </form>
              </div>
            </div>`;
        });
      }

      content += `<div class="text-frist"><button class="btn btn-primary" onclick="window.submitFormsByPolicy(${i}, ${policy.title.replace('ประเด็นที่ ', '')})">บันทึกข้อมูล ${policy.title}</button></div></div>`;
      $('#policyContent').append(content);

      // Load data for this policy
      loadSubmittedData(i, policy.title.replace('ประเด็นที่ ', ''));
    });
  });

  // Helper to render the special table
  function renderAwardTableHTML(evaId) {
    return `
      <div class="table-responsive">
        <table class="table table-bordered table-sm award-table">
          <thead class="text-center table-light">
             <tr>
               <th rowspan="2" style="width: 40%; vertical-align: middle;">ผลงาน</th>
               <th colspan="4">จำนวน (คน)</th>
             </tr>
             <tr>
               <th>ระดับประเทศ</th>
               <th>ระดับภาค</th>
               <th>ระดับจังหวัด</th>
               <th>ระดับเขตพื้นที่</th>
             </tr>
          </thead>
          <tbody>
             <tr>
               <td>1. นักเรียนที่ได้รับรางวัล/เป็นต้นแบบ</td>
               <td><input type="number" class="form-control form-control-sm text-center" name="std_nat" min="0"></td>
               <td><input type="number" class="form-control form-control-sm text-center" name="std_reg" min="0"></td>
               <td><input type="number" class="form-control form-control-sm text-center" name="std_prov" min="0"></td>
               <td><input type="number" class="form-control form-control-sm text-center" name="std_area" min="0"></td>
             </tr>
             <tr>
               <td>2. ครูและบุคลากรทางการศึกษาที่ได้รับรางวัล/เป็นต้นแบบ</td>
               <td><input type="number" class="form-control form-control-sm text-center" name="tch_nat" min="0"></td>
               <td><input type="number" class="form-control form-control-sm text-center" name="tch_reg" min="0"></td>
               <td><input type="number" class="form-control form-control-sm text-center" name="tch_prov" min="0"></td>
               <td><input type="number" class="form-control form-control-sm text-center" name="tch_area" min="0"></td>
             </tr>
             <tr>
               <td>3. สถานศึกษาได้รับรางวัล/เป็นต้นแบบ</td>
               <td><input type="number" class="form-control form-control-sm text-center" name="sch_nat" min="0"></td>
               <td><input type="number" class="form-control form-control-sm text-center" name="sch_reg" min="0"></td>
               <td><input type="number" class="form-control form-control-sm text-center" name="sch_prov" min="0"></td>
               <td><input type="number" class="form-control form-control-sm text-center" name="sch_area" min="0"></td>
             </tr>
          </tbody>
        </table>
      </div>
      <div class="mt-2">
         <label class="form-label">ชื่อรางวัล (ถ้ามี)</label>
         <input type="text" class="form-control" name="award_name" placeholder="ระบุชื่อรางวัลที่ได้รับ...">
      </div>
      `;
  }

  window.submitFormsByPolicy = async function (policyIndex, policyId) {
    if (!confirm("ยืนยันการส่งข้อมูลของนโยบายนี้หรือไม่?")) return;

    const forms = document.querySelectorAll(`#policy${policyIndex} form`);
    const saveBtn = document.querySelector(`#policy${policyIndex} button`);

    // UI Loading state
    const originalBtnText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = "กำลังบันทึก...";

    // Iterate over forms and save sequentially
    for (const form of forms) {
      const evaId = form.querySelector('input[name="Eva_ID"]').value;
      const isSpecialTableItem = ["5.1.2", "5.2.2", "5.3.2"].includes(evaId);

      let detail = "";

      if (isSpecialTableItem) {
        // Gather data from table inputs
        const awardData = {
          type: "award_table",
          std: {
            nat: form.querySelector('input[name="std_nat"]').value || "",
            reg: form.querySelector('input[name="std_reg"]').value || "",
            prov: form.querySelector('input[name="std_prov"]').value || "",
            area: form.querySelector('input[name="std_area"]').value || ""
          },
          tch: {
            nat: form.querySelector('input[name="tch_nat"]').value || "",
            reg: form.querySelector('input[name="tch_reg"]').value || "",
            prov: form.querySelector('input[name="tch_prov"]').value || "",
            area: form.querySelector('input[name="tch_area"]').value || ""
          },
          sch: {
            nat: form.querySelector('input[name="sch_nat"]').value || "",
            reg: form.querySelector('input[name="sch_reg"]').value || "",
            prov: form.querySelector('input[name="sch_prov"]').value || "",
            area: form.querySelector('input[name="sch_area"]').value || ""
          },
          award_name: form.querySelector('input[name="award_name"]').value || ""
        };
        detail = JSON.stringify(awardData); // Save as JSON string
      } else {
        detail = form.querySelector('textarea[name="school_report_detail"]').value;
      }

      const fileInput = form.querySelector('input[name="Eva_PDF"]');
      let pdfUrl = form.dataset.existingPdf || ""; // Keep existing URL if no new file

      // 1. Upload File to Google Drive (if new file selected)
      if (fileInput.files.length > 0) {
        try {
          // alert(`กำลังอัปโหลดไฟล์สำหรับข้อ ${evaId}...`);
          const file = fileInput.files[0];
          const base64 = await toBase64(file);

          const formData = new FormData();
          // Use 'submitEvaluation' 
          formData.append("action", "submitEvaluation");
          formData.append("UserID", userID);
          formData.append("Eva_ID", evaId);
          formData.append("Eva_PDF", base64);

          // IMPORTANT: GAS requires SheetName. We assume 'Evaluation' + policyId
          const sheetName = `Evaluation${policyId}`;
          formData.append("SheetName", sheetName);

          // Full Parameters required by GAS (submitEvaluation)
          formData.append("Eva_Process", "-");
          formData.append("Eva_Innovation", "-");
          formData.append("Eva_Output", "-");
          formData.append("Eva_Pro", "-");
          // Add 'School_Report_Detail' just in case, though not used in standard GAS logic
          formData.append("School_Report_Detail", "See Supabase DB");

          console.log(`📤 Uploading ${evaId}... Params: action=submitEvaluation, SheetName=${sheetName}, UserID=${userID}`);

          const res = await fetch(googleScriptURL, { method: "POST", body: formData });

          // Enhanced JSON parsing safety
          let data;
          try {
            const text = await res.text();
            // Sometimes GAS returns HTML error page instead of JSON
            if (text.startsWith("<")) {
              console.error("GAS returned HTML:", text);
              throw new Error("Server returned HTML intead of JSON. Check Script URL.");
            }
            data = JSON.parse(text);
          } catch (e) {
            throw new Error("Invalid JSON response from Google Script: " + e.message);
          }

          if (data.success) {
            if (data.url) {
              pdfUrl = data.url;
              console.log(`✅ Upload success for ${evaId}: ${pdfUrl}`);
            } else {
              console.warn(`⚠️ Upload success but 'url' missing in response. Using fallback/empty.`);
            }
          } else {
            throw new Error(data.message || "Unknown error from Script");
          }

        } catch (err) {
          console.error("Upload failed", err);
          alert(`อัปโหลดไฟล์ข้อ ${evaId} ล้มเหลว: ${err.message}. \nกรุณาตรวจสอบว่าได้ Deploy GAS เป็นเวอร์ชันใหม่หรือยัง`);
          saveBtn.disabled = false;
          saveBtn.textContent = originalBtnText;
          return;
        }
      }

      // 2. Save Data to Supabase
      try {
        const { data, error } = await window.supabaseClient
          .from('evaluations')
          .upsert({
            school_id: userID,
            policy_id: parseInt(policyId),
            eva_id: evaId,
            school_report_process: detail, // ✅ Save full detail here only (Text or JSON)
            school_report_innovation: "-",
            school_report_output: "-",
            pdf_url: pdfUrl,
            updated_at: new Date().toISOString()
          }, { onConflict: 'school_id, eva_id' })
          .select();

        if (error) throw error;

        // Update dataset to reflect new URL immediately (for next save without reload)
        if (pdfUrl) {
          form.dataset.existingPdf = pdfUrl;
          // Update UI Preview immediately
          const previewDiv = form.querySelector(".pdf-preview");
          previewDiv.innerHTML = `<a href="${pdfUrl}" target="_blank" class="btn btn-sm btn-outline-info">📄 ดูไฟล์แนบใหม่ (บันทึกแล้ว)</a>`;
        }

      } catch (err) {
        console.error("Supabase Save Error", err);
        alert(`บันทึกข้อมูลข้อ ${evaId} ล้มเหลว: ${err.message}`);
        saveBtn.disabled = false;
        saveBtn.textContent = originalBtnText;
        return;
      }
    }

    // Success
    alert("✅ บันทึกข้อมูลเรียบร้อยแล้ว");
    saveBtn.textContent = "✅ ส่งแล้ว";
    saveBtn.disabled = true;
    saveBtn.classList.replace("btn-primary", "btn-secondary");
  };

  async function loadSubmittedData(policyIndex, policyId) {
    try {
      const { data: evaluations, error } = await window.supabaseClient
        .from('evaluations')
        .select('*')
        .eq('school_id', userID)
        .eq('policy_id', policyId);

      if (error) throw error;

      const forms = document.querySelectorAll(`#policy${policyIndex} form`);

      forms.forEach((form) => {
        const evaId = form.querySelector('input[name="Eva_ID"]').value;
        const matchingData = evaluations.find(e => e.eva_id === evaId);
        const previewDiv = form.querySelector(".pdf-preview");
        const isSpecialTableItem = ["5.1.2", "5.2.2", "5.3.2"].includes(evaId);

        if (matchingData) {
          // Load data
          if (isSpecialTableItem) {
            try {
              const savedData = JSON.parse(matchingData.school_report_process || "{}");
              if (savedData.type === 'award_table') {
                // Populate table
                form.querySelector('input[name="std_nat"]').value = savedData.std?.nat || "";
                form.querySelector('input[name="std_reg"]').value = savedData.std?.reg || "";
                form.querySelector('input[name="std_prov"]').value = savedData.std?.prov || "";
                form.querySelector('input[name="std_area"]').value = savedData.std?.area || "";

                form.querySelector('input[name="tch_nat"]').value = savedData.tch?.nat || "";
                form.querySelector('input[name="tch_reg"]').value = savedData.tch?.reg || "";
                form.querySelector('input[name="tch_prov"]').value = savedData.tch?.prov || "";
                form.querySelector('input[name="tch_area"]').value = savedData.tch?.area || "";

                form.querySelector('input[name="sch_nat"]').value = savedData.sch?.nat || "";
                form.querySelector('input[name="sch_reg"]').value = savedData.sch?.reg || "";
                form.querySelector('input[name="sch_prov"]').value = savedData.sch?.prov || "";
                form.querySelector('input[name="sch_area"]').value = savedData.sch?.area || "";

                form.querySelector('input[name="award_name"]').value = savedData.award_name || "";
              } else {
                // Fallback if data exists but not in our JSON format (legacy text?)
                // Maybe put it in award_name for visibility
                form.querySelector('input[name="award_name"]').value = matchingData.school_report_process;
              }
            } catch (e) {
              // Not valid JSON, treat as text
              form.querySelector('input[name="award_name"]').value = matchingData.school_report_process;
            }
          } else {
            form.querySelector('textarea[name="school_report_detail"]').value = matchingData.school_report_process || "";
          }


          if (matchingData.pdf_url && matchingData.pdf_url.trim() !== "") {
            form.dataset.existingPdf = matchingData.pdf_url;
            previewDiv.innerHTML = `<a href="${matchingData.pdf_url}" target="_blank" class="btn btn-sm btn-outline-info">
              📄 ดูไฟล์แนบเดิม
            </a>`;
          } else {
            form.dataset.existingPdf = "";
            previewDiv.innerHTML = "";
          }

          // Check if locked
          if (matchingData.is_checked) {
            form.querySelectorAll("textarea, input").forEach(el => el.disabled = true);
          }
        } else {
          previewDiv.innerHTML = "";
        }
      });

    } catch (err) {
      console.error("Load Error:", err);
    }
  }

  // Helper for file upload
  const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    const MAX_FILE_SIZE_MB = 8; // Reduce to safe limit for GAS
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

    if (file.size > MAX_FILE_SIZE_BYTES) {
      reject(new Error(`File size exceeds ${MAX_FILE_SIZE_MB}MB limit.`));
      return;
    }

    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });

})();