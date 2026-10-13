// researchTree.js — Lapisan 3: Teknologi & Inovasi (8 Node)
import { CONFIG } from '../config.js';

export class ResearchTreeSystem {
  static startResearch(nodeId, gameState) {
    if (gameState.activeResearch) {
      return { success: false, reason: 'Laboratorium riset sedang mengerjakan proyek lain' };
    }

    if (gameState.researchedNodes.includes(nodeId)) {
      return { success: false, reason: 'Teknologi ini sudah berhasil dikuasai' };
    }

    const node = CONFIG.RESEARCH_NODES.find((n) => n.id === nodeId);
    if (!node) return { success: false, reason: 'Node riset tidak ditemukan' };

    // Validasi Prasyarat
    for (const reqId of node.prereq) {
      if (!gameState.researchedNodes.includes(reqId)) {
        const reqNode = CONFIG.RESEARCH_NODES.find((n) => n.id === reqId);
        return { success: false, reason: `Membutuhkan riset "${reqNode?.title || reqId}" terlebih dahulu` };
      }
    }

    // Validasi Biaya
    if (gameState.money < node.cost) {
      return { success: false, reason: `Dana riset tidak cukup (Butuh $${node.cost.toLocaleString()})` };
    }

    gameState.money -= node.cost;
    gameState.activeResearch = {
      id: nodeId,
      title: node.title,
      progressDays: 0,
      totalDays: node.daysRequired,
    };

    gameState.logs.unshift({
      text: `Memulai riset: "${node.title}" ($${node.cost.toLocaleString()} · ${node.daysRequired} hari).`,
      type: 'info',
    });

    return { success: true };
  }

  static tickDaily(gameState) {
    if (!gameState.activeResearch) return;

    gameState.activeResearch.progressDays += 1;

    if (gameState.activeResearch.progressDays >= gameState.activeResearch.totalDays) {
      const finishedId = gameState.activeResearch.id;
      const node = CONFIG.RESEARCH_NODES.find((n) => n.id === finishedId);

      gameState.researchedNodes.push(finishedId);
      gameState.activeResearch = null;

      gameState.logs.unshift({
        text: `RISET TUNTAS: "${node?.title}"! Kemampuan baru terbuka: ${node?.newCapability}.`,
        type: 'success',
      });
    }
  }
}
