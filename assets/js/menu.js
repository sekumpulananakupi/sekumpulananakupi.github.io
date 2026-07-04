function initMenu() {
    const menuToggle = document.getElementById("menuToggle");
    const navMenu = document.getElementById("navMenu");
    const dropdownToggles = document.querySelectorAll(".nav-dropdown-toggle");
    initThemeToggle();

    if (!menuToggle || !navMenu) return;

    const closeDropdown = (dropdown, suppressHover = false) => {
        dropdown.classList.remove("open");
        dropdown.classList.toggle("click-closed", suppressHover);
        const toggle = dropdown.querySelector(".nav-dropdown-toggle");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
    };

    const closeOtherDropdowns = (currentDropdown) => {
        document.querySelectorAll(".nav-dropdown.open").forEach((dropdown) => {
            if (dropdown !== currentDropdown) closeDropdown(dropdown);
        });
    };

    // Hindari memasang listener dua kali
    if (!menuToggle.dataset.initialized) {
        menuToggle.dataset.initialized = "true";

        menuToggle.addEventListener("click", () => {
            navMenu.classList.toggle("show");
        });
    }

    dropdownToggles.forEach((toggle) => {
        if (toggle.dataset.initialized) return;
        toggle.dataset.initialized = "true";

        const dropdown = toggle.closest(".nav-dropdown");

        dropdown.addEventListener("mouseleave", () => {
            dropdown.classList.remove("click-closed");
        });

        toggle.addEventListener("click", (event) => {
            event.stopPropagation();
            const isOpen = dropdown.classList.contains("open");

            closeOtherDropdowns(dropdown);

            if (isOpen) {
                closeDropdown(dropdown, true);
                toggle.blur();
                return;
            }

            dropdown.classList.remove("click-closed");
            dropdown.classList.add("open");
            toggle.setAttribute("aria-expanded", "true");
        });
    });

    if (!document.body.dataset.navDropdownCloseInitialized) {
        document.body.dataset.navDropdownCloseInitialized = "true";

        document.addEventListener("click", (event) => {
            if (event.target.closest(".nav-dropdown")) return;

            document.querySelectorAll(".nav-dropdown.open").forEach(closeDropdown);
        });
    }
}

function isAdminPage() {
    return document.body.classList.contains("admin-modern-body") || /\/pages\/admin(?:-modern)?\.html$/.test(window.location.pathname);
}

function initThemeToggle() {
    if (isAdminPage()) {
        document.documentElement.removeAttribute("data-theme");
        return;
    }

    const themeToggle = document.getElementById("themeToggle");
    const savedTheme = localStorage.getItem("site-theme");
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    const initialTheme = savedTheme || (prefersDark ? "dark" : "light");

    const applyTheme = (theme) => {
        const isDark = theme === "dark";
        document.documentElement.dataset.theme = isDark ? "dark" : "light";

        if (!themeToggle) return;

        themeToggle.setAttribute("aria-pressed", String(isDark));
        themeToggle.setAttribute("aria-label", isDark ? "Aktifkan light mode" : "Aktifkan night mode");
        themeToggle.innerHTML = isDark
            ? '<i class="fas fa-sun" aria-hidden="true"></i>'
            : '<i class="fas fa-moon" aria-hidden="true"></i>';
    };

    applyTheme(initialTheme);

    if (!themeToggle || themeToggle.dataset.initialized) return;
    themeToggle.dataset.initialized = "true";

    themeToggle.addEventListener("click", () => {
        const nextTheme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
        localStorage.setItem("site-theme", nextTheme);
        applyTheme(nextTheme);
    });
}

document.addEventListener("DOMContentLoaded", initThemeToggle);

const legacyNavbar = document.getElementById("navbar");

if (legacyNavbar) {
    fetch("../components/navbar.html")
        .then(res => res.text())
        .then(html => {
            legacyNavbar.innerHTML = html;
            initMenu();
        })
        .catch(console.error);
}