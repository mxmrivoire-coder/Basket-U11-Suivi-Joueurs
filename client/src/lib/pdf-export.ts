// Export PDF pur jsPDF — sans html2canvas
// Format A4, données structurées uniquement

const TECH_LABELS: Record<string, string> = {
  début: "Début",
  à_travailler: "À travailler",
  en_cours: "En cours",
  acquis: "Acquis",
  maîtrise: "Maîtrise",
};

const MENTAL_LABELS = ["", "Difficultés", "Fragile", "Correct", "Bien", "Excellent"];

const TECH_COMPETENCES = [
  { key: "dribbleMainDroite", label: "Dribble main droite" },
  { key: "dribbleMainGauche", label: "Dribble main gauche" },
  { key: "changementMain", label: "Changement de main" },
  { key: "tirCercleDroite", label: "Tir au cercle (droite)" },
  { key: "tirCercleGauche", label: "Tir au cercle (gauche)" },
  { key: "passeDeuxMains", label: "Passe à deux mains" },
  { key: "passeUneMain", label: "Passe à une main" },
  { key: "attraperSousPression", label: "Attraper sous pression" },
  { key: "comprehension1c1", label: "Compréhension 1c1" },
  { key: "duelsSimples", label: "Duels simples" },
  { key: "placementSansBallon", label: "Placement sans ballon" },
  { key: "occupationEspaces", label: "Occupation des espaces" },
];

const MENTAL_COMPETENCES = [
  { key: "concentration", label: "Concentration" },
  { key: "coachabilite", label: "Coachabilité" },
  { key: "gestionFrustration", label: "Gestion frustration" },
  { key: "confianceMatch", label: "Confiance match" },
  { key: "espritCollectif", label: "Esprit collectif" },
  { key: "plaisirVisible", label: "Plaisir visible" },
];

export async function exportFicheJoueurPDF(data: any) {
  const { default: jsPDF } = await import("jspdf");

  const doc = new jsPDF({ format: "a4", unit: "mm" });
  const W = 210;
  const margin = 15;
  const usable = W - margin * 2;
  let y = margin;

  const hex = (r: number, g: number, b: number) => [r, g, b] as [number, number, number];
  const NAVY = hex(30, 58, 100);
  const ORANGE = hex(234, 108, 14);
  const GRAY_BG = hex(245, 246, 250);
  const GRAY_TEXT = hex(100, 110, 130);
  const GREEN = hex(16, 140, 80);
  const RED = hex(200, 50, 50);

  // ─── Helpers ────────────────────────────────────────────────────────────────
  function checkPage(needed = 12) {
    if (y + needed > 280) {
      doc.addPage();
      y = margin;
    }
  }

  function sectionTitle(title: string) {
    checkPage(14);
    doc.setFillColor(...NAVY);
    doc.rect(margin, y, usable, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text(title.toUpperCase(), margin + 3, y + 4.8);
    y += 10;
    doc.setTextColor(0, 0, 0);
  }

  function row(label: string, value: string, valueColor?: [number, number, number]) {
    checkPage(8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...GRAY_TEXT);
    doc.text(label, margin, y);
    doc.setFont("helvetica", "bold");
    if (valueColor) doc.setTextColor(...valueColor);
    else doc.setTextColor(30, 40, 60);
    doc.text(value || "—", margin + 55, y);
    doc.setTextColor(0, 0, 0);
    y += 5.5;
  }

  function textBlock(label: string, value: string, labelColor?: [number, number, number]) {
    if (!value?.trim()) return;
    checkPage(20);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    if (labelColor) doc.setTextColor(...labelColor);
    else doc.setTextColor(...NAVY);
    doc.text(label, margin, y);
    y += 4.5;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(40, 50, 70);
    const lines = doc.splitTextToSize(value, usable);
    lines.forEach((line: string) => {
      checkPage(5);
      doc.text(line, margin, y);
      y += 4.5;
    });
    y += 2;
  }

  // ─── Header ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, W, 28, "F");

  // Basketball circles décoration
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.setFillColor(255, 255, 255, 0);
  doc.circle(195, 5, 10, "S");
  doc.circle(190, 15, 15, "S");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("BASKET U11", margin, 12);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(200, 215, 240);
  doc.text("Fiche de suivi individuel", margin, 19);

  const today = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  doc.setFontSize(7.5);
  doc.setTextColor(170, 190, 220);
  doc.text(`Généré le ${today}`, margin, 25);

  y = 34;

  // ─── Identité joueur ────────────────────────────────────────────────────────
  const { joueur, fiche, evalTech, evalMentale, objectifs, observations, notesAdmin } = data;

  // Bloc identité fond coloré
  doc.setFillColor(...GRAY_BG);
  doc.roundedRect(margin, y, usable, 30, 2, 2, "F");
  doc.setFillColor(...ORANGE);
  doc.roundedRect(margin, y, 4, 30, 1, 1, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text(`${joueur.prenom} ${joueur.nom}`, margin + 8, y + 10);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY_TEXT);

  const infosL1 = [joueur.equipe, joueur.poste, joueur.numeroDossard ? `#${joueur.numeroDossard}` : null].filter(Boolean).join("  ·  ");
  if (infosL1) doc.text(infosL1, margin + 8, y + 17);

  const profils: Record<string, string> = { A: "Candidat U13", B: "Ambitieux U11", C: "En construction" };
  doc.text(`Profil ${joueur.profil} — ${profils[joueur.profil] || ""}`, margin + 8, y + 23);

  if (joueur.dateNaissance) {
    const age = Math.floor((Date.now() - new Date(joueur.dateNaissance).getTime()) / (1000 * 60 * 60 * 24 * 365.25));
    doc.text(`${age} ans`, W - margin - 20, y + 10, { align: "right" });
  }

  y += 36;

  // ─── Période de suivi ────────────────────────────────────────────────────────
  sectionTitle("Période de suivi");
  row("Début", fiche.periodeDebut ? new Date(fiche.periodeDebut).toLocaleDateString("fr-FR") : "—");
  row("Fin", fiche.periodeFin ? new Date(fiche.periodeFin).toLocaleDateString("fr-FR") : "—");
  row("Orientation", fiche.orientationEnvisagee || "indéfini");
  y += 3;

  // ─── Synthèse coach ──────────────────────────────────────────────────────────
  if (fiche.pointsForts || fiche.axesPrioritaires) {
    sectionTitle("Synthèse coach");
    textBlock("Points forts", fiche.pointsForts, GREEN);
    textBlock("Axes prioritaires", fiche.axesPrioritaires, [200, 100, 20]);
    y += 2;
  }

  // ─── Objectifs ───────────────────────────────────────────────────────────────
  if (objectifs?.length > 0) {
    sectionTitle("Objectifs individuels");
    for (const obj of objectifs) {
      checkPage(10);
      const statutColor: [number, number, number] = obj.statut === "Atteint" ? GREEN : obj.statut === "Abandonné" ? RED : ORANGE;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(...NAVY);
      doc.text(`• ${obj.libelle}`, margin, y);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...statutColor);
      doc.text(`[${obj.statut}]`, W - margin - 20, y, { align: "right" });
      y += 4.5;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(...GRAY_TEXT);
      doc.text(`  « ${obj.formulationEnfant} »`, margin, y);
      y += 5.5;
    }
    y += 2;
  }

  // ─── Évaluation technique ─────────────────────────────────────────────────
  if (evalTech) {
    sectionTitle("Évaluation technique");
    const colW = usable / 2;

    const allTech = [
      ...TECH_COMPETENCES,
      ...(() => { try { return JSON.parse(evalTech.competencesCustom || "[]"); } catch { return []; } })().map((c: any) => ({
        key: `__custom__${c.id}`,
        label: c.libelle,
        _customNiveau: c.niveau,
      })),
    ];

    for (let i = 0; i < allTech.length; i += 2) {
      checkPage(8);
      const cols = [allTech[i], allTech[i + 1]].filter(Boolean);
      cols.forEach((comp: any, ci) => {
        const xOffset = margin + ci * colW;
        const niveau = comp._customNiveau !== undefined ? comp._customNiveau : (evalTech as any)[comp.key] || "début";
        const levelLabel = TECH_LABELS[niveau] || niveau;

        // Couleur selon niveau
        const levelColors: Record<string, [number, number, number]> = {
          début: hex(150, 155, 165),
          à_travailler: hex(200, 70, 70),
          en_cours: hex(220, 130, 30),
          acquis: hex(50, 100, 200),
          maîtrise: hex(16, 160, 90),
        };
        const lc = levelColors[niveau] || hex(100, 100, 100);

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(40, 50, 70);
        doc.text(comp.label, xOffset, y);

        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...lc);
        doc.text(levelLabel, xOffset + colW - 5, y, { align: "right" });
      });
      y += 5.5;
    }
    y += 2;
  }

  // ─── Évaluation mentale ───────────────────────────────────────────────────
  if (evalMentale) {
    sectionTitle("Évaluation mentale");
    const MENTAL_COMP_ALL = [
      ...MENTAL_COMPETENCES,
      ...(() => { try { return JSON.parse(evalMentale.competencesCustom || "[]"); } catch { return []; } })().map((c: any) => ({
        key: `__custom__${c.id}`,
        label: c.libelle,
        _customVal: Number(c.niveau) || 3,
      })),
    ];

    for (const comp of MENTAL_COMP_ALL) {
      checkPage(8);
      const val: number = (comp as any)._customVal !== undefined ? (comp as any)._customVal : ((evalMentale as any)[comp.key] || 3);
      const label = MENTAL_LABELS[val] || "—";

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(40, 50, 70);
      doc.text(comp.label, margin, y);

      // Barres
      const barW = 4;
      const barGap = 1;
      const barsStart = W - margin - (5 * barW + 4 * barGap) - 20;
      const barColors: [number, number, number][] = [
        hex(220, 60, 60), hex(240, 130, 30), hex(250, 200, 30), hex(50, 120, 220), hex(16, 160, 90)
      ];
      for (let b = 0; b < 5; b++) {
        const bx = barsStart + b * (barW + barGap);
        if (b < val) {
          doc.setFillColor(...barColors[b]);
        } else {
          doc.setFillColor(220, 225, 235);
        }
        doc.rect(bx, y - 3.5, barW, 4, "F");
      }

      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY_TEXT);
      doc.text(label, W - margin, y, { align: "right" });

      y += 6;
    }

    if (evalMentale.commentaireGlobal) {
      y += 2;
      textBlock("Commentaire global", evalMentale.commentaireGlobal, GRAY_TEXT);
    }
    y += 2;
  }

  // ─── Observations ────────────────────────────────────────────────────────
  if (observations?.length > 0) {
    sectionTitle("Observations de séances");
    for (const obs of observations.slice(0, 6)) {
      checkPage(14);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...NAVY);
      const dateStr = obs.dateSeance ? new Date(obs.dateSeance).toLocaleDateString("fr-FR") : "";
      doc.text(`${dateStr}  [${obs.type}]`, margin, y);
      y += 4.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(50, 60, 80);
      const lines = doc.splitTextToSize(obs.contenu, usable);
      lines.slice(0, 3).forEach((line: string) => {
        checkPage(5);
        doc.text(line, margin, y);
        y += 4;
      });
      y += 2;
    }
  }

  // ─── Notes internes (si présentes) ───────────────────────────────────────
  if (notesAdmin?.length > 0) {
    sectionTitle("Notes staff (confidentielles)");
    for (const note of notesAdmin) {
      checkPage(12);
      const dateStr = note.dateCreation ? new Date(note.dateCreation).toLocaleDateString("fr-FR") : "";
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7.5);
      doc.setTextColor(...GRAY_TEXT);
      doc.text(dateStr, margin, y);
      y += 4;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(50, 60, 80);
      const lines = doc.splitTextToSize(note.contenu, usable);
      lines.slice(0, 3).forEach((line: string) => {
        checkPage(5);
        doc.text(line, margin, y);
        y += 4;
      });
      y += 2;
    }
  }

  // ─── Footer sur chaque page ───────────────────────────────────────────────
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFillColor(...NAVY);
    doc.rect(0, 290, W, 8, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7);
    doc.setTextColor(180, 195, 225);
    doc.text("Document confidentiel — Basket U11 — Suivi des joueurs", margin, 295);
    doc.text(`Page ${p}/${totalPages}`, W - margin, 295, { align: "right" });
  }

  // ─── Sauvegarde ──────────────────────────────────────────────────────────
  const filename = `fiche_${joueur.prenom}_${joueur.nom}_${new Date().toISOString().slice(0, 10)}.pdf`
    .replace(/\s+/g, "_")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  doc.save(filename);
}
