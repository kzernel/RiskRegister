// ────────────────────────────────────────────────────────────────────────────────
// script.js: Risk Register with Multi-User Auth, Column Filters, 5×5 Gradient Heatmap + Inline Editing
// ────────────────────────────────────────────────────────────────────────────────
console.log("🔧 script.js loaded");

// ─── Gradient Heatmap Plugin ──────────────────────────────────────────────────
const gradientHeatmapPlugin = {
  id: 'gradientHeatmapPlugin',
  beforeDatasetsDraw(chart) {
    const {
      ctx,
      chartArea: { top, bottom, left, right }
    } = chart;
    const cellW = (right - left) / 5;
    const cellH = (bottom - top) / 5;
    const minScore = 1, maxScore = 25;

    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        const prob  = i + 1;
        const imp   = 5 - j;
        const score = prob * imp;
        const t     = (score - minScore) / (maxScore - minScore);
        const hue   = (1 - t) * 120;   // green→yellow→red
        ctx.fillStyle = `hsl(${hue}, 100%, 60%)`;
        ctx.fillRect(
          left + i * cellW,
          top  + j * cellH,
          cellW,
          cellH
        );
      }
    }
  }
};
Chart.register(gradientHeatmapPlugin);

// ─── App State & Filters ───────────────────────────────────────────────────────
let matrixChart    = null;
let currentRisks   = [];  // from Firestore
let textFilter     = "";  // 🔍
let severityFilter = "";  // 🚦
let probFilter     = "";  // 🎲
let impactFilter   = "";  // 💥

// ─── Firebase Init ─────────────────────────────────────────────────────────────
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
const auth = firebase.auth();
const db   = firebase.firestore();

// ─── DOM Elements ─────────────────────────────────────────────────────────────
const authContainer   = document.getElementById("auth-container");
const appContainer    = document.getElementById("app-container");
const emailInput      = document.getElementById("email");
const passInput       = document.getElementById("password");
const signUpBtn       = document.getElementById("signUpBtn");
const signInBtn       = document.getElementById("signInBtn");
const signOutBtn      = document.getElementById("signOutBtn");
const form            = document.getElementById("riskForm");
const textInput       = document.getElementById("filterInput");
const severitySelect  = document.getElementById("severityFilter");
const probSelect      = document.getElementById("probFilter");
const impactSelect    = document.getElementById("impactFilter");
const tableBody       = document.getElementById("riskTable");
const clearBtn        = document.getElementById("clearRisks");
const exportBtn       = document.getElementById("exportCSV");

// ─── Filter Listeners ──────────────────────────────────────────────────────────
[textInput, severitySelect, probSelect, impactSelect].forEach(el => {
  if (!el) return console.error("Missing filter element:", el);
  el.addEventListener("input",  applyFilters);
  el.addEventListener("change", applyFilters);
});
function applyFilters() {
  textFilter     = textInput.value.trim().toLowerCase();
  severityFilter = severitySelect.value;
  probFilter     = probSelect.value;
  impactFilter   = impactSelect.value;
  renderTable();
}

// ─── Auth Flow ────────────────────────────────────────────────────────────────
auth.onAuthStateChanged(user => {
  if (user) {
    authContainer.style.display = "none";
    appContainer.style.display  = "block";
    renderTable();
  } else {
    authContainer.style.display = "block";
    appContainer.style.display  = "none";
  }
});

signUpBtn.addEventListener("click", async () => {
  try { await auth.createUserWithEmailAndPassword(emailInput.value, passInput.value); }
  catch(e){ alert("Sign-Up Error: "+e.message); }
});
signInBtn.addEventListener("click", async () => {
  try { await auth.signInWithEmailAndPassword(emailInput.value, passInput.value); }
  catch(e){ alert("Sign-In Error: "+e.message); }
});
signOutBtn.addEventListener("click", () => auth.signOut());

// ─── Firestore Helper ─────────────────────────────────────────────────────────
function userRisksRef() {
  return db.collection("users")
           .doc(auth.currentUser.uid)
           .collection("risks");
}

// ─── Add Risk Handler ─────────────────────────────────────────────────────────
form.addEventListener("submit", async e => {
  e.preventDefault();
  const title       = document.getElementById("title").value.trim();
  const description = document.getElementById("description").value.trim();
  const prob        = parseInt(document.getElementById("probability").value, 10);
  const impact      = parseInt(document.getElementById("impact").value,      10);
  const dateId      = document.getElementById("dateIdentified").value;
  const dateMit     = document.getElementById("dateMitigated").value;
  const comments    = document.getElementById("comments").value.trim();
  const status      = document.getElementById("status").value;

  if (!title||!description||isNaN(prob)||isNaN(impact)) {
    return alert("Title, Description, Probability & Impact are required.");
  }
  const score = prob*impact;
  await userRisksRef().add({
    title, description, probability:prob, impact, score,
    dateIdentified: dateId||"", dateMitigated: dateMit||"",
    comments, status
  });
  form.reset();
  renderTable();
});

// ─── Render Table & Update Chart ───────────────────────────────────────────────
async function renderTable() {
  // fetch all
  const snap = await userRisksRef().orderBy("score","desc").get();
  currentRisks = snap.docs.map(d=>({ id:d.id, ...d.data() }));

  // filter
  const filtered = currentRisks.filter(risk=>{
    const textOK = !textFilter ||
      Object.values(risk).some(v=>
        String(v).toLowerCase().includes(textFilter)
      );
    const sev = risk.score>=15?"high":risk.score>=6?"medium":"low";
    const severityOK = !severityFilter || sev===severityFilter;
    const probOK     = !probFilter     || String(risk.probability)===probFilter;
    const impactOK   = !impactFilter   || String(risk.impact)===impactFilter;
    return textOK&&severityOK&&probOK&&impactOK;
  });

  // clear & build rows
  tableBody.innerHTML = "";
  filtered.forEach(risk=>{
    const cls = risk.score>=15?"high":risk.score>=6?"medium":"low";
    const tr  = document.createElement("tr");
    tr.classList.add(cls);

    // each cell is contenteditable, with data-field
    tr.innerHTML = `
      <td data-field="title"       contenteditable>${risk.title}</td>
      <td data-field="description" contenteditable>${risk.description}</td>
      <td data-field="probability" contenteditable>${risk.probability}</td>
      <td data-field="impact"      contenteditable>${risk.impact}</td>
      <td>${risk.score}</td>
      <td data-field="dateIdentified" contenteditable>${risk.dateIdentified||""}</td>
      <td data-field="dateMitigated"   contenteditable>${risk.dateMitigated||""}</td>
      <td data-field="comments"        contenteditable>${risk.comments||""}</td>
      <td data-field="status"          contenteditable>${risk.status||""}</td>
    `;

    // on blur, update Firestore
    tr.querySelectorAll("[contenteditable]").forEach(cell=>{
      cell.addEventListener("blur", async e=>{
        const field = e.target.dataset.field;
        let newVal  = e.target.innerText.trim();

        // validate prob/impact
        if(field==="probability"||field==="impact"){
          const n = parseInt(newVal,10);
          if(isNaN(n)||n<1||n>5){
            return alert("Probability & Impact must be 1–5");
          }
          newVal = n;
        }

        // prepare update
        const docRef    = userRisksRef().doc(risk.id);
        const updateObj = { [field]: newVal };

        // if prob/impact changed, recompute score
        if(field==="probability"||field==="impact"){
          const otherField = field==="probability"?"impact":"probability";
          const otherVal   = risk[otherField];
          updateObj.score  = (field==="probability"?newVal:otherVal)
                           * (field==="impact"?newVal:otherVal);
        }

        // commit & refresh
        try {
          await docRef.update(updateObj);
          renderTable();
        } catch(err){
          console.error("Firestore update failed:",err);
          alert("Save failed, please try again.");
        }
      });
    });

    tableBody.appendChild(tr);
  });

  // redraw the chart ONCE
  updateMatrixChart(filtered);
}

// ─── Clear & Export ───────────────────────────────────────────────────────────
clearBtn.addEventListener("click", async ()=>{
  if(!confirm("Delete ALL risks?")) return;
  const snap = await userRisksRef().get();
  const batch = db.batch();
  snap.forEach(d=>batch.delete(d.ref));
  await batch.commit();
  renderTable();
});

exportBtn.addEventListener("click", ()=>{
  if(!currentRisks.length) return alert("No risks to export");
  const header = ["Title","Description","Probability","Impact","Score","Date Identified","Date Mitigated","Comments","Status"];
  const rows = currentRisks.map(r=>[
    r.title, r.description, r.probability, r.impact, r.score,
    r.dateIdentified, r.dateMitigated, r.comments, r.status
  ]);
  const csv = "data:text/csv;charset=utf-8," + [header,...rows].map(r=>r.join(",")).join("\n");
  const link = document.createElement("a");
  link.href = encodeURI(csv);
  link.download = "risk_register.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
});

// ─── Draw 5×5 Chart ───────────────────────────────────────────────────────────
function updateMatrixChart(risksToPlot=currentRisks){
  const dataPoints = risksToPlot.map(r=>{
    let color;
    if     (r.score>=15) color="rgba(220,53,69,0.8)";
    else if(r.score>=6 ) color="rgba(255,193,7,0.8)";
    else                 color="rgba(40,167,69,0.8)";
    return { x:r.probability, y:r.impact, backgroundColor:color };
  });

  const cfg = {
    type: "scatter",
    data: { datasets:[{ data:dataPoints, pointRadius:5 }] },
    options:{
      responsive:true,
      maintainAspectRatio:false,
      scales:{
        x:{ title:{display:true,text:"Probability"},min:1,max:5,ticks:{stepSize:1},grid:{color:"#eee"} },
        y:{ title:{display:true,text:"Impact"     },min:1,max:5,ticks:{stepSize:1},grid:{color:"#eee"} }
      },
      plugins: { legend:{display:false} }
    },
    plugins:[ gradientHeatmapPlugin ]
  };

  const ctx = document.getElementById("riskMatrix").getContext("2d");
  if(matrixChart){
    matrixChart.data.datasets[0].data = dataPoints;
    matrixChart.update();
  } else {
    matrixChart = new Chart(ctx,cfg);
  }
}
