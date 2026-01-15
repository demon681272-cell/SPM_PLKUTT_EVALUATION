// ✅ form-summary-s.js (Supabase Version)
(() => {
  console.log("✅ form-summary-s.js loaded (Supabase Version)");

  const loadEvaSummary = async () => {
    const userID = localStorage.getItem("UserID");

    // Safety check
    if (!window.supabaseClient) {
      console.warn("Supabase Client not ready yet.");
      setTimeout(loadEvaSummary, 500);
      return;
    }

    try {
      // 1. Fetch all evaluations for this user from Supabase
      const { data: evaluations, error } = await window.supabaseClient
        .from('evaluations')
        .select('policy_id, eva_id, is_checked') // Select minimal fields
        .eq('school_id', userID);

      if (error) throw error;

      // 2. Process data
      // Map: policy_id -> count of submitted items
      const submittedCountByPolicy = {};
      evaluations.forEach(row => {
        const pid = row.policy_id;
        if (!submittedCountByPolicy[pid]) submittedCountByPolicy[pid] = 0;
        submittedCountByPolicy[pid]++;
      });

      let html = "";

      // 3. Loop through policies (Assuming global 'policies' variable exists from form-policy-data.js)
      if (typeof policies === 'undefined') {
        console.error("❌ Global 'policies' data not found.");
        return;
      }

      // Loop through 1 to 13 (or however many policies there are)
      // Adjust logic if policies index is 0-based but titles say "Policy 1"
      policies.forEach((policy, index) => {
        const policyNum = index + 1; // Assuming policy index matches array index + 1
        const head1 = policy.head1 || "";

        // Total items expected for this policy
        const total = policy.items ? policy.items.length : 0;

        // Done items (from Supabase count)
        const done = submittedCountByPolicy[policyNum] || 0;

        const percent = total ? Math.round((done / total) * 100) : 0;
        // Cap at 100 if something is weird
        const displayPercent = Math.min(100, Math.max(0, percent));

        const barColor = displayPercent === 100 ? "bg-success" : displayPercent >= 50 ? "bg-warning" : "bg-danger";

        html += `
                <tr>
                <td>${head1}</td>
                <td class="text-center">${total}</td>
                <td class="text-center">${done}</td>
                <td>
                    <div class="progress" style="height: 22px;">
                    <div class="progress-bar ${barColor}" role="progressbar" style="width: ${displayPercent}%;">
                        ${displayPercent}%
                    </div>
                    </div>
                </td>
                </tr>
            `;
      });

      const table = document.getElementById("evaStatusTable");
      if (table) {
        table.innerHTML = html;
        console.log("✅ โหลดข้อมูลสรุปใส่ตารางเรียบร้อย");
      } else {
        console.warn("❌ ไม่พบ #evaStatusTable");
      }

    } catch (err) {
      console.error("❌ Error loading summary:", err);
      const table = document.getElementById("evaStatusTable");
      if (table) table.innerHTML = `<tr><td colspan="4" class="text-danger">ไม่สามารถโหลดข้อมูลได้: ${err.message}</td></tr>`;
    }
  };

  function waitForElement(id, callback) {
    const el = document.getElementById(id);
    if (el) {
      callback(el);
    } else {
      setTimeout(() => waitForElement(id, callback), 100);
    }
  }

  // Use DOMContentLoaded wrapper just in case
  document.addEventListener('DOMContentLoaded', () => {
    waitForElement("evaStatusTable", loadEvaSummary);
  });

})();
