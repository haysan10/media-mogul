// researchTree.js — Pohon riset teknologi media (8 node)
import { CONFIG } from '../config.js';

export class ResearchTreeSystem {
  /**
   * Mulai proyek riset
   */
  static startResearch(nodeId, gameState) {
    if (gameState.activeResearch) {
      return { success: false, reason: 'Sedang ada proyek riset lain yang berjalan' };
    }

    if (gameState.researchedNodes.includes(nodeId)) {
      return { success: false, reason: 'Riset ini sudah selesai dipelajari' };
    }

    const node = CONFIG.RESEARCH_NODES.find((n) => n.id === nodeId);
    if (!node) return { success: false, reason: 'Node riset tidak ditemukan' };

    // Cek prasyarat
    for (const req of node.prereq) {
      if (!gameState.researchedNodes.includes(req)) {
        const reqNode = CONFIG.RESEARCH_NODES.find((n) => n.id === req);
        return { success: false, reason: `Butuh riset "${reqNode?.title || req}" terlebih dahulu` };
      }
    }

    if (gameState.money < node.cost) {
      return { success: false, reason: `Dana tidak cukup (butuh $${node.cost.toLocaleString()})` };
    }

    gameState.money -= node.cost;
    gameState.activeResearch = {
      id: nodeId,
      title: node.title,
      progressDays: 0,
      totalDays: node.daysRequired,
    };

    gameState.logs.unshift({
      text: `Memulai riset inovasi: ${node.title} (Estimasi: ${node.daysRequired} hari).`,
      type: 'info',
    });

    return { success: true };
  }

  /**
   * Kemajuan riset harian
   */
  static tickDailyResearch(gameState) {
    if (!gameState.activeResearch) return;

    gameState.activeResearch.progressDays += 1;

    if (gameState.activeResearch.progressDays >= gameState.activeResearch.totalDays) {
      const finishedId = gameState.activeResearch.id;
      const node = CONFIG.RESEARCH_NODES.find((n) => n.id === finishedId);

      gameState.researchedNodes.push(finishedId);
      gameState.activeResearch = null;

      gameState.logs.unshift({
        text: `RISET SELESAI: "${node?.title}"! ${node?.effectText}`,
        type: 'success',
      });
    }
  }
}
