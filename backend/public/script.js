// ===== CONFIG =====
const API_URL = '/api'
const SPIN_PRICE = 1
const FULL_ROUNDS = 5
const MIN_WITHDRAW_TON = 5
const MIN_DEPOSIT_TON = 0.1

// TODO: username -> GiftWheelsBot
const BOT_USERNAME = 'GiftWheels_bot'

const wheelSectors = [
  { emoji: '📅', name: 'Календарь', price: 1.5 },
  { emoji: '🐸', name: 'Пепе', price: 0.0 },
  { emoji: '💋', name: 'Губы', price: 0.0 },
  { emoji: '🧸', name: 'Мишка', price: 0.1 },
  { emoji: '🍀', name: 'Клевер', price: 0.0 },
  { emoji: '🍑', name: 'Персик', price: 0.0 },
  { emoji: '🧸', name: 'Мишка', price: 0.1 },
]

// ===== CASES CONFIG =====
// По твоей идее: "крутится кейс и всегда мишка" — делаем выдачу всегда Мишка.
const CASES = {
  newyear: {
    id: 'newyear',
    title: 'Календарь',
    priceTon: 0.2,
    imageSelector: '.case-image-newyear',
    contents: [
      { emoji: '📅', name: 'Календарь', price: 1.5 },
      { emoji: '🧸', name: 'Мишка', price: 0.1 },
    ],
  },
  onlynft: {
    id: 'onlynft',
    title: 'Классический',
    priceTon: 1.0,
    imageSelector: '.case-image-onlynft',
    contents: [
      { emoji: '🐸', name: 'Пепе', price: 0.0 },
      { emoji: '🧸', name: 'Мишка', price: 0.1 },
    ],
  },
  crypto: {
    id: 'crypto',
    title: 'Все или ничего',
    priceTon: 0.5,
    imageSelector: '.case-image-crypto',
    contents: [
      { emoji: '🍑', name: 'Персик', price: 0.0 },
      { emoji: '🧸', name: 'Мишка', price: 0.1 },
    ],
  },
}


const CASES_ALWAYS_PRIZE = { emoji: '🧸', name: 'Мишка', price: 0.1 }

// ===== CUSTOM IMAGES =====
const GIFT_IMAGES = {
  Пепе: 'epepepepe.webp',
  Персик: 'epersok.webp',
}

function giftVisual(item) {
  const file = GIFT_IMAGES[item?.name]
  if (file) return `<span class="gift-icon" style="background-image:url('${file}')"></span>`
  return item?.emoji || '🎁'
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
  rewards: document.getElementById('screen-rewards'),
  invite: document.getElementById('screen-invite'),
  home: document.getElementById('screen-home'),
  wheel: document.getElementById('screen-wheel'),
  crash: document.getElementById('screen-crash'),
  cases: document.getElementById('screen-cases'),
  caseOpen: document.getElementById('screen-case-open'),
  bonus: document.getElementById('screen-bonus'),
  profile: document.getElementById('screen-profile'),
  admin: document.getElementById('screen-admin'),
  minecraft: document.getElementById('screen-minecraft'),

}

const depositBtn = document.getElementById('deposit-btn')
const withdrawBtn = document.getElementById('withdraw-btn')

const prizeModal = document.getElementById('prize-modal')
const modalPrizeEmoji = document.getElementById('modal-prize-emoji')
const modalPrizeName = document.getElementById('modal-prize-name')
const modalPrizePrice = document.getElementById('modal-prize-price')
const modalSellBtn = document.getElementById('modal-sell')
const modalKeepBtn = document.getElementById('modal-keep')

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

// Invite UI
const inviteLinkText = document.getElementById('invite-link-text')
const inviteCopyBtn = document.getElementById('invite-copy-btn')

// Cases UI
const caseCards = document.querySelectorAll('#screen-cases .case-card')
const caseOpenTitleEl = document.getElementById('case-open-title')
const caseOpenImageEl = document.getElementById('case-open-image')
const caseOpenPriceEl = document.getElementById('case-open-price')
const caseOpenSpinBtn = document.getElementById('case-open-spin')
const caseOpenRewardsListEl = document.getElementById('case-open-rewards-list')

// Case open animation UI
const caseAnimOverlay = document.getElementById('case-anim-overlay')
const caseAnimTrack = document.getElementById('case-anim-track')

function setCaseAnimVisible(v) {
  if (!caseAnimOverlay) return
  caseAnimOverlay.classList.toggle('active', !!v)
}

function makeAnimItemHTML(prize) {
  const v = giftVisual(prize)
  const isIcon = String(v).includes('gift-icon')
  return `<div class="case-anim-item">${isIcon ? v : `<div class="emoji">${v}</div>`}</div>`
}

// рулетка-анимация (простая и надежная)
async function playCaseOpenAnimation({ pool, winner }) {
  if (!caseAnimTrack || !caseAnimOverlay) return

  const base = Array.isArray(pool) && pool.length ? pool : [winner]
  const items = []
  for (let i = 0; i < 28; i++) items.push(base[i % base.length])
  items[items.length - 6] = winner // победитель ближе к концу

  caseAnimTrack.innerHTML = items.map(makeAnimItemHTML).join('')
  caseAnimTrack.style.transition = 'none'
  caseAnimTrack.style.transform = 'translateX(0px)'

  setCaseAnimVisible(true)

  await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)))

  const itemW = 96
  const gap = 22
  const step = itemW + gap

  const winIndex = items.length - 6
  const target = -(winIndex * step)
  const jitter = -Math.round(step * 0.35 + Math.random() * step * 0.25)
  const finalX = target + jitter

  caseAnimTrack.style.transition = 'transform 2.6s cubic-bezier(.08,.82,.12,1)'
  caseAnimTrack.style.transform = `translateX(${finalX}px)`

  await new Promise(r => setTimeout(r, 2700))
  setCaseAnimVisible(false)
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

const adminState = {
  q: '',
  page: 1,
  pages: 1,
}

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
  const sectorNodes = wheel.querySelectorAll('.sector')
  sectorNodes.forEach((node, i) => {
    const s = wheelSectors[i]
    if (!s) {
      node.textContent = '❔'
      node.title = ''
      return
    }
    node.innerHTML = giftVisual(s)
    node.title = `${s.name} (${s.price} TON)`
  })
}

function renderPrizesList() {
  const items = document.querySelectorAll('.prizes-grid .prize-item')
  items.forEach((card, i) => {
    const s = wheelSectors[i]
    if (!s) return
    const emojiEl = card.querySelector('.prize-emoji')
    const nameEl = card.querySelector('.prize-name')
    if (emojiEl) emojiEl.innerHTML = giftVisual(s)
    if (nameEl) nameEl.textContent = s.name
  })
}

function renderInventory() {
  if (!inventoryList) return

  if (!Array.isArray(inventory) || inventory.length === 0) {
    inventoryList.innerHTML = `<div class="inventory-empty">У вас пока нет подарков</div>`
    return
  }

  inventoryList.innerHTML = inventory
    .map((item, idx) => {
      const price = Number(item.price || 0).toFixed(2)
      return `
        <div class="inventory-item" data-idx="${idx}">
          <div class="inventory-item-top">
            <div class="inventory-item-emoji">${giftVisual(item)}</div>
            <div class="inventory-item-price">${price} TON</div>
          </div>
          <div class="inventory-item-name">${item.name || 'Подарок'}</div>
          <div class="inventory-item-actions">
            <button class="inventory-btn inv-sell" type="button">Продать</button>
            <button class="inventory-btn inv-withdraw" type="button">Вывести</button>
          </div>
        </div>
      `
    })
    .join('')
}

function setScreen(name) {
  Object.keys(screens).forEach(key => {
    screens[key]?.classList.toggle('active', key === name)
  })
  navButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.target === name)
  })
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

// ===== CASES HELPERS =====
function renderCaseRewardsList(cfg) {
  if (!caseOpenRewardsListEl) return
  if (!cfg) {
    caseOpenRewardsListEl.innerHTML = ''
    return
  }

  const items = Array.isArray(cfg.contents) ? cfg.contents : [CASES_ALWAYS_PRIZE]
  caseOpenRewardsListEl.innerHTML = items
    .map(it => `<div class="case-reward-item">${giftVisual(it)} <span>${it.name}</span></div>`)
    .join('')
}


function openCase(caseType) {
  const cfg = CASES[caseType]
  if (!cfg) {
    alert('Этот кейс скоро добавим.')
    return
  }

  selectedCaseType = caseType

  if (caseOpenTitleEl) caseOpenTitleEl.textContent = cfg.title
  if (caseOpenPriceEl) caseOpenPriceEl.textContent = Number(cfg.priceTon || 0).toFixed(2)

  // подтягиваем классы изображения из карточки, чтобы было "как в списке"
  if (caseOpenImageEl) {
    const img = document.querySelector(`#screen-cases .case-card[data-case-type="${caseType}"] .case-image`)
    if (img?.className) {
      // заменим base-class, чтобы CSS мог отличать open-image при необходимости
      caseOpenImageEl.className = img.className.replace('case-image', 'case-open-image')
    } else {
      caseOpenImageEl.className = 'case-open-image'
    }
  }

  renderCaseRewardsList(cfg)
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
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initData: INIT_DATA, ...body }),
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

  if (adminNavBtn) adminNavBtn.style.display = isAdmin ? '' : 'none'

  updateBalanceUI()
  renderInventory()
  return data
}

async function spinApi() {
  return apiPost('/spin')
}

// ✅ NEW: open case via server
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

// admin APIs
async function adminStatsApi() {
  return apiPost('/admin/stats')
}
async function adminUsersApi({ q, page }) {
  return apiPost('/admin/users', { q, page })
}
async function adminPromoCreateApi(payload) {
  return apiPost('/admin/promo/create', payload)
}
async function adminPromoListApi() {
  return apiPost('/admin/promo/list')
}
async function adminPromoDeleteApi(code) {
  return apiPost('/admin/promo/delete', { code })
}
async function adminAdjustBalanceApi(tgId, delta) {
  return apiPost('/admin/user/adjust-balance', { tgId, delta })
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
  const r = await adminUsersApi({ q: adminState.q, page: adminState.page })
  const items = Array.isArray(r.items) ? r.items : []
  adminState.pages = Number(r.pages || 1) || 1
  adminState.page = Number(r.page || adminState.page) || 1
  renderAdminUsersGrid(items)
  renderAdminPager()
}

async function loadAdminStats() {
  if (!isAdmin) return
  const stats = await adminStatsApi()
  renderAdminStats(stats)
}

async function loadAdminPromos() {
  if (!isAdmin) return
  const r = await adminPromoListApi()
  renderAdminPromos(r.items || [])
}

// ===== EVENTS =====

// навигация по вкладкам
navButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.target
    if (target === 'admin' && !isAdmin) return
    setScreen(target)
  })
})

// клики по карточкам на главной (Краш / Колесо / Кейсы)
document.querySelectorAll('[data-home-target]').forEach(card => {
  card.addEventListener('click', () => {
    const target = card.getAttribute('data-home-target')

    if (target === 'crash' || target === 'wheel') {
      setScreen(target)
      return
    }

        if (target === 'cases') {
      setScreen('cases')
      return
    }

    if (target === 'minecraft') {
      setScreen('minecraft')
      return
    }

  })
})

// Кейсы: клик по карточке -> экран открытия
caseCards.forEach(card => {
  card.addEventListener('click', () => {
    const type = card.getAttribute('data-case-type')

    if (!['newyear', 'onlynft', 'crypto'].includes(type)) {
      alert('Этот кейс скоро добавим.')
      return
    }

    openCase(type)
  })
})

// ✅ Открыть кейс (через сервер /api/cases/open)
caseOpenSpinBtn?.addEventListener('click', async () => {
  const cfg = CASES[selectedCaseType]
  if (!cfg) return

  if (prizeModal?.classList.contains('active')) return
  if (withdrawModal?.classList.contains('active')) return

  caseOpenSpinBtn.disabled = true
  try {
    // 1) сервер списывает и возвращает приз
    const r = await apiPost('/cases/open', { caseType: selectedCaseType })

    balance = Number(r.newBalance ?? balance)
    updateBalanceUI()

    const prize = r.prize || CASES_ALWAYS_PRIZE

    // 2) анимация (крутит содержимое кейса)
    const pool = Array.isArray(cfg.contents) && cfg.contents.length ? cfg.contents : [prize]
    await playCaseOpenAnimation({ pool, winner: prize })

    // 3) показываем результат
    currentPrize = prize
    currentPrizeIdx = null
    setLastPrizeText(currentPrize)
    openModal(currentPrize)
  } catch (e) {
    alert(e.message || 'Ошибка открытия кейса')
  } finally {
    caseOpenSpinBtn.disabled = false
  }
})


// крутилка
spinButton?.addEventListener('click', async e => {
  e.preventDefault()
  e.stopPropagation()
  if (isSpinning) return
  if (prizeModal?.classList.contains('active')) return
  if (withdrawModal?.classList.contains('active')) return

  if (balance < SPIN_PRICE) {
    alert('Недостаточно средств. Нужно минимум 1 TON.')
    return
  }

  isSpinning = true
  spinButton.disabled = true

  let prizeData = null
  try {
    prizeData = await spinApi()
  } catch (err) {
    alert(err.message || 'Ошибка при прокрутке')
    isSpinning = false
    spinButton.disabled = false
    return
  }

  currentPrize = prizeData.prize
  currentPrizeIdx = Number.isInteger(prizeData.idx) ? prizeData.idx : null
  balance = Number(prizeData.newBalance ?? balance - SPIN_PRICE)
  updateBalanceUI()

  // Сейчас у тебя намеренно всегда крутится на мишку:
  const bearIndex = wheelSectors.findIndex(s => s?.name === 'Мишка')
  const sectorIndex = bearIndex >= 0 ? bearIndex : 0

  const N = wheelSectors.length
  const step = 360 / N
  const base = sectorIndex * step + step / 2

  const desiredAngle = 270
  const current = ((currentRotation % 360) + 360) % 360
  const delta = (((desiredAngle - base - current) % 360) + 360) % 360

  currentRotation += FULL_ROUNDS * 360 + delta
  wheel.style.transform = `rotate(${currentRotation.toFixed(3)}deg)`
})

wheel?.addEventListener('transitionend', e => {
  if (e.propertyName !== 'transform') return
  if (!isSpinning) return

  currentRotation = ((currentRotation % 360) + 360) % 360
  wheel.style.transition = 'none'
  wheel.style.transform = `rotate(${currentRotation.toFixed(3)}deg)`
  wheel.offsetHeight
  wheel.style.transition = ''

  setLastPrizeText(currentPrize)
  openModal(currentPrize)

  isSpinning = false
})

modalSellBtn?.addEventListener('click', async () => {
  if (!currentPrize) return
  try {
    // Если сервер не дал idx — сначала кладем приз в инвентарь, потом продаем по idx
    if (!Number.isInteger(currentPrizeIdx)) {
      await keepPrizeApi(currentPrize)
      const me = await fetchUserData() // обновит inventory
      const i = (me.inventory || inventory || []).findIndex(it => it?.name === currentPrize.name)
      currentPrizeIdx = i >= 0 ? i : null
    }

    if (!Number.isInteger(currentPrizeIdx)) {
      alert('Не удалось определить idx предмета. Обнови страницу/попробуй ещё раз.')
      return
    }

    const data = await sellPrizeApi(currentPrize, currentPrizeIdx)
    balance = Number(data.newBalance ?? balance)
    updateBalanceUI()

    currentPrize = null
    currentPrizeIdx = null
    closeModal()
    spinButton.disabled = false
    await fetchUserData()
  } catch (err) {
    alert(err.message || 'Ошибка продажи')
  }
})

modalKeepBtn?.addEventListener('click', async () => {
  if (!currentPrize) return
  try {
    await keepPrizeApi(currentPrize)
    await fetchUserData()
    currentPrize = null
    currentPrizeIdx = null
    closeModal()
    spinButton.disabled = false
  } catch (err) {
    alert(err.message || 'Ошибка сохранения')
  }
})

inventoryList?.addEventListener('click', async e => {
  const card = e.target.closest('.inventory-item')
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

promoApplyBtn?.addEventListener('click', async () => {
  const code = (promoInput?.value || '').trim()
  if (!code) {
    alert('Введите промокод')
    return
  }

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
  }
})

// ===== DEPOSIT TON =====
function openDepositModalFromAnyButton() {
  if (!depositModal) return
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

    // ---- TonConnect statuses (как было у тебя) ----
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
    // ---------------------------------------------

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
    withdrawConfirmBtn.disabled = false
  }
})

// ===== CRASH (logic + canvas animation: rocket -> moon) =====
const crashCanvas = document.getElementById('crash-canvas')
const crashCtx = crashCanvas ? crashCanvas.getContext('2d') : null
const crashMultiplierEl = document.getElementById('crash-multiplier')
const crashStatusEl = document.getElementById('crash-status')
const crashBetInput = document.getElementById('crash-bet-input')
const crashAutoInput = document.getElementById('crash-auto-input')
const crashMainActionBtn = document.getElementById('crash-main-action')
const crashCurrentBetEl = document.getElementById('crash-current-bet')
const crashPotentialWinEl = document.getElementById('crash-potential-win')

let crashState = 'idle' // idle | playing | crashed
let crashMultiplier = 1.0
let crashPoint = null

let crashBetAmount = 0
let crashAutoCashoutAt = null
let crashHasCashedOut = false

let crashAnimFrame = null
let crashStartTime = null

// Скорость роста НЕ зависит от crashPoint, иначе палится
// m(t) = exp(k*t)
let crashK = 0.15

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

function generateCrashPoint() {
  const rand = Math.random() * 100

  // 80% — совсем низкие (1.01–1.09)
  if (rand < 80) {
    return 1.01 + Math.random() * (1.09 - 1.01)
  }

  // 19% — низкие (1.09–1.8)
  if (rand < 99) {
    return 1.09 + Math.random() * (1.8 - 1.09)
  }

  // 1% — средние (1.8–4.0)
  return 1.8 + Math.random() * (4.0 - 1.8)
} // ← вот этой скобки не хватало

function getSceneSize() {
  const rect = crashCanvas.getBoundingClientRect()
  return { w: rect.width, h: rect.height }
}


function moonPos(w, h) {
  return { x: w * 0.78, y: h * 0.26, r: Math.min(w, h) * 0.14 }
}

// квадратичная траектория
function pathPoint(p, w, h) {
  const a = { x: w * 0.18, y: h * 0.78 }
  const c = { x: w * 0.42, y: h * 0.18 }
  const b = { x: w * 0.72, y: h * 0.32 }
  const t = clamp(p, 0, 1)
  const x = (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * c.x + t * t * b.x
  const y = (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * c.y + t * t * b.y
  return { x, y }
}

function pathTangentAng(p, w, h) {
  const a = { x: w * 0.18, y: h * 0.78 }
  const c = { x: w * 0.42, y: h * 0.18 }
  const b = { x: w * 0.72, y: h * 0.32 }
  const t = clamp(p, 0, 1)
  const dx = 2 * (1 - t) * (c.x - a.x) + 2 * t * (b.x - c.x)
  const dy = 2 * (1 - t) * (c.y - a.y) + 2 * t * (b.y - c.y)
  return Math.atan2(dy, dx)
}

// ---------- particles ----------
const particles = []
function spawnExplosion(x, y) {
  const n = 46
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2
    const sp = 80 + Math.random() * 220
    particles.push({
      x,
      y,
      vx: Math.cos(a) * sp,
      vy: Math.sin(a) * sp,
      life: 0,
      max: 0.7 + Math.random() * 0.7,
      size: 1.5 + Math.random() * 2.8,
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

// ---------- draw ----------
function drawMoon(ctx, w, h) {
  const m = moonPos(w, h)
  const g = ctx.createRadialGradient(m.x - m.r * 0.3, m.y - m.r * 0.3, m.r * 0.2, m.x, m.y, m.r)
  g.addColorStop(0, 'rgba(226,232,240,0.95)')
  g.addColorStop(0.6, 'rgba(148,163,184,0.9)')
  g.addColorStop(1, 'rgba(15,23,42,0.9)')

  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2)
  ctx.fill()

  ctx.globalAlpha = 0.25
  ctx.fillStyle = '#0f172a'
  const cr = [
    { x: m.x - m.r * 0.25, y: m.y + m.r * 0.05, r: m.r * 0.18 },
    { x: m.x + m.r * 0.18, y: m.y - m.r * 0.15, r: m.r * 0.12 },
    { x: m.x + m.r * 0.05, y: m.y + m.r * 0.22, r: m.r * 0.09 },
  ]
  for (const c of cr) {
    ctx.beginPath()
    ctx.arc(c.x, c.y, c.r, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}

function drawPath(ctx, w, h, p) {
  ctx.save()
  ctx.lineWidth = 2
  ctx.strokeStyle = 'rgba(56,189,248,0.22)'
  ctx.beginPath()
  const steps = 60
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * clamp(p, 0, 1)
    const pt = pathPoint(t, w, h)
    if (i === 0) ctx.moveTo(pt.x, pt.y)
    else ctx.lineTo(pt.x, pt.y)
  }
  ctx.stroke()
  ctx.lineWidth = 4
  ctx.strokeStyle = 'rgba(56,189,248,0.10)'
  ctx.stroke()
  ctx.restore()
}

function drawRocket(ctx, x, y, ang, flamePower) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(ang)

  // корпус
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

  // окно
  ctx.fillStyle = 'rgba(56,189,248,0.9)'
  ctx.beginPath()
  ctx.arc(2, 0, 4, 0, Math.PI * 2)
  ctx.fill()

  // крылья
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

  // огонь
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

// ---------- UI ----------
function updateCrashButtonUI() {
  if (!crashMainActionBtn) return
  if (crashState === 'idle') {
    crashMainActionBtn.textContent = 'Сделать ставку'
    crashMainActionBtn.disabled = false
  } else if (crashState === 'playing') {
    crashMainActionBtn.textContent = 'Забрать'
    crashMainActionBtn.disabled = false
  } else {
    crashMainActionBtn.textContent = 'Раунд завершён'
    crashMainActionBtn.disabled = true
  }
}

function updateCrashMultiplierUI() {
  if (crashMultiplierEl) crashMultiplierEl.textContent = `${crashMultiplier.toFixed(2)}x`
  if (crashBetAmount > 0 && crashPotentialWinEl) {
    crashPotentialWinEl.textContent = `${(crashBetAmount * crashMultiplier).toFixed(2)} TON`
  }
  if (crashCurrentBetEl) {
    crashCurrentBetEl.textContent = crashBetAmount > 0 ? `${crashBetAmount.toFixed(2)} TON` : '—'
  }
  updateCrashButtonUI()
}

function setCrashStatus(text, color) {
  if (!crashStatusEl) return
  crashStatusEl.textContent = text
  crashStatusEl.style.color = color || '#e5e7eb'
}

// ---------- logic ----------
function stepCrashMultiplier() {
  const t = Math.max(0, Date.now() - crashStartTime) / 1000
  crashMultiplier = Math.exp(crashK * t)
  if (!Number.isFinite(crashMultiplier) || crashMultiplier < 1) crashMultiplier = 1
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
  } catch (err) {
    alert(err.message || 'Ошибка вывода')
  }
}

function crashBoomIntoMoon() {
  if (!crashCanvas) return
  const { w, h } = getSceneSize()
  const m = moonPos(w, h)
  const ix = m.x - m.r * 0.55
  const iy = m.y + m.r * 0.25
  crashImpact = { x: ix, y: iy, ts: performance.now() }
  crashShake = 1
  spawnExplosion(ix, iy)
  if (!crashHasCashedOut) setCrashStatus('Врезались в луну!', '#f97373')
}

function endCrash() {
  crashState = 'crashed'
  updateCrashButtonUI()

  setTimeout(() => {
    crashState = 'idle'
    crashMultiplier = 1.0
    crashBetAmount = 0
    crashPoint = null
    crashAutoCashoutAt = null
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
  if (crashState !== 'idle') return

  crashBetAmount = parseFloat(crashBetInput?.value || '0')
  if (isNaN(crashBetAmount) || crashBetAmount < 0.1) {
    alert('Минимум 0.1 TON')
    return
  }
  if (balance < crashBetAmount) {
    alert('Недостаточно средств.')
    return
  }

  const rawAuto = String(crashAutoInput?.value || '').replace(',', '.').trim()
  crashAutoCashoutAt = null
  if (rawAuto) {
    const val = Number(rawAuto)
    if (!Number.isFinite(val) || val < 1.1) {
      alert('Авто-вывод: введите число не меньше 1.1')
      return
    }
    crashAutoCashoutAt = val
  }

  try {
    const r = await apiPost('/crash/bet', { amount: crashBetAmount })
    balance = Number(r.newBalance ?? balance)
    updateBalanceUI()
  } catch (err) {
    alert(err.message || 'Ошибка ставки')
    return
  }

  crashPoint = generateCrashPoint()
  crashMultiplier = 1.0
  crashState = 'playing'
  crashHasCashedOut = false
  crashStartTime = Date.now()
  crashImpact = null
  crashShake = 0

  setCrashStatus('Летим...', '#e5e7eb')
  updateCrashMultiplierUI()
  startCrashRenderLoop()
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

    if (crashAutoCashoutAt && crashMultiplier >= crashAutoCashoutAt && !crashHasCashedOut) {
      cashoutCrash(true)
    }

    if (crashPoint && crashMultiplier >= crashPoint) {
      crashMultiplier = crashPoint
      updateCrashMultiplierUI()
      crashBoomIntoMoon()
      endCrash()
    } else {
      updateCrashMultiplierUI()
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

  crashCtx.clearRect(0, 0, w, h)

  // легкая туманность
  const fog = crashCtx.createRadialGradient(w * 0.25, h * 0.85, 10, w * 0.25, h * 0.85, h * 0.9)
  fog.addColorStop(0, 'rgba(99,102,241,0.10)')
  fog.addColorStop(1, 'rgba(2,6,23,0)')
  crashCtx.fillStyle = fog
  crashCtx.fillRect(0, 0, w, h)

  drawMoon(crashCtx, w, h)

  // прогресс полета из текущего multiplier
  let p = 0
  if (crashState === 'playing' || crashState === 'crashed') {
    const t = Math.log(Math.max(crashMultiplier, 1)) / crashK
    p = clamp(t / 12, 0, 1)
  }

  drawPath(crashCtx, w, h, p)

  if (crashState === 'playing') {
    const pt = pathPoint(p, w, h)
    const ang = pathTangentAng(p, w, h)
    const flame = 0.4 + 0.6 * Math.min(1, (crashMultiplier - 1) / 2)
    drawRocket(crashCtx, pt.x, pt.y, ang, flame)
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

// ---------- controls ----------
crashMainActionBtn?.addEventListener('click', () => {
  if (crashState === 'idle') startCrash()
  else if (crashState === 'playing') cashoutCrash(false)
})

window.addEventListener('resize', () => {
  if (!crashCanvas) return
  initCrashCanvas()
  startCrashRenderLoop()
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

// ===== INIT =====
async function init() {
  updateTelegramUserUI()
  renderWheel()
  renderPrizesList()
  setLastPrizeText(null)
  updateInviteUI()

  if (crashCanvas) {
    initCrashCanvas()
    startCrashRenderLoop()
  }

  updateDepositButtonState()

  try {
    await fetchUserData()
    if (isAdmin) await Promise.allSettled([loadAdminStats(), loadAdminPromos(), loadAdminUsers()])
  } catch (err) {
    alert(err.message || 'Unknown error')
  }
}

init()






