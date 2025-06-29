document.getElementById("riskForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const title = document.getElementById("title").value;
  const description = document.getElementById("description").value;
  const probability = parseInt(document.getElementById("probability").value);
  const impact = parseInt(document.getElementById("impact").value);
  const score = probability * impact;

  const risk = { title, description, probability, impact, score };

  let risks = JSON.parse(localStorage.getItem("risks") || "[]");
  risks.push(risk);
  localStorage.setItem("risks", JSON.stringify(risks));

  renderTable();
  document.getElementById("clearRisks").addEventListener("click", function() {
  if (confirm("Are you sure you want to delete all risks?")) {
    localStorage.removeItem("risks");
    renderTable();
  }
});
  this.reset();
});

function renderTable() {
  const risks = JSON.parse(localStorage.getItem("risks") || "[]");
  const table = document.getElementById("riskTable");
  table.innerHTML = "";

  risks
    .sort((a, b) => b.score - a.score)
    .forEach(risk => {
      let riskLevel = "";
if (risk.score >= 15) {
  riskLevel = "high";
} else if (risk.score >= 6) {
  riskLevel = "medium";
} else {
  riskLevel = "low";
}

const row = `<tr class="${riskLevel}">
  <td>${risk.title}</td>
  <td>${risk.description}</td>
  <td>${risk.probability}</td>
  <td>${risk.impact}</td>
  <td>${risk.score}</td>
</tr>`;

      table.innerHTML += row;
    });
}

window.onload = renderTable;
