/* ================================================================
   VDH Portfolio — main.js
   Handles: component loading, nav scroll state, mobile menu,
            ToC active state, scroll-triggered fade-ins
   ================================================================ */

/**
 * Detect path depth relative to project root.
 * index.html lives at root (depth 0).
 * projects/olist-data-warehouse/index.html lives at depth 2.
 * Returns a prefix like '' or '../../'
 */
function getRootPrefix() {
  const path = window.location.pathname;
  // Count directories deep we are (ignore the filename itself)
  const parts = path.replace(/\/[^/]*$/, '').replace(/^\//, '').split('/').filter(Boolean);
  // On GitHub Pages the first segment is the repo name — treat it as depth 0
  // We detect project pages by looking for 'projects' in the path
  const depth = parts.filter(p => p !== '' && p !== 'vdh-projects-portfolio' && p !== 'hoangdev-vdh.github.io' && p !== 'vdh-portfolio').length;
  return depth > 0 ? '../'.repeat(depth) : './';
}

/**
 * Dynamically load an HTML component into a placeholder div.
 * @param {string} placeholderId  - id of the target <div>
 * @param {string} componentPath  - relative path from root to component file
 */
async function loadComponent(placeholderId, componentPath) {
  const el = document.getElementById(placeholderId);
  if (!el) return;

  const prefix = getRootPrefix();
  const url = prefix + componentPath;

  try {
    // Check for file protocol to provide a helpful error message
    if (window.location.protocol === 'file:') {
      throw new Error("fetch() cannot load local files using the file:// protocol due to CORS restrictions. Please use a local server like VS Code Live Server.");
    }

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} loading ${url}`);
    const html = await res.text();
    el.innerHTML = html;

    // After injecting, run any component-specific init
    if (placeholderId === 'header-placeholder') initNav();
    if (placeholderId === 'footer-placeholder') initFooter();
  } catch (err) {
    console.warn('[VDH] Component load failed:', err.message);
  }
}

/* ── Navigation ─────────────────────────────────────────────── */
function initNav() {
  const nav = document.querySelector('.site-nav');
  const hamburger = document.querySelector('.nav-hamburger');
  const navLinks = document.querySelector('.nav-links');

  if (!nav) return;

  // Fix relative links for sub-pages so they always point back to the root level
  const prefix = getRootPrefix();
  
  // Adjust nav logo link
  const logoLink = nav.querySelector('.nav-logo');
  if (logoLink && logoLink.getAttribute('href')?.startsWith('./')) {
    logoLink.setAttribute('href', logoLink.getAttribute('href').replace('./', prefix));
  }
  
  // Adjust other nav links
  if (navLinks) {
    navLinks.querySelectorAll('a').forEach(a => {
      const href = a.getAttribute('href');
      if (href && href.startsWith('./')) {
        a.setAttribute('href', href.replace('./', prefix));
      }
    });
  }

  // Scroll shadow
  const onScroll = () => {
    nav.classList.toggle('scrolled', window.scrollY > 10);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile toggle
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      const open = hamburger.classList.toggle('open');
      navLinks.classList.toggle('open', open);
      hamburger.setAttribute('aria-expanded', open);
    });

    // Close on link click
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
      });
    });
  }

  // Mark active link based on current path
  const currentPath = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(a => {
    const href = a.getAttribute('href') || '';
    if (href === '#') return;
    // Simple matching: if the href appears in the current path
    if (href.includes('projects') && currentPath.includes('projects')) {
      a.classList.add('active');
    } else if ((href === './' || href === '/' || href.endsWith('index.html')) && 
               !currentPath.includes('projects')) {
      // Don't auto-mark Home as active on project pages
    }
  });
}

/* ── Footer ─────────────────────────────────────────────────── */
function initFooter() {
  const currentYearEl = document.getElementById('current-year');
  if (currentYearEl) {
    currentYearEl.textContent = new Date().getFullYear();
  }
}

/* ── Table of Contents active tracking ──────────────────────── */
function initToc() {
  // Support both old .toc-list pattern and new .toc ul pattern
  const tocLinks = document.querySelectorAll('.toc-list a, .toc ul a');
  if (!tocLinks.length) return;

  // Track all headings with IDs inside article content
  const headings = Array.from(document.querySelectorAll(
    '.article-body h2[id], .article-body h3[id], .prose h2[id], .prose h3[id]'
  ));
  if (!headings.length) return;

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        tocLinks.forEach(a => a.classList.remove('active'));
        const active = document.querySelector(
          `.toc-list a[href="#${entry.target.id}"], .toc ul a[href="#${entry.target.id}"]`
        );
        if (active) active.classList.add('active');
      }
    });
  }, { rootMargin: '-80px 0px -60% 0px' });

  headings.forEach(h => observer.observe(h));
}

/* ── Scroll-triggered fade-in ────────────────────────────────── */
function initFadeIns() {
  const els = document.querySelectorAll('.fade-in');
  if (!els.length) return;

  if ('IntersectionObserver' in window) {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.classList.add('visible');
          obs.unobserve(e.target);
        }
      });
    }, { threshold: 0.12 });
    els.forEach(el => obs.observe(el));
  } else {
    // Fallback: show all
    els.forEach(el => el.classList.add('visible'));
  }
}

/* ── Smooth internal anchor scroll ──────────────────────────── */
function initSmoothScroll() {
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const target = document.querySelector(a.getAttribute('href'));
    if (!target) return;
    e.preventDefault();
    const navH = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 64;
    const top = target.getBoundingClientRect().top + window.scrollY - navH - 16;
    window.scrollTo({ top, behavior: 'smooth' });
  });
}

/* ── Bootstrap ───────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', async () => {
  // Load all components that exist on the page
  await Promise.all([
    loadComponent('header-placeholder', 'components/header.html'),
    loadComponent('footer-placeholder', 'components/footer.html'),
    loadComponent('intro-placeholder',  'components/intro.html'),
  ]);

  initFadeIns();
  initSmoothScroll();
  initToc();
});