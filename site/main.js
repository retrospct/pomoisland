/* global document, HTMLAnchorElement, window */

import { inject } from '@vercel/analytics'

import './styles.css'

inject()

const releaseUrl = 'https://github.com/retrospct/pomoisland/releases/latest'
const brandName = 'PomoIsland'

const image = (src, alt, className = '') =>
  `<img class="${className}" src="/assets/${src}" alt="${alt}" loading="lazy" decoding="async" />`

const appMark = (className = '') =>
  `<img class="app-mark ${className}" src="/assets/icon.png" alt="" aria-hidden="true" />`

document.querySelector('#site-root').innerHTML = `
  <header class="site-header">
    <div class="shell header-inner">
      <a class="wordmark" href="#top" aria-label="${brandName} home">
        ${appMark('wordmark-mark')}
        <span>${brandName}</span>
      </a>

      <button class="menu-toggle" type="button" aria-expanded="false" aria-controls="site-nav">
        <span class="sr-only">Toggle navigation</span>
        Menu
      </button>

      <nav class="site-nav" id="site-nav" aria-label="Primary navigation">
        <a href="#how-it-works">How it works</a>
        <a href="#settings">Make it yours</a>
        <a href="#every-display">Every display</a>
        <a class="external-link" href="https://github.com/retrospct/pomoisland/blob/main/CHANGELOG.md" target="_blank" rel="noopener noreferrer">Changelog</a>
        <a class="button button-small button-dark" href="${releaseUrl}">Download</a>
      </nav>
    </div>
  </header>

  <main id="top">
    <section class="hero shell" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="eyebrow">macOS · every display · distraction less</p>
        <h1 id="hero-title">Focus without another tab<span class="accent-dot">.</span></h1>
        <p class="hero-intro">
          ${brandName} stays at the top edge when you want it there, then pulls free into a quiet
          standalone island when you want it closer.
        </p>
        <div class="hero-actions">
          <a class="button button-primary" href="${releaseUrl}">Download for macOS</a>
          <a class="text-link" href="#how-it-works">See how it works</a>
        </div>
        <p class="micro-note">Apple Silicon · Built for your Mac</p>
      </div>

      <div class="hero-stage" aria-label="${brandName} floating on a notchless desktop">
        <div class="stage-label stage-label-top">01 / no notch required</div>
        <div class="notch-surface edge-surface">
          ${image('no-notch-example.gif', `${brandName} focus timer floating on a notchless green desktop`, 'hero-notch-image hero-demo-gif')}
          <span class="stage-caption stage-caption-left">pull it close</span>
          <span class="stage-caption stage-caption-right">23:15 / focus</span>
        </div>
        <div class="stage-footnote">Dock it or let it float. The timer stays out of the way.</div>
      </div>
    </section>

    <section class="statement-band" aria-label="Product positioning">
      <div class="shell statement-grid">
        <p class="eyebrow">A timer that stays close</p>
        <p class="statement">The useful kind of visible — present enough to keep you moving, quiet enough to leave your work alone.</p>
      </div>
    </section>

    <section class="section shell" id="how-it-works" aria-labelledby="how-title">
      <div class="section-heading">
        <p class="eyebrow">02 / how it works</p>
        <h2 id="how-title">From tucked away to fully in control.</h2>
        <p>Rest, hover, click, focus. Each state reveals only what you need.</p>
      </div>

      <div class="story-list">
        <article class="story-row story-row-feature">
          <div class="story-copy">
            <span class="story-index">01</span>
            <h3>Tucked.</h3>
            <p>Time and session progress stay at the top edge, even on a display without a hardware notch.</p>
            <p class="mono-detail">FOCUS · 03:03 · AT REST</p>
          </div>
          <div class="story-media media-pill edge-media">
            ${image('edge-purple.png', `${brandName} purple focus timer tucked into the top edge`, 'contain-image state-image-wide')}
          </div>
        </article>

        <article class="story-row story-row-reverse">
          <div class="story-copy">
            <span class="story-index">02</span>
            <h3>Hover.</h3>
            <p>Move over the island to reveal quick controls, task context, and progress without opening another window.</p>
            <p class="mono-detail">FOCUS · 05:45 · QUICK CONTROLS</p>
          </div>
          <div class="story-media media-hover">
            ${image('hover-controls-hd.png', `${brandName} purple hover view with task, progress bar, timer, pause, and skip controls`, 'contain-image hover-image')}
          </div>
        </article>

        <article class="story-row story-row-feature">
          <div class="story-copy">
            <span class="story-index">03</span>
            <h3>Expand.</h3>
            <p>Click any timer card for the full timer view: progress, pause, reset, skip, and the current task at a glance.</p>
            <p class="mono-detail">TASK + diagrams</p>
          </div>
          <div class="story-media media-expanded">
            ${image('expanded-timer.png', `Expanded ${brandName} timer card with task context and playback controls`, 'contain-image expanded-timer-image')}
          </div>
        </article>

        <article class="story-row story-row-reverse">
          <div class="story-copy">
            <span class="story-index">04</span>
            <h3>Reset.</h3>
            <p>When focus ends, the island shifts state with you. Take a short break, then start the next round with a clean edge.</p>
            <p class="mono-detail mono-clay">BREAK · 03:47 · RESET YOUR MIND</p>
          </div>
          <div class="story-media media-pill media-break edge-media">
            ${image('edge-amber.png', 'Amber PomoIsland timer approaching the end of a focus block', 'contain-image break-edge-image')}
          </div>
        </article>
      </div>
    </section>

    <section class="dark-section" id="settings" aria-labelledby="settings-title">
      <div class="shell">
        <div class="section-heading section-heading-dark">
          <p class="eyebrow">03 / your focus, your way</p>
          <h2 id="settings-title">Quiet by default. Tunable when you want it.</h2>
          <p>Choose the rhythm, accent, sounds, and notch behavior that make your desk feel like yours.</p>
        </div>

        <div class="settings-gallery">
          <figure class="settings-shot settings-shot-main">
            ${image('settings-general.png', 'PomoIsland General settings with timer preset, behavior, shortcuts, and daily goal', 'gallery-image')}
            <figcaption>General / set the rhythm</figcaption>
          </figure>
          <figure class="settings-shot settings-shot-secondary">
            ${image('settings-preferences.png', 'PomoIsland Preferences settings with timer style, colors, placement, and sound options', 'gallery-image')}
            <figcaption>Preferences / tune the feel</figcaption>
          </figure>
        </div>

        <div class="progress-rail">
          <div class="progress-copy">
            <p class="eyebrow">four ways to float</p>
            <h3>Take the island with you.</h3>
            <p>Pull the timer away from the edge, then choose the standalone layout that fits your desk.</p>
          </div>
          <div class="progress-gallery floating-layout-gallery" aria-label="PomoIsland standalone layouts">
            ${image('standalone-floating.png', `${brandName} default standalone layout`, 'progress-image floating-layout-image')}
            ${image('standalone-task.png', `${brandName} standalone task layout`, 'progress-image floating-layout-image')}
            ${image('standalone-compact.png', `${brandName} compact standalone layout`, 'progress-image floating-layout-image')}
            ${image('standalone-round.png', `${brandName} round standalone layout`, 'progress-image floating-layout-image floating-layout-round')}
          </div>
        </div>

        <div class="dark-quote">
          <span class="quote-mark">“</span>
          <p>Good focus software should help you disappear into the work — not ask you to manage the software.</p>
        </div>
      </div>
    </section>

    <section class="section shell snap-section" id="snap" aria-labelledby="snap-title">
      <div class="section-heading">
        <p class="eyebrow">04 / one block at a time</p>
        <h2 id="snap-title">Choose a task. Start the clock. Stay with it.</h2>
        <p>${brandName} pairs each Pomodoro with the task that matters now, so you can work in focused blocks, take deliberate breaks, and keep moving without losing your place.</p>
      </div>

      <div class="snap-grid snap-grid-single">
        <figure class="snap-card snap-card-large">
          <div class="snap-frame">
            ${image('expanded-tasks-full.png', `Expanded ${brandName} timer with playback controls and task list`, 'snap-image expanded-tasks-full-image')}
          </div>
          <figcaption><span>Focus</span> / keep the task, timer, and session progress together.</figcaption>
        </figure>
      </div>
    </section>

    <section class="section shell display-section" id="every-display" aria-labelledby="display-title">
      <div class="section-heading">
        <p class="eyebrow">05 / every display</p>
        <h2 id="display-title">Notch-aware where it matters.</h2>
        <p>On a MacBook with a notch, ${brandName} wraps around the camera naturally and expands downward when you need more control.</p>
      </div>

      <div class="display-grid display-grid-single">
        <figure class="display-card display-card-notched">
          <div class="display-motion-crop">
            ${image('notch-example.gif', `${brandName} wrapping and expanding around a physical MacBook notch`, 'display-image display-image-notched')}
          </div>
          <figcaption><span>Notched display</span> / wraps the camera naturally.</figcaption>
        </figure>
      </div>

      <div class="completion-note">
        <div class="completion-copy">
          <p class="eyebrow">When the block ends</p>
          <h3>Look up when it matters.</h3>
          <p>A quiet system notification closes the loop, while the menu-bar timer keeps the next block within reach.</p>
        </div>
        ${image('notification-center-transparent.png', `macOS Notification Center showing a ${brandName} break notification`, 'completion-notification')}
      </div>
    </section>

    <section class="download-section shell" aria-labelledby="download-title">
      <div class="download-mark">${appMark('download-app-mark')}</div>
      <div>
        <p class="eyebrow">06 / start a better loop</p>
        <h2 id="download-title">Make room for focus.</h2>
        <p>Download ${brandName} and keep your next session one glance away.</p>
      </div>
      <a class="button button-primary" href="${releaseUrl}">Download for macOS</a>
    </section>
  </main>

  <footer class="site-footer">
    <div class="shell footer-inner">
      <a class="wordmark footer-wordmark" href="#top">
        ${appMark('wordmark-mark')}
        <span>${brandName}</span>
      </a>
      <p>Focus timer for macOS. Built for real work.</p>
      <div class="footer-links">
        <a href="${releaseUrl}">Download</a>
        <a href="https://github.com/retrospct/pomoisland">GitHub</a>
        <a class="external-link" href="https://github.com/retrospct/pomoisland/issues">Support</a>
        <a class="external-link" href="https://x.com/retrospct" target="_blank" rel="noopener noreferrer">@retrospct</a>
      </div>
    </div>
  </footer>
`

const menuToggle = document.querySelector('.menu-toggle')
const nav = document.querySelector('#site-nav')

menuToggle.addEventListener('click', () => {
  const open = menuToggle.getAttribute('aria-expanded') === 'true'
  menuToggle.setAttribute('aria-expanded', String(!open))
  nav.classList.toggle('is-open', !open)
})

nav.addEventListener('click', (event) => {
  if (event.target instanceof HTMLAnchorElement && window.innerWidth < 760) {
    menuToggle.setAttribute('aria-expanded', 'false')
    nav.classList.remove('is-open')
  }
})
