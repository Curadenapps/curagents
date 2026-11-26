// Core world objects: rinse fountains (save points), relics (ability pickups), lore stones.
import { Actor } from './entity';
import { register } from './registry';
import { TAU, clamp } from '../engine/math';
import type { Game } from './types';
import type { Room } from './room';
import { ART, owned, ownedOrders, nextOrder, setOrder, unlockOrder } from './orders';
import { particle as PT } from '../design/tokens';
import { rewardOnce, XP } from './xp';

const near = (g: Game, x: number, y: number, rx: number, ry: number) => Math.abs(g.player.x - x) < rx && Math.abs(g.player.y - y) < ry;
const wantsInteract = (g: Game) => !g.busy() && !g.ui.isOpen() && (g.input.pressed('interact', 0.05) || g.input.pressed('up', 0.05)) && g.player.grounded;

/** A basin of rinse water. Rest here to heal, save and set your respawn point. */
export class Fountain extends Actor {
  t = 0; resting = 0; prompt = 0; rested = false;
  constructor(x: number, y: number) { super(x, y, 30, 16); this.z = 5; }
  update(g: Game, dt: number) {
    this.t += dt; const n = near(g, this.x, this.y, 40, 50);
    this.prompt = clamp(this.prompt + (n ? dt : -dt) * 4, 0, 1);
    if (this.resting > 0) this.resting -= dt;
    if (!n) this.rested = false;
    if (n && wantsInteract(g) && this.rested && ownedOrders(g).length > 1) { // rest again: change Order
      g.input.consume('interact'); g.input.consume('up');
      const id = nextOrder(g); setOrder(g, id); g.persist(); this.resting = 0.8; g.audio.sfx('rest', { pitch: 1.25 });
      g.fx.burst(g.player.x, g.player.y, { ...PT.rinseAway, n: 26, speed: [60, 240], spread: TAU }); g.fx.burst(g.player.x, g.player.y - 18, PT.cleanGlint);
      g.ui.toast(`Order: ${ART[id].name}. ${ART[id].line}`, 4200);
    } else if (n && wantsInteract(g)) {
      g.input.consume('interact'); g.input.consume('up');
      const p = g.player; p.heal(99); g.save.room = g.room.id; g.save.door = 'S'; g.save.hp = p.maxHp; g.persist();
      this.resting = 1.4; g.audio.sfx('rest');
      this.rested = true; rewardOnce(g, `rest:${g.room.def.id}`, XP.rest, this.x, this.y - 60, 'Fountain');
      const first = !owned(g, 'vanguard'); if (first) unlockOrder(g, 'vanguard', true);
      if (g.save.progress.points > 0) setTimeout(() => g.progress.open(), 650);
      else if (!first) g.ui.toast(ownedOrders(g).length > 1 ? 'Rested. Rest again to change your Order.' : 'Rested. The fountain will bring you back here.');
      g.fx.burst(this.x, this.y - 10, { n: 40, color: ['#ffffff', '#8BB8E8'], shape: 'bubble', speed: [40, 220], angle: -Math.PI / 2, spread: 1.6, size: [1.5, 5], gravity: -40, life: [0.6, 1.4], emissive: true });
    }
    if (Math.random() < dt * 6) g.fx.burst(this.x + (Math.random() - 0.5) * 34, this.y - 12, { n: 1, color: '#CCD8ED', shape: 'bubble', speed: [10, 40], angle: -Math.PI / 2, spread: 0.6, size: [1, 3], gravity: -30, life: [0.8, 1.6], emissive: true });
  }
  draw(ctx: CanvasRenderingContext2D) {
    const x = this.x, y = this.y + this.hh; // floor
    ctx.fillStyle = '#9fb0cf'; ctx.beginPath(); ctx.moveTo(x - 36, y); ctx.lineTo(x - 28, y - 26); ctx.quadraticCurveTo(x, y - 34, x + 28, y - 26); ctx.lineTo(x + 36, y); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#aebbd6'; ctx.fillRect(x - 36, y - 4, 72, 4);
    ctx.fillStyle = '#9fb0d0'; ctx.beginPath(); ctx.ellipse(x, y - 26, 26, 5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#e8eef9'; ctx.beginPath(); ctx.moveTo(x - 4, y - 30); ctx.lineTo(x - 2.5, y - 62); ctx.quadraticCurveTo(x, y - 70, x + 2.5, y - 62); ctx.lineTo(x + 4, y - 30); ctx.fill();
  }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    const x = this.x, y = this.y + this.hh, w = 1 + Math.sin(this.t * 2) * 0.05;
    g.r.halo(ctx, x, y - 30, 90 * w, '#8BB8E8', 0.45 + this.resting * 0.3);
    ctx.fillStyle = 'rgba(160,205,255,0.9)'; ctx.beginPath(); ctx.ellipse(x, y - 27, 22, 3.6, 0, 0, TAU); ctx.fill();
    g.r.halo(ctx, x, y - 66, 20, '#ffffff', 0.7);
    if (this.prompt > 0) { ctx.globalAlpha = this.prompt; ctx.fillStyle = '#ffffff'; ctx.font = '14px "Futura LT Pro", Futura, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('REST', x, y - 86); ctx.globalAlpha = 1; }
  }
  lights(g: Game) { g.light({ x: this.x, y: this.y - 20, r: 300, color: '#8BB8E8', i: 0.5 + this.resting * 0.4 }); }
}

/** An ability relic on a little plinth. Picking it up sets the ability and a flag. */
export class Relic extends Actor {
  t = 0; ability: 'dash' | 'grip' | 'rinse' | 'pulse'; title: string; text: string; flagId: string;
  constructor(x: number, y: number, ability: Relic['ability'], title: string, text: string) { super(x, y, 14, 14); this.ability = ability; this.title = title; this.text = text; this.flagId = 'relic-' + ability; this.z = 6; }
  update(g: Game, dt: number) {
    this.t += dt;
    if (g.save.abilities[this.ability]) { this.dead = true; return; }
    if (near(g, this.x, this.y, 26, 40)) {
      g.save.abilities[this.ability] = true; g.setFlag(this.flagId, true); if (this.ability === 'dash') { g.setFlag('prime-m', true); unlockOrder(g, 'ranger'); }
      rewardOnce(g, `relic:${this.ability}`, XP.relic, this.x, this.y - 40, 'Relic'); g.persist(); this.dead = true;
      g.audio.sfx('relic'); g.hitstop(0.2); g.flash([1, 1, 1], 0.6); g.shake(8, 0.4);
      g.fx.burst(this.x, this.y, { n: 60, color: ['#ffffff', '#8BB8E8', '#FCE300'], speed: [80, 520], emissive: true, size: [1, 3], life: [0.4, 1.2], shape: 'streak' });
      g.ui.areaTitle(this.title, this.text);
    }
  }
  draw(ctx: CanvasRenderingContext2D) {
    const x = this.x, y = this.y + this.hh + 18;
    ctx.fillStyle = '#c9d4ea'; ctx.beginPath(); ctx.moveTo(x - 18, y); ctx.lineTo(x - 12, y - 16); ctx.lineTo(x + 12, y - 16); ctx.lineTo(x + 18, y); ctx.fill();
  }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    const b = Math.sin(this.t * 2.4) * 5, x = this.x, y = this.y - 6 + b;
    g.r.halo(ctx, x, y, 70, '#8BB8E8', 0.6); g.r.halo(ctx, x, y, 22, '#ffffff', 0.9);
    ctx.save(); ctx.translate(x, y); ctx.rotate(this.t * 0.8); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 4; i++) { ctx.rotate(TAU / 4); ctx.beginPath(); ctx.moveTo(6, 0); ctx.lineTo(13, 0); ctx.stroke(); } ctx.restore();
  }
  lights(g: Game) { g.light({ x: this.x, y: this.y, r: 260, color: '#8BB8E8', i: 1 }); }
}

/** A carved stone with a short inscription. */
export class LoreStone extends Actor {
  text: string; prompt = 0; t = 0;
  constructor(x: number, y: number, text: string) { super(x, y, 16, 24); this.text = text; this.z = 4; }
  update(g: Game, dt: number) {
    this.t += dt; const n = near(g, this.x, this.y, 46, 50); this.prompt = clamp(this.prompt + (n ? dt : -dt) * 4, 0, 1);
    if (n && wantsInteract(g)) { g.input.consume('interact'); g.input.consume('up'); g.ui.toast(this.text, 6500); g.audio.sfx('read'); rewardOnce(g, `lore:${g.room.def.id}:${Math.round(this.x)}`, XP.lore, this.x, this.y - 44, 'Oath stone'); }
  }
  draw(ctx: CanvasRenderingContext2D) {
    const x = this.x, y = this.y + this.hh;
    ctx.fillStyle = '#4a5880'; ctx.beginPath(); ctx.moveTo(x - 16, y); ctx.lineTo(x - 14, y - 40); ctx.quadraticCurveTo(x, y - 52, x + 14, y - 40); ctx.lineTo(x + 16, y); ctx.fill();
    ctx.strokeStyle = '#6f7fa8'; ctx.lineWidth = 1.2; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(x - 8, y - 34 + i * 7); ctx.lineTo(x + 8, y - 34 + i * 7); ctx.stroke(); }
  }
  drawEmissive(ctx: CanvasRenderingContext2D, g: Game) {
    g.r.halo(ctx, this.x, this.y - 6, 30, '#8BB8E8', 0.15 + this.prompt * 0.3);
    if (this.prompt > 0) { ctx.globalAlpha = this.prompt; ctx.fillStyle = '#ffffff'; ctx.font = '14px "Futura LT Pro", Futura, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('READ', this.x, this.y - 44); ctx.globalAlpha = 1; }
  }
}

register.legend('S', (g, x, y) => new Fountain(x, y + 16 - 16));
register.object('relic', (g, o) => new Relic((o.x + 0.5) * 32, (o.y + 0.5) * 32 - 10, o.ability as Relic['ability'], String(o.title ?? ''), String(o.text ?? '')));
register.object('lore', (g, o) => new LoreStone((o.x + 0.5) * 32, (o.y + 1) * 32 - 24, String(o.text ?? '')));
export type { Room };
