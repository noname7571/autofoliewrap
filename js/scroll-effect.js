/**
 * ============================================================
 * autofoliewrap.cz — scroll-driven frame sequence
 * ============================================================
 * A 60-frame WebP sequence of a real job in the workshop,
 * scrubbed by scroll position on a <canvas>.
 *
 * Design rules this file follows:
 *  · Never block the page. Frames load only once the section
 *    is close to the viewport, in small batches, and the first
 *    frame is painted the moment it arrives.
 *  · Always degrade. Not-yet-loaded frames fall back to the
 *    nearest one that is, so scrubbing is never blank.
 *  · Respect the visitor. Reduced motion or a metered/slow
 *    connection gets a single still frame instead.
 * ============================================================
 */
const CONFIG = {
    totalFrames: 60,
    urlPrefix: 'assets/frames/car_',
    ext: 'webp',
    concurrency: 6,
    stillFrame: 30,
};
const canvas = document.getElementById('storyCanvas');
const ctx = canvas?.getContext('2d', { alpha: false }) ?? null;
const track = document.getElementById('storyTrack');
const stage = canvas?.parentElement ?? null;
const pctLabel = document.getElementById('storyPct');
const frames = new Array(CONFIG.totalFrames);
let currentFrame = 0;
let loadedCount = 0;
const frameUrl = (i) => `${CONFIG.urlPrefix}${i + 1}.${CONFIG.ext}`;
/** True when the visitor has asked us not to move things, or is on a metered/slow link. */
function shouldSkipAnimation() {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches)
        return true;
    const conn = navigator.connection;
    if (!conn)
        return false;
    return Boolean(conn.saveData) || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g';
}
/* ─── Loading ─────────────────────────────────────────────── */
function loadFrame(index) {
    return new Promise((resolve) => {
        const img = new Image();
        img.decoding = 'async';
        img.onload = () => {
            frames[index] = img;
            loadedCount++;
            // Paint the very first frame we get so the section is never empty.
            if (index === 0 || loadedCount === 1)
                draw(currentFrame);
            resolve();
        };
        // A missing frame is not fatal — scrubbing falls back to its neighbour.
        img.onerror = () => resolve();
        img.src = frameUrl(index);
    });
}
/** Fetch the sequence in small batches so we never saturate the connection. */
async function loadSequence() {
    const order = Array.from({ length: CONFIG.totalFrames }, (_, i) => i);
    for (let i = 0; i < order.length; i += CONFIG.concurrency) {
        await Promise.all(order.slice(i, i + CONFIG.concurrency).map(loadFrame));
    }
}
/** Nearest frame that has actually arrived, searching outwards. */
function nearestLoaded(index) {
    if (frames[index])
        return frames[index];
    for (let d = 1; d < CONFIG.totalFrames; d++) {
        if (frames[index - d])
            return frames[index - d];
        if (frames[index + d])
            return frames[index + d];
    }
    return undefined;
}
/* ─── Rendering ───────────────────────────────────────────── */
function resize() {
    if (!canvas || !ctx || !stage)
        return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const { width, height } = stage.getBoundingClientRect();
    const w = Math.round(width * dpr);
    const h = Math.round(height * dpr);
    if (canvas.width === w && canvas.height === h)
        return;
    canvas.width = w;
    canvas.height = h;
    draw(currentFrame);
}
/** Paint one frame, cropped like `object-fit: cover`. */
function draw(index) {
    if (!canvas || !ctx)
        return;
    const img = nearestLoaded(index);
    if (!img)
        return;
    const cw = canvas.width;
    const ch = canvas.height;
    const scale = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    ctx.drawImage(img, (cw - dw) / 2, (ch - dh) / 2, dw, dh);
}
function setProgressLabel(progress) {
    if (pctLabel)
        pctLabel.textContent = `${Math.round(progress * 100)} %`;
}
/* ─── Scroll binding ──────────────────────────────────────── */
function bindScroll() {
    if (!track || !stage)
        return;
    let ticking = false;
    const update = () => {
        ticking = false;
        const rect = track.getBoundingClientRect();
        const distance = rect.height - stage.getBoundingClientRect().height;
        if (distance <= 0)
            return;
        const progress = Math.min(1, Math.max(0, -rect.top / distance));
        const frame = Math.round(progress * (CONFIG.totalFrames - 1));
        setProgressLabel(progress);
        if (frame !== currentFrame) {
            currentFrame = frame;
            draw(frame);
        }
    };
    window.addEventListener('scroll', () => {
        if (ticking)
            return;
        ticking = true;
        requestAnimationFrame(update);
    }, { passive: true });
    update();
}
/* ─── Boot ────────────────────────────────────────────────── */
function start() {
    resize();
    let resizeTimer;
    window.addEventListener('resize', () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(resize, 150);
    });
    if (shouldSkipAnimation()) {
        // One still frame, no scroll listener, no sequence download.
        void loadFrame(CONFIG.stillFrame).then(() => {
            currentFrame = CONFIG.stillFrame;
            draw(CONFIG.stillFrame);
        });
        setProgressLabel(0);
        return;
    }
    void loadSequence();
    bindScroll();
}
if (canvas && ctx && track && stage) {
    // Nothing downloads until the section is genuinely on its way into view.
    const warmUp = new IntersectionObserver((entries) => {
        if (!entries.some((entry) => entry.isIntersecting))
            return;
        warmUp.disconnect();
        start();
    }, { rootMargin: '200% 0px' });
    warmUp.observe(track);
}
export {};
//# sourceMappingURL=scroll-effect.js.map