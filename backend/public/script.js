// ===== CONFIG =====
const API_URL = '/api'
const SPIN_PRICE = 1
const FULL_ROUNDS = 5
const MIN_WITHDRAW_TON = 5
const MIN_DEPOSIT_TON = 0.1
;

// TODO: username -> GiftWheelsBot
const BOT_USERNAME = 'GiftWheels_bot'

const wheelSectors = [
  { emoji: '🐸', name: 'Pepe', nameKey: 'Pepe', price: 0.0 },                    // 0
  { emoji: '🗡️', name: 'Lightsword', nameKey: 'lightsword', price: 7.0 },       // 1
  { emoji: '📅', name: 'Celendar (random)', nameKey: 'Celendar (random)', price: 4.5 },       // 2
  { emoji: '🧪', name: 'Hexpot', nameKey: 'Hexpot', price: 10.0 },               // 3
  { emoji: '🧸', name: 'Bear', nameKey: 'Bear', price: 0.1 },                    // 4
  { emoji: '🍑', name: 'Precious Peach (random)', nameKey: 'Precious Peach (random)', price: 500.0 }, // 5
  { emoji: '🧸', name: 'Bear', nameKey: 'Bear', price: 0.1 },                    // 6
]

// ===== CASES CONFIG =====
const CASES = {
  newyear: {
    id: 'newyear',
    title: 'calendar',
    priceTon: 0.5,
    imageSelector: '.case-image-newyear',
    contents: [
      { emoji: '📅', name: 'Celendar (random)', price: 4.5 },
      { emoji: '🍭', name: 'lolpop',            price: 7.0 },
      { emoji: '🧸', name: 'Bear',              price: 0.1 },
      { emoji: '🧦', name: 'socks',             price: 10.0 },
      { emoji: '🧸', name: 'Bear',              price: 0.1 },
      { emoji: '🪆', name: 'Woodoo (random)',   price: 30.0 },
      { emoji: '🧸', name: 'Bear',              price: 0.1 },
    ],
  },

  onlynft: {
    id: 'onlynft',
    title: 'Classic case',
    priceTon: 2.5,
    imageSelector: '.case-image-onlynft',
    contents: [
      { emoji: '🐸', name: 'Plush Pepe Pink Latex', price: 10000.0 },

      { emoji: '💔', name: 'Trapped Hearts',  price: 20.0 },
      { emoji: '🐱', name: 'Scared Cats',     price: 200.0 },
      { emoji: '💵', name: 'Snoop Cigars',    price: 15.0 },
      { emoji: '🥃', name: 'Vintage Cigars',  price: 40.0 },
      { emoji: '🎩', name: 'Witch Hats',      price: 7.0 },
      { emoji: '🍪', name: 'Happy Brownies',  price: 5.0 },

      { emoji: '🧸', name: 'Bear',            price: 0.1 },
    ],
  },

  crypto: {
    id: 'crypto',
    title: 'All or nothing',
    priceTon: 1.20,
    imageSelector: '.case-image-crypto',
    contents: [
      { emoji: '🍑', name: 'Precious Peach (random)', price: 500.0 },
      { emoji: '🧸', name: 'Bear', price: 0.1 },
    ],
  },

  elite: {
    id: 'elite',
    title: '50/50 case',
    priceTon: 12.5,
    imageSelector: '.case-image-elite',
    contents: [
      { emoji: '📅', name: 'Celendar (random)', price: 4.5 },
      { emoji: '🪆', name: 'Woodoo (random)',   price: 30.0 },
    ],
  },
}

// Всегда выдаваемый приз (winner).
const CASES_ALWAYS_PRIZE = { emoji: '🧸', name: 'Bear', price: 0.1 }

// CUSTOM IMAGES (ключ = точное item.name)
const GIFT_IMAGES = {
  'Pepe': 'epepepepe.webp',
  'Plush Pepe Pink Latex': 'PinkLat.webp',

  'Precious Peach (random)': 'epersok.webp',
  'Celendar (random)': 'Deskcelend.png',

  'Hexpot': 'Hexpot (1).webp',
  'lightsword': 'lightsword.webp',

  'lolpop': 'levelpops.webp',
  'socks': 'soksos.webp',
  'Woodoo (random)': 'voodoolol.png',
  'Bear': 'Bear.png',

  'Trapped Hearts': 'TrappedHeart.png',
  'Scared Cats': 'scaredcad.webp',
  'Snoop Cigars': 'dollars.webp',
  'Vintage Cigars': 'sigares.webp',
  'Witch Hats': 'WitchHats.webp',
  'Happy Brownies': 'poorsada.webp',
}

function giftVisual(item) {
  if (!item) return ''
  if (item.imageUrl) {
    const url = String(item.imageUrl).replace(/'/g, "\\'").replace(/"/g, '%22')
    return `<span class="gift-icon" style="background-image:url('${url}')"></span>`
  }
  const name = item.nameKey || item.name
  const file = GIFT_IMAGES[name]
  if (file) {
    return `<span class="gift-icon" style="background-image:url('${file}')"></span>`
  }
  return item.emoji || ''
}

// ===== TELEGRAM =====
const tg = window.Telegram?.WebApp || null
if (!tg) {
  alert('Открой приложение через Telegram.')
  throw new Error('Telegram WebApp not found')
}

tg.ready()
tg.expand()
document.body.style.backgroundColor = tg.themeParams?.bg_color || '#02051a'

const INIT_DATA = tg.initData
const telegramUser = tg.initDataUnsafe?.user || null

// ===== TON CONNECT =====
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: `${location.origin}/tonconnect-manifest.json`,
  buttonRootId: 'ton-connect',
})

// ===== UI ELEMENTS =====
const wheel = document.getElementById('wheel')

function setWheelIconsUpright(angleDeg) {
  if (!wheel) return
  wheel.style.setProperty('--wheel-rot', `${angleDeg}deg`)
}

const spinButton = document.getElementById('spin-button')
const balanceValueSpan = document.getElementById('balance-value')
const balanceValueSpan2 = document.getElementById('balance-value-2')
const balanceValueSpan3 = document.getElementById('balance-value-3')
const lastPrizeSpan = document.getElementById('last-prize')

const walletStatusBtn = document.getElementById('wallet-status-btn')

const promoInput = document.getElementById('promo-input')
const promoApplyBtn = document.getElementById('promo-apply')

const navButtons = document.querySelectorAll('.nav-btn')
const screens = {
  invite: document.getElementById('screen-invite'),
  home: document.getElementById('screen-home'),
  wheel: document.getElementById('screen-wheel'),
  crash: document.getElementById('screen-crash'),
  cases: document.getElementById('screen-cases'),
  caseOpen: document.getElementById('screen-case-open'),
  bonus: document.getElementById('screen-bonus'),
  profile: document.getElementById('screen-profile'),
  admin: document.getElementById('screen-admin'),
  frog: document.getElementById('screen-frog'),
}

const rewardsListEl = document.getElementById('rewards-list')

const depositBtn = document.getElementById('deposit-btn')
const withdrawBtn = document.getElementById('withdraw-btn')

// Модалка приза
const prizeModal = document.getElementById('prize-modal')
const modalPrizeEmoji = document.getElementById('modal-prize-emoji')
const modalPrizeName = document.getElementById('modal-prize-name')
const modalPrizePrice = document.getElementById('modal-prize-price')
const modalSellBtn = document.getElementById('modalSellBtn')
const modalKeepBtn = document.getElementById('modalKeepBtn')

const inventoryList = document.getElementById('inventory-list')

// Withdraw modal
const withdrawModal = document.getElementById('withdraw-modal')
const withdrawAmountInput = document.getElementById('withdraw-amount-input')
const withdrawCancelBtn = document.getElementById('withdraw-cancel')
const withdrawConfirmBtn = document.getElementById('withdraw-confirm')
const withdrawBalanceHint = document.getElementById('withdraw-balance-hint')

// Deposit modal
const depositModal = document.getElementById('deposit-modal')
const depositAmountInput = document.getElementById('deposit-amount-input')
const depositConfirmBtn = document.getElementById('deposit-confirm')
const depositCancelBtn = document.getElementById('deposit-cancel')
const connectTonBtn = document.getElementById('connect-ton-btn')
const depositTabs = document.querySelectorAll('.deposit-tab')
const depositBodyTon = document.querySelector('.deposit-body-ton')
const depositBodyNft = document.querySelector('.deposit-body-nft')
const depositNftContactBtn = document.getElementById('deposit-nft-contact')

// Admin UI
const adminNavBtn = document.getElementById('admin-nav-btn')

const adminPromoType = document.getElementById('admin-promo-type')
const adminPromoCode = document.getElementById('admin-promo-code')
const adminPromoAmount = document.getElementById('admin-promo-amount')
const adminPromoMaxUses = document.getElementById('admin-promo-maxuses')
const adminPromoCreateBtn = document.getElementById('admin-promo-create')
const adminPromosList = document.getElementById('admin-promos-list')
const adminPromosRefresh = document.getElementById('admin-promos-refresh')

const adminStatsBox = document.getElementById('admin-stats')
const adminStatsRefresh = document.getElementById('admin-stats-refresh')

const adminUsersQ = document.getElementById('admin-users-q')
const adminUsersSearch = document.getElementById('admin-users-search')
const adminUsersGrid = document.getElementById('admin-users-grid')
const adminPrev = document.getElementById('admin-prev')
const adminNext = document.getElementById('admin-next')
const adminPageInfo = document.getElementById('admin-page-info')

const adminAdjTgId = document.getElementById('admin-adj-tgid')
const adminAdjDelta = document.getElementById('admin-adj-delta')
const adminAdjApply = document.getElementById('admin-adj-apply')
const adminAdjResult = document.getElementById('admin-adj-result')

// Broadcast UI
const adminBcText = document.getElementById('admin-bc-text')
const adminBcNow = document.getElementById('admin-bc-now')
const adminBc10m = document.getElementById('admin-bc-10m')
const adminBc1h = document.getElementById('admin-bc-1h')
const adminBc24h = document.getElementById('admin-bc-24h')
const adminBcResult = document.getElementById('admin-bc-result')


// Invite UI
const inviteLinkText = document.getElementById('invite-link-text')
const inviteCopyBtn = document.getElementById('invite-copy-btn')

// Cases UI
const caseCards = document.querySelectorAll('.case-card')
const caseOpenPriceEl = document.getElementById('case-open-price')
const caseOpenSpinBtn = document.getElementById('case-open-spin')
const caseOpenRewardsListEl = document.getElementById('case-open-rewards-list')
const caseOpenTrack = document.getElementById('case-open-track')
const caseOpenTitleEl = document.getElementById('case-open-title')
const caseOpenImageEl = document.getElementById('case-open-image')
const caseOpenBackBtn = document.getElementById('case-open-back')

// Case animation overlay
const caseAnimOverlay = document.getElementById('case-anim-overlay')
const caseAnimTrack = document.getElementById('case-anim-track')

// FROGTON UI
let frogScrollEl = document.querySelector('.frog-game-area')
let frogCanvas = document.getElementById('frog-canvas')
const frogMainActionBtn = document.getElementById('frog-main-action')
const frogBetInput = document.getElementById('frog-bet-input')
const frogAutoInput = document.getElementById('frog-auto-input')
const frogCurrentMultEl = document.getElementById('frog-current-mult')
const frogPotentialWinEl = document.getElementById('frog-potential-win')

// ===== CASES: helpers =====
function formatTonHuman(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return '0'
  return n.toFixed(2).replace(/\.?0+$/, '')
}

function renderCasesMenuFromConfig() {
  caseCards?.forEach(card => {
    const type = card.getAttribute('data-case-type')
    const cfg = CASES?.[type]
    if (!cfg) return

    const titleEl = card.querySelector('.case-name')
    const priceEl = card.querySelector('.case-price')

    if (titleEl) titleEl.textContent = cfg.title || type
    if (priceEl) priceEl.textContent = `${formatTonHuman(cfg.priceTon || 0)} TON`
  })
}

function setCaseAnimVisible(v) {
  if (!caseAnimOverlay) return
  caseAnimOverlay.classList.toggle('active', !!v)
}

function makeAnimItemHTML(prize) {
  const v = giftVisual(prize)
  const isIcon = String(v).includes('gift-icon')
  return `<div class="case-anim-item">${isIcon ? v : `<div class="emoji">${v}</div>`}</div>`
}

// Рулетка-анимация в оверлее (если захочешь использовать)
async function playCaseOpenAnimation({ pool, winner }) {
  if (!caseAnimTrack || !caseAnimOverlay) return

  const base = Array.isArray(pool) && pool.length ? pool : [winner]
  const items = []
  for (let i = 0; i < 28; i++) items.push(base[i % base.length])
  const winIndex = Math.floor(items.length / 2)
  items[winIndex] = winner

  caseAnimTrack.innerHTML = items.map(makeAnimItemHTML).join('')
  caseAnimTrack.style.transition = 'none'
  caseAnimTrack.style.transform = 'translateX(0px)'

  setCaseAnimVisible(true)
  caseAnimOverlay.offsetHeight
  caseAnimTrack.offsetHeight
  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

  const container = caseAnimTrack.parentElement
  const winnerEl = caseAnimTrack.children[winIndex]
  let finalX = 0
  if (container && winnerEl) {
    const containerRect = container.getBoundingClientRect()
    const itemRect = winnerEl.getBoundingClientRect()
    const centerX = containerRect.left + containerRect.width / 2
    const itemCenter = itemRect.left + itemRect.width / 2
    finalX = centerX - itemCenter
  }

  caseAnimTrack.style.transition = 'transform 5.6s cubic-bezier(.08,.82,.12,1)'
  caseAnimTrack.style.transform = `translateX(${finalX}px)`

  await new Promise(r => setTimeout(r, 3600))
  setCaseAnimVisible(false)
}

// Inline-анимация в экране кейса
async function playInlineCaseAnimation(pool, winner) {
  if (!caseOpenTrack) return

  const base = Array.isArray(pool) && pool.length ? [...pool] : [winner]
  for (let i = base.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[base[i], base[j]] = [base[j], base[i]]
  }

  const items = []
  for (let i = 0; i < 28; i++) items.push(base[i % base.length])

  caseOpenTrack.innerHTML = items.map(makeAnimItemHTML).join('')
  caseOpenTrack.style.transition = 'none'
  caseOpenTrack.style.transform = 'translateX(0px)'
  void caseOpenTrack.offsetHeight

  const centerIndex = Math.floor(items.length / 2)
  items[centerIndex] = winner
  caseOpenTrack.innerHTML = items.map(makeAnimItemHTML).join('')

  const container = caseOpenTrack.parentElement
  const winnerEl = caseOpenTrack.children[centerIndex]
  let finalX = 0
  if (container && winnerEl) {
    const containerRect = container.getBoundingClientRect()
    const itemRect = winnerEl.getBoundingClientRect()
    const centerX = containerRect.left + containerRect.width / 2
    const itemCenter = itemRect.left + itemRect.width / 2
    finalX = centerX - itemCenter
  }
  const DURATION_MS = 6500

  await new Promise(resolve => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      caseOpenTrack.removeEventListener('transitionend', onEnd)
      resolve()
    }
    const onEnd = e => {
      if (e.propertyName !== 'transform') return
      finish()
    }

    caseOpenTrack.addEventListener('transitionend', onEnd)
    setTimeout(finish, DURATION_MS + 300)

    caseOpenTrack.style.transition = `transform ${DURATION_MS}ms cubic-bezier(.08,.82,.12,1)`
    caseOpenTrack.style.transform = `translateX(${finalX}px)`
  })
}

// ===== STATE =====
let currentRotation = 0
let balance = 0
let inventory = []
let currentPrize = null
let currentPrizeIdx = null
let isSpinning = false
let isAdmin = false
let selectedCaseType = null
let isCaseOpening = false

const adminState = {
  q: '',
  page: 1,
  pages: 1,
}


// прогресс к бесплатному колесу
const WHEEL_DEPOSIT_TARGET = 0.5
let freeWheelAvailable = false
let wheelDepositProgressTon = 0


// ===== HELPERS =====
function updateBalanceUI() {
  const rounded = Number((balance || 0).toFixed(2))
  if (balanceValueSpan) balanceValueSpan.textContent = String(rounded)
  if (balanceValueSpan2) balanceValueSpan2.textContent = String(rounded)
  if (balanceValueSpan3) balanceValueSpan3.textContent = String(rounded)
  if (withdrawBalanceHint) withdrawBalanceHint.textContent = String(rounded)
}

function setLastPrizeText(prize) {
  if (!lastPrizeSpan) return
  lastPrizeSpan.textContent = prize ? `${prize.emoji} ${prize.name}` : '—'
}

function openModal(prize) {
  if (!prizeModal) return
  if (modalPrizeEmoji) modalPrizeEmoji.innerHTML = giftVisual(prize)
  if (modalPrizeName) modalPrizeName.textContent = prize.name
  if (modalPrizePrice) modalPrizePrice.textContent = Number(prize.price || 0).toFixed(2)
  prizeModal.classList.add('active')
}

function closeModal() {
  if (!prizeModal) return
  prizeModal.classList.remove('active')
}

// Withdraw helpers
function openWithdrawModal(prefillAmount = '') {
  if (!withdrawModal) return
  updateBalanceUI()
  if (withdrawAmountInput) {
    withdrawAmountInput.value =
      prefillAmount !== undefined && prefillAmount !== null ? String(prefillAmount) : ''
    withdrawAmountInput.focus()
  }
  withdrawModal.classList.add('active')
}

function closeWithdrawModal() {
  if (!withdrawModal) return
  withdrawModal.classList.remove('active')
}

function renderWheel() {
  if (!wheel) return

  const sectorNodes = wheel.querySelectorAll(".sector")
  sectorNodes.forEach((node, i) => {
    const s = wheelSectors[i]

    let inner = node.querySelector(".sector-inner")
    if (!inner) {
      inner = document.createElement("span")
      inner.className = "sector-inner"
      node.textContent = ""
      node.appendChild(inner)
    }

    if (!s) {
      inner.innerHTML = ""
      node.title = ""
      return
    }

    inner.innerHTML = giftVisual(s)
    node.title = `${s.name} (${s.price} TON)`
  })
}

function renderPrizesList() {
  const DISPLAY = [
    { idx: 4, title: "Bear",            priceText: "0.1 TON" },
    { idx: 0, title: "Pepe",            priceText: "10000 TON" },
    { idx: 2, title: "Desk Calendar",   priceText: "4.5 TON" },
    { idx: 1, title: "Lightsword",      priceText: "7 TON" },
    { idx: 3, title: "Hexpot",          priceText: "10 TON" },
    { idx: 6, title: "Bear",            priceText: "0.1 TON" },
    { idx: 5, title: "Precious Peach",  priceText: "500 TON" },
  ]

  const cards = document.querySelectorAll(".wheel-prizes-grid .wheel-prize-card")
  cards.forEach((card, i) => {
    const d = DISPLAY[i]
    if (!d) return

    const s = wheelSectors[d.idx]
    if (!s) return

    const emojiEl = card.querySelector(".prize-emoji")
    const nameEl = card.querySelector(".prize-name")
    const priceTextEl = card.querySelector(".wheel-prize-price-text")

    if (emojiEl) emojiEl.innerHTML = giftVisual(s)
    if (nameEl) nameEl.textContent = d.title
    if (priceTextEl) priceTextEl.textContent = d.priceText
  })
}

function renderInventoryContent() {
  if (!inventoryList || !Array.isArray(inventory) || inventory.length === 0) return
  inventoryList.innerHTML = inventory
    .map((item, idx) => {
      const price = Number(item.price || 0).toFixed(2)
      return `
        <div class="inv-card" data-idx="${idx}">
          <div class="inv-card-image-wrap">
            <div class="inv-card-image">
              ${giftVisual(item)}
            </div>
            <div class="inv-card-name">
              ${escapeHtml(item.name || 'Подарок')}
            </div>
          </div>

          <div class="inv-card-footer">
            <div class="inv-card-price">
              <span class="inv-ton-icon"></span>
              <span class="inv-ton-value">${price}</span>
            </div>
            <div class="inv-card-actions">
              <button class="inv-btn inv-sell" type="button">Продать</button>
              <button class="inv-btn inv-withdraw" type="button">Вывести</button>
            </div>
          </div>
        </div>
      `
    })
    .join('')
}

function renderInventory() {
  if (!inventoryList) return

  if (!Array.isArray(inventory) || inventory.length === 0) {
    inventoryList.innerHTML = `<div class="inventory-empty">У вас пока нет подарков</div>`
    return
  }

  const hasTrappedHearts = inventory.some(i => (i.name || '') === 'Trapped Hearts')
  if (hasTrappedHearts) {
    getTonnelGift('Trapped Hearts').then(r => {
      if (r && r.imageUrl) GIFT_IMAGES['Trapped Hearts'] = r.imageUrl
      renderInventoryContent()
    })
  }

  renderInventoryContent()
}

function setScreen(name) {
  Object.keys(screens).forEach(key => {
    screens[key]?.classList.toggle('active', key === name)
  })
  navButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.target === name)
  })

  const content = document.querySelector('.content')
  if (content) content.scrollTop = 0
  window.scrollTo?.(0, 0)
}

function updateTelegramUserUI() {
  if (!telegramUser) return

  const userName = telegramUser.first_name || telegramUser.username || 'User'
  document.querySelectorAll('.user-name, .profile-name').forEach(el => (el.textContent = userName))

  const idEl = document.querySelector('.profile-id')
  if (idEl) idEl.textContent = `ID: ${telegramUser.id}`

  if (telegramUser.photo_url) {
    document.querySelectorAll('.avatar, .profile-avatar').forEach(avatar => {
      avatar.style.backgroundImage = `url(${telegramUser.photo_url})`
      avatar.style.backgroundSize = 'cover'
      avatar.style.backgroundPosition = 'center'
    })
  }
}

// ===== INVITE =====
function buildInviteLink() {
  const myId = telegramUser?.id
  if (!myId) return null
  if (!BOT_USERNAME || BOT_USERNAME === 'YOUR_BOT_USERNAME') return null
  return `https://t.me/${BOT_USERNAME}?startapp=${myId}`
}

function updateInviteUI() {
  const link = buildInviteLink()
  if (inviteLinkText) inviteLinkText.textContent = link || 'Укажи BOT_USERNAME в script.js'
}

inviteCopyBtn?.addEventListener('click', async () => {
  const link = buildInviteLink()
  if (!link) {
    alert('Сначала укажи BOT_USERNAME в script.js')
    return
  }
  try {
    await navigator.clipboard.writeText(link)
    alert('Ссылка скопирована')
  } catch (e) {
    alert('Не удалось скопировать ссылку (попробуй вручную).')
  }
})

// Кэш Tonnel: ключ -> { priceTon, imageUrl }
let tonnelGiftCache = {}

async function getTonnelGift(key) {
  if (tonnelGiftCache[key]) return tonnelGiftCache[key]
  try {
    const r = await apiPost('/tonnel/gift', { key })
    tonnelGiftCache[key] = { priceTon: r.priceTon, imageUrl: r.imageUrl || null }
    return tonnelGiftCache[key]
  } catch (e) {
    console.warn('[Tonnel] getTonnelGift failed for', key, e?.message || e)
    return null
  }
}

// ===== CASES HELPERS =====
function renderCaseRewardsList(cfg) {
  if (!caseOpenRewardsListEl) return
  if (!cfg) {
    caseOpenRewardsListEl.innerHTML = ''
    return
  }

  const items = Array.isArray(cfg.contents) ? cfg.contents : [CASES_ALWAYS_PRIZE]

  caseOpenRewardsListEl.innerHTML = items.map(it => {
    const name = escapeHtml(it?.name || '')
    const priceText = formatTonHuman(it?.price)
    const giftName = (it?.name || '').trim()

    return `
      <div class="case-prize-card" data-gift-name="${escapeHtml(giftName)}">
        <div class="case-prize-emoji">${giftVisual(it)}</div>
        <div class="case-prize-name">${name}</div>

        <div class="case-prize-price">
          <span class="case-prize-ton"></span>
          <span class="case-prize-price-text">${priceText}</span>
        </div>
      </div>
    `
  }).join('')

  // Trapped Hearts: подтянуть цену и картинку с Tonnel для Classic case
  if (cfg.id === 'onlynft') {
    getTonnelGift('Trapped Hearts').then(r => {
      if (!r || !caseOpenRewardsListEl) return
      const card = caseOpenRewardsListEl.querySelector('[data-gift-name="Trapped Hearts"]')
      if (!card) return
      const emojiEl = card.querySelector('.case-prize-emoji')
      const priceEl = card.querySelector('.case-prize-price-text')
      if (priceEl) priceEl.textContent = formatTonHuman(r.priceTon)
      if (emojiEl && r.imageUrl) {
        emojiEl.innerHTML = `<span class="gift-icon" style="background-image:url('${r.imageUrl.replace(/'/g, "\\'")}')"></span>`
      }
    })
  }
}

function renderCasePreviewTrack(cfg) {
  if (!caseOpenTrack) return

  const items = Array.isArray(cfg?.contents) && cfg.contents.length ? cfg.contents : []
  const base = items.length ? items : [CASES_ALWAYS_PRIZE]

  const out = []
  for (let i = 0; i < 18; i++) out.push(base[i % base.length])

  caseOpenTrack.innerHTML = out.map(makeAnimItemHTML).join('')
  caseOpenTrack.style.transition = 'none'
  caseOpenTrack.style.transform = 'translateX(0px)'
}

function openCase(caseType) {
  const cfg = CASES[caseType]
  if (!cfg) {
    alert('Этот кейс скоро добавим.')
    return
  }

  selectedCaseType = caseType

  if (caseOpenTitleEl) {
    caseOpenTitleEl.textContent = cfg.title || ''
  }

  if (caseOpenPriceEl) {
    caseOpenPriceEl.textContent = formatTonHuman(cfg.priceTon || 0)
  }

  if (caseOpenImageEl) {
    const img = cfg.imageSelector ? document.querySelector(cfg.imageSelector) : null
    if (img?.className) {
      caseOpenImageEl.className = img.className.replace('case-image', 'case-open-image')
    } else {
      caseOpenImageEl.className = 'case-open-image'
    }
  }

  renderCaseRewardsList(cfg)
  renderCasePreviewTrack(cfg)
  setScreen('caseOpen')
}

// ===== TON CONNECT =====
function isWalletConnected() {
  return Boolean(tonConnectUI?.account?.address)
}

function formatAddress(addr) {
  if (!addr) return ''
  return addr.slice(0, 4) + '…' + addr.slice(-3)
}

function updateWalletStatusUI() {
  if (!walletStatusBtn) return
  const connected = isWalletConnected()

  if (!connected) {
    walletStatusBtn.classList.remove('wallet-status-connected')
    walletStatusBtn.classList.add('wallet-status-disconnected')
  } else {
    walletStatusBtn.classList.remove('wallet-status-disconnected')
    walletStatusBtn.classList.add('wallet-status-connected')
  }

  walletStatusBtn.textContent = '+'
}

function updateConnectButtonUI() {
  if (!connectTonBtn) return
  const connected = isWalletConnected()

  if (!connected) {
    connectTonBtn.classList.remove('connect-wallet-bound')
    connectTonBtn.textContent = 'Подключите TON кошелёк'
    return
  }

  const addr = tonConnectUI.account?.address || ''
  connectTonBtn.classList.add('connect-wallet-bound')
  connectTonBtn.innerHTML = `
    <span>${formatAddress(addr)}</span>
    <span>Изменить</span>
  `
}

function updateDepositButtonState() {
  if (depositBtn) {
    const connected = isWalletConnected()
    depositBtn.disabled = false
    depositBtn.title = connected ? '' : 'Сначала подключи TON-кошелёк в модалке'
  }
  updateWalletStatusUI()
  updateConnectButtonUI()
}

tonConnectUI.onStatusChange(() => {
  updateDepositButtonState()
})


// ===== API (initData auth) =====
async function apiPost(path, body = {}) {
  const base = String(API_URL || '').replace(/\/+$/, '')   // "/api"
  const p = String(path || '').replace(/^\/+/, '')         // "me" или "admin/users"
  const url = `${base}/${p}`                               // "/api/me"

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      initData: String(window.Telegram?.WebApp?.initData || ''),
      ...body,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}`)
  return data
}


// user
async function fetchUserData() {
  const data = await apiPost('/me')
  balance = Number(data.balance || 0)
  inventory = Array.isArray(data.inventory) ? data.inventory : []
  isAdmin = Boolean(data.isAdmin)

  freeWheelAvailable = Boolean(data.freeWheelAvailable)
  wheelDepositProgressTon = Number(data.wheelDepositProgressTon || 0)
  updateWheelPriceLabel()

  if (adminNavBtn) adminNavBtn.style.display = isAdmin ? '' : 'none'

  updateBalanceUI()
  renderInventory()
  return data
}

function updateWheelPriceLabel() {
  const priceLabelEl = document.getElementById('wheel-price-text')
  if (!priceLabelEl) return

  if (freeWheelAvailable) {
    priceLabelEl.textContent = 'Бесплатно'
  } else {
    const need = Math.max(0, WHEEL_DEPOSIT_TARGET - wheelDepositProgressTon)
      .toFixed(2)
      .replace(/\.?0+$/, '')
    priceLabelEl.textContent =
      need === '0'
        ? 'Бесплатно'
        : `Сделайте депозит ещё ${need} TON, чтобы колесо стало бесплатным`
  }
}

// spin / cases
async function spinApi() {
  return apiPost('/spin')
}

async function openCaseApi(caseType) {
  return apiPost('/cases/open', { caseType })
}

async function keepPrizeApi(prize) {
  return apiPost('/prize/keep', { prize })
}

async function sellPrizeApi(prize, idx) {
  const body = { prize }
  if (Number.isInteger(idx)) body.idx = idx
  return apiPost('/prize/sell', body)
}

async function applyPromoApi(code) {
  return apiPost('/promo/apply', { code })
}

// withdraw APIs
async function withdrawTonApi(amount) {
  return apiPost('/withdraw/ton', { amount })
}

async function withdrawGiftApi(idx) {
  return apiPost('/withdraw/gift', { idx })
}

// deposit APIs
async function depositInfoApi() {
  return apiPost('/deposit/info')
}
async function depositCreateApi(amount) {
  return apiPost('/deposit/create', { amount })
}
async function depositCheckApi(depositId) {
  return apiPost('/deposit/check', { depositId })
}

// ===== REWARDS APIs =====
// REWARDS APIs
async function rewardsListApi() { return apiPost("rewards/list"); }
async function rewardsClaimApi(key) { return apiPost("rewards/claim", { key }); }


// admin APIs
async function adminStatsApi() {
  return apiPost("admin/stats");
}

async function adminUsersApi(q, page) {
  return apiPost("admin/users", { q, page });
}

async function adminPromoCreateApi(payload) {
  return apiPost("admin/promo/create", payload);
}

async function adminPromoListApi() {
  return apiPost("admin/promo/list");
}

async function adminPromoDeleteApi(code) {
  return apiPost("admin/promo/delete", { code });
}

async function adminAdjustBalanceApi(tgId, delta) {
  return apiPost("admin/user/adjust-balance", { tgId, delta });
}

async function adminBroadcastCreateApi(text, delaySec) {
  return apiPost("admin/broadcast/create", { text, delaySec })
}



// deposit helpers
function toNanoString(tonAmount) {
  return String(Math.round(tonAmount * 1e9))
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

function escapeHtml(s) {
  return String(s || '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

// ===== FROGTON DRAW HELPERS =====

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()

    img.onload = () => resolve(img)

    img.onerror = () => {
      console.error('Image load error:', src)
      reject(src)
    }

    img.src = src
  })
}

// Глобальные переменные для FROGTON (убедиcь, что они объявлены один раз)
const FROG_HATCH_MULTS = [
  1.15, 1.3, 1.6, 2.0, 3.0,
  5.0, 10.0, 15.0, 25.0, 100.0,
]

let frogState = 'idle'
let frogBet = 0
let frogCurrentHatch = -1    // -1 = старт у светофора
let frogWinningHatch = -1
let frogAutoHatch = null
let frogCameraOffset = 0    // смещение дороги влево/вправо


let frogJumpProgress = 0     // 0..1
let frogAnimX = 0
let frogIsJumping = false

let frogCtx = null
let frogSprite = null        // froggame.png
let frogCarSprite = null     // Cartonfrog.png

// --- init graphics ---

async function initFrogGraphics() {
  if (!frogCanvas) return

  frogCanvas.width = frogCanvas.clientWidth
  frogCanvas.height = frogCanvas.clientHeight

  frogCtx = frogCanvas.getContext('2d')

  try { frogSprite = await loadImage('froggame.png') } catch (e) {}
  try { frogCarSprite = await loadImage('Cartonfrog.png') } catch (e) {}

  drawFrogScene(false)
}


// --- geometry & background ---

function getHatchX(index) {
  const paddingLeft = 120
  const step = 90
  return paddingLeft + index * step
}

function getGroundY() {
  if (!frogCanvas) return 0
  return frogCanvas.height * 0.7
}

function clearFrogCanvas() {
  if (!frogCtx || !frogCanvas) return
  frogCtx.clearRect(0, 0, frogCanvas.width, frogCanvas.height)
}

function drawRoadBackground() {
  const w = frogCanvas.width
  const h = frogCanvas.height
  const groundY = getGroundY()

  // асфальт
  frogCtx.fillStyle = '#020617'
  frogCtx.fillRect(0, 0, w, h)

  // дорога
  const roadTop = groundY - 80
  const roadBottom = groundY + 40
  frogCtx.fillStyle = '#0b1120'
  frogCtx.fillRect(0, roadTop, w, roadBottom - roadTop)

  // бордюры
  frogCtx.fillStyle = '#111827'
  frogCtx.fillRect(0, roadTop - 10, w, 10)
  frogCtx.fillRect(0, roadBottom, w, 10)

  // центральная пунктирная линия
  frogCtx.strokeStyle = 'rgba(148,163,184,0.7)'
  frogCtx.lineWidth = 3
  frogCtx.setLineDash([14, 14])
  frogCtx.beginPath()
  frogCtx.moveTo(0, (roadTop + roadBottom) / 2)
  frogCtx.lineTo(w, (roadTop + roadBottom) / 2)
  frogCtx.stroke()
  frogCtx.setLineDash([])
}

function drawTrafficLight() {
  const w = frogCanvas.width
  const h = frogCanvas.height
  const x = w * 0.12
  const y = h * 0.18

  // стойка
  frogCtx.fillStyle = '#0f172a'
  frogCtx.fillRect(x - 4, y, 8, 70)

  // корпус
  frogCtx.fillStyle = '#020617'
  frogCtx.fillRect(x - 16, y - 40, 32, 60)
  frogCtx.strokeStyle = 'rgba(148,163,184,0.6)'
  frogCtx.lineWidth = 2
  frogCtx.strokeRect(x - 16, y - 40, 32, 60)

  const r = 7
  const cy1 = y - 28
  const cy2 = y - 12
  const cy3 = y + 4

  // красный
  frogCtx.fillStyle = 'rgba(248,113,113,0.25)'
  frogCtx.beginPath()
  frogCtx.arc(x, cy1, r, 0, Math.PI * 2)
  frogCtx.fill()

  // жёлтый
  frogCtx.fillStyle = 'rgba(252,211,77,0.25)'
  frogCtx.beginPath()
  frogCtx.arc(x, cy2, r, 0, Math.PI * 2)
  frogCtx.fill()

  // зелёный активный
  frogCtx.fillStyle = '#22c55e'
  frogCtx.shadowColor = 'rgba(34,197,94,0.8)'
  frogCtx.shadowBlur = 16
  frogCtx.beginPath()
  frogCtx.arc(x, cy3, r, 0, Math.PI * 2)
  frogCtx.fill()
  frogCtx.shadowBlur = 0
}

// --- main draw ---
function drawFrogScene(showCar = false) {
  if (!frogCtx || !frogCanvas) return
  clearFrogCanvas()

  const w = frogCanvas.width
  const h = frogCanvas.height
  const groundY = getGroundY()

  drawRoadBackground()

  if (frogCurrentHatch < 0) {
    drawTrafficLight()
  }

  // люки + множители
  frogCtx.font = '12px system-ui'
  frogCtx.textAlign = 'center'
  frogCtx.textBaseline = 'top'

  for (let i = 0; i < FROG_HATCH_MULTS.length; i++) {
    const worldX = getHatchX(i)
    const x = worldX - frogCameraOffset
    const mult = FROG_HATCH_MULTS[i]

    const isCurrent = Math.round(frogCurrentHatch) === i

    const hatchW = 64
    const hatchH = 24
    const hatchY = groundY - 26

    let baseColor = '#020617'
    if (isCurrent) baseColor = '#4c1d95'

    const glowColor = isCurrent
      ? 'rgba(216,180,254,0.98)'   // неоновый фиолетовый
      : 'rgba(15,23,42,0.9)'

    frogCtx.save()
    frogCtx.shadowColor = glowColor
    frogCtx.shadowBlur = isCurrent ? 22 : 8

    frogCtx.fillStyle = baseColor
    frogCtx.beginPath()
    frogCtx.roundRect(x - hatchW / 2, hatchY, hatchW, hatchH, 10)
    frogCtx.fill()
    frogCtx.restore()

    frogCtx.fillStyle = '#020617'
    frogCtx.beginPath()
    frogCtx.ellipse(
      x,
      hatchY + hatchH / 2 + 1,
      hatchW * 0.3,
      hatchH * 0.26,
      0,
      0,
      Math.PI * 2
    )
    frogCtx.fill()

    const labelW = 56
    const labelH = 16
    const labelY = groundY + 4

    frogCtx.fillStyle = 'rgba(15,23,42,0.96)'
    frogCtx.beginPath()
    frogCtx.roundRect(x - labelW / 2, labelY, labelW, labelH, 8)
    frogCtx.fill()

    frogCtx.fillStyle = isCurrent ? '#f5f3ff' : '#e5e7eb'
    frogCtx.fillText(`${mult.toFixed(2)}x`, x, labelY + 2)
  }

  // лягушка
  if (frogSprite) {
    const size = 80
    let x

    if (frogCurrentHatch < 0) {
      x = w * 0.22
    } else if (frogIsJumping) {
      x = frogAnimX
    } else {
      const worldX = getHatchX(frogCurrentHatch)
      x = worldX - frogCameraOffset
    }

    const jumpOffset = frogIsJumping
      ? Math.sin(Math.PI * frogJumpProgress) * 18
      : 0

    frogCtx.drawImage(
      frogSprite,
      x - size / 2,
      groundY - size - 16 - jumpOffset,
      size,
      size
    )
  }

  // машина
  if (showCar && frogCarSprite && frogCurrentHatch >= 0) {
    const size = 115
    const worldX = getHatchX(frogCurrentHatch)
    const x = (frogIsJumping ? frogAnimX : worldX - frogCameraOffset)

    frogCtx.drawImage(
      frogCarSprite,
      x - size / 2,
      groundY - size - 40,
      size,
      size
    )
  }
}


// --- UI helpers (оставляем как было, только без scrollFrogToHatch) ---

function updateFrogUI() {
  if (!frogMainActionBtn) return
  if (frogState === 'idle' || frogState === 'cashed' || frogState === 'dead') {
    frogMainActionBtn.textContent = 'Сделать ставку'
    frogMainActionBtn.disabled = false
    frogCashoutBtn.disabled = true
  } else if (frogState === 'bet_placed' || frogState === 'running') {
    frogMainActionBtn.textContent = 'Играть (прыжок)'
    frogMainActionBtn.disabled = false
    frogCashoutBtn.disabled = false
  }

  if (frogCurrentMultEl) {
    const idx = Math.min(
      Math.max(frogCurrentHatch, 0),
      FROG_HATCH_MULTS.length - 1
    )
    const mult = FROG_HATCH_MULTS[idx] || 1
    frogCurrentMultEl.textContent = `${mult.toFixed(2)}x`
  }

  if (frogPotentialWinEl) {
    const idx = Math.min(
      Math.max(frogCurrentHatch, 0),
      FROG_HATCH_MULTS.length - 1
    )
    const mult = FROG_HATCH_MULTS[idx] || 1
    const win = frogBet * mult
    frogPotentialWinEl.textContent =
      frogBet > 0 ? `${win.toFixed(2)} TON` : '—'
  }
}



// ===== ADMIN RENDER =====
function renderAdminStats(stats) {
  if (!adminStatsBox) return
  if (!stats) {
    adminStatsBox.textContent = '—'
    return
  }
  const usersCount = Number(stats.usersCount || 0)
  const totalBalance = Number(stats.totalBalance || 0).toFixed(2)
  const totalDeposits = Number(stats.totalDeposits || 0).toFixed(2)

  adminStatsBox.innerHTML =
    `Пользователей: <b>${usersCount}</b><br/>` +
    `Сумма балансов: <b>${totalBalance}</b> TON<br/>` +
    `Сумма депозитов: <b>${totalDeposits}</b> TON`
}

function renderAdminPromos(items) {
  if (!adminPromosList) return
  if (!Array.isArray(items) || items.length === 0) {
    adminPromosList.textContent = 'Промокодов нет'
    return
  }

  adminPromosList.innerHTML = items
    .map(p => {
      const code = escapeHtml(p.code)
      const type = p.type === 'balance' ? 'TON' : 'Gift'
      const value =
        p.type === 'balance'
          ? `${Number(p.amount || 0).toFixed(2)} TON`
          : `${escapeHtml(p.gift_name || 'Мишка')}`
      const used = `${Number(p.used_count || 0)}/${Number(p.max_uses || 0)}`
      const active = Number(p.is_active || 0) ? 'активен' : 'выкл'

      return `
        <div class="admin-promo-item">
          <div class="admin-promo-left">
            <div class="admin-promo-code">${code}</div>
            <div class="admin-promo-meta">${type}: ${value} • uses: ${used} • ${active}</div>
          </div>
          <div class="admin-promo-actions">
            <button class="admin-mini-btn admin-mini-danger" data-del-promo="${code}" type="button">Удалить</button>
          </div>
        </div>
      `
    })
    .join('')
}

function renderAdminUsersGrid(items) {
  if (!adminUsersGrid) return
  if (!Array.isArray(items) || items.length === 0) {
    adminUsersGrid.innerHTML = `<div class="inventory-empty">Ничего не найдено</div>`
    return
  }

  adminUsersGrid.innerHTML = items
    .map(u => {
      const tgId = escapeHtml(u.tg_id)
      const username = u.username ? `@${escapeHtml(u.username)}` : '(no username)'
      const name = [u.first_name, u.last_name].filter(Boolean).join(' ')
      const full = escapeHtml(name || 'User')
      const bal = Number(u.balance || 0).toFixed(2)
      const dep = Number(u.total_deposit_ton || 0).toFixed(2)

      const lastSeen = u.last_seen_at ? new Date(Number(u.last_seen_at)).toLocaleString() : '—'

      return `
        <div class="admin-user-card">
          <div class="admin-user-top">
            <div class="admin-user-name">${full} ${username}</div>
            <div class="admin-user-balance">${bal} TON</div>
          </div>
          <div class="admin-user-meta">
            ID: ${tgId}<br/>
            Deposit: ${dep} TON<br/>
            Last seen: ${escapeHtml(lastSeen)}
          </div>
        </div>
      `
    })
    .join('')
}

function renderAdminPager() {
  if (!adminPageInfo) return
  adminPageInfo.textContent = `${adminState.page} / ${adminState.pages}`
  if (adminPrev) adminPrev.disabled = adminState.page <= 1
  if (adminNext) adminNext.disabled = adminState.page >= adminState.pages
}

async function loadAdminUsers() {
  if (!isAdmin) return
  if (adminUsersGrid) {
    adminUsersGrid.innerHTML = `
      <div class="skeleton skeleton-card" style="grid-column: 1/-1;"></div>
      <div class="skeleton skeleton-card" style="grid-column: 1/-1;"></div>
      <div class="skeleton skeleton-card" style="grid-column: 1/-1;"></div>
    `
  }
  const r = await adminUsersApi(adminState.q, adminState.page)
  const items = Array.isArray(r.items) ? r.items : []
  adminState.pages = Number(r.pages || 1) || 1
  adminState.page = Number(r.page || adminState.page) || 1
  renderAdminUsersGrid(items)
  renderAdminPager()
}


async function loadAdminStats() {
  if (!isAdmin) return
  if (adminStatsBox) {
    adminStatsBox.innerHTML = '<div class="skeleton skeleton-text-lg" style="width:100%;"></div><div class="skeleton skeleton-text" style="width:80%; margin-top:8px;"></div><div class="skeleton skeleton-text" style="width:60%; margin-top:8px;"></div>'
  }
  const stats = await adminStatsApi()
  renderAdminStats(stats)
}

async function loadAdminPromos() {
  if (!isAdmin) return
  if (adminPromosList) {
    adminPromosList.innerHTML = '<div class="skeleton skeleton-text" style="width:100%;"></div><div class="skeleton skeleton-text" style="width:90%; margin-top:6px;"></div>'
  }
  const r = await adminPromoListApi()
  renderAdminPromos(r.items || [])
}

function renderRewardsSkeleton() {
  if (!rewardsListEl) return
  rewardsListEl.innerHTML = `
    <div class="bonus-card skeleton-reward-card skeleton"></div>
    <div class="bonus-card skeleton-reward-card skeleton"></div>
    <div class="bonus-card skeleton-reward-card skeleton"></div>
  `
}

async function loadRewards() {
  if (!rewardsListEl) return

  renderRewardsSkeleton()

  const r = await rewardsListApi()
  const items = Array.isArray(r.items) ? r.items : []

  if (!items.length) {
    rewardsListEl.innerHTML = `
      <div class="bonus-card">
        <div class="bonus-title">Наград нет</div>
        <div class="bonus-text">Пока нечего показывать</div>
      </div>
    `
    return
  }

  rewardsListEl.innerHTML = items.map(it => {
    const key = escapeHtml(it.key || '')
    const title = escapeHtml(it.title || 'Награда')
    const desc = escapeHtml(it.desc || '')
    const status = String(it.status || 'locked')
    const canClaim = status === 'available'

    return `
      <div class="bonus-card" data-reward-key="${key}">
        <div class="bonus-title">${title}</div>
        <div class="bonus-text">${desc}</div>
        <button class="action-btn action-green reward-claim-btn" type="button" ${canClaim ? '' : 'disabled'}>
          ${canClaim ? 'Забрать' : 'Недоступно'}
        </button>
      </div>
    `
  }).join('')
}


// ===== EVENTS =====

// навигация по вкладкам
navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target
    if (target === 'admin' && !isAdmin) return
    if (target !== 'crash') stopCrashPolling()
    setScreen(target)

    if (target === 'crash') {
      if (crashBetsListEl) {
        crashBetsListEl.innerHTML = `
          <div class="crash-bet-item"><div class="crash-bet-avatar-wrap"><div class="skeleton skeleton-avatar" style="width:42px;height:42px;"></div></div><div class="crash-bet-info"><div class="skeleton skeleton-text" style="width:80px;"></div><div class="skeleton skeleton-text" style="width:60px;"></div></div></div>
          <div class="crash-bet-item"><div class="crash-bet-avatar-wrap"><div class="skeleton skeleton-avatar" style="width:42px;height:42px;"></div></div><div class="crash-bet-info"><div class="skeleton skeleton-text" style="width:70px;"></div><div class="skeleton skeleton-text" style="width:50px;"></div></div></div>
        `
      }
      startCrashPolling()
      fetchCrashState().then((s) => s && applyCrashState(s))
    }

    if (target === 'bonus') {
      loadRewards().catch(e => alert(e.message || 'Ошибка наград'))
    }

    if (target === 'admin') {
      loadAdminStats().catch(() => {})
      loadAdminPromos().catch(() => {})
      loadAdminUsers().catch(e => alert(e.message || 'Ошибка админки'))
    }
  })
})


document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.reward-claim-btn')
  if (!btn) return

  const card = btn.closest('[data-reward-key]')
  const key = card?.getAttribute('data-reward-key')
  if (!key) return

  btn.disabled = true
  setButtonLoading(btn, true)
  try {
    const r = await rewardsClaimApi(key)

    if (typeof r.newBalance === 'number') {
      balance = Number(r.newBalance)
      updateBalanceUI()
    }

    await loadRewards()
    await fetchUserData()
  } catch (err) {
    alert(err.message || 'Ошибка награды')
  } finally {
    setButtonLoading(btn, false)
    btn.disabled = false
  }
})

// клики по карточкам на главной
document.querySelectorAll('[data-home-target]').forEach(card => {
  card.addEventListener('click', () => {
    const target = card.getAttribute('data-home-target')

    if (target === 'wheel') {
      setScreen('wheel')
      return
    }

    if (target === 'cases') {
      setScreen('cases')
      return
    }

    if (target === 'frog') {
      setScreen('frog')
      return
    }

    if (target === 'crash') {
      setScreen('crash')
      return
    }
  })
})

// Кейсы: клик по карточке
caseCards.forEach(card => {
  card.addEventListener('click', () => {
    const type = card.getAttribute('data-case-type')
    const cfg = CASES?.[type]
    if (!cfg) {
      alert('Этот кейс скоро добавим.')
      return
    }
    openCase(type)
  })
})

caseOpenBackBtn?.addEventListener('click', () => {
  setScreen('home')
})

// Открыть кейс через сервер
caseOpenSpinBtn?.addEventListener('click', async () => {
  const cfg = CASES[selectedCaseType]
  if (!cfg) return

  if (isCaseOpening) return
  if (prizeModal?.classList.contains('active')) return
  if (withdrawModal?.classList.contains('active')) return

  isCaseOpening = true
  caseOpenSpinBtn.disabled = true
  setButtonLoading(caseOpenSpinBtn, true)

  try {
    const r = await openCaseApi(selectedCaseType)

    balance = Number(r?.newBalance ?? balance)
    updateBalanceUI()

    const prize = r?.prize
    if (!prize) {
      alert('Сервер не вернул приз')
      return
    }

    const pool =
      Array.isArray(r?.rollItems) && r.rollItems.length
        ? r.rollItems
        : (Array.isArray(cfg.contents) && cfg.contents.length ? cfg.contents : [prize])

    await playInlineCaseAnimation(pool, prize)

    currentPrize = prize
    currentPrizeIdx = null
    setLastPrizeText(currentPrize)
    openModal(currentPrize)
  } catch (e) {
    alert(e?.message || 'Ошибка открытия кейса')
  } finally {
    setButtonLoading(caseOpenSpinBtn, false)
    isCaseOpening = false
    caseOpenSpinBtn.disabled = false
  }
})

// Крутилка
spinButton?.addEventListener('click', async e => {
  e.preventDefault()
  e.stopPropagation()
  if (isSpinning) return
  if (prizeModal?.classList.contains('active')) return
  if (withdrawModal?.classList.contains('active')) return

  const need = Math.max(0, WHEEL_DEPOSIT_TARGET - wheelDepositProgressTon)
    .toFixed(2)
    .replace(/\.?0+$/, '')

  if (!freeWheelAvailable) {
    alert(
      need === '0'
        ? 'Сделайте депозит 0.5 TON, чтобы колесо стало бесплатным.'
        : `Сделайте депозит ещё ${need} TON, чтобы колесо стало бесплатным.`
    )
    return
  }

  isSpinning = true
  spinButton.disabled = true
  setButtonLoading(spinButton, true)

  let prizeData = null
  try {
    prizeData = await spinApi()
    setButtonLoading(spinButton, false)
  } catch (err) {
    setButtonLoading(spinButton, false)
    alert(err.message || 'Ошибка при прокрутке')
    isSpinning = false
    spinButton.disabled = false
    return
  }

  currentPrize = prizeData.prize
  currentPrizeIdx = Number.isInteger(prizeData.idx) ? prizeData.idx : null

  if (typeof prizeData.newBalance === 'number') {
    balance = Number(prizeData.newBalance)
  }
  freeWheelAvailable = Boolean(prizeData.freeWheelAvailable)
  wheelDepositProgressTon = Number(prizeData.wheelDepositProgressTon || 0)
  updateBalanceUI()

  let sectorIndex = wheelSectors.findIndex(s => s?.name === currentPrize?.name)
  if (sectorIndex < 0) sectorIndex = 0

  const N = wheelSectors.length
  const step = 360 / N
  const base = sectorIndex * step + step / 2

  const desiredAngle = 270
  const current = ((currentRotation % 360) + 360) % 360
  const delta = (((desiredAngle - base - current) % 360) + 360) % 360

  currentRotation += FULL_ROUNDS * 360 + delta
  setWheelIconsUpright(currentRotation)
})

wheel?.addEventListener('transitionend', (e) => {
  if (e.propertyName !== '--wheel-rot' && e.propertyName !== 'transform') return
  if (!isSpinning) return

  currentRotation = ((currentRotation % 360) + 360) % 360

  wheel.style.transition = 'none'
  setWheelIconsUpright(currentRotation)
  wheel.offsetHeight
  wheel.style.transition = ''

  setLastPrizeText(currentPrize)
  openModal(currentPrize)

  isSpinning = false
  fetchUserData().catch(() => {})
})

// Кнопка "В инвентарь"
modalKeepBtn?.addEventListener('click', async () => {
  if (!prizeModal) return

  try {
    const data = await fetchUserData()
    balance = Number(data.balance || balance)
    inventory = Array.isArray(data.inventory) ? data.inventory : inventory
    renderInventory()
  } catch (_) {}

  currentPrize = null
  currentPrizeIdx = null
  prizeModal.classList.remove('active')
  if (spinButton) spinButton.disabled = false
})

modalSellBtn?.addEventListener('click', async () => {
  if (!currentPrize) {
    prizeModal?.classList.remove('active')
    if (spinButton) spinButton.disabled = false
    return
  }

  try {
    const idx = 0
    const data = await sellPrizeApi(currentPrize, idx)
    balance = Number(data.newBalance ?? balance)
    updateBalanceUI()

    if (Array.isArray(data.inventory)) {
      inventory = data.inventory
      renderInventory()
    } else {
      await fetchUserData()
    }
  } catch (err) {
    alert(err.message || 'Ошибка продажи')
  } finally {
    currentPrize = null
    currentPrizeIdx = null
    prizeModal?.classList.remove('active')
    if (spinButton) spinButton.disabled = false
  }
})

// инвентарь
inventoryList?.addEventListener('click', async e => {
  const card = e.target.closest('.inv-card')
  if (!card) return

  const idx = Number(card.dataset.idx)
  const item = inventory?.[idx]
  if (!item) return

  if (e.target.classList.contains('inv-sell')) {
    try {
      const data = await sellPrizeApi(item, idx)
      balance = Number(data.newBalance ?? balance)
      updateBalanceUI()
      await fetchUserData()
    } catch (err) {
      alert(err.message || 'Ошибка продажи')
    }
  }

  if (e.target.classList.contains('inv-withdraw')) {
    try {
      const r = await withdrawGiftApi(idx)
      inventory = Array.isArray(r.inventory) ? r.inventory : inventory
      renderInventory()
      alert('Заявка на вывод подарка отправлена админу.')
    } catch (err) {
      alert(err.message || 'Ошибка вывода подарка')
    }
  }
})

// промокоды
promoApplyBtn?.addEventListener('click', async () => {
  const code = (promoInput?.value || '').trim()
  if (!code) {
    alert('Введите промокод')
    return
  }

  setButtonLoading(promoApplyBtn, true)
  try {
    const data = await applyPromoApi(code)

    if (data.type === 'balance' || typeof data.amount === 'number') {
      balance = Number(data.newBalance ?? balance)
      updateBalanceUI()
      promoInput.value = ''
      alert(`Промокод применён: +${Number(data.amount || 0).toFixed(2)} TON`)
      await fetchUserData()
      return
    }

    if (data.type === 'gift' && data.prize) {
      if (Array.isArray(data.inventory)) inventory = data.inventory
      renderInventory()
      promoInput.value = ''
      alert('Промокод применён: подарок зачислен в инвентарь.')
      await fetchUserData()
      return
    }

    alert('Промокод применён')
    promoInput.value = ''
    await fetchUserData()
  } catch (err) {
    alert(err.message || 'Ошибка промокода')
  } finally {
    setButtonLoading(promoApplyBtn, false)
  }
})

// ===== DEPOSIT TON =====
let currentDepositTab = 'ton'

function setDepositTab(tab) {
  currentDepositTab = tab === 'nft' ? 'nft' : 'ton'

  depositTabs.forEach(btn => {
    const val = btn.dataset.depositTab || 'ton'
    btn.classList.toggle('active', val === currentDepositTab)
  })

  if (depositBodyTon) depositBodyTon.style.display = currentDepositTab === 'ton' ? 'block' : 'none'
  if (depositBodyNft) depositBodyNft.style.display = currentDepositTab === 'nft' ? 'block' : 'none'

  if (depositConfirmBtn) {
    depositConfirmBtn.style.display = currentDepositTab === 'ton' ? '' : 'none'
  }
}

depositTabs.forEach(btn => {
  btn.addEventListener('click', () => {
    const tab = btn.dataset.depositTab || 'ton'
    setDepositTab(tab)
  })
})

depositNftContactBtn?.addEventListener('click', () => {
  if (!tg || !tg.openTelegramLink) {
    window.open('https://t.me/modergw', '_blank')
    return
  }
  tg.openTelegramLink('https://t.me/modergw')
})

function openDepositModalFromAnyButton() {
  if (!depositModal) return
  setDepositTab('ton')
  const connected = isWalletConnected()
  if (depositAmountInput) depositAmountInput.disabled = !connected
  if (depositConfirmBtn) depositConfirmBtn.disabled = !connected
  depositModal.classList.add('active')
}

walletStatusBtn?.addEventListener('click', openDepositModalFromAnyButton)
depositBtn?.addEventListener('click', openDepositModalFromAnyButton)

depositCancelBtn?.addEventListener('click', () => {
  if (!depositModal) return
  depositModal.classList.remove('active')
})

connectTonBtn?.addEventListener('click', async () => {
  try {
    await tonConnectUI.openModal()
  } catch (_) {}

  const connected = isWalletConnected()
  if (depositAmountInput) depositAmountInput.disabled = !connected
  if (depositConfirmBtn) depositConfirmBtn.disabled = !connected
  updateConnectButtonUI()
})

depositConfirmBtn?.addEventListener('click', async () => {
  try {
    if (!isWalletConnected()) {
      alert('Сначала подключи TON-кошелёк.')
      return
    }

    let minDeposit = MIN_DEPOSIT_TON
    try {
      const info = await depositInfoApi()
      minDeposit = Number(info.minDeposit ?? MIN_DEPOSIT_TON)
    } catch (_) {}

    const raw = String(depositAmountInput?.value || '').replace(',', '.').trim()
    const amountTon = Number(raw)

    if (!Number.isFinite(amountTon) || amountTon <= 0) {
      alert('Введите корректную сумму')
      return
    }
    if (amountTon < minDeposit) {
      alert(`Минимум ${minDeposit} TON`)
      return
    }

    depositConfirmBtn.disabled = true
    setButtonLoading(depositConfirmBtn, true)

    const dep = await depositCreateApi(amountTon)

    const tx = {
      validUntil: Math.floor(Date.now() / 1000) + 360,
      messages: [
        {
          address: dep.address,
          amount: toNanoString(dep.amount),
          payload: dep.payloadBase64,
        },
      ],
    }

    alert('Подтверди транзакцию в кошельке...')
    let requestSent = false

    await tonConnectUI.sendTransaction(tx, {
      modals: ['before', 'success', 'error'],
      notifications: ['before', 'success', 'error'],
      skipRedirectToWallet: 'never',
      onRequestSent: () => {
        requestSent = true
        alert('Запрос отправлен в кошелёк. Подтверди транзакцию.')
      },
    })

    if (!requestSent) {
      alert('Ожидаем подтверждение... (если кошелёк не открылся — открой вручную)')
    }

    for (let i = 0; i < 12; i++) {
      await sleep(5000)
      const r = await depositCheckApi(dep.depositId)
      if (r.credited) {
        await fetchUserData()
        alert(`Депозит зачислен: +${Number(dep.amount).toFixed(2)} TON`)
        depositModal.classList.remove('active')
        return
      }
    }

    alert('Транзакция отправлена. Если не зачислилось — подожди 1–2 минуты и попробуй ещё раз.')
  } catch (err) {
    alert(err.message || 'Ошибка депозита')
  } finally {
    setButtonLoading(depositConfirmBtn, false)
    depositConfirmBtn.disabled = false
    updateDepositButtonState()
  }
})

// withdraw TON
withdrawBtn?.addEventListener('click', () => {
  openWithdrawModal(String(Math.max(MIN_WITHDRAW_TON, 5)))
})

withdrawCancelBtn?.addEventListener('click', () => closeWithdrawModal())

withdrawConfirmBtn?.addEventListener('click', async () => {
  const raw = String(withdrawAmountInput?.value || '').replace(',', '.').trim()
  const amount = Number(raw)

  if (!Number.isFinite(amount)) {
    alert('Введите корректную сумму')
    return
  }
  if (amount < MIN_WITHDRAW_TON) {
    alert(`Минимум ${MIN_WITHDRAW_TON} TON`)
    return
  }
  if (amount > balance) {
    alert('Недостаточно средств')
    return
  }

  try {
    withdrawConfirmBtn.disabled = true
    setButtonLoading(withdrawConfirmBtn, true)
    const r = await withdrawTonApi(amount)
    balance = Number(r.newBalance ?? balance)
    updateBalanceUI()
    closeWithdrawModal()
    alert(`Заявка на вывод ${amount.toFixed(2)} TON отправлена админу.`)
    await fetchUserData()
  } catch (err) {
    const msg = String(err.message || '')
    if (msg.includes('минимальное пополнение')) {
      alert('Прежде чем вывести, нужно сделать минимальное пополнение 1 TON')
    } else {
      alert(msg || 'Ошибка заявки на вывод')
    }
  } finally {
    setButtonLoading(withdrawConfirmBtn, false)
    withdrawConfirmBtn.disabled = false
  }
})

// ===== CRASH (logic + canvas animation: rocket -> moon) =====
const crashCanvas = document.getElementById('crash-canvas')
const crashCtx = crashCanvas ? crashCanvas.getContext('2d') : null

const rocketVideo = document.getElementById('rocket-video')

// offscreen canvas для вырезания чёрного фона (chroma key)
const rocketKeyCanvas = document.createElement('canvas')
const rocketKeyCtx = rocketKeyCanvas.getContext('2d', { willReadFrequently: true })

const crashMultiplierEl = document.getElementById('crash-multiplier')
const crashStatusEl = document.getElementById('crash-status')
const crashBetInput = document.getElementById('crash-bet-input')
const crashMainActionBtn = document.getElementById('crash-main-action')
const crashCurrentBetEl = document.getElementById('crash-current-bet')
const crashPotentialWinEl = document.getElementById('crash-potential-win')
const crashCountdownEl = document.getElementById('crash-countdown')
const crashCountdownNumEl = document.getElementById('crash-countdown-num')
const crashBetsListEl = document.getElementById('crash-bets-list')
const crashHistoryListEl = document.getElementById('crash-history-list')

let crashState = 'idle' // idle | counting | playing | crashed
let crashMultiplier = 1.0
let crashPoint = null

let crashBetAmount = 0
let crashHasCashedOut = false

let crashAnimFrame = null
let crashStartTime = null

let crashRoundState = null
let crashPollTimer = null
let crashCountdownTimer = null
let crashLastRoundId = null

// m(t) = exp(k*t), синхронно с сервером
let crashK = 0.07

// визуальные состояния
let crashImpact = null // {x,y,ts}
let crashShake = 0 // 0..1

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v))
}

function initCrashCanvas() {
  if (!crashCanvas || !crashCtx) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const rect = crashCanvas.getBoundingClientRect()
  crashCanvas.width = Math.max(1, Math.floor(rect.width * dpr))
  crashCanvas.height = Math.max(1, Math.floor(rect.height * dpr))
  crashCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

async function ensureRocketVideoPlaying() {
  if (!rocketVideo) return
  try {
    rocketVideo.muted = true
    rocketVideo.playsInline = true
    await rocketVideo.play()
  } catch (_) {
    // autoplay может быть заблокирован — норм
  }
}

async function fetchCrashState() {
  try {
    const data = await apiPost('/crash/state', {})
    crashRoundState = data
    return data
  } catch (e) {
    return null
  }
}

function renderCrashBets(bets, roundStatus) {
  if (!crashBetsListEl) return
  if (!Array.isArray(bets) || bets.length === 0) {
    crashBetsListEl.innerHTML = '<div class="crash-bets-empty">Пока нет ставок</div>'
    return
  }
  const showStatus = roundStatus === 'flying' || roundStatus === 'crashed'
  crashBetsListEl.innerHTML = bets
    .map((b) => {
      const name = escapeHtml(b.firstName || b.username || 'User')
      const username = b.username ? `@${escapeHtml(b.username)}` : name
      const photo = b.photoUrl ? `style="background-image:url('${String(b.photoUrl).replace(/'/g, "\\'")}')"` : ''
      const amount = Number(b.amount || 0).toFixed(2)
      const cashed = !!b.cashedOut
      const mult = Number(b.cashoutMultiplier || 0)
      let statusClass = ''
      let statusHtml = ''
      if (showStatus) {
        statusClass = cashed ? 'cashed-out' : 'busted'
        statusHtml = cashed
          ? `<span class="crash-bet-cashout win">${mult > 0 ? mult.toFixed(2) + 'x' : '✓'}</span>`
          : `<span class="crash-bet-cashout loss">0x</span>`
      }
      return `
        <div class="crash-bet-item ${statusClass}">
          <div class="crash-bet-avatar-wrap">
            <div class="crash-bet-user" ${photo}></div>
          </div>
          <div class="crash-bet-info">
            <span class="crash-bet-username">${escapeHtml(username)}</span>
            <div class="crash-bet-right">
              <div class="crash-bet-amount-row">
                <span class="crash-ton-logo"></span>
                <span class="crash-bet-amount">${amount}</span>
              </div>
              ${statusHtml}
            </div>
          </div>
        </div>
      `
    })
    .join('')
}

function renderCrashHistory(history) {
  if (!crashHistoryListEl) return
  if (!Array.isArray(history) || history.length === 0) {
    crashHistoryListEl.innerHTML = ''
    return
  }
  crashHistoryListEl.innerHTML = history
    .map((h) => {
      const mult = Number(h.multiplier || 0)
      const multStr = mult.toFixed(2)
      let cls = 'history-low'
      if (mult > 10) cls = 'history-high'
      else if (mult >= 2) cls = 'history-mid'
      return `<div class="crash-history-item ${cls}">${multStr}x</div>`
    })
    .join('')
}

function runCrashCountdown(countdownEndsAt) {
  if (!crashCountdownEl || !crashCountdownNumEl) return
  if (crashCountdownTimer) {
    clearTimeout(crashCountdownTimer)
    crashCountdownTimer = null
  }
  crashCountdownEl.classList.remove('hidden')

  let lastNum = -1
  function tick() {
    const now = Date.now()
    const left = Math.max(0, countdownEndsAt - now)
    const num = left > 0 ? Math.min(7, Math.ceil(left / 1000)) : 0

    if (num !== lastNum) {
      lastNum = num
      crashCountdownNumEl.textContent = num > 0 ? String(num) : '1'
      if (num > 0) {
        crashCountdownNumEl.style.animation = 'none'
        crashCountdownNumEl.offsetHeight
        crashCountdownNumEl.style.animation = 'crashCountdownPop 0.9s ease-out'
      }
    }

    if (num > 0) {
      const msToNext = (left % 1000) || 1000
      crashCountdownTimer = setTimeout(tick, Math.min(msToNext, 1000))
    } else {
      crashCountdownEl.classList.add('hidden')
      crashCountdownTimer = null
    }
  }
  tick()
}

function applyCrashState(state) {
  if (!state) return
  const roundStatus = state.round ? state.round.status : null
  renderCrashBets(state.bets || [], roundStatus)
  renderCrashHistory(state.history || [])

  const round = state.round
  if (!round) {
    screens.crash?.classList.remove('playing')
    crashState = 'idle'
    crashLastRoundId = null
    setCrashStatus('Скоро взлетаем', '#e5e7eb')
    updateCrashButtonUI()
    return
  }

  // если до этого летели, а теперь сервер прислал не flying — принудительно докручиваем взрыв
  if (crashState === 'playing' && round.status !== 'flying') {
    crashBoomIntoMoon()
    endCrash()
  }

  if (round.status === 'counting') {
    screens.crash?.classList.remove('playing')
    // запускаем отсчёт только при входе в новый раунд,
    // чтобы не дёргать анимацию на каждом опросе и при ставке
    if (crashLastRoundId !== round.id || crashState !== 'counting') {
      crashLastRoundId = round.id
      crashState = 'counting'
      if (round.countdownEndsAt && round.countdownEndsAt > Date.now() + 100) {
        runCrashCountdown(round.countdownEndsAt)
      }
    }
    const myBet = state.myBet
    crashBetAmount = myBet ? myBet.amount : 0
    crashHasCashedOut = myBet ? !!myBet.cashedOut : false
    setCrashStatus('Ставки принимаются', '#e5e7eb')
    updateCrashButtonUI()
    return
  }

  if (round.status === 'flying') {
    if (crashState === 'crashed') return
    screens.crash?.classList.add('playing')
    if (crashCountdownTimer) {
      clearTimeout(crashCountdownTimer)
      crashCountdownTimer = null
    }
    if (crashCountdownEl) crashCountdownEl.classList.add('hidden')

    // Входим в новый летящий раунд: инициализируем один раз
    if (crashLastRoundId !== round.id || crashState !== 'playing') {
      crashLastRoundId = round.id
      crashState = 'playing'
      crashPoint = round.crashPoint
      crashStartTime = round.flyingStartedAt || Date.now()
      crashBetAmount = state.myBet ? state.myBet.amount : 0
      crashHasCashedOut = state.myBet ? !!state.myBet.cashedOut : false
      crashMultiplier = 1.0
      if (crashMultiplierEl) crashMultiplierEl.textContent = '1.00x'
      setCrashStatus('Летим...', '#e5e7eb')
      ensureRocketVideoPlaying().catch?.(() => {})
      startCrashRenderLoop()
    }

    updateCrashButtonUI()
    return
  }

  screens.crash?.classList.remove('playing')
  crashLastRoundId = null
  crashState = 'idle'
  setCrashStatus('Скоро взлетаем', '#e5e7eb')
  updateCrashButtonUI()
}

function getSceneSize() {
  const rect = crashCanvas.getBoundingClientRect()
  return { w: rect.width, h: rect.height }
}

// ---------- particles ----------
const particles = []

function spawnExplosion(x, y) {
  const n = 140
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2
    const sp = 120 + Math.random() * 360
    particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0,
      max: 0.7 + Math.random() * 0.7,
      size: 3.0 + Math.random() * 6.0,
      hue: 35 + Math.random() * 25,
    })
  }
}

function stepParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.life += dt
    const t = p.life / p.max
    if (t >= 1) {
      particles.splice(i, 1)
      continue
    }
    p.vx *= 0.985
    p.vy = p.vy * 0.985 + 120 * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
  }
}

function drawParticles(ctx) {
  for (const p of particles) {
    const t = p.life / p.max
    const alpha = (1 - t) * 0.9
    ctx.fillStyle = `hsla(${p.hue}, 95%, 60%, ${alpha})`
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size * (1 + t * 0.4), 0, Math.PI * 2)
    ctx.fill()
  }
}

// (можно оставить старую векторную ракету — она больше не используется)
function drawRocket(ctx, x, y, ang, flamePower) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(ang)

  ctx.fillStyle = '#e5e7eb'
  ctx.strokeStyle = 'rgba(15,23,42,0.8)'
  ctx.lineWidth = 1.2

  ctx.beginPath()
  ctx.moveTo(18, 0)
  ctx.quadraticCurveTo(6, -12, -12, -8)
  ctx.lineTo(-16, 0)
  ctx.lineTo(-12, 8)
  ctx.quadraticCurveTo(6, 12, 18, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = 'rgba(56,189,248,0.9)'
  ctx.beginPath()
  ctx.arc(2, 0, 4, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#94a3b8'
  ctx.beginPath()
  ctx.moveTo(-8, -6)
  ctx.lineTo(-20, -14)
  ctx.lineTo(-12, -2)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-8, 6)
  ctx.lineTo(-20, 14)
  ctx.lineTo(-12, 2)
  ctx.closePath()
  ctx.fill()

  const fp = clamp(flamePower, 0, 1)
  if (fp > 0.02) {
    const len = 14 + fp * 18
    const wid = 5 + fp * 5
    const grad = ctx.createRadialGradient(-18 - len * 0.2, 0, 2, -18 - len, 0, len)
    grad.addColorStop(0, 'rgba(251,191,36,0.95)')
    grad.addColorStop(0.5, 'rgba(249,115,22,0.7)')
    grad.addColorStop(1, 'rgba(239,68,68,0)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.moveTo(-16, 0)
    ctx.quadraticCurveTo(-16 - len, -wid, -16 - len * 1.2, 0)
    ctx.quadraticCurveTo(-16 - len, wid, -16, 0)
    ctx.closePath()
    ctx.fill()
  }

  ctx.restore()
}

// Видео-ракета: правильные пропорции + наклон + вырезание чёрного фона
function drawRocketVideo(ctx, x, y, ang, size = 70) {
  if (!rocketVideo || rocketVideo.readyState < 2 || !rocketKeyCtx) return

  const vw = rocketVideo.videoWidth
  const vh = rocketVideo.videoHeight
  if (!vw || !vh) return

  // 1) кадр видео -> offscreen canvas
  rocketKeyCanvas.width = vw
  rocketKeyCanvas.height = vh
  rocketKeyCtx.clearRect(0, 0, vw, vh)
  rocketKeyCtx.drawImage(rocketVideo, 0, 0, vw, vh)

  // 2) вырезаем "почти чёрный" фон
  const frame = rocketKeyCtx.getImageData(0, 0, vw, vh)
  const d = frame.data
  const threshold = 45 // если съедает ракету — уменьши (30–40)

  for (let i = 0; i < d.length; i += 4) {
    const r = d[i]
    const g = d[i + 1]
    const b = d[i + 2]
    if (r <= threshold && g <= threshold && b <= threshold) {
      d[i + 3] = 0
    }
  }
  rocketKeyCtx.putImageData(frame, 0, 0)

  // 3) сохраняем реальные пропорции видео
  const aspect = vw / vh

  const width = size * 2.85
  const height = width / aspect   // <-- ВАЖНО: теперь нет растяжения

  const extraTilt = 0.25

  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(ang + extraTilt)

  ctx.drawImage(
    rocketKeyCanvas,
    -width / 2,
    -height / 2,
    width,
    height
  )

  ctx.restore()
}


// ---------- UI ----------
function updateCrashButtonUI() {
  if (!crashMainActionBtn) return
  if (crashState === 'idle' || crashState === 'counting') {
    crashMainActionBtn.textContent = 'Сделать ставку'
    crashMainActionBtn.disabled = false
  } else if (crashState === 'playing') {
    crashMainActionBtn.textContent = 'Забрать'
    crashMainActionBtn.disabled = !(crashBetAmount > 0 && !crashHasCashedOut)
  } else {
    crashMainActionBtn.textContent = 'Раунд завершён'
    crashMainActionBtn.disabled = true
  }
}

function updateCrashMultiplierUI() {
  if (crashMultiplierEl) crashMultiplierEl.textContent = `${crashMultiplier.toFixed(2)}x`
  updateCrashButtonUI()
}

function setCrashStatus(text, color) {
  if (!crashStatusEl) return
  crashStatusEl.textContent = text
  crashStatusEl.style.color = color || '#e5e7eb'
}

// ---------- logic ----------
function stepCrashMultiplier() {
  const t = Math.max(0, (Date.now() - crashStartTime) / 1000)
  crashMultiplier = Math.exp(crashK * t)
  if (!Number.isFinite(crashMultiplier) || crashMultiplier < 1) crashMultiplier = 1
  if (crashPoint != null && crashMultiplier > crashPoint) crashMultiplier = crashPoint
}

async function cashoutCrash(isAuto = false) {
  if (crashState !== 'playing') return
  if (crashHasCashedOut) return

  const winAmount = crashBetAmount * crashMultiplier

  try {
    const r = await apiPost('/crash/cashout', { amount: winAmount })
    balance = Number(r.newBalance ?? balance)
    updateBalanceUI()

    crashHasCashedOut = true
    setCrashStatus(isAuto ? 'Авто-вывод!' : 'Вы забрали!', '#22c55e')
    updateCrashButtonUI()
    const state = await fetchCrashState()
    if (state) applyCrashState(state)
  } catch (err) {
    alert(err.message || 'Ошибка вывода')
  }
}

function crashBoomIntoMoon() {
  if (!crashCanvas) return
  const { w, h } = getSceneSize()

  // Точка взрыва = точка ракеты (фикс сверху)
  const ix = Math.round(w * 0.5)
  const iy = Math.round(h * 0.6)

  crashImpact = { x: ix, y: iy, ts: performance.now() }
  crashShake = 1
  spawnExplosion(ix, iy)

  // показываем взрыв всегда, даже если игрок успел забрать
  setCrashStatus('Краш!', '#f97373')
}

function endCrash() {
  crashState = 'crashed'
  screens.crash?.classList.remove('playing')
  updateCrashButtonUI()

  setTimeout(() => {
    crashState = 'idle'
    crashMultiplier = 1.0
    crashBetAmount = 0
    crashPoint = null
    crashHasCashedOut = false
    crashImpact = null
    crashShake = 0

    setCrashStatus('Скоро взлетаем', '#e5e7eb')
    if (crashMultiplierEl) crashMultiplierEl.textContent = '1.00x'
    if (crashCurrentBetEl) crashCurrentBetEl.textContent = '—'
    if (crashPotentialWinEl) crashPotentialWinEl.textContent = '—'
    updateCrashButtonUI()

    startCrashRenderLoop()
  }, 2000)
}

async function startCrash() {
  if (crashState !== 'idle' && crashState !== 'counting') return

  const amount = parseFloat(crashBetInput?.value || '0')
  if (isNaN(amount) || amount < 0.1) {
    alert('Минимум 0.1 TON')
    return
  }
  if (balance < amount) {
    alert('Недостаточно средств.')
    return
  }

  try {
    const r = await apiPost('/crash/bet', { amount })
    balance = Number(r.newBalance ?? balance)
    updateBalanceUI()
    crashBetAmount = amount
    crashHasCashedOut = false
    const state = await fetchCrashState()
    if (state) applyCrashState(state)
  } catch (err) {
    alert(err.message || 'Ошибка ставки')
  }
}

// ---------- render loop ----------
let lastFrameTs = 0
function startCrashRenderLoop() {
  if (!crashCanvas || !crashCtx) return
  initCrashCanvas()

  if (crashAnimFrame) cancelAnimationFrame(crashAnimFrame)
  lastFrameTs = 0
  crashAnimFrame = requestAnimationFrame(renderCrash)
}

function renderCrash(ts) {
  if (!crashCtx || !crashCanvas) return

  // 1) логика каждый кадр
  if (crashState === 'playing') {
    stepCrashMultiplier()
    updateCrashMultiplierUI()
    if (crashPoint != null && crashMultiplier >= crashPoint && !crashHasCashedOut) {
      crashState = 'crashed'
      crashBoomIntoMoon()
      endCrash()
    }
  }

  // 2) dt
  const dt = clamp((ts - lastFrameTs) / 1000 || 0, 0, 0.05)
  lastFrameTs = ts

  const { w, h } = getSceneSize()

  if (crashShake > 0) crashShake = Math.max(0, crashShake - dt * 4)

  crashCtx.save()
  if (crashShake > 0.001) {
    const mag = crashShake * 6
    crashCtx.translate((Math.random() - 0.5) * mag, (Math.random() - 0.5) * mag)
  }

  // canvas прозрачный, фон = видео под ним
  crashCtx.clearRect(0, 0, w, h)

  // Ракета фиксированно сверху
  if (crashState === 'playing') {
    const rx = w * 0.5
    const ry = h * 0.6
    const ang = -0.25
    drawRocketVideo(crashCtx, rx, ry, ang, 92)
  }

  if (crashState === 'crashed' && crashImpact) {
    const t = (performance.now() - crashImpact.ts) / 1000
    const a = Math.max(0, 1 - t / 0.5)
    if (a > 0) {
      crashCtx.globalAlpha = a
      crashCtx.fillStyle = 'rgba(251,191,36,0.8)'
      crashCtx.beginPath()
      crashCtx.arc(crashImpact.x, crashImpact.y, 18 + t * 120, 0, Math.PI * 2)
      crashCtx.fill()
      crashCtx.globalAlpha = 1
    }
  }

  stepParticles(dt)
  drawParticles(crashCtx)

  crashCtx.restore()

  const needMore =
    crashState === 'playing' || crashState === 'crashed' || particles.length > 0 || crashShake > 0.001
  if (needMore) crashAnimFrame = requestAnimationFrame(renderCrash)
}

function startCrashPolling() {
  if (crashPollTimer) return
  function poll() {
    if (!screens.crash?.classList.contains('active')) return
    fetchCrashState().then((state) => {
      if (state) {
        applyCrashState(state)
        const round = state.round
        let interval = 1500
        if (round?.status === 'counting' && round?.countdownEndsAt) {
          const left = round.countdownEndsAt - Date.now()
          if (left > 0 && left < 4000) interval = 300
          else if (left > 0 && left < 7000) interval = 600
        } else if (round?.status === 'flying') interval = 800
        crashPollTimer = setTimeout(poll, interval)
      } else {
        crashPollTimer = setTimeout(poll, 1500)
      }
    })
  }
  poll()
}

function stopCrashPolling() {
  if (crashPollTimer) {
    clearTimeout(crashPollTimer)
    crashPollTimer = null
  }
  if (crashCountdownTimer) {
    clearTimeout(crashCountdownTimer)
    crashCountdownTimer = null
  }
}

// ---------- controls ----------
crashMainActionBtn?.addEventListener('click', async () => {
  await ensureRocketVideoPlaying()
  if (crashState === 'idle' || crashState === 'counting') startCrash()
  else if (crashState === 'playing') cashoutCrash(false)
})

window.addEventListener('resize', () => {
  if (!crashCanvas) return
  initCrashCanvas()
  startCrashRenderLoop()
})

// ===== FROGTON LOGIC =====
async function frogStartBet() {
  if (frogState !== 'idle' && frogState !== 'cashed' && frogState !== 'dead') return
  if (!frogBetInput) return

  const amount = Number(frogBetInput.value || 0)
  if (!Number.isFinite(amount) || amount <= 0) {
    alert('Укажи ставку (TON)')
    return
  }

  if (amount > balance) {
    alert('Недостаточно средств')
    return
  }

  try {
    const r = await apiPost('/crash/bet', { amount })
    balance = Number(r.newBalance ?? balance)
    updateBalanceUI()
  } catch (e) {
    alert(e.message || 'Ошибка ставки')
    return
  }

  await initFrogGraphics()

  frogBet = amount
frogState = 'bet_placed'
frogCurrentHatch = -1
frogWinningHatch = Math.floor(Math.random() * FROG_HATCH_MULTS.length)
frogAutoHatch = null
frogJumpProgress = 0
frogIsJumping = false





  if (frogScrollEl) frogScrollEl.scrollLeft = 0

  updateFrogUI()
  drawFrogScene(false)
}

async function frogJump() {
  if (frogState !== 'bet_placed' && frogState !== 'running') return

  // первый прыжок: от светофора к люку 0
  if (frogCurrentHatch < 0) {
    frogState = 'running'
    const targetIndex = 0

    const w = frogCanvas.width
    const startX = w * 0.22                   // экранная позиция старта
    const endWorldX = getHatchX(targetIndex)  // мировая
    const endX = endWorldX - frogCameraOffset // экранная позиция люка

    const duration = 500
    const startTime = performance.now()

    frogIsJumping = true

    await new Promise(resolve => {
      function step(t) {
        const k = Math.min(1, (t - startTime) / duration)
        const ease = k * (2 - k)

        frogJumpProgress = ease
        frogAnimX = startX + (endX - startX) * ease

        drawFrogScene(false)

        if (k < 1) {
          requestAnimationFrame(step)
        } else {
          frogIsJumping = false
          frogJumpProgress = 0
          frogCurrentHatch = targetIndex

          frogCameraOffset = getHatchX(frogCurrentHatch) - frogCanvas.width * 0.4

          drawFrogScene(false)
          resolve()
        }
      }
      requestAnimationFrame(step)
    })

    updateFrogUI()
    return
  }

  // последующие прыжки: от люка к люку
  const fromIndex = frogCurrentHatch
  const toIndex = frogCurrentHatch + 1
  if (toIndex >= FROG_HATCH_MULTS.length) return

  frogState = 'running'

  // считаем в МИРОВЫХ координатах, а на экран выводим через камеру
  const startWorldX = getHatchX(fromIndex)
  const endWorldX = getHatchX(toIndex)

  const duration = 500
  const startTime = performance.now()

  frogIsJumping = true

  await new Promise(resolve => {
    function step(t) {
      const k = Math.min(1, (t - startTime) / duration)
      const ease = k * (2 - k)

      frogJumpProgress = ease

      const interpWorldX = startWorldX + (endWorldX - startWorldX) * ease
      frogAnimX = interpWorldX - frogCameraOffset   // переводим в экранные

      drawFrogScene(false)

      if (k < 1) {
        requestAnimationFrame(step)
      } else {
        frogIsJumping = false
        frogJumpProgress = 0
        frogCurrentHatch = toIndex

        frogCameraOffset = getHatchX(frogCurrentHatch) - frogCanvas.width * 0.4

        drawFrogScene(false)
        resolve()
      }
    }
    requestAnimationFrame(step)
  })

  updateFrogUI()

  if (frogAutoHatch !== null && frogCurrentHatch === frogAutoHatch) {
    await frogCashout()
    return
  }

  if (frogWinningHatch >= 0 && frogCurrentHatch > frogWinningHatch) {
    await frogDie()
  }
}

async function frogCashout() {
  if (frogState !== 'bet_placed' && frogState !== 'running') return

  // здесь по-хорошему надо считать win и отправлять на сервер
  await frogDie()
}

async function frogDie() {
  frogState = 'dead'
  updateFrogUI()
  drawFrogScene(true)

  alert('Лягушку сбила машина. Ставка проиграна.')

  frogBet = 0
  frogCurrentHatch = -1
  frogWinningHatch = -1
  frogAutoHatch = null
}


// кнопки FrogTon
frogMainActionBtn?.addEventListener('click', async () => {
  if (frogState === 'idle' || frogState === 'cashed' || frogState === 'dead') {
    await frogStartBet()
  } else if (frogState === 'bet_placed' || frogState === 'running') {
    await frogJump()
  }
})

const frogCashoutBtn = document.getElementById('frog-cashout-btn')
frogCashoutBtn?.addEventListener('click', async () => {
  await frogCashout()
})

// ===== ADMIN EVENTS =====
adminPromoType?.addEventListener('change', () => {
  const t = String(adminPromoType.value || 'gift')
  if (!adminPromoAmount) return
  adminPromoAmount.disabled = t !== 'balance'
})

adminPromoCreateBtn?.addEventListener('click', async () => {
  if (!isAdmin) return
  const type = String(adminPromoType?.value || 'gift')
  const code = String(adminPromoCode?.value || '').trim()
  const maxUses = Number(adminPromoMaxUses?.value || 1)

  if (!code) {
    alert('Введите код')
    return
  }
  if (!Number.isInteger(maxUses) || maxUses < 1) {
    alert('maxUses должен быть >= 1')
    return
  }

  try {
    adminPromoCreateBtn.disabled = true

    if (type === 'balance') {
      const amount = Number(String(adminPromoAmount?.value || '').replace(',', '.'))
      if (!Number.isFinite(amount) || amount <= 0) {
        alert('Сумма TON должна быть > 0')
        return
      }
      await adminPromoCreateApi({ type: 'balance', code, amount, maxUses })
    } else {
      await adminPromoCreateApi({ type: 'gift', code, giftName: 'Мишка', maxUses })
    }

    if (adminPromoCode) adminPromoCode.value = ''
    if (adminPromoAmount) adminPromoAmount.value = ''
    await loadAdminPromos()
    alert('Промокод создан')
  } catch (e) {
    alert(e.message || 'Ошибка создания промокода')
  } finally {
    adminPromoCreateBtn.disabled = false
  }
})

adminPromosRefresh?.addEventListener('click', async () => {
  try {
    await loadAdminPromos()
  } catch (e) {
    alert(e.message || 'Ошибка')
  }
})

adminPromosList?.addEventListener('click', async e => {
  const btn = e.target.closest('[data-del-promo]')
  if (!btn) return
  const code = btn.getAttribute('data-del-promo')
  if (!code) return
  if (!confirm(`Удалить промокод ${code}?`)) return
  try {
    await adminPromoDeleteApi(code)
    await loadAdminPromos()
  } catch (e) {
    alert(e.message || 'Ошибка удаления')
  }
})

adminStatsRefresh?.addEventListener('click', async () => {
  try {
    await loadAdminStats()
  } catch (e) {
    alert(e.message || 'Ошибка')
  }
})

adminUsersSearch?.addEventListener('click', async () => {
  adminState.q = String(adminUsersQ?.value || '').trim()
  adminState.page = 1
  try {
    await loadAdminUsers()
  } catch (e) {
    alert(e.message || 'Ошибка')
  }
})

adminPrev?.addEventListener('click', async () => {
  if (adminState.page <= 1) return
  adminState.page -= 1
  try {
    await loadAdminUsers()
  } catch (e) {
    alert(e.message || 'Ошибка')
  }
})

adminNext?.addEventListener('click', async () => {
  if (adminState.page >= adminState.pages) return
  adminState.page += 1
  try {
    await loadAdminUsers()
  } catch (e) {
    alert(e.message || 'Ошибка')
  }
})

adminAdjApply?.addEventListener('click', async () => {
  if (!isAdmin) return
  const tgId = String(adminAdjTgId?.value || '').trim()
  const delta = Number(String(adminAdjDelta?.value || '').replace(',', '.'))

  if (!tgId) {
    alert('Введите tg_id')
    return
  }
  if (!Number.isFinite(delta) || delta === 0) {
    alert('Введите delta (например +1 или -1)')
    return
  }

  try {
    adminAdjApply.disabled = true
    const r = await adminAdjustBalanceApi(tgId, delta)
    if (adminAdjResult) adminAdjResult.textContent = `OK. New balance: ${Number(r.newBalance || 0).toFixed(2)} TON`
    await loadAdminStats()
  } catch (e) {
    if (adminAdjResult) adminAdjResult.textContent = e.message || 'Ошибка'
    alert(e.message || 'Ошибка')
  } finally {
    adminAdjApply.disabled = false
  }
})

async function createBroadcast(delaySec) {
  if (!isAdmin) return
  const text = String(adminBcText?.value || '').trim()
  if (!text) { alert('Введите текст рассылки'); return }

  try {
    const r = await adminBroadcastCreateApi(text, delaySec)
    const when = new Date(Number(r.runAt || Date.now())).toLocaleString()
    if (adminBcResult) adminBcResult.textContent = `✅ Задача создана (#${r.jobId}). Отправка: ${when}`
    alert('Задача рассылки создана')
  } catch (e) {
    if (adminBcResult) adminBcResult.textContent = `❌ Ошибка: ${e?.message || e}`
    alert(e?.message || 'Ошибка рассылки')
  }
}

adminBcNow?.addEventListener('click', () => createBroadcast(0))
adminBc10m?.addEventListener('click', () => createBroadcast(10 * 60))
adminBc1h?.addEventListener('click', () => createBroadcast(60 * 60))
adminBc24h?.addEventListener('click', () => createBroadcast(24 * 60 * 60))


// ===== LOADING HELPERS =====
const appLoadingEl = document.getElementById('app-loading')

function hideAppLoading() {
  appLoadingEl?.classList.add('hidden')
}

function setButtonLoading(btn, loading) {
  if (!btn) return
  if (loading) {
    btn.classList.add('btn-loading')
    if (!btn.querySelector('.spinner')) {
      const s = document.createElement('span')
      s.className = 'spinner'
      btn.appendChild(s)
    }
  } else {
    btn.classList.remove('btn-loading')
    btn.querySelector('.spinner')?.remove()
  }
}

// ===== INIT =====
async function init() {
  updateTelegramUserUI();
  renderWheel();
  renderPrizesList();
  renderCasesMenuFromConfig();
  setLastPrizeText(null);
  updateInviteUI();
  updateDepositButtonState();

  try {
    await fetchUserData();
    hideAppLoading();
    if (isAdmin) {
      await Promise.allSettled([
        loadAdminStats(),
        loadAdminPromos(),
        loadAdminUsers(),
      ]);
    }
  } catch (err) {
    hideAppLoading();
    alert(err.message || 'Unknown error');
  }

  await initFrogGraphics();
  drawFrogScene(false);   // ВАЖНО: первый кадр
  updateFrogUI();
}


init()














































