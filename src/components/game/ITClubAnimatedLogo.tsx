import React, { useEffect, useRef } from 'react';

const CIRCUIT_PATHS = [
  { pts: [[0.098,0.268],[0.14,0.267],[0.183,0.265],[0.222,0.265],[0.263,0.266],[0.308,0.269]], col: '#00bbff', spd: 0.0055 },
  { pts: [[0.188,0.265],[0.188,0.315],[0.188,0.373],[0.189,0.432],[0.189,0.49],[0.19,0.548],[0.191,0.62]], col: '#00ddff', spd: 0.0045 },
  { pts: [[0.14,0.268],[0.12,0.296],[0.111,0.332],[0.111,0.375],[0.11,0.42],[0.11,0.465]], col: '#0099ff', spd: 0.006 },
  { pts: [[0.54,0.118],[0.54,0.178],[0.54,0.242],[0.54,0.308],[0.541,0.378],[0.541,0.448],[0.542,0.516],[0.543,0.585],[0.544,0.617]], col: '#00eeff', spd: 0.005 },
  { pts: [[0.645,0.25],[0.688,0.246],[0.73,0.243],[0.772,0.241],[0.813,0.24],[0.855,0.239],[0.9,0.239],[0.948,0.241],[0.963,0.244]], col: '#0099ff', spd: 0.0058 },
  { pts: [[0.962,0.244],[0.96,0.3],[0.958,0.36],[0.956,0.422],[0.954,0.484],[0.952,0.544],[0.95,0.6],[0.948,0.632]], col: '#00bbff', spd: 0.0052 },
  { pts: [[0.807,0.24],[0.792,0.272],[0.772,0.312],[0.758,0.358],[0.75,0.41],[0.749,0.465],[0.748,0.52]], col: '#0088ff', spd: 0.0062 },
  { pts: [[0.878,0.263],[0.875,0.306],[0.873,0.356],[0.871,0.41],[0.87,0.458]], col: '#0077ff', spd: 0.007 },
];

const NODES = [
  { x:0.098,y:0.27,r:7 },{ x:0.308,y:0.27,r:6 },{ x:0.111,y:0.338,r:5.5 },
  { x:0.111,y:0.393,r:5 },{ x:0.11,y:0.455,r:4.5 },{ x:0.191,y:0.622,r:5 },
  { x:0.54,y:0.118,r:9 },{ x:0.54,y:0.242,r:3.5 },{ x:0.541,y:0.378,r:3.5 },
  { x:0.542,y:0.516,r:3.5 },{ x:0.544,y:0.617,r:5 },{ x:0.645,y:0.25,r:6 },
  { x:0.963,y:0.244,r:7 },{ x:0.948,y:0.632,r:6 },{ x:0.67,y:0.278,r:4.5 },
  { x:0.681,y:0.324,r:4 },{ x:0.688,y:0.373,r:4 },{ x:0.878,y:0.266,r:4.5 },
  { x:0.875,y:0.31,r:4 },{ x:0.872,y:0.358,r:4 },{ x:0.87,y:0.415,r:4 },
];

const SPAWN_ZONES = [
  () => ({ x: Math.random() * 0.06, y: Math.random() }),
  () => ({ x: Math.random() * 0.06, y: Math.random() }),
  () => ({ x: 0.97 + Math.random() * 0.03, y: Math.random() }),
  () => ({ x: Math.random(), y: Math.random() * 0.17 }),
  () => ({ x: Math.random(), y: 0.85 + Math.random() * 0.15 }),
  () => ({ x: 0.32 + Math.random() * 0.2, y: 0.2 + Math.random() * 0.48 }),
  () => ({ x: 0.57 + Math.random() * 0.065, y: 0.2 + Math.random() * 0.48 }),
  () => ({ x: Math.random(), y: Math.random() }),
];

interface Props {
  width?: number;
  height?: number;
}

export const ITClubAnimatedLogo: React.FC<Props> = ({ width = 300, height = 200 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = width;
    canvas.height = height;
    const W = width;
    const H = height;

    const img = new Image();
    img.src = '/itclub-logo-photo.jpg';
    imgRef.current = img;

    class Particle {
      x = 0; y = 0; vx = 0; vy = 0; sz = 0; hue = 0; maxL = 0; life = 0;
      constructor() { this.reset(true); }
      reset(init: boolean) {
        const zone = SPAWN_ZONES[Math.floor(Math.random() * SPAWN_ZONES.length)];
        const pos = zone();
        this.x = pos.x; this.y = pos.y;
        this.vx = (Math.random() - 0.5) * 0.00028;
        this.vy = (Math.random() - 0.5) * 0.00028 - 0.00006;
        this.sz = Math.random() * 2.2 + 0.6;
        this.hue = 195 + Math.random() * 40;
        this.maxL = 300 + Math.random() * 500;
        this.life = init ? Math.random() * this.maxL : 0;
      }
      update() {
        this.x += this.vx; this.y += this.vy; this.life++;
        if (this.life > this.maxL || this.x < -0.02 || this.x > 1.02 || this.y < -0.02 || this.y > 1.02)
          this.reset(false);
      }
      get alpha() {
        const p = this.life / this.maxL;
        if (p < 0.15) return (p / 0.15) * 0.75;
        if (p > 0.8) return ((1 - p) / 0.2) * 0.75;
        return 0.75;
      }
      draw() {
        ctx!.save();
        ctx!.globalAlpha = this.alpha;
        ctx!.shadowBlur = 10;
        ctx!.shadowColor = `hsl(${this.hue},100%,65%)`;
        ctx!.fillStyle = `hsl(${this.hue},100%,72%)`;
        ctx!.beginPath();
        ctx!.arc(this.x * W, this.y * H, this.sz, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();
      }
    }

    class CircuitPulse {
      pts: number[][]; col: string; spd: number; t: number; sz: number; trail = 6;
      constructor(path: typeof CIRCUIT_PATHS[0]) {
        this.pts = path.pts;
        this.col = path.col;
        this.spd = path.spd * (0.85 + Math.random() * 0.3);
        this.t = Math.random();
        this.sz = 2.5 + Math.random() * 1.5;
      }
      posAt(t: number) {
        t = ((t % 1) + 1) % 1;
        const segs = this.pts.length - 1;
        const raw = t * segs;
        const i = Math.min(Math.floor(raw), segs - 1);
        const f = raw - i;
        const a = this.pts[i], b = this.pts[Math.min(i + 1, segs)];
        return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      }
      update() { this.t = (this.t + this.spd / this.pts.length) % 1; }
      draw() {
        const step = this.spd / this.pts.length;
        for (let k = 0; k < this.trail; k++) {
          const [px, py] = this.posAt(this.t - step * k * 1.4);
          const a = 1 - k / this.trail;
          const sz = this.sz * (0.5 + 0.5 * a);
          ctx!.save();
          ctx!.globalAlpha = a * 0.85;
          ctx!.shadowBlur = 12 * a;
          ctx!.shadowColor = this.col;
          ctx!.fillStyle = k === 0 ? '#ffffff' : this.col;
          ctx!.beginPath();
          ctx!.arc(px * W, py * H, sz, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.restore();
        }
      }
    }

    class Spark {
      ox = 0; oy = 0; x = 0; y = 0; vx = 0; vy = 0; maxL = 0; life = 0; hue = 0; sz = 0;
      constructor() { this.reset(true); }
      reset(init: boolean) {
        const n = NODES[Math.floor(Math.random() * NODES.length)];
        this.ox = n.x + (Math.random() - 0.5) * 0.012;
        this.oy = n.y + (Math.random() - 0.5) * 0.012;
        this.x = this.ox; this.y = this.oy;
        this.vx = (Math.random() - 0.5) * 0.0055;
        this.vy = (Math.random() - 0.5) * 0.0055;
        this.maxL = 18 + Math.random() * 28;
        this.life = init ? Math.random() * this.maxL : 0;
        this.hue = 190 + Math.random() * 50;
        this.sz = 1.5 + Math.random() * 2;
      }
      update() {
        this.x += this.vx; this.y += this.vy;
        this.vx *= 0.92; this.vy *= 0.92;
        this.life++;
        if (this.life > this.maxL) this.reset(false);
      }
      draw() {
        const a = (1 - this.life / this.maxL) * 0.9;
        ctx!.save();
        ctx!.globalAlpha = a;
        ctx!.shadowBlur = 18;
        ctx!.shadowColor = `hsl(${this.hue},100%,70%)`;
        ctx!.fillStyle = `hsl(${this.hue},100%,88%)`;
        ctx!.beginPath();
        ctx!.arc(this.x * W, this.y * H, this.sz * (1 - (this.life / this.maxL) * 0.5), 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();
      }
    }

    const nodePhases = NODES.map((_, i) => i * 0.55);

    function drawNodeRings(timeS: number) {
      NODES.forEach((n, i) => {
        const phase = (timeS * 0.6 + nodePhases[i]) % 2;
        const alpha = Math.sin(phase * Math.PI) * 0.45;
        if (alpha <= 0) return;
        const r = n.r * (W / 960) * (1 + Math.sin(phase * Math.PI) * 0.6);
        ctx!.save();
        ctx!.globalAlpha = alpha;
        ctx!.strokeStyle = 'rgba(0,170,255,0.90)';
        ctx!.lineWidth = 1.2;
        ctx!.shadowBlur = 12;
        ctx!.shadowColor = '#0099ff';
        ctx!.beginPath();
        ctx!.arc(n.x * W, n.y * H, r, 0, Math.PI * 2);
        ctx!.stroke();
        ctx!.restore();
      });
    }

    function drawScanLine(timeS: number) {
      const period = 8.0;
      const t = (timeS % period) / period;
      const sy = t * H;
      let a = 1;
      if (t < 0.05) a = t / 0.05;
      if (t > 0.92) a = (1 - t) / 0.08;
      const g = ctx!.createLinearGradient(0, sy - 28, 0, sy + 28);
      g.addColorStop(0, 'rgba(0,160,255,0)');
      g.addColorStop(0.38, `rgba(0,175,255,${0.1 * a})`);
      g.addColorStop(0.5, `rgba(0,200,255,${0.22 * a})`);
      g.addColorStop(0.62, `rgba(0,175,255,${0.1 * a})`);
      g.addColorStop(1, 'rgba(0,160,255,0)');
      ctx!.fillStyle = g;
      ctx!.fillRect(0, sy - 28, W, 56);
      ctx!.save();
      ctx!.globalAlpha = 0.3 * a;
      ctx!.strokeStyle = 'rgba(0,210,255,1)';
      ctx!.lineWidth = 1;
      ctx!.shadowBlur = 6;
      ctx!.shadowColor = '#00ccff';
      ctx!.beginPath();
      ctx!.moveTo(0, sy);
      ctx!.lineTo(W, sy);
      ctx!.stroke();
      ctx!.restore();
    }

    function drawAmbientGlow(timeS: number) {
      const pulse = 0.5 + 0.5 * Math.sin(timeS * ((Math.PI * 2) / 4));
      const cx = W * 0.5, cy = H * 0.4;
      const r = Math.min(W, H) * 0.58;
      const g = ctx!.createRadialGradient(cx, cy, r * 0.2, cx, cy, r);
      g.addColorStop(0, 'rgba(0,120,255,0)');
      g.addColorStop(0.75, 'rgba(0,100,255,0)');
      g.addColorStop(1, `rgba(0,130,255,${0.04 + 0.04 * pulse})`);
      ctx!.fillStyle = g;
      ctx!.fillRect(0, 0, W, H);
    }

    function drawLogoPulse(timeS: number) {
      const pulse = 0.5 + 0.5 * Math.sin(timeS * (Math.PI / 2));
      const alpha = 0.22 + 0.38 * pulse;
      const blurPx = 14 + 18 * pulse;
      ctx!.save();
      ctx!.globalAlpha = alpha;
      ctx!.shadowBlur = blurPx;
      ctx!.shadowColor = `rgba(0,${140 + Math.round(35 * pulse)},255,1)`;
      if (img.complete && img.naturalWidth) {
        ctx!.drawImage(img, 0, 0, W, H);
      }
      ctx!.restore();
    }

    const particles = Array.from({ length: 65 }, () => new Particle());
    const pulses = CIRCUIT_PATHS.flatMap(path => {
      const count = Math.ceil(path.pts.length / 3.5);
      return Array.from({ length: count }, (_, i) => {
        const p = new CircuitPulse(path);
        p.t = i / count;
        return p;
      });
    });
    const sparks = Array.from({ length: 18 }, () => new Spark());

    let startTS: number | null = null;

    function animate(ts: number) {
      if (!startTS) startTS = ts;
      const timeS = (ts - startTS) / 1000;

      ctx!.clearRect(0, 0, W, H);

      if (img.complete && img.naturalWidth) {
        ctx!.drawImage(img, 0, 0, W, H);
      }

      drawAmbientGlow(timeS);
      drawLogoPulse(timeS);
      drawScanLine(timeS);
      drawNodeRings(timeS);
      particles.forEach(p => { p.update(); p.draw(); });
      pulses.forEach(p => { p.update(); p.draw(); });
      sparks.forEach(s => { s.update(); s.draw(); });

      rafRef.current = requestAnimationFrame(animate);
    }

    function start() {
      rafRef.current = requestAnimationFrame(animate);
    }

    if (img.complete && img.naturalWidth) {
      start();
    } else {
      img.onload = start;
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [width, height]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ display: 'block', background: 'transparent' }}
    />
  );
};
