const checklistKey = "saupi_maba_checklist_v1";

const checklistInputs = document.querySelectorAll("#mabaChecklist input[type='checkbox']");
const progressText = document.getElementById("progressText");
const progressFill = document.getElementById("progressFill");
const faqSearch = document.getElementById("faqSearch");
const faqItems = document.querySelectorAll(".faq-item");

function loadChecklist() {
  const saved = JSON.parse(localStorage.getItem(checklistKey) || "{}");

  checklistInputs.forEach(input => {
    input.checked = Boolean(saved[input.dataset.id]);
  });

  updateProgress();
}

function saveChecklist() {
  const data = {};

  checklistInputs.forEach(input => {
    data[input.dataset.id] = input.checked;
  });

  localStorage.setItem(checklistKey, JSON.stringify(data));
  updateProgress();
}

function updateProgress() {
  const total = checklistInputs.length;
  const checked = [...checklistInputs].filter(input => input.checked).length;
  const percent = total ? Math.round((checked / total) * 100) : 0;

  progressText.textContent = percent + "%";
  progressFill.style.width = percent + "%";
}

checklistInputs.forEach(input => {
  input.addEventListener("change", saveChecklist);
});

document.querySelectorAll(".quick-card").forEach(card => {
  card.addEventListener("click", () => {
    const target = document.querySelector(card.dataset.target);

    if (target) {
      target.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  });
});

document.querySelectorAll(".accordion-btn").forEach(button => {
  button.addEventListener("click", () => {
    const item = button.closest(".accordion-item");
    item.classList.toggle("active");
  });
});

if (faqSearch) {
  faqSearch.addEventListener("input", () => {
    const keyword = faqSearch.value.toLowerCase().trim();

    faqItems.forEach(item => {
      const text = item.textContent.toLowerCase() + " " + item.dataset.keyword;
      item.style.display = text.includes(keyword) ? "" : "none";
    });
  });
}

loadChecklist();