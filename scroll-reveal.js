document.addEventListener('DOMContentLoaded', () => {
  const targets = document.querySelectorAll('[data-reveal], [data-reveal-group]');
  if (!targets.length) return;

  // Hard safety net: no matter what, nothing stays invisible longer than this.
  // Prevents any section from getting permanently stuck at opacity:0 if the
  // observer never fires (short pages, edge-case viewport sizes, etc.)
  const forceRevealAll = () => {
    targets.forEach((el) => el.classList.add('in-view'));
  };

  if (!('IntersectionObserver' in window)) {
    forceRevealAll();
    return;
  }

  const safetyTimeout = setTimeout(forceRevealAll, 1500);

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0, rootMargin: '0px' }
  );

  targets.forEach((el) => observer.observe(el));

  // If every target has already revealed itself quickly, no need to wait
  // for the full timeout — but leaving it running is harmless either way.
  window.addEventListener('load', () => {
    // Re-check once more after full page load (images/fonts can shift layout)
    targets.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight && rect.bottom > 0) {
        el.classList.add('in-view');
      }
    });
  });
});