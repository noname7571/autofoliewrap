/**
 * ============================================================
 * autofoliewrap.cz — site interactivity
 * ============================================================
 * Every module is independently guarded: if its markup is
 * missing the module bails out instead of throwing, so one
 * missing section can never take the rest of the page down.
 * ============================================================
 */

/**
 * Where the contact form POSTs. Leave empty and the form falls back to
 * opening the visitor's mail client with everything pre-filled — that way
 * a poptávka always reaches the business, even without a backend.
 */
const FORM_ENDPOINT = '';
const CONTACT_EMAIL = 'info@autofoliewrap.cz';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const czk = new Intl.NumberFormat('cs-CZ');

const $ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T | null =>
  root.querySelector<T>(sel);
const $$ = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document): T[] =>
  Array.from(root.querySelectorAll<T>(sel));

/** Visible label of a chip, minus its icon and price badge. */
function chipLabel(input: HTMLInputElement): string {
  const span = input.parentElement?.querySelector('span');
  if (!span) return input.value;
  const clone = span.cloneNode(true) as HTMLElement;
  clone.querySelectorAll('svg, b').forEach((n) => n.remove());
  return clone.textContent!.trim();
}

/* ─── Header, active nav link, back-to-top ─────────────────── */

function initScrollChrome(): void {
  const header = $('#header');
  const toTop = $<HTMLButtonElement>('#toTop');
  let ticking = false;

  const update = (): void => {
    ticking = false;
    const y = window.scrollY;
    header?.classList.toggle('site-header--solid', y > 24);
    toTop?.classList.toggle('is-visible', y > 600);
  };

  window.addEventListener(
    'scroll',
    () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    },
    { passive: true },
  );
  update();

  toTop?.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  });

  // Highlight the nav link of the section currently in view.
  const links = $$<HTMLAnchorElement>('.nav__link');
  const sections = links
    .map((link) => document.querySelector<HTMLElement>(link.getAttribute('href') || ''))
    .filter((el): el is HTMLElement => el !== null);

  if (!sections.length) return;

  const spy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const id = `#${entry.target.id}`;
        links.forEach((link) => {
          if (link.getAttribute('href') === id) link.setAttribute('aria-current', 'true');
          else link.removeAttribute('aria-current');
        });
      }
    },
    { rootMargin: '-45% 0px -50% 0px' },
  );

  sections.forEach((section) => spy.observe(section));
}

/* ─── Mobile navigation ───────────────────────────────────── */

function initNav(): void {
  const burger = $<HTMLButtonElement>('#burger');
  const nav = $('#nav');
  const scrim = $('#navScrim');
  if (!burger || !nav) return;

  const outside = [$('#obsah'), $('.site-footer'), $('.actionbar'), $('#toTop'), $('#cookie')]
    .filter((el): el is HTMLElement => el !== null);

  const setOpen = (open: boolean): void => {
    burger.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
    document.body.style.overflow = open ? 'hidden' : '';
    outside.forEach((el) => el.toggleAttribute('inert', open));
    if (scrim) scrim.hidden = !open;
    if (open) $<HTMLAnchorElement>('.nav__link', nav)?.focus();
  };

  const isOpen = (): boolean => burger.getAttribute('aria-expanded') === 'true';

  burger.addEventListener('click', () => setOpen(!isOpen()));
  scrim?.addEventListener('click', () => {
    setOpen(false);
    burger.focus();
  });

  $$('a', nav).forEach((link) => {
    link.addEventListener('click', () => {
      if (isOpen()) setOpen(false);
    });
  });

  document.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Escape' && isOpen()) {
      setOpen(false);
      burger.focus();
    }
  });

  // Leaving the mobile breakpoint should never leave the page stuck in "open".
  const wide = window.matchMedia('(width > 52rem)');
  wide.addEventListener('change', (e) => {
    if (e.matches && isOpen()) setOpen(false);
  });
}

/* ─── Animated counters ───────────────────────────────────── */

function initCounters(): void {
  const counters = $$('.counter');
  if (!counters.length) return;

  const run = (el: HTMLElement): void => {
    const target = Number(el.dataset.target ?? '0');
    if (reducedMotion.matches) {
      el.textContent = czk.format(target);
      return;
    }

    const duration = 1400;
    const start = performance.now();

    const tick = (now: number): void => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = czk.format(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(tick);
    };

    el.textContent = '0';
    requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        run(entry.target as HTMLElement);
        observer.unobserve(entry.target);
      }
    },
    { threshold: 0.6 },
  );

  counters.forEach((el) => observer.observe(el));
}

/* ─── Gallery: filters + lightbox ─────────────────────────── */

function initGallery(): void {
  const grid = $('#gallery');
  const filters = $('#galleryFilters');
  const empty = $('#galleryEmpty');
  if (!grid) return;

  const items = $$('.gallery__item', grid);

  filters?.addEventListener('click', (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.filter');
    if (!btn) return;

    const filter = btn.dataset.filter ?? 'all';
    $$<HTMLButtonElement>('.filter', filters).forEach((f) => {
      const active = f === btn;
      f.classList.toggle('is-active', active);
      f.setAttribute('aria-pressed', String(active));
    });

    let shown = 0;
    items.forEach((item) => {
      const match = filter === 'all' || item.dataset.cat === filter;
      item.hidden = !match;
      if (match) shown++;
    });

    if (empty) empty.hidden = shown > 0;
  });

  // ── Lightbox ──
  const dialog = $<HTMLDialogElement>('#lightbox');
  const img = $<HTMLImageElement>('#lightboxImg');
  const caption = $('#lightboxCaption');
  if (!dialog || !img || !caption) return;

  let queue: HTMLButtonElement[] = [];
  let index = 0;

  const show = (i: number): void => {
    if (!queue.length) return;
    index = (i + queue.length) % queue.length;
    const btn = queue[index];
    const thumb = btn.querySelector('img');
    img.src = btn.dataset.full ?? thumb?.src ?? '';
    img.alt = thumb?.alt ?? '';
    caption.textContent = btn.dataset.caption ?? '';
    const multiple = queue.length > 1;
    $('#lightboxPrev')!.hidden = !multiple;
    $('#lightboxNext')!.hidden = !multiple;
  };

  grid.addEventListener('click', (e: MouseEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('.gallery__btn');
    if (!btn) return;
    // Only browse what the visitor can currently see.
    queue = $$<HTMLButtonElement>('.gallery__item:not([hidden]) .gallery__btn', grid);
    show(queue.indexOf(btn));
    dialog.showModal();
  });

  $('#lightboxClose')?.addEventListener('click', () => dialog.close());
  $('#lightboxPrev')?.addEventListener('click', () => show(index - 1));
  $('#lightboxNext')?.addEventListener('click', () => show(index + 1));

  dialog.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'ArrowRight') show(index + 1);
    if (e.key === 'ArrowLeft') show(index - 1);
  });

  // Light dismiss for browsers without dialog[closedby].
  if (!('closedBy' in dialog)) {
    dialog.addEventListener('click', (e: MouseEvent) => {
      if (e.target === dialog) dialog.close();
    });
  }

  dialog.addEventListener('close', () => {
    img.removeAttribute('src');
  });
}

/* ─── Finish explorer (tabs) ──────────────────────────────── */

function initFinishTabs(): void {
  const list = $('.finish__picker');
  if (!list) return;

  const tabs = $$<HTMLButtonElement>('.finish__tab', list);
  if (!tabs.length) return;

  const select = (tab: HTMLButtonElement, focus = true): void => {
    tabs.forEach((t) => {
      const active = t === tab;
      t.classList.toggle('is-active', active);
      t.setAttribute('aria-selected', String(active));
      t.tabIndex = active ? 0 : -1;

      const panel = document.getElementById(t.getAttribute('aria-controls') ?? '');
      if (panel) panel.hidden = !active;
    });
    if (focus) tab.focus();
  };

  list.addEventListener('click', (e: MouseEvent) => {
    const tab = (e.target as HTMLElement).closest<HTMLButtonElement>('.finish__tab');
    if (tab) select(tab, false);
  });

  list.addEventListener('keydown', (e: KeyboardEvent) => {
    const current = tabs.indexOf(document.activeElement as HTMLButtonElement);
    if (current < 0) return;

    const moves: Record<string, number> = {
      ArrowRight: current + 1,
      ArrowLeft: current - 1,
      Home: 0,
      End: tabs.length - 1,
    };

    const next = moves[e.key];
    if (next === undefined) return;
    e.preventDefault();
    select(tabs[(next + tabs.length) % tabs.length]);
  });
}

/* ─── Testimonials carousel ───────────────────────────────── */

function initQuotes(): void {
  const track = $<HTMLUListElement>('#quotesTrack');
  const dots = $('#quoteDots');
  if (!track || !dots) return;

  const slides = $$<HTMLLIElement>('.quote', track);
  if (slides.length < 2) return;

  let current = 0;

  const goTo = (i: number, smooth = true): void => {
    current = (i + slides.length) % slides.length;
    track.scrollTo({
      left: slides[current].offsetLeft - track.offsetLeft,
      behavior: smooth && !reducedMotion.matches ? 'smooth' : 'auto',
    });
  };

  slides.forEach((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'quotes__dot';
    dot.innerHTML = `<span class="visually-hidden">Reference ${i + 1}</span>`;
    dot.addEventListener('click', () => goTo(i));
    dots.append(dot);
  });

  const dotEls = $$<HTMLButtonElement>('.quotes__dot', dots);

  // The scroller itself is the source of truth — dots follow it,
  // so swiping and button presses can never disagree.
  const spy = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        current = slides.indexOf(entry.target as HTMLLIElement);
        dotEls.forEach((dot, i) => {
          dot.classList.toggle('is-active', i === current);
          dot.setAttribute('aria-current', String(i === current));
        });
      }
    },
    { root: track, threshold: 0.6 },
  );

  slides.forEach((slide) => spy.observe(slide));

  $('#quotePrev')?.addEventListener('click', () => goTo(current - 1));
  $('#quoteNext')?.addEventListener('click', () => goTo(current + 1));

  // Autoplay — off for reduced motion, paused on any sign of engagement.
  if (reducedMotion.matches) return;

  let timer: number | undefined;
  const play = (): void => {
    stop();
    timer = window.setInterval(() => {
      if (!document.hidden) goTo(current + 1);
    }, 6000);
  };
  const stop = (): void => window.clearInterval(timer);

  const container = $('#quotes');
  container?.addEventListener('pointerenter', stop);
  container?.addEventListener('pointerleave', play);
  container?.addEventListener('focusin', stop);
  container?.addEventListener('focusout', play);
  track.addEventListener('pointerdown', stop, { passive: true });
  play();
}

/* ─── Price calculator ────────────────────────────────────── */

interface CalcState {
  service: string;
  size: string;
  extras: string[];
}

function initCalculator(): void {
  const form = $<HTMLFormElement>('#calcForm');
  if (!form) return;

  const BASE: Record<string, number> = {
    tint: 3500,
    wrap: 18000,
    ppfFront: 8000,
    ppfFull: 45000,
    ad: 4500,
  };
  const SIZE: Record<string, number> = { small: 0.85, medium: 1, large: 1.25, van: 1.5 };
  const EXTRA: Record<string, number> = { lights: 1500, roof: 3500, details: 2500, removal: 3000 };
  const TIME: Record<string, string> = {
    tint: '1 den',
    wrap: '3–5 pracovních dnů',
    ppfFront: '1–2 dny',
    ppfFull: '5–7 pracovních dnů',
    ad: '1–2 dny',
  };

  const out = {
    low: $('#calcLow'),
    high: $('#calcHigh'),
    service: $('#sumService'),
    size: $('#sumSize'),
    extras: $('#sumExtras'),
    time: $('#sumTime'),
  };

  const round100 = (n: number): number => Math.round(n / 100) * 100;

  const read = (): CalcState => {
    const data = new FormData(form);
    return {
      service: String(data.get('service') ?? 'tint'),
      size: String(data.get('size') ?? 'medium'),
      extras: data.getAll('extra').map(String),
    };
  };

  const update = (): void => {
    const state = read();
    const extrasTotal = state.extras.reduce((sum, key) => sum + (EXTRA[key] ?? 0), 0);
    const low = round100((BASE[state.service] ?? 0) * (SIZE[state.size] ?? 1) + extrasTotal);
    const high = round100(low * 1.18);

    if (out.low) out.low.textContent = czk.format(low);
    if (out.high) out.high.textContent = czk.format(high);

    const checkedService = $<HTMLInputElement>(`input[name="service"]:checked`, form);
    const checkedSize = $<HTMLInputElement>(`input[name="size"]:checked`, form);
    const checkedExtras = $$<HTMLInputElement>(`input[name="extra"]:checked`, form);

    if (out.service && checkedService) out.service.textContent = chipLabel(checkedService);
    if (out.size && checkedSize) out.size.textContent = chipLabel(checkedSize);
    if (out.extras) {
      out.extras.textContent = checkedExtras.length
        ? checkedExtras.map(chipLabel).join(', ')
        : 'žádné';
    }
    if (out.time) out.time.textContent = TIME[state.service] ?? '—';
  };

  form.addEventListener('change', update);
  update();

  // Hand the configuration over to the contact form.
  $('#calcSend')?.addEventListener('click', () => {
    const message = $<HTMLTextAreaElement>('#f-message');
    if (message) {
      message.value =
        `Dobrý den,\n\nrád bych poptal: ${out.service?.textContent}\n` +
        `Vozidlo: ${out.size?.textContent}\n` +
        `Doplňky: ${out.extras?.textContent}\n` +
        `Odhad z kalkulačky: ${out.low?.textContent} – ${out.high?.textContent} Kč\n\n` +
        `Prosím o potvrzení ceny a volného termínu. Děkuji.`;
      message.dispatchEvent(new Event('input', { bubbles: true }));
    }
    document.getElementById('kontakt')?.scrollIntoView({
      behavior: reducedMotion.matches ? 'auto' : 'smooth',
    });
    window.setTimeout(() => $<HTMLInputElement>('#f-name')?.focus(), reducedMotion.matches ? 0 : 600);
  });
}

/* ─── Contact form ────────────────────────────────────────── */

function initContactForm(): void {
  const form = $<HTMLFormElement>('#contactForm');
  const status = $('#formStatus');
  const submit = $<HTMLButtonElement>('#formSubmit');
  if (!form || !status || !submit) return;

  const messageFor = (field: HTMLInputElement | HTMLTextAreaElement): string => {
    if (field.validity.valueMissing) return 'Tohle pole prosím vyplňte.';
    if (field.validity.typeMismatch && field.type === 'email') return 'Zkontrolujte formát e-mailu.';
    return 'Zkontrolujte prosím zadanou hodnotu.';
  };

  const showError = (field: HTMLInputElement | HTMLTextAreaElement, text: string): void => {
    const slot = $(`[data-error-for="${field.id}"]`, form);
    if (slot) slot.textContent = text;
  };

  // Validate when the user leaves a field; clear the error as soon as they fix it.
  $$<HTMLInputElement | HTMLTextAreaElement>('input, textarea', form).forEach((field) => {
    field.addEventListener('blur', () => {
      if (field.value && !field.checkValidity()) showError(field, messageFor(field));
    });
    field.addEventListener('input', () => showError(field, ''));
  });

  const setStatus = (text: string, state: 'ok' | 'error' | '' = ''): void => {
    status.textContent = text;
    if (state) status.dataset.state = state;
    else delete status.dataset.state;
  };

  form.addEventListener('submit', async (e: SubmitEvent) => {
    e.preventDefault();

    // Honeypot — bots fill every field they find.
    if ($<HTMLInputElement>('#f-website', form)?.value) return;

    const fields = $$<HTMLInputElement | HTMLTextAreaElement>('input, textarea', form).filter(
      (f) => f.id !== 'f-website',
    );

    let firstInvalid: HTMLInputElement | HTMLTextAreaElement | null = null;
    fields.forEach((field) => {
      const ok = field.checkValidity();
      showError(field, ok ? '' : messageFor(field));
      if (!ok && !firstInvalid) firstInvalid = field;
    });

    if (firstInvalid) {
      setStatus('Formulář ještě není kompletní — zvýrazněná pole potřebují doplnit.', 'error');
      (firstInvalid as HTMLElement).focus();
      return;
    }

    const data = new FormData(form);
    submit.disabled = true;
    setStatus('Odesíláme…');

    if (!FORM_ENDPOINT) {
      // No backend wired up yet: hand the poptávka to the visitor's mail client
      // so it still reaches the business instead of disappearing.
      const body = [
        `Jméno: ${data.get('name')}`,
        `E-mail: ${data.get('email')}`,
        `Telefon: ${data.get('phone') || '—'}`,
        `Vozidlo: ${data.get('car') || '—'}`,
        '',
        String(data.get('message') ?? ''),
      ].join('\n');

      window.location.href =
        `mailto:${CONTACT_EMAIL}` +
        `?subject=${encodeURIComponent('Poptávka z webu — ' + data.get('name'))}` +
        `&body=${encodeURIComponent(body)}`;

      setStatus(`Otevřeli jsme váš e-mailový klient. Nefunguje? Napište nám na ${CONTACT_EMAIL}.`, 'ok');
      submit.disabled = false;
      return;
    }

    try {
      const res = await fetch(FORM_ENDPOINT, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) throw new Error(String(res.status));
      form.reset();
      setStatus('Děkujeme! Ozveme se vám zpravidla do několika hodin v pracovní době.', 'ok');
    } catch {
      setStatus(`Odeslání se nepovedlo. Zavolejte nám prosím nebo napište na ${CONTACT_EMAIL}.`, 'error');
    } finally {
      submit.disabled = false;
    }
  });
}

/* ─── Cookie notice ───────────────────────────────────────── */

function initCookieNotice(): void {
  const box = $('#cookie');
  if (!box) return;

  let stored: string | null = null;
  try {
    stored = localStorage.getItem('cookieConsent');
  } catch {
    // Private mode / storage blocked — just don't nag.
    return;
  }
  if (stored) return;

  const decide = (value: string): void => {
    try {
      localStorage.setItem('cookieConsent', value);
    } catch {
      /* nothing we can do, and nothing worth breaking the page over */
    }
    box.hidden = true;
  };

  window.setTimeout(() => {
    box.hidden = false;
  }, 1200);

  $('#cookieAccept')?.addEventListener('click', () => decide('accepted'));
  $('#cookieDecline')?.addEventListener('click', () => decide('necessary'));
}

/* ─── Boot ────────────────────────────────────────────────── */

function init(): void {
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  initScrollChrome();
  initNav();
  initCounters();
  initGallery();
  initFinishTabs();
  initQuotes();
  initCalculator();
  initContactForm();
  initCookieNotice();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init, { once: true });
} else {
  init();
}

export {};
