(function () {
  "use strict";

  var treeviewMenu = $('.app-menu');

  // Toggle Sidebar
  $('[data-toggle="sidebar"]').click(function (event) {
    event.preventDefault();
    $('.app').toggleClass('sidenav-toggled');
  });

  // Activate sidebar treeview toggle
  $("[data-toggle='treeview']").click(function (event) {
    event.preventDefault();
    if (!$(this).parent().hasClass('is-expanded')) {
      treeviewMenu.find("[data-toggle='treeview']").parent().removeClass('is-expanded');
    }
    $(this).parent().toggleClass('is-expanded');
  });

})();


// 📊 1. Progress Bar Logic (For School Dashboard) - FULL VERSION (DB Ready)
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(async () => {
    const userID = localStorage.getItem("UserID");
    const userType = localStorage.getItem("UserType");

    // Safety check
    if (!window.supabaseClient) return;

    // Only run for School users
    if (!userID || userType !== 'school') return;

    try {
      const TOTAL_ITEMS = 39; // Hardcoded total

      // Fetch evaluations including is_checked status
      const { data, error } = await window.supabaseClient
        .from('evaluations')
        .select('id, is_checked')
        .eq('school_id', userID);

      if (error) {
        console.error("❌ Fetch evaluations error:", error);
        throw error;
      }

      // Count School Submission
      const schoolCount = data ? data.length : 0;

      // Count Area Check (Count rows where is_checked is true)
      const areaCount = data ? data.filter(r => r.is_checked === true).length : 0;

      // Update UI
      const updateBar = (key, done, total) => {
        const percent = Math.min(100, Math.round((done / total) * 100));
        const bar = document.getElementById(`level-${key}`);
        const label = document.getElementById(`label-${key}`);
        if (bar && label) {
          bar.style.width = `${percent}%`;
          label.textContent = `${percent}%`;
        }
      };

      updateBar('school', schoolCount, TOTAL_ITEMS);
      updateBar('area', areaCount, TOTAL_ITEMS);
      updateBar('admin', 0, TOTAL_ITEMS); // Placeholder for admin level

      console.log(`✅ Stats Loaded: School=${schoolCount}/${TOTAL_ITEMS}, Area Check=${areaCount}/${TOTAL_ITEMS}`);

    } catch (err) {
      console.error("❌ Stats Logic Failed:", err);
    }
  }, 1000);
});

// 📊 2. School List Progress (For Area Dashboard) - FULL VERSION (DB Ready)
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(async () => {
    const userType = localStorage.getItem("UserType");
    const area = localStorage.getItem("Area");

    if (!window.supabaseClient) return;
    if (userType !== "area" || !area) return; // Only for Area users

    const table = document.getElementById("schoolEvalTable-home");
    if (!table) return;

    try {
      // A. Get all schools in this area
      const { data: schools, error: errVal } = await window.supabaseClient
        .from('users')
        .select('id, school_name, fullname')
        .eq('user_type', 'school')
        .eq('area', area);

      if (errVal) throw errVal;
      if (!schools || schools.length === 0) {
        table.innerHTML = `<tr><td colspan="5" class="text-center">ไม่พบโรงเรียนในเขตพื้นที่นี้</td></tr>`;
        return;
      }

      // B. Get all evaluations for schools
      const schoolIds = schools.map(s => s.id);

      let evals = [];
      if (schoolIds.length > 0) {
        const { data: evalsData, error: errEval } = await window.supabaseClient
          .from('evaluations')
          .select('school_id, is_checked') // Select checked status too if needed for future logic
          .in('school_id', schoolIds);

        if (errEval) throw errEval;
        evals = evalsData || [];
      }

      // C. Calculate Counts & Render
      const TOTAL_ITEMS = 39;
      let totalPercentSum = 0;
      let html = "";

      schools.forEach((school, index) => {
        const schoolEvals = evals.filter(e => e.school_id === school.id);
        const doneCount = schoolEvals.length;

        const percent = Math.min(100, Math.round((doneCount / TOTAL_ITEMS) * 100));
        const barColor = percent === 100 ? "bg-success" : percent >= 50 ? "bg-warning" : "bg-danger";

        // Status Badge
        const status = doneCount >= TOTAL_ITEMS
          ? `<span class="text-success fw-bold">✅ ครบถ้วน</span>`
          : `<span class="text-warning">⏳ ${doneCount}/${TOTAL_ITEMS}</span>`;

        totalPercentSum += percent;

        html += `
            <tr>
                <td class="text-center">${index + 1}</td>
                <td>${school.school_name}</td>
                <td>${school.fullname || "-"}</td>
                <td class="text-center">${status}</td>
                <td class="text-center">
                <div class="progress" style="height: 22px;">
                    <div class="progress-bar ${barColor}" role="progressbar" style="width: ${percent}%; font-size: 8pt;">
                    ${percent}%
                    </div>
                </div>
                </td>
            </tr>
            `;
      });

      table.innerHTML = html;

      // Update all 3 Progress Bars for Area Dashboard
      const avgPercent = schools.length ? Math.round(totalPercentSum / schools.length) : 0;

      // Update School Progress Bar (average of all schools in area)
      const schoolProgressBar = document.getElementById("level-school");
      const schoolProgressLabel = document.getElementById("label-school");
      if (schoolProgressBar && schoolProgressLabel) {
        schoolProgressBar.style.width = `${avgPercent}%`;
        schoolProgressLabel.textContent = `${avgPercent}%`;
      }

      // Update Area Progress Bar (same as school for now)
      const areaProgressBar = document.getElementById("level-area");
      const areaProgressLabel = document.getElementById("label-area");
      if (areaProgressBar && areaProgressLabel) {
        areaProgressBar.style.width = `${avgPercent}%`;
        areaProgressLabel.textContent = `${avgPercent}%`;
      }

      // Update Admin Progress Bar (placeholder)
      const adminProgressBar = document.getElementById("level-admin");
      const adminProgressLabel = document.getElementById("label-admin");
      if (adminProgressBar && adminProgressLabel) {
        adminProgressBar.style.width = "0%";
        adminProgressLabel.textContent = "0%";
      }

    } catch (err) {
      console.error("❌ School List Error:", err);
      table.innerHTML = `<tr><td colspan="5" class="text-danger text-center">⚠️ โหลดข้อมูลล้มเหลว: ${err.message}</td></tr>`;
    }
  }, 1000);
});


const observer = new MutationObserver(() => {
  const carouselEl = document.querySelector('#imageCarousel');
  if (carouselEl) {
    new bootstrap.Carousel(carouselEl, {
      interval: 3000,
      ride: 'carousel',
      wrap: true
    });
    observer.disconnect();
  }
});

observer.observe(document.body, { childList: true, subtree: true });
