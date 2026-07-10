function getComponentPath(filename) {
  const script = document.currentScript || [...document.scripts].find((item) => item.src.includes("/assets/js/components.js"));
  return new URL(`../../components/${filename}`, script?.src || window.location.href).href;
}

async function loadComponent(selector, path) {
  const target = document.querySelector(selector);
  if (!target) return;

  try {
    console.info("[components] Loading component", { selector, path });
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Gagal memuat komponen (${res.status} ${res.statusText}): ${path}`);
    target.innerHTML = await res.text();
  } catch (err) {
    console.error("[components] Component loading failed", { selector, path, error: err });
  }
}


document.addEventListener("DOMContentLoaded", async () => {
  await loadComponent("[data-component='navbar']", getComponentPath("navbar.html"));
  await loadComponent("[data-component='footer']", getComponentPath("footer.html"));

  setActiveMenu();

  if (typeof initMenu === "function") {
    initMenu();
  }

  initialiseNavbarAccount();
});

function setActiveMenu() {
  const currentPath = window.location.pathname;
  const navLinks = document.querySelectorAll(".nav-menu a");

  navLinks.forEach((link) => {
    const linkPath = new URL(link.href).pathname;

    if (currentPath === linkPath) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

function getNavbarAccountName(user) {
  return user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Akun SA UPI";
}

async function initialiseNavbarAccount() {
  const account = document.getElementById("navAccount");
  const signInLink = account?.querySelector(".nav-account-sign-in");
  const toggle = document.getElementById("navAccountToggle");
  const menu = document.getElementById("navAccountMenu");
  const logoutButton = document.getElementById("navAccountLogout");
  if (!account || !signInLink || !toggle || !menu || !logoutButton || account.dataset.initialized) return;
  account.dataset.initialized = "true";

  const render = (user) => {
    const isSignedIn = Boolean(user);
    signInLink.hidden = isSignedIn;
    toggle.hidden = !isSignedIn;
    menu.hidden = !isSignedIn;
    account.classList.toggle("is-signed-in", isSignedIn);
    account.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
    if (!user) return;
    const name = getNavbarAccountName(user);
    document.getElementById("navAccountName").textContent = name;
    document.getElementById("navAccountEmail").textContent = user.email || "";
    document.getElementById("navAccountInitial").textContent = name.trim().charAt(0).toUpperCase();
  };

  toggle.addEventListener("click", (event) => {
    event.stopPropagation();
    const isOpen = account.classList.toggle("open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
  document.addEventListener("click", (event) => {
    if (!event.target.closest("#navAccount")) {
      account.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
  });

  if (!window.supabase) {
    await loadSupabaseForNavbar();
  }
  if (!window.supabase) return;
  const client = window.supabase.createClient("https://rozfgvucyiwqqmmrmbph.supabase.co", "sb_publishable_KL8Jcb1hEzU-kAZiOMYWFg_hupftFmq");
  logoutButton.addEventListener("click", async () => {
    logoutButton.disabled = true;
    try {
      const { error } = await client.auth.signOut();
      if (error) throw error;
      window.location.assign(new URL("../pages/akun.html", window.location.href).href);
    } catch (error) {
      console.error("[account] Sign out failed", error);
      logoutButton.disabled = false;
    }
  });
  const { data } = await client.auth.getSession();
  render(data.session?.user || null);
  client.auth.onAuthStateChange((_event, session) => render(session?.user || null));
}

function loadSupabaseForNavbar() {
  if (window.supabase) return Promise.resolve();
  if (window.saupiSupabaseLoader) return window.saupiSupabaseLoader;
  window.saupiSupabaseLoader = new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
  return window.saupiSupabaseLoader;
}

async function getComponent(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Gagal load ${path}`);
  return await res.text();
}