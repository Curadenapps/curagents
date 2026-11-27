// Contextual tips: one-time nudges when the player is near something they may not know how to handle,
// keeps falling, or seems stuck. Each tip shows once per save (flag tip-<id>), never during a fight's
// busiest moments, and names keyboard or gamepad buttons to match what the player is using.
import { TILE } from '../engine/render';
import type { GameCore } from './game';
import { keyName } from '../ui/kit';

type TipId = 'pogo' | 'airdash' | 'gap' | 'walljump' | 'crouch' | 'paste' | 'focus' | 'deepclean' | 'stuck';

export class Tips {
  g: GameCore; cool = 6; roomT = 0; hazards = 0; roomId = ''; wallT = 0; slitT = 0; crouchT = 0;
  constructor(g: GameCore) { this.g = g; }
  private k(a: Parameters<typeof keyName>[1]) { return keyName(this.g as any, a); }
  private seen(id: TipId) { return !!this.g.save.flags['tip-' + id]; }
  show(id: TipId) {
    const g = this.g; if (this.seen(id) || this.cool > 0 || g.ui.isOpen() || g.busy()) return false;
    const text: Record<TipId, string> = {
      pogo: `In the air, hold ${this.k('down')} and slash (${this.k('attack')}) to bounce off spikes and plaque.`,
      airdash: `Jump, then dash in mid-air (${this.k('dash')}) to cross wide gaps. Your dash comes back when you land or touch a wall.`,
      gap: `A clogged gap between two teeth. Walk up and press ${this.k('interact')} to clean it with an interdental brush of the size shown.`,
      walljump: `Touching a wall in the air? Jump again (${this.k('jump')}) to spring off it.`,
      crouch: `Hold ${this.k('down')} to crawl under low gaps.`,
      paste: `Shoot an interdental refill: hold ${this.k('spell')} to draw, aim with ${this.k('up')} / ${this.k('down')}, let go to fire. ${this.k('size')} changes the size.`,
      focus: `Low on enamel? Hold ${this.k('focus')} to focus and mend a shard with fluor.`,
      deepclean: `Guarded creature. Hold slash (${this.k('attack')}) to charge a Deep Clean, then let go: it cracks guards.`,
      stuck: 'Exits glow and show where they lead. Hold Up or Down for a moment to look around.',
    };
    g.save.flags['tip-' + id] = true; g.ui.toast(text[id], 7000); this.cool = 14; return true;
  }
  update(dt: number) {
    const g = this.g, p = g.player; if (g.state !== 'play' || !p || p.deadT >= 0) return;
    this.cool -= dt;
    if (g.room.id !== this.roomId) { this.roomId = g.room.id; this.roomT = 0; this.hazards = 0; }
    this.roomT += dt;
    const r = g.room, ab = g.save.abilities, tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
    // hazards: count hits from spikes and pits
    if (p.hazardT >= 0 && p.hazardT < dt * 1.5) this.hazards++;
    if (this.hazards >= 1) this.show('pogo');
    if (this.hazards >= 2) this.show('airdash');
    // spikes in view for the first time
    if (!this.seen('pogo') && this.near(tx, ty, 6, (c) => c === '^')) this.show('pogo');
    // pressed against a slit
    const ahead = r.at(Math.floor((p.x + p.facing * (p.hw + 4)) / TILE), ty);
    if ('|IH'.includes(ahead) || this.near(tx, ty, 2, (c) => '|IH'.includes(c))) { this.slitT += dt; if (this.slitT > 0.4) this.show('gap'); } else this.slitT = 0;
    // a low gap ahead: blocked at head height, open at the feet
    const fx = Math.floor((p.x + p.facing * (p.hw + 4)) / TILE), feet = Math.floor((p.y + p.hh - 4) / TILE), head = Math.floor((p.y - p.hh + 4) / TILE);
    if (p.grounded && !p.crouching && r.solid(fx, head) && !r.solid(fx, feet) && Math.abs(g.input.axisX) > 0.5) { this.crouchT += dt; if (this.crouchT > 0.5) this.show('crouch'); } else this.crouchT = 0;
    // in the air against a wall
    if (!p.grounded && (p.wallL || p.wallR)) { this.wallT += dt; if (this.wallT > 0.25) this.show('walljump'); } else this.wallT = 0;
    // resources
    if (!this.seen('paste') && g.save.playTime > 40) this.show('paste');
    if (p.hp <= 2 && p.fluor >= 33) this.show('focus');
    // a guarded creature nearby
    if (!this.seen('deepclean')) for (const e of g.entities as any[]) if (e.type === 'tartar-brute' && Math.abs(e.x - p.x) < 260 && Math.abs(e.y - p.y) < 120) { this.show('deepclean'); break; }
    // lingering in one room
    if (this.roomT > 75) this.show(this.hazards > 0 ? 'airdash' : 'stuck');
  }
  private near(tx: number, ty: number, rad: number, test: (c: string) => boolean) {
    const r = this.g.room;
    for (let y = ty - 2; y <= ty + 4; y++) for (let x = tx - rad; x <= tx + rad; x++) if (test(r.at(x, y))) return true;
    return false;
  }
}
