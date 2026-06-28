function initMenu() {
    const menuToggle = document.getElementById("menuToggle");
    const navMenu = document.getElementById("navMenu");

    if (!menuToggle || !navMenu) return;

    // Hindari memasang listener dua kali
    if (menuToggle.dataset.initialized) return;
    menuToggle.dataset.initialized = "true";

    menuToggle.addEventListener("click", () => {
        navMenu.classList.toggle("show");
    });
}

fetch("../components/navbar.html")
    .then(res => res.text())
    .then(html => {
        document.getElementById("navbar").innerHTML = html;
        initMenu();
    })
    .catch(console.error);