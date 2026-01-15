// ✅ edit-user.js (Supabase Hybrid Version - Fixed Upload & Display)
(() => {
  const googleScriptURL = CONFIG.API_URL; // Use GAS for File Upload Only
  const UserID = localStorage.getItem("UserID"); // This is Supabase ID now

  // Note: UserType, SchoolName, etc. are less critical for *fetching* own data as we query by ID

  if (!UserID) {
    console.warn("No UserID found, redirecting to login");
    window.location.href = "index.html";
    return;
  }

  // 1. Load User Data from Supabase
  async function loadUserData() {
    try {
      const { data: user, error } = await window.supabaseClient
        .from('users')
        .select('*')
        .eq('id', UserID)
        .single();

      if (error) throw error;

      if (user) {
        console.log("📦 Loaded User Data:", user);

        // Update UI
        setText("nameOutput", user.fullname || user.school_name || "-");
        setText("emailOutput", user.email || "-");
        setText("phoneOutput", user.phone || "-");

        // Pre-fill inputs
        setVal("nameInput", user.fullname || user.school_name || "");
        setVal("emailInput", user.email || "");
        setVal("phoneInput", user.phone || "");

        // Update Profile Pic
        let picUrl = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23eee'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='16' fill='%23aaa' dy='.3em' text-anchor='middle'%3ENo Image%3C/text%3E%3C/svg%3E";
        if (user.profile_pic && user.profile_pic.trim() !== "") {
          picUrl = formatDriveUrl(user.profile_pic);
        }

        const img = document.getElementById("picOutput");
        if (img) {
          img.src = picUrl;
          img.onerror = function () {
            this.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='150' height='150' viewBox='0 0 150 150'%3E%3Crect width='150' height='150' fill='%23fee'/%3E%3Ctext x='50%25' y='50%25' font-family='Arial' font-size='16' fill='%23e55' dy='.3em' text-anchor='middle'%3EError%3C/text%3E%3C/svg%3E";
            console.warn("Failed to load image:", picUrl);
          };
        }
      }
    } catch (err) {
      console.error("❌ Link Supabase Error:", err);
      // alert("ไม่สามารถโหลดข้อมูลผู้ใช้ได้");
    }
  }

  // Helper: Format Google Drive URL to be viewable in <img> tag
  function formatDriveUrl(url) {
    if (!url) return "";

    // Pattern 1: drive.google.com/file/d/VIDEO_ID/view...
    let match = url.match(/\/d\/(.+?)\//);
    if (match) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }

    // Pattern 2: drive.google.com/open?id=VIDEO_ID
    match = url.match(/id=(.+?)(&|$)/);
    if (match) {
      return `https://drive.google.com/uc?export=view&id=${match[1]}`;
    }

    return url; // Return original if unknown format
  }

  // Helper Utils
  function setText(id, val) { const el = document.getElementById(id); if (el) el.textContent = val; }
  function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }

  // 2. Handle Form Submit
  const updateForm = document.getElementById("updateForm");
  if (updateForm) {
    updateForm.addEventListener("submit", async function (e) {
      e.preventDefault();

      const fileInput = document.getElementById("picInput");
      const file = fileInput.files[0];
      const loading = document.getElementById("loadingPopup");
      if (loading) loading.style.display = "flex";

      let picUrl = null;

      try {
        // Step A: Upload Image to Google Drive (if selected)
        if (file) {
          const base64 = await toBase64(file);
          const formData = new FormData();
          // Use 'submitEvaluation' as it is the known working endpoint for uploads
          formData.append("action", "submitEvaluation");
          formData.append("UserID", UserID);
          formData.append("Eva_ID", "PROFILE_PIC"); // Dummy ID
          formData.append("Eva_PDF", base64);

          // Add dummy fields to pass GAS validation
          formData.append("School_Report_Detail", "Update Profile Picture");
          formData.append("School_Report_Innovation", "-");
          formData.append("School_Report_Process", "-");
          formData.append("School_Report_Output", "-");

          const res = await fetch(googleScriptURL, { method: "POST", body: formData });
          const json = await res.json();
          if (json.url) {
            picUrl = json.url;
            console.log("✅ Profile Pic Uploaded:", picUrl);
          } else {
            console.warn("⚠️ Upload finished but no URL returned", json);
          }
        }

        // Step B: Update Supabase
        const updateData = {
          fullname: document.getElementById("nameInput").value,
          email: document.getElementById("emailInput").value,
          phone: document.getElementById("phoneInput").value,
          // Only update pic if new one uploaded
        };

        if (picUrl) updateData.profile_pic = picUrl;

        const { error } = await window.supabaseClient
          .from('users')
          .update(updateData)
          .eq('id', UserID);

        if (error) throw error;

        // Success
        if (loading) loading.style.display = "none";
        alert("✅ อัปเดตข้อมูลเรียบร้อยแล้ว");
        loadUserData(); // Refresh UI
        updateForm.reset();

      } catch (err) {
        if (loading) loading.style.display = "none";
        console.error("Update Failed:", err);
        alert("❌ อัปเดตล้มเหลว: " + err.message);
      }
    });
  }

  // Base64 Helper
  const toBase64 = file => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = error => reject(error);
  });

  // Initial Load
  loadUserData();

})();


