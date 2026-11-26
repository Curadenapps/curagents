// BESTIARY (owned by the enemies agent). PLACEHOLDER: one crawler so the core can be tested.
import { Enemy } from '../entity';
import { register } from '../registry';
import { TILE } from '../../engine/render';
import type { Game } from '../types';

class Filmling extends Enemy {
  constructor(x: number, y: number) { super('filmling', x, y + TILE / 2 - 13, 16, 13, 15); this.shine = 3; }
  think(g: Game, dt: number) {
    this.vx = this.facing * 70;
    if (this.wallL || this.wallR || !g.room.groundAt(this.x + this.facing * (this.hw + 4), this.y + this.hh + 4)) { if (this.grounded) this.facing = -this.facing as 1 | -1; }
    this.physics(g, dt);
  }
  draw(ctx: CanvasRenderingContext2D) {
    this.withFlash(ctx, () => { ctx.fillStyle = '#d9c400'; ctx.beginPath(); ctx.ellipse(this.x, this.y + 2, 17, 12, 0, 0, Math.PI * 2); ctx.fill(); });
  }
}
register.legend('f', (g, x, y) => new Filmling(x, y));
