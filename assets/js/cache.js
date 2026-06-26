const SAUPI_CACHE_PREFIX = "saupi_cache_";

function getCache(key, ttlMinutes = 1440) {
  try {
    const raw = localStorage.getItem(SAUPI_CACHE_PREFIX + key);
    if (!raw) return null;

    const cached = JSON.parse(raw);
    const now = Date.now();
    const maxAge = ttlMinutes * 60 * 1000;

    if (!cached.timestamp || now - cached.timestamp > maxAge) {
      localStorage.removeItem(SAUPI_CACHE_PREFIX + key);
      return null;
    }

    return cached.data;
  } catch (error) {
    console.warn("Cache gagal dibaca:", key, error);
    return null;
  }
}

function setCache(key, data) {
  try {
    localStorage.setItem(
      SAUPI_CACHE_PREFIX + key,
      JSON.stringify({
        timestamp: Date.now(),
        data
      })
    );
  } catch (error) {
    console.warn("Cache gagal disimpan:", key, error);
  }
}

function clearSaupiCache(key = null) {
  if (key) {
    localStorage.removeItem(SAUPI_CACHE_PREFIX + key);
    return;
  }

  Object.keys(localStorage)
    .filter(item => item.startsWith(SAUPI_CACHE_PREFIX))
    .forEach(item => localStorage.removeItem(item));
}