async function login(event) {
  event.preventDefault();
  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorBox = document.getElementById("error");
  const loginBtn = document.querySelector("button[type='submit']");

  if (!username || !password) {
    errorBox.innerText = "กรุณากรอกชื่อผู้ใช้และรหัสผ่าน";
    return;
  }

  errorBox.innerText = "";
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> กำลังเข้าสู่ระบบ...';

  try {
    // 1. ลองค้นหาใน Supabase
    const { data: user, error } = await window.supabaseClient
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password) // *Note: In production, passwords should be hashed!
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "Row not found"
      throw error;
    }

    if (user) {
      console.log("✅ Login success via Supabase", user);

      // Map Snake_case from DB to camelCase/PascalCase for app consistency
      localStorage.setItem("UserID", user.id); // Supabase ID is usually numeric or uuid
      localStorage.setItem("UserType", user.user_type);
      localStorage.setItem("SchoolName", user.school_name || "");
      localStorage.setItem("Area", user.area || "");
      localStorage.setItem("UserName", user.username);

      // Redirect based on user type
      if (user.user_type === 'school') {
        window.location.href = 'dashboard.html';
      } else if (user.user_type === 'area') {
        window.location.href = 'area-dashboard.html';
      } else if (user.user_type === 'admin') {
        window.location.href = 'admin-dashboard.html';
      } else {
        throw new Error('Unknown user type');
      }
    } else {
      // 2. ถ้าไม่เจอใน Supabase (หรือรหัสผิด)
      errorBox.innerText = "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง";
      loginBtn.disabled = false;
      loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> เข้าสู่ระบบ';
    }
  } catch (err) {
    console.error("Login Error:", err);
    errorBox.innerText = "เกิดข้อผิดพลาดในการเชื่อมต่อ: " + err.message;
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> เข้าสู่ระบบ';
  }
}

function loadFormSummaryPage() {
  // 1. โหลด Chart.js ก่อน (หากยังไม่โหลด)
  if (typeof Chart === 'undefined') {
    const chartScript = document.createElement('script');
    chartScript.src = 'https://cdn.jsdelivr.net/npm/chart.js';
    chartScript.onload = () => {
      loadFormSummary(); // โหลดหลังจาก Chart.js โหลดเสร็จ
    };
    document.head.appendChild(chartScript);
  } else {
    loadFormSummary(); // Chart.js ถูกโหลดแล้ว
  }
}

function loadFormSummary() {
  // 2. โหลด HTML content ของหน้า form-summary (เช่นจาก .html, หรือ Template)
  fetch('form-summary.html')
    .then(res => res.text())
    .then(html => {
      document.getElementById('main-content').innerHTML = html;

      // 3. โหลดสคริปต์ form-summary.js หลังจากโหลด HTML แล้ว
      const script = document.createElement('script');
      script.src = 'js/form-summary.js'; // ที่มีฟังก์ชัน loadEvaStatusGroupedWithSummary()
      document.body.appendChild(script);
    });
}

document.addEventListener("DOMContentLoaded", () => {
  const logoutBtn = document.getElementById("logoutBT");

  if (logoutBtn) {
    logoutBtn.addEventListener("click", (e) => {
      e.preventDefault();

      // 🔒 เคลียร์ข้อมูลใน localStorage
      localStorage.removeItem("UserID");
      localStorage.removeItem("UserType");
      localStorage.clear(); // ล้างทั้งหมดถ้าต้องการ

      // ✅ Redirect ไปหน้า login.html
      window.location.href = "index.html";
    });
  }
});