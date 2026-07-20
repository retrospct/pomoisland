/* global document, HTMLAnchorElement, window */

import './styles.css'

const menuButton = document.querySelector('.menu-button')
const navigation = document.querySelector('#primary-nav')

menuButton.addEventListener('click', () => {
  const isOpen = menuButton.getAttribute('aria-expanded') === 'true'
  menuButton.setAttribute('aria-expanded', String(!isOpen))
  navigation.classList.toggle('is-open', !isOpen)
})

navigation.addEventListener('click', (event) => {
  if (event.target instanceof HTMLAnchorElement && window.innerWidth < 840) {
    menuButton.setAttribute('aria-expanded', 'false')
    navigation.classList.remove('is-open')
  }
})

const accentAssets = {
  purple: '/assets/standalone-mode.png',
  mint: '/assets/edge-mint.png',
  blue: '/assets/edge-blue.png',
  amber: '/assets/edge-amber.png',
}

const accentButtons = document.querySelectorAll('.accent-dot')
const floatingPreview = document.querySelector('.floating-preview img')

accentButtons.forEach((button) => {
  button.addEventListener('click', () => {
    accentButtons.forEach((candidate) => {
      candidate.classList.toggle('is-active', candidate === button)
      candidate.setAttribute('aria-pressed', String(candidate === button))
    })

    const accent = button.dataset.accent
    floatingPreview.classList.add('is-changing')
    window.setTimeout(() => {
      floatingPreview.src = accentAssets[accent]
      floatingPreview.alt = `PomoIsland ${accent} timer preview`
      floatingPreview.classList.remove('is-changing')
    }, 120)
  })
})
