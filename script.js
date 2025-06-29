// ─── Firebase Initialization ────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyCI_brM58_psBt8IpYQlDCJ0u2pZO1EtAE",
  authDomain: "risk-register-63ef2.firebaseapp.com",
  projectId: "risk-register-63ef2",
  storageBucket: "risk-register-63ef2.appspot.com",
  messagingSenderId: "189252582282",
  appId: "1:189252582282:web:14f2dc7b79da2dbd0fa673",
  measurementId: "G-LY31GS5RKV"
};
firebase.initializeApp(firebaseConfig);

// grab auth & firestore from the compat SDK
const auth = firebase.auth();
const db   = firebase.firestore();
// ─────────────────────────────────────────────────────────────────────────────


// Grab elements
const form = document.getElementById("riskForm");
const tableBody = document.getElementById("riskTable");
const clearBtn = document.getElementById("clearRisks");
const exportBtn = document.getElementById("exportCSV");

// 1️⃣ Handle form submission & add new risk
form.addEventListener("submit", function(e) {
  e.preventDefault();
  const title       = document.getElementById("title").value;
  const description = document.getElementById("description").value;
  const probability = parseInt(document.getElementById("probability").value, 10);
  const impact      = parseInt(document.getElementById("impact").value, 10);
  const score       = probability * impact;

  // Persist
  const risks = JSON.parse(localStorage.getItem("risks") || "[]");
  risks.push({ title, description, probability, impact, score });
  localStorage.setItem("risks", JSON.stringify(risks));

  form.reset();
  renderTable();
});

// 2️⃣ Render table with color-coding
function renderTable() {
  const risks = JSON.parse(localStorage.getItem("risks") || "[]");
  tableBody.innerHTML = "";

  risks
    .sort((a, b) => b.score - a.score)
    .forEach(risk => {
      let levelClass;
      if (risk.score >= 15)      levelClass = "high";
      else if (risk.score >= 6)  levelClass = "medium";
      else                        levelClass = "low";

      const row = document.createElement("tr");
      row.classList.add(levelClass);
      row.innerHTML = `
        <td>${risk.title}</td>
        <td>${risk.description}</td>
        <td>${risk.probability}</td>
        <td>${risk.impact}</td>
        <td>${risk.score}</td>
      `;
      tableBody.appendChild(row);
    });
}

// 3️⃣ Clear all risks
clearBtn.addEventListener("click", () => {
  if (confirm("Are you sure you want to delete all risks?")) {
    localStorage.removeItem("risks");
    renderTable();
  }
});

// 4️⃣ Export to CSV
exportBtn.addEventListener("click", () => {
  const risks = JSON.parse(localStorage.getItem("risks") || "[]");
  if (risks.length === 0) {
    alert("No risks to export.");
    return;
  }

  const header = ["Title","Description","Probability","Impact","Score"];
  const rows = risks.map(r => [r.title, r.description, r.probability, r.impact, r.score]);

  const csvContent = "data:text/csv;charset=utf-8,"
    + [header, ...rows].map(r => r.join(",")).join("\n");

  const link = document.createElement("a");
  link.href = encodeURI(csvContent);
  link.download = "risk_register.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// 5️⃣ Initial render
window.addEventListener("load", renderTable);
