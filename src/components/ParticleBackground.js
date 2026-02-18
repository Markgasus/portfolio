import React, { useEffect } from 'react';

const ParticleBackground = () => {
  useEffect(() => {
    const src = 'https://cdn.jsdelivr.net/npm/particles.js@2.0.0/particles.min.js';

    // compute particle count by viewport area with clamps
    function computeCount() {
      const baseline = 1920 * 1080; // reference area
      const baseCount = 180;
      const w = Math.max(window.innerWidth || 800, 300);
      const h = Math.max(window.innerHeight || 600, 300);
      const area = w * h;
      const calc = Math.round((baseCount * area) / baseline);
      return Math.min(300, Math.max(40, calc));
    }

    function initParticles(overrideCount) {
      try {
        if (!window.particlesJS) return;
        const count = typeof overrideCount === 'number' ? overrideCount : computeCount();
        window.particlesJS('particles-js', {
          particles: {
            number: { value: count, density: { enable: false } },
            color: { value: '#ffffff' },
            shape: { type: 'circle' },
            opacity: { value: 0.85, random: true },
            size: { value: 2.0, random: true },
            line_linked: { enable: false },
            move: {
              enable: true,
              speed: 0.3,
              direction: 'none',
              random: true,
              straight: false,
              out_mode: 'out',
              bounce: false,
            },
          },
          interactivity: {
            detect_on: 'canvas',
            events: {
              onhover: { enable: false },
              onclick: { enable: false },
              resize: true,
            },
            modes: {},
          },
          retina_detect: true,
        });
      } catch (e) {
        // initialization failed
      }
    }

    if (!document.getElementById('particles-js-script')) {
      const script = document.createElement('script');
      script.src = src;
      script.id = 'particles-js-script';
      script.async = true;
      script.onload = () => initParticles();
      document.body.appendChild(script);
    } else {
      initParticles();
    }

    // Debounced resize handler: reinit particles with new count
    let resizeTimer = null;
    function handleResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        try {
          const el = document.getElementById('particles-js');
          if (el) el.innerHTML = '';
          if (window.pJSDom && Array.isArray(window.pJSDom)) window.pJSDom = [];
          initParticles();
        } catch (err) {
          // ignore
        }
      }, 250);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
      const el = document.getElementById('particles-js');
      if (el) el.innerHTML = '';
      if (window.pJSDom && Array.isArray(window.pJSDom)) window.pJSDom = [];
    };
  }, []);

  return <div id="particles-js" />;
};

export default ParticleBackground;
