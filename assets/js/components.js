async function loadComponent(selector, path) {
  const target = document.querySelector(selector);
  if (!target) return;

  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error(`Gagal load ${path}`);
    target.innerHTML = await res.text();
  } catch (err) {
    console.error(err);
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  await loadComponent("[data-component='navbar']", "/components/navbar.html");
  await loadComponent("[data-component='footer']", "/components/footer.html");
});