import { ROSTER } from "./engine.mjs";
export class Tournament {
  constructor(fighter, random = Math.random) {
    this.random = random;
    const rivals = ROSTER.filter((f) => f.id !== fighter).map((f) => f.id);
    for (let i = rivals.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [rivals[i], rivals[j]] = [rivals[j], rivals[i]];
    }
    this.entries = [
      { id: fighter, player: true },
      ...Array.from({ length: 7 }, (_, i) => ({
        id: rivals[i % rivals.length],
        player: false,
      })),
    ];
    this.round = 0;
    this.history = [];
    this.finished = false;
    this.champion = null;
  }
  get label() {
    return ["QUARTERFINAL", "SEMIFINAL", "FINAL"][this.round] || "CHAMPIONSHIP";
  }
  get opponent() {
    const i = this.entries.findIndex((e) => e.player);
    return this.entries[i % 2 === 0 ? i + 1 : i - 1]?.id;
  }
  advance(playerWon) {
    if (this.finished) return;
    const winners = [];
    for (let i = 0; i < this.entries.length; i += 2) {
      const a = this.entries[i],
        b = this.entries[i + 1];
      const winner =
        a.player || b.player
          ? playerWon
            ? a.player
              ? a
              : b
            : a.player
              ? b
              : a
          : this.random() < 0.5
            ? a
            : b;
      winners.push(winner);
      this.history.push({
        round: this.label,
        a: a.id,
        b: b.id,
        winner: winner.id,
      });
    }
    this.entries = winners;
    if (!playerWon || winners.length === 1) {
      this.finished = true;
      this.champion = playerWon ? winners[0].id : null;
    } else this.round++;
  }
}
