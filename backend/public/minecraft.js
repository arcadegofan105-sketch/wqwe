// minecraft.js (demo)
(function () {
  const ASSETS_DIR = 'Assets'
  const SYMBOLS = [
    'stone.jpg',
    'Grass.jpg',
    'redstone.jpg',
    'gold.jpg',
    'obsidian.jpg',
    'PickWood.jpg',
    'PickStone.jpg',
    'PickGold.jpg',
    'PickDiamond.jpg',
    'ender-eye-bonus.jpg',
  ]

  const COLS = 5
  const ROWS = 3

  function asset(name) {
    return `${ASSETS_DIR}/${name}`
  }

  function randSym() {
    return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)]
  }

  function iconHTML(fileName) {
    return `<div class="mc-icon" style="background-image:url('${asset(fileName)}')"></div>`
  }

  function renderGrid(grid15) {
    const gridEl = document.getElementById('mc-grid')
    if (!gridEl) return
    gridEl.innerHTML = grid15
      .map(fn => `<div class="mc-cell">${iconHTML(fn)}</div>`)
      .join('')
  }

  function demoSpin() {
    const grid = Array.from({ length: COLS * ROWS }, () => randSym())
    renderGrid(grid)

    const lastWin = document.getElementById('mc-lastwin')
    if (lastWin) lastWin.textContent = (Math.random() * 0.3).toFixed(2)
  }

  function init() {
    const btn = document.getElementById('mc-spin-btn')
    if (btn) btn.addEventListener('click', demoSpin)
    demoSpin()
  }

  document.addEventListener('DOMContentLoaded', init)
})()
