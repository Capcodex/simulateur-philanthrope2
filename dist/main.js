"use strict";
// main.ts — Version simplifiée + habitudes de don (impact actuel)
// - 5 questions claires (Faible / Moyen / Fort)
// - Ajout : tranches de don, fréquence, horizon, implication non financière
// - Radar Chart.js
// - Benchmark = référence fixe (50/100)
// Mapping simple des réponses vers des scores (0–100)
const map3 = { faible: 30, moyen: 50, fort: 80 };
function readHabitudes() {
    const montant = document.getElementById('donMontant').value;
    const frequence = document.getElementById('donFrequence').value;
    const horizon = document.getElementById('donHorizon').value;
    const implication = document.getElementById('donImplication').value;
    return { montant, frequence, horizon, implication };
}
// Bonus liés aux habitudes de don
function bonusMontant(m) {
    switch (m) {
        case 'm1': return 10;
        case 'm2': return 20;
        case 'm3': return 30;
        default: return 0;
    }
}
function bonusFrequence(f) {
    switch (f) {
        case 'recurrent': return 10;
        case 'mensuel': return 15;
        default: return 0;
    }
}
function bonusHorizon(h, mode) {
    if (mode === 'portee') {
        switch (h) {
            case 'h1': return 5;
            case 'h3': return 10;
            case 'h5': return 15;
            default: return 0;
        }
    }
    // profondeur
    switch (h) {
        case 'h1': return 10;
        case 'h3': return 20;
        case 'h5': return 25;
        default: return 0;
    }
}
function bonusImplication(i, mode) {
    const v = i === 'parfois' ? 5 : i === 'reguliere' ? 12 : 0;
    if (mode === 'capacitation')
        return i === 'parfois' ? 10 : i === 'reguliere' ? 20 : 0;
    return v;
}
const clamp = (v, min = 0, max = 100) => Math.max(min, Math.min(max, v));
// Lecture des intentions → scores de base
function parseIntentions() {
    const g = (id) => document.getElementById(id).value;
    return {
        portee: map3[g('qPortee')],
        profondeur: map3[g('qProfondeur')],
        equite: map3[g('qEquite')],
        capacitation: map3[g('qCapacitation')],
        rayonnement: map3[g('qRayonnement')],
    };
}
// Combinaison : intentions (base) + habitudes (bonus)
function computeScores() {
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
function computeBenchmark(scores) {
    const REF = 50; // ≈ 2,5/5
    const BAND = 15;
    const classify = (v) => v > REF + BAND ? '⬆️ au-dessus de la référence'
        : v < REF - BAND ? '⬇️ en dessous de la référence'
            : '➖ dans la zone de référence';
    return {
        portee: classify(scores.portee),
        profondeur: classify(scores.profondeur),
        equite: classify(scores.equite),
        capacitation: classify(scores.capacitation),
        rayonnement: classify(scores.rayonnement),
    };
}
// Radar
let radarChart = null;
function renderRadar(scores) {
    const ctx = document.getElementById('radarImpact').getContext('2d');
    if (!ctx)
        return;
    if (radarChart)
        radarChart.destroy();
    radarChart = new window.Chart(ctx, {
        type: 'radar',
        data: {
            labels: ['Combien de personnes ?', 'Changement durable', 'Équité & inclusion', 'Autonomie (capacitation)', 'Rayonnement'],
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
function renderBenchmark(status) {
    const list = document.getElementById('benchmark-list');
    list.innerHTML = '';
    const rows = [
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
    const form = document.getElementById('impact-form');
    const resultBlock = document.getElementById('resultat');
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        // Validation minimale (habitudes + intentions)
        const required = ['donMontant', 'donFrequence', 'donHorizon', 'donImplication', 'qPortee', 'qProfondeur', 'qEquite', 'qCapacitation', 'qRayonnement'];
        for (const id of required) {
            const v = document.getElementById(id).value;
            if (!v) {
                alert('Merci de répondre à toutes les questions.');
                return;
            }
        }
        const scores = computeScores();
        const bench = computeBenchmark(scores);
        renderRadar(scores);
        renderBenchmark(bench);
        resultBlock.hidden = false;
        resultBlock.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    // Lead form (démonstration)
    const leadForm = document.getElementById('lead-form');
    leadForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('lead-email').value;
        const region = document.getElementById('lead-region').value;
        const don = document.getElementById('lead-don').value;
        const rgpd = document.getElementById('lead-rgpd').checked;
        if (!email || !region || !don || !rgpd)
            return;
        alert('Merci ! Un expert vous recontactera rapidement.');
    });
});
/* Ajouts pour sections et grilles simples */
// (les classes .section-title et .grid-2 sont déclarées dans style.css)
