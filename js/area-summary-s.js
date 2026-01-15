// ✅ area-summary-s.js (Supabase Version - Full Implementation)
(() => {
  console.log("📊 Area Summary Page Loaded");
  const area = localStorage.getItem("Area");

  if (!area) {
    console.error("❌ No Area user found.");
    return;
  }

  // Initial Load
  async function init() {
    if (!window.supabaseClient) {
      setTimeout(init, 500);
      return;
    }

    // Load Header/Structure for the Summary Table if missing
    injectSummaryTableStructure();

    await loadSchoolDropdown();
  }

  // Inject Table Structure dynamically into area-summary.html placeholder
  function injectSummaryTableStructure() {
    const container = document.getElementById('summary-content-placeholder');
    if (!container) return; // Only if placeholder exists, else assume it's already there

    container.innerHTML = `
        <div class="tile mt-4" id="summary-tile" style="display:none;">
          <h3 class="tile-title" id="selected-school-name">สรุปผลการนิเทศ</h3>
          <div class="tile-body">
            <div class="table-responsive">
              <table class="table table-hover table-bordered align-middle">
                <thead>
                  <tr class="text-center table-success">
                    <th style="width: 50%;">นโยบาย “เรียนดี มีความสุข”</th>
                    <th style="width: 15%;">จำนวนตัวชี้วัด</th>
                    <th style="width: 15%;">ดำเนินการแล้ว</th>
                    <th style="width: 20%;">ความคืบหน้า</th>
                  </tr>
                </thead>
                <tbody id="areaSummaryTableBody">
                    <!-- Data will be loaded here -->
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
  }

  async function loadSchoolDropdown() {
    try {
      console.log("📦 Fetching schools for area:", area);
      const { data: schools, error } = await window.supabaseClient
        .from('users')
        .select('id, school_name')
        .eq('user_type', 'school')
        .eq('area', area);

      if (error) throw error;

      const dropdown = document.getElementById("schoolDropdown");
      if (!dropdown) return;

      dropdown.innerHTML = `<option value="">-- เลือกโรงเรียน --</option>`;

      if (schools && schools.length > 0) {
        schools.forEach(school => {
          const opt = document.createElement("option");
          opt.value = school.id;
          opt.textContent = school.school_name;
          dropdown.appendChild(opt);
        });
      } else {
        dropdown.innerHTML = `<option value="">ไม่พบข้อมูลโรงเรียน</option>`;
      }

      // Event Listener for Change
      dropdown.addEventListener('change', (e) => {
        const schoolId = e.target.value;
        const schoolName = e.target.options[e.target.selectedIndex].text;

        if (schoolId) {
          loadSchoolSummary(schoolId, schoolName);
        } else {
          document.getElementById('summary-tile').style.display = 'none';
        }
      });

    } catch (err) {
      console.error("❌ Error loading schools:", err);
      const dropdown = document.getElementById("schoolDropdown");
      if (dropdown) dropdown.innerHTML = `<option value="">โหลดข้อมูลล้มเหลว</option>`;
    }
  }

  // Load Summary Data for Selected School
  async function loadSchoolSummary(schoolId, schoolName) {
    const tbody = document.getElementById('areaSummaryTableBody');
    const tile = document.getElementById('summary-tile');
    const title = document.getElementById('selected-school-name');

    if (!tbody || !tile) {
      // Fallback: If elements don't exist in HTML, try to find them or alert
      console.warn("Table elements not found. Ensure area-summary.html has the correct structure.");
      return;
    }

    tile.style.display = 'block';
    title.innerText = `สรุปผลการนิเทศ: ${schoolName}`;
    tbody.innerHTML = '<tr><td colspan="4" class="text-center"><span class="spinner-border spinner-border-sm"></span> กำลังโหลดข้อมูล...</td></tr>';

    // 1. Fetch Evaluations
    try {
      const { data: evaluations, error } = await window.supabaseClient
        .from('evaluations')
        .select('policy_id, eva_id, is_checked, school_report_process')
        .eq('school_id', schoolId);

      if (error) throw error;

      // 2. Process Data
      const summaryData = {};

      evaluations.forEach(row => {
        const pid = row.policy_id;
        // Check if school has submitted data (process field is not empty)
        // Or use 'is_checked' if you want Area's checked status? User asked for "Summary", likely School's submission progress.
        // Let's count if school_report_process is filled.
        const hasData = row.school_report_process && row.school_report_process.length > 0;

        if (!summaryData[pid]) summaryData[pid] = 0;
        if (hasData) summaryData[pid]++;
      });

      // 3. Render Table
      // Check for area_policies (which is loaded in Area pages) OR policies
      const policiesData = (typeof area_policies !== 'undefined') ? area_policies : ((typeof policies !== 'undefined') ? policies : null);

      if (!policiesData) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">ไม่พบข้อมูลนโยบาย (Global Policies/Area Policies)</td></tr>';
        return;
      }

      // Use policiesData for loop below
      const policiesLoop = policiesData;

      let html = '';
      policiesLoop.forEach((policy, index) => {
        const pid = index + 1;
        const totalItems = policy.items ? policy.items.length : 0;
        const completedItems = summaryData[pid] || 0;

        const percent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

        let barClass = 'bg-danger';
        if (percent >= 50) barClass = 'bg-warning';
        if (percent === 100) barClass = 'bg-success';

        html += `
                    <tr>
                        <td>${policy.head1}</td>
                        <td class="text-center">${totalItems}</td>
                        <td class="text-center">${completedItems}</td>
                        <td>
                            <div class="progress" style="height: 20px;">
                                <div class="progress-bar ${barClass}" role="progressbar" style="width: ${percent}%;" aria-valuenow="${percent}" aria-valuemin="0" aria-valuemax="100">${percent}%</div>
                            </div>
                        </td>
                    </tr>
                `;
      });

      tbody.innerHTML = html;

    } catch (err) {
      console.error("Error loading summary:", err);
      tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">เกิดข้อผิดพลาด: ${err.message}</td></tr>`;
    }
  }

  init();
})();