function initMenu() {
  const menuToggle = document.getElementById("menuToggle");
  const navMenu = document.getElementById("navMenu");

  if (!menuToggle || !navMenu) return;

  menuToggle.addEventListener("click", () => {
    navMenu.classList.toggle("show");
  });
}

document.addEventListener("DOMContentLoaded", initMenu);
window.addEventListener("load", initMenu);

fetch("../components/navbar.html")
  .then(res => res.text())
  .then(data => {
    document.getElementById("navbar").innerHTML = data;
    initMenu();
  });