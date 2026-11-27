// An NPC standing in a room: idle animation, a soft light, and a TALK prompt when the knight is near and grounded.
import { Actor } from '../entity';
import { clamp, damp } from '../../engine/math';
import type { Game } from '../types';
import { ART, type Pose } from './art';
import { rewardOnce, XP } from '../xp';

export class Npc extends Actor {
  npc: string; t = Math.random() * 10; prompt = 0; blinkT = 2 + Math.random() * 3; blink = 0; look = 0; talking = false; talk = 0;
  facing: 1 | -1 = -1;
  constructor(npc: string, x: number, footY: number) {
    const h = (ART[npc]?.height ?? 60) / 2;
    super(x, footY - Math.min(h, 30), 14, Math.min(h, 30)); // body box stays a tile-friendly size; art may be taller
    this.npc = npc; this.z = 8;
  }
  update(g: Game, dt: number) {
    this.t += dt;
    this.physics(g, dt);
    const p = g.player, dx = p.x - this.x, near = Math.abs(dx) < 64 && Math.abs(p.y - this.y) < 60;
    this.prompt = clamp(this.prompt + (near && !this.talking ? dt : -dt) * 4, 0, 1);
    if (Math.abs(dx) < 260) this.facing = dx < 0 ? -1 : 1;
    this.look = damp(this.look, clamp((p.y - this.y) / 120, -1, 1), 3, dt);
    // blink
    this.blinkT -= dt; if (this.blinkT <= 0) { this.blink = 1; this.blinkT = 2.5 + Math.random() * 4; }
    this.blink = Math.max(0, this.blink - dt * 7);
    this.talk = this.talking ? 0.5 + 0.5 * Math.sin(this.t * 18) : damp(this.talk, 0, 10, dt);
    if (near && !this.talking && !g.busy() && !g.ui.isOpen() && p.grounded && (g.input.pressed('interact', 0.05) || g.input.pressed('up', 0.05))) {
      g.input.consume('interact'); g.input.consume('up');
      this.talking = true; rewardOnce(g, `talk:${this.npc}`, XP.talk, this.x, this.y - 70, 'New friend');
      g.ui.talk(this.npc).finally(() => { this.talking = false; });
    }
  }
  pose(): Pose { return { t: this.t, f: this.facing, blink: this.blink > 0.5 ? 1 : 0, talk: this.talk, look: this.look }; }
  get footY() { return this.y + this.hh; }
  draw(ctx: CanvasRenderingContext2D) {
    const art = ART[this.npc]; if (!art) return;
    // contact shadow
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.beginPath(); ctx.ellipse(this.x, this.footY, 22, 4, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.translate(this.x, this.footY); art.body(ctx, this.pose()); ctx.restore();
  }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    const art = ART[this.npc]; if (!art) return;
    ctx.save(); ctx.translate(this.x, this.footY); art.glow(ctx, this.pose(), (c, x, y, r, col, a) => g.r.halo(c, x, y, r, col, a)); ctx.restore();
    if (this.prompt > 0) {
      const y = this.footY - art.height - 22 - this.prompt * 4;
      ctx.globalAlpha = this.prompt; ctx.fillStyle = '#ffffff'; ctx.font = '14px "Futura LT Pro", Futura, sans-serif'; ctx.textAlign = 'center';
      ctx.fillText('TALK', this.x, y); ctx.globalAlpha = 1;
    }
  }
  lights(g: Game) {
    const art = ART[this.npc]; if (!art) return;
    g.light({ x: this.x, y: this.footY - art.height * 0.6, r: 200 + art.height, color: art.accent, i: 0.55 + (this.talking ? 0.2 : 0) });
  }
}
