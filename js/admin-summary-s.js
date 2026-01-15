// Admin Summary Page - Supabase Version with Charts
(() => {
    console.log("📊 Admin Summary Page Loaded");

    const TOTAL_ITEMS = 39;
    let overallChart = null;
    let policyChart = null;

    async function loadSummaryData() {
        if (!window.supabaseClient) {
            setTimeout(loadSummaryData, 500);
            return;
        }

        if (typeof policies === 'undefined') {
            console.error("Policies not loaded");
            return;
        }

        try {
            // ดึงข้อมูลทั้งหมด
            const [schoolsRes, evalsRes] = await Promise.all([
                window.supabaseClient.from('users').select('id, school_name, area').eq('user_type', 'school'),
                window.supabaseClient.from('evaluations').select('school_id, policy_id, eva_id, is_checked')
            ]);

            if (schoolsRes.error) throw schoolsRes.error;
            if (evalsRes.error) throw evalsRes.error;

            const schools = schoolsRes.data;
            const allEvals = evalsRes.data;

            // สร้างสรุป
            displayPolicySummary(schools, allEvals);
            displayAreaSummary(schools, allEvals);
            drawCharts(schools, allEvals);

        } catch (err) {
            console.error("❌ Load summary error:", err);
            alert("เกิดข้อผิดพลาด: " + err.message);
        }
    }

    // สรุปตามนโยบาย
    function displayPolicySummary(schools, allEvals) {
        const table = document.getElementById('policy-summary-table');
        if (!table) return;

        const tbody = table.querySelector('tbody');
        const totalSchools = schools.length;

        let html = '';
        policies.forEach((policy, index) => {
            const policyId = index + 1;
            const itemCount = policy.items ? policy.items.length : 0;
            const totalPossible = totalSchools * itemCount;

            const policyEvals = allEvals.filter(e => e.policy_id === policyId);
            const submitted = policyEvals.length;
            const pending = totalPossible - submitted;
            const percent = totalPossible ? Math.round((submitted / totalPossible) * 100) : 0;

            const barColor = percent === 100 ? 'bg-success' : percent >= 50 ? 'bg-warning' : 'bg-danger';

            html += `
        <tr>
          <td class="text-center">${policyId}</td>
          <td><strong>${policy.title}</strong>: ${policy.head1}</td>
          <td class="text-center">${itemCount}</td>
          <td class="text-center"><span class="badge bg-success">${submitted}</span></td>
          <td class="text-center"><span class="badge bg-secondary">${pending}</span></td>
          <td>
            <div class="progress" style="height: 25px;">
              <div class="progress-bar ${barColor}" style="width: ${percent}%;">
                ${percent}%
              </div>
            </div>
          </td>
        </tr>
      `;
        });

        tbody.innerHTML = html;
    }

    // สรุปตามสหวิทยาเขต
    function displayAreaSummary(schools, allEvals) {
        const table = document.getElementById('area-summary-detail-table');
        if (!table) return;

        const tbody = table.querySelector('tbody');

        // จัดกลุ่มโรงเรียนตามเขต
        const areaGroups = {};
        schools.forEach(school => {
            const area = school.area || 'ไม่ระบุ';
            if (!areaGroups[area]) areaGroups[area] = [];
            areaGroups[area].push(school);
        });

        let html = '';
        let index = 1;

        Object.keys(areaGroups).sort().forEach(area => {
            const schoolsInArea = areaGroups[area];
            const schoolIds = schoolsInArea.map(s => s.id);

            let completedCount = 0;
            let partialCount = 0;
            let noneCount = 0;
            let totalPercent = 0;

            schoolsInArea.forEach(school => {
                const schoolEvals = allEvals.filter(e => e.school_id === school.id);
                const count = schoolEvals.length;
                const percent = Math.round((count / TOTAL_ITEMS) * 100);

                totalPercent += percent;

                if (count === TOTAL_ITEMS) completedCount++;
                else if (count > 0) partialCount++;
                else noneCount++;
            });

            const avgPercent = schoolsInArea.length ? Math.round(totalPercent / schoolsInArea.length) : 0;
            const barColor = avgPercent === 100 ? 'bg-success' : avgPercent >= 50 ? 'bg-warning' : 'bg-danger';

            html += `
        <tr>
          <td class="text-center">${index++}</td>
          <td><strong>${area}</strong></td>
          <td class="text-center">${schoolsInArea.length}</td>
          <td class="text-center"><span class="badge bg-success">${completedCount}</span></td>
          <td class="text-center"><span class="badge bg-warning">${partialCount}</span></td>
          <td class="text-center"><span class="badge bg-secondary">${noneCount}</span></td>
          <td>
            <div class="progress" style="height: 25px;">
              <div class="progress-bar ${barColor}" style="width: ${avgPercent}%;">
                ${avgPercent}%
              </div>
            </div>
          </td>
        </tr>
      `;
        });

        tbody.innerHTML = html;
    }

    // วาดกราฟ
    function drawCharts(schools, allEvals) {
        const totalPossible = schools.length * TOTAL_ITEMS;
        const submitted = allEvals.length;
        const pending = totalPossible - submitted;

        // กราฟภาพรวม (Pie Chart)
        const overallCtx = document.getElementById('overallChart');
        if (overallCtx) {
            if (overallChart) overallChart.destroy();
            overallChart = new Chart(overallCtx, {
                type: 'doughnut',
                data: {
                    labels: ['ส่งแล้ว', 'รอดำเนินการ'],
                    datasets: [{
                        data: [submitted, pending],
                        backgroundColor: ['#28a745', '#dc3545'],
                        borderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        },
                        title: {
                            display: true,
                            text: 'สัดส่วนการส่งงานทั้งหมด'
                        }
                    }
                }
            });
        }

        // กราฟแยกตามนโยบาย (Bar Chart)
        const policyCtx = document.getElementById('policyChart');
        if (policyCtx) {
            const labels = policies.map((p, i) => `นโยบาย ${i + 1}`);
            const data = policies.map((policy, index) => {
                const policyId = index + 1;
                const itemCount = policy.items ? policy.items.length : 0;
                const totalPossible = schools.length * itemCount;
                const policyEvals = allEvals.filter(e => e.policy_id === policyId);
                return totalPossible ? Math.round((policyEvals.length / totalPossible) * 100) : 0;
            });

            if (policyChart) policyChart.destroy();
            policyChart = new Chart(policyCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'ความคืบหน้า (%)',
                        data: data,
                        backgroundColor: 'rgba(54, 162, 235, 0.6)',
                        borderColor: 'rgba(54, 162, 235, 1)',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: true,
                    scales: {
                        y: {
                            beginAtZero: true,
                            max: 100,
                            ticks: {
                                callback: function (value) {
                                    return value + '%';
                                }
                            }
                        }
                    },
                    plugins: {
                        legend: {
                            display: false
                        },
                        title: {
                            display: true,
                            text: 'ความคืบหน้าแต่ละนโยบาย'
                        }
                    }
                }
            });
        }
    }

    // เริ่มโหลด
    loadSummaryData();

})();
