// Admin Home Page Logic - Supabase Version
(() => {
    console.log("🏠 Admin Home Page Loaded");

    const TOTAL_ITEMS = 39; // จำนวนข้อทั้งหมด

    // Load all statistics
    async function loadAdminStats() {
        if (!window.supabaseClient) {
            console.warn("Supabase not ready, retrying...");
            setTimeout(loadAdminStats, 500);
            return;
        }

        try {
            // 1. ดึงข้อมูลโรงเรียนทั้งหมด
            const { data: schools, error: schoolError } = await window.supabaseClient
                .from('users')
                .select('id, school_name, fullname, area')
                .eq('user_type', 'school')
                .order('area', { ascending: true })
                .order('school_name', { ascending: true });

            if (schoolError) throw schoolError;

            // 2. ดึงข้อมูล evaluations ทั้งหมด
            const { data: allEvals, error: evalError } = await window.supabaseClient
                .from('evaluations')
                .select('school_id, eva_id, is_checked');

            if (evalError) throw evalError;

            // 3. คำนวณสถิติ
            calculateAndDisplayStats(schools, allEvals);
            displayAreaSummary(schools, allEvals);
            displaySchoolList(schools, allEvals);

        } catch (err) {
            console.error("❌ Load stats error:", err);
            alert("เกิดข้อผิดพลาดในการโหลดข้อมูล: " + err.message);
        }
    }

    // คำนวณและแสดง Progress Bars
    function calculateAndDisplayStats(schools, allEvals) {
        const totalSchools = schools.length;
        const totalPossibleEvals = totalSchools * TOTAL_ITEMS;

        // นับจำนวน evaluations ที่มี
        const totalSubmitted = allEvals.length;
        const totalChecked = allEvals.filter(e => e.is_checked === true).length;

        // คำนวณเปอร์เซ็นต์
        const schoolPercent = totalPossibleEvals ? Math.round((totalSubmitted / totalPossibleEvals) * 100) : 0;
        const areaPercent = totalPossibleEvals ? Math.round((totalChecked / totalPossibleEvals) * 100) : 0;
        const adminPercent = 0; // Placeholder

        // อัปเดต UI
        updateProgressBar('school', schoolPercent);
        updateProgressBar('area', areaPercent);
        updateProgressBar('admin', adminPercent);

        console.log(`✅ Stats: School=${schoolPercent}%, Area=${areaPercent}%, Admin=${adminPercent}%`);
    }

    // อัปเดต Progress Bar
    function updateProgressBar(key, percent) {
        const bar = document.getElementById(`level-${key}`);
        const label = document.getElementById(`label-${key}`);
        if (bar && label) {
            bar.style.width = `${percent}%`;
            label.textContent = `${percent}%`;
        }
    }

    // แสดงสรุปแยกตามสหวิทยาเขต
    function displayAreaSummary(schools, allEvals) {
        const table = document.getElementById('area-summary-table');
        if (!table) return;

        // จัดกลุ่มโรงเรียนตามเขต
        const areaGroups = {};
        schools.forEach(school => {
            const area = school.area || 'ไม่ระบุ';
            if (!areaGroups[area]) {
                areaGroups[area] = [];
            }
            areaGroups[area].push(school);
        });

        let html = '';
        let index = 1;

        Object.keys(areaGroups).sort().forEach(area => {
            const schoolsInArea = areaGroups[area];
            const schoolCount = schoolsInArea.length;
            const totalPossible = schoolCount * TOTAL_ITEMS;

            // นับจำนวน evals ที่ส่งแล้วในเขตนี้
            const schoolIds = schoolsInArea.map(s => s.id);
            const evalsInArea = allEvals.filter(e => schoolIds.includes(e.school_id));
            const submitted = evalsInArea.length;
            const pending = totalPossible - submitted;
            const percent = totalPossible ? Math.round((submitted / totalPossible) * 100) : 0;

            const barColor = percent === 100 ? "bg-success" : percent >= 50 ? "bg-warning" : "bg-danger";

            html += `
        <tr>
          <td class="text-center">${index++}</td>
          <td><strong>${area}</strong></td>
          <td class="text-center">${schoolCount}</td>
          <td class="text-center"><span class="badge bg-success">${submitted}</span></td>
          <td class="text-center"><span class="badge bg-secondary">${pending}</span></td>
          <td>
            <div class="progress" style="height: 25px;">
              <div class="progress-bar ${barColor}" style="width: ${percent}%;" role="progressbar">
                ${percent}%
              </div>
            </div>
          </td>
        </tr>
      `;
        });

        table.innerHTML = html || '<tr><td colspan="6" class="text-center text-muted">ไม่พบข้อมูล</td></tr>';
    }

    // แสดงรายชื่อโรงเรียนทั้งหมด
    function displaySchoolList(schools, allEvals) {
        const table = document.getElementById('school-list-table');
        if (!table) return;

        let html = '';

        schools.forEach((school, index) => {
            const schoolEvals = allEvals.filter(e => e.school_id === school.id);
            const done = schoolEvals.length;
            const percent = Math.round((done / TOTAL_ITEMS) * 100);
            const barColor = percent === 100 ? "bg-success" : percent >= 50 ? "bg-warning" : "bg-danger";

            const status = percent === 100
                ? '<span class="badge bg-success">✅ ครบถ้วน</span>'
                : percent > 0
                    ? `<span class="badge bg-warning">⏳ ${done}/${TOTAL_ITEMS}</span>`
                    : '<span class="badge bg-secondary">❌ ยังไม่ส่ง</span>';

            html += `
        <tr>
          <td class="text-center">${index + 1}</td>
          <td>${school.school_name}</td>
          <td class="text-center">${school.area || '-'}</td>
          <td>${school.fullname || '-'}</td>
          <td class="text-center">${status}</td>
          <td>
            <div class="progress" style="height: 20px;">
              <div class="progress-bar ${barColor}" style="width: ${percent}%;" role="progressbar">
                ${percent}%
              </div>
            </div>
          </td>
        </tr>
      `;
        });

        table.innerHTML = html || '<tr><td colspan="6" class="text-center text-muted">ไม่พบข้อมูล</td></tr>';
    }

    // เริ่มโหลดข้อมูล
    loadAdminStats();

})();
