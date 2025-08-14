// main.ts — Version simplifiée + habitudes de don (impact actuel)
// - 5 questions claires (Faible / Moyen / Fort)
// - Ajout : tranches de don, fréquence, horizon, implication non financière
// - Radar Chart.js
// - Benchmark = référence fixe (50/100)

// Types

type AxeScores = {
  portee: number;
  profondeur: number;
  equite: number;
  capacitation: number;
  rayonnement: number;
};

type Habitudes = {
  montant: 'm0' | 'm1' | 'm2' | 'm3';
  frequence: 'ponctuel' | 'recurrent' | 'mensuel';
  horizon: 'h0' | 'h1' | 'h3' | 'h5';
  implication: 'aucune' | 'parfois' | 'reguliere';
};

// Mapping simple des réponses vers des scores (0–100)
const map3: Record<string, number> = { faible: 30, moyen: 50, fort: 80 };

function readHabitudes(): Habitudes {
  const montant = (document.getElementById('donMontant') as HTMLSelectElement).value as Habitudes['montant'];
  const frequence = (document.getElementById('donFrequence') as HTMLSelectElement).value as Habitudes['frequence'];
  const horizon = (document.getElementById('donHorizon') as HTMLSelectElement).value as Habitudes['horizon'];
  const implication = (document.getElementById('donImplication') as HTMLSelectElement).value as Habitudes['implication'];
  return { montant, frequence, horizon, implication };
}

// Bonus liés aux habitudes de don
function bonusMontant(m: Habitudes['montant']) {
  switch (m) { case 'm1': return 10; case 'm2': return 20; case 'm3': return 30; default: return 0; }
}
function bonusFrequence(f: Habitudes['frequence']) {
  switch (f) { case 'recurrent': return 10; case 'mensuel': return 15; default: return 0; }
}
function bonusHorizon(h: Habitudes['horizon'], mode: 'portee' | 'profondeur') {
  if (mode === 'portee') {
    switch (h) { case 'h1': return 5; case 'h3': return 10; case 'h5': return 15; default: return 0; }
  }
  // profondeur
  switch (h) { case 'h1': return 10; case 'h3': return 20; case 'h5': return 25; default: return 0; }
}
function bonusImplication(i: Habitudes['implication'], mode: 'profondeur' | 'capacitation') {
  const v = i === 'parfois' ? 5 : i === 'reguliere' ? 12 : 0;
  if (mode === 'capacitation') return i === 'parfois' ? 10 : i === 'reguliere' ? 20 : 0;
  return v;
}

const clamp = (v: number, min = 0, max = 100) => Math.max(min, Math.min(max, v));

// Lecture des intentions → scores de base
function parseIntentions(): AxeScores {
  const g = (id: string) => (document.getElementById(id) as HTMLSelectElement).value;
  return {
    portee: map3[g('qPortee')],
    profondeur: map3[g('qProfondeur')],
    equite: map3[g('qEquite')],
    capacitation: map3[g('qCapacitation')],
    rayonnement: map3[g('qRayonnement')],
  };
}

// Combinaison : intentions (base) + habitudes (bonus)
function computeScores(): AxeScores {
  const base = parseIntentions();
  const hab = readHabitudes();

  let portee = base.portee + bonusMontant(hab.montant) + bonusFrequence(hab.frequence) + bonusHorizon(hab.horizon, 'portee');
  let profondeur = base.profondeur + bonusHorizon(hab.horizon, 'profondeur') + bonusImplication(hab.implication, 'profondeur');
  let equite = base.equite; // les habitudes n’influencent pas directement l’équité
  let capacitation = base.capacitation + bonusImplication(hab.implication, 'capacitation');
  let rayonnement = base.rayonnement + (hab.frequence === 'recurrent' ? 5 : hab.frequence === 'mensuel' ? 10 : 0);

  return {
    portee: clamp(portee),
    profondeur: clamp(profondeur),
    equite: clamp(equite),
    capacitation: clamp(capacitation),
    rayonnement: clamp(rayonnement),
  };
}

// Benchmark simple : référence fixe (50) avec bande ±15
function computeBenchmark(scores: AxeScores) {
  const REF = 50; // ≈ 2,5/5
  const BAND = 15;
  const classify = (v: number) =>
    v > REF + BAND ? '⬆️ au-dessus de la référence'
    : v < REF - BAND ? '⬇️ en dessous de la référence'
    : '➖ dans la zone de référence';
  return {
    portee: classify(scores.portee),
    profondeur: classify(scores.profondeur),
    equite: classify(scores.equite),
    capacitation: classify(scores.capacitation),
    rayonnement: classify(scores.rayonnement),
  } as Record<keyof AxeScores, string>;
}

// Radar
let radarChart: any = null;
function renderRadar(scores: AxeScores) {
  const ctx = (document.getElementById('radarImpact') as HTMLCanvasElement).getContext('2d');
  if (!ctx) return;
  if (radarChart) radarChart.destroy();

  radarChart = new (window as any).Chart(ctx, {
    type: 'radar',
    data: {
      labels: ['Combien de personnes ?','Changement durable','Équité & inclusion','Autonomie (capacitation)','Rayonnement'],
      datasets: [{
        label: 'Score (0–100)',
        data: [scores.portee, scores.profondeur, scores.equite, scores.capacitation, scores.rayonnement],
        fill: true,
        backgroundColor: 'rgba(127,90,240,0.25)',
        borderColor: '#7f5af0',
        pointBackgroundColor: '#7f5af0',
        borderWidth: 2,
      }]
    },
    options: {
      responsive: true,
      scales: { r: { suggestedMin: 0, suggestedMax: 100, angleLines: { color: '#2c2c2c' }, grid: { color: '#2c2c2c' }, pointLabels: { color: '#ddd' }, ticks: { display: false } } },
      plugins: { legend: { display: false } }
    }
  });
}

function renderBenchmark(status: Record<keyof AxeScores, string>) {
  const list = document.getElementById('benchmark-list') as HTMLUListElement;
  list.innerHTML = '';
  const rows: [keyof AxeScores, string][] = [
    ['portee', 'Combien de personnes ?'],
    ['profondeur', 'Changement durable'],
    ['equite', 'Équité & inclusion'],
    ['capacitation', 'Autonomie (capacitation)'],
    ['rayonnement', 'Rayonnement'],
  ];
  rows.forEach(([k, label]) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${label}</span><span class="status">${status[k]}</span>`;
    list.appendChild(li);
  });
}

// Main

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('impact-form') as HTMLFormElement;
  const resultBlock = document.getElementById('resultat') as HTMLDivElement;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // Validation minimale (habitudes + intentions)
    const required = ['donMontant','donFrequence','donHorizon','donImplication','qPortee','qProfondeur','qEquite','qCapacitation','qRayonnement'];
    for (const id of required) {
      const v = (document.getElementById(id) as HTMLSelectElement).value;
      if (!v) { alert('Merci de répondre à toutes les questions.'); return; }
    }

    const scores = computeScores();
    const bench = computeBenchmark(scores);

    renderRadar(scores);
    renderBenchmark(bench);

    resultBlock.hidden = false;
    resultBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Lead form (démonstration)
  const leadForm = document.getElementById('lead-form') as HTMLFormElement;
  leadForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = (document.getElementById('lead-email') as HTMLInputElement).value;
    const region = (document.getElementById('lead-region') as HTMLSelectElement).value;
    const don = (document.getElementById('lead-don') as HTMLSelectElement).value;
    const rgpd = (document.getElementById('lead-rgpd') as HTMLInputElement).checked;
    if (!email || !region || !don || !rgpd) return;
    alert('Merci ! Un expert vous recontactera rapidement.');
  });
});

/* Ajouts pour sections et grilles simples */
// (les classes .section-title et .grid-2 sont déclarées dans style.css)
