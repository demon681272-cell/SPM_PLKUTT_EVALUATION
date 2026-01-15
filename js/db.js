window.addEventListener("DOMContentLoaded", () => {
  const SchoolName = localStorage.getItem("SchoolName");
  const Area = localStorage.getItem("Area");

  // แสดงข้อมูลใน HTML
  document.getElementById("School1").innerText = SchoolName;
  document.getElementById("Area1").innerText = Area;
});



