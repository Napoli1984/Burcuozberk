// On-screen stick and buttons for phones and tablets. They write into Input.virtual.
export function bindTouch(ui, inp) {
  const root = ui.root;
  const zone = root.querySelector('#stick-zone');
  const stick = root.querySelector('#stick');
  const knob = root.querySelector('#knob');
  const R = 54;
  let id = null, bx = 0, by = 0;

  const mark = () => { inp.lastDevice = 'touch'; ui.setTouch(true); };

  const place = () => {
    const r = zone.getBoundingClientRect();
    stick.style.left = (bx - r.left) + 'px';
    stick.style.top = (by - r.top) + 'px';
  };

  const move = (e) => {
    let dx = e.clientX - bx, dy = e.clientY - by;
    const d = Math.hypot(dx, dy);
    if (d > R) {
      // The base follows a finger that slides far away, so the stick never gets stuck at the edge.
      const k = (d - R) / d;
      bx += dx * k; by += dy * k;
      dx = e.clientX - bx; dy = e.clientY - by;
      place();
    }
    inp.virtual.axisX = Math.max(-1, Math.min(1, dx / R));
    inp.virtual.axisY = Math.max(-1, Math.min(1, dy / R));
    knob.style.transform = `translate(${dx}px, ${dy}px)`;
  };

  zone.addEventListener('pointerdown', (e) => {
    if (id !== null) return;
    e.preventDefault();
    id = e.pointerId;
    try { zone.setPointerCapture(id); } catch (err) { /* ignore */ }
    bx = e.clientX; by = e.clientY;
    place();
    stick.classList.add('on');
    move(e);
    mark();
  });
  zone.addEventListener('pointermove', (e) => { if (e.pointerId === id) { e.preventDefault(); move(e); } });
  const end = (e) => {
    if (e.pointerId !== id) return;
    id = null;
    inp.virtual.axisX = 0; inp.virtual.axisY = 0;
    knob.style.transform = '';
    stick.style.left = ''; stick.style.top = '';
    stick.classList.remove('on');
  };
  zone.addEventListener('pointerup', end);
  zone.addEventListener('pointercancel', end);
  zone.addEventListener('lostpointercapture', end);

  for (const btn of root.querySelectorAll('.tb')) {
    const name = btn.dataset.btn;
    const ids = new Set();
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      ids.add(e.pointerId);
      try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      inp.virtual.buttons[name] = true;
      btn.classList.add('down');
      mark();
    });
    const up = (e) => {
      ids.delete(e.pointerId);
      if (!ids.size) { inp.virtual.buttons[name] = false; btn.classList.remove('down'); }
    };
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  }
  root.addEventListener('touchstart', () => mark(), { passive: true });
}
