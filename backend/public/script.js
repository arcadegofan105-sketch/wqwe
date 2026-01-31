// ===== CONFIG =====
const API_URL = '/api'
const SPIN_PRICE = 1
const FULL_ROUNDS = 5
const MIN_WITHDRAW_TON = 5
const MIN_DEPOSIT_TON = 0.1

const wheelSectors = [
  { emoji: '📅', name: 'Календарь', price: 1.5 },
  { emoji: '🐸', name: 'Пепе', price: 0.0 },
  { emoji: '💋', name: 'Губы', price: 0.0 },
  { emoji: '🧸', name: 'Мишка', price: 0.1 },
  { emoji: '🍀', name: 'Клевер', price: 0.0 },
  { emoji: '🍑', name: 'Персик', price: 0.0 },
  { emoji: '🧸', name: 'Мишка', price: 0.1 },
]

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
const notTelegram = document.getElementById('not-telegram')
const appRoot = document.getElementById('app-root')

function showNotTelegram() {
  if (notTelegram) notTelegram.style.display = 'block'
  if (appRoot) appRoot.style.display = 'none'
}

function showApp() {
  if (notTelegram) notTelegram.style.display = 'none'
  if (appRoot) appRoot.style.display = 'block'
}

if (!tg) {
  showNotTelegram()
  throw new Error('Telegram WebApp not found')
}

tg.ready()
tg.expand()
document.body.style.backgroundColor = tg.themeParams?.bg_color || '#02051a'
showApp()

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
  bonus: document.getElementById('screen-bonus'),
  profile: document.getElementById('screen-profile'),
  admin: document.getElementById('screen-admin'),
}

const adminNavBtn = document.getElementById('admin-nav-btn')
const adminUsersSummaryBtn = document.getElementById('admin-users-summary-btn')
const adminTgIdInput = document.getElementById('admin-tg-id-input')
const adminAmountInput = document.getElementById('admin-amount-input')
const adminAdjustBalanceBtn = document.getElementById('admin-adjust-balance-btn')
const adminResultBox = document.getElementById('admin-result')

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
const openDepositPlusBtn = document.getElementById('open-deposit-modal')
const depositAmountInput = document.getElementById('deposit-amount-input')
const depositConfirmBtn = document.getElementById('deposit-confirm')
const depositCancelBtn = document.getElementById('deposit-cancel')
const connectTonBtn = document.getElementById('connect-ton-btn')

// вкладки депозита и звёзды
const depositTabs = document.querySelectorAll('.deposit-tab')
const depositTonBlock = document.querySelector('.deposit-ton-block')
const depositStarsBlock = document.querySelector('.deposit-stars-block')
const depositStarsInput = document.getElementById('deposit-stars-input')
const starsBalanceHint = document.getElementById('stars-balance-hint')
const starsToTonHint = document.getElementById('stars-to-ton-hint')

// ===== STATE =====
let currentRotation = 0
let balance = 0
let inventory = []
let currentPrize = null
let isSpinning = false
let isAdminFlag = false
let starsBalance = 0

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
  modalPrizeName.textContent = prize.name
  modalPrizePrice.textContent = Number(prize.price || 0).toFixed(2)
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
      prefillAmount !== undefined && prefillAmount !== null
        ? String(prefillAmount)
        : ''
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
  const N = wheelSectors.length
  const angleStep = 140 / (N - 1)
  const startAngle = -70

  sectorNodes.forEach((node, i) => {
    const s = wheelSectors[i]
    if (!s) {
      node.textContent = '❔'
      node.title = ''
      return
    }
    node.innerHTML = giftVisual(s)
    node.title = `${s.name} (${s.price} TON)`

    const angle = startAngle + i * angleStep
node.dataset.angle = angle
node.style.transform = `rotate(${angle}deg)`

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
    inventoryList.innerHTML =
      `<div class="inventory-empty">У вас пока нет подарков</div>`
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
    if (!screens[key]) return
    screens[key].classList.toggle('active', key === name)
  })
  navButtons.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.target === name)
  })
}

function updateTelegramUserUI() {
  if (!telegramUser) return

  const userName = telegramUser.first_name || telegramUser.username || 'User'
  document
    .querySelectorAll('.user-name, .profile-name')
    .forEach(el => (el.textContent = userName))

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

// ===== ADMIN HELPERS =====
function isAdmin() {
  if (typeof isAdminFlag === 'boolean') return isAdminFlag
  return false
}

function setupAdminUI() {
  const admin = isAdmin()

  if (!admin) {
    if (adminNavBtn) adminNavBtn.style.display = 'none'
    if (screens.admin) screens.admin.style.display = 'none'
    return
  }

  if (adminNavBtn) adminNavBtn.style.display = ''
  if (screens.admin) screens.admin.style.display = ''

  adminUsersSummaryBtn?.addEventListener('click', async () => {
    if (adminResultBox) {
      adminResultBox.textContent = 'Отправляем запрос...'
      adminResultBox.classList.remove('error')
    }
    try {
      const r = await apiPost('/admin/users/summary')
      if (adminResultBox) {
        adminResultBox.textContent =
          'Список пользователей отправлен в Telegram. Кол-во: ' +
          (r.usersCount ?? 0)
      }
      alert('Список пользователей отправлен в Telegram.')
    } catch (err) {
      if (adminResultBox) {
        adminResultBox.textContent = err.message || 'Ошибка запроса'
        adminResultBox.classList.add('error')
      }
      alert(err.message || 'Ошибка запроса')
    }
  })

  adminAdjustBalanceBtn?.addEventListener('click', async () => {
    const tgId = (adminTgIdInput?.value || '').trim()
    const rawAmount = String(adminAmountInput?.value || '')
      .replace(',', '.')
      .trim()
    const amount = Number(rawAmount)

    if (!tgId) {
      alert('Укажи tg_id пользователя')
      return
    }
    if (!Number.isFinite(amount) || amount === 0) {
      alert('Укажи ненулевую сумму (можно отрицательную)')
      return
    }

    if (adminResultBox) {
      adminResultBox.textContent = 'Применяем изменение баланса...'
      adminResultBox.classList.remove('error')
    }

    try {
      const r = await apiPost('/admin/adjust-balance', {
        tgId,
        amount,
      })
      if (adminResultBox) {
        adminResultBox.textContent =
          `Новый баланс пользователя ${tgId}: ` +
          Number(r.newBalance || 0).toFixed(2) +
          ' TON'
      }
      alert(
        `Баланс изменён. Новый баланс: ${Number(r.newBalance || 0).toFixed(
          2,
        )} TON`,
      )
    } catch (err) {
      if (adminResultBox) {
        adminResultBox.textContent = err.message || 'Ошибка изменения баланса'
        adminResultBox.classList.add('error')
      }
      alert(err.message || 'Ошибка изменения баланса')
    }
  })
}

// ===== TON CONNECT (deposit lock) =====
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

async function fetchUserData() {
  const data = await apiPost('/me')
  balance = Number(data.balance || 0)
  starsBalance = Number(data.stars || 0)
  inventory = Array.isArray(data.inventory) ? data.inventory : []
  updateBalanceUI()
  renderInventory()

  if (starsBalanceHint) {
    starsBalanceHint.textContent = String(starsBalance)
  }

  if (typeof data.isAdmin === 'boolean') {
    isAdminFlag = data.isAdmin
  } else if (telegramUser && data.adminId) {
    isAdminFlag = String(telegramUser.id) === String(data.adminId)
  }

  setupAdminUI()
  return data
}

async function spinApi() {
  return apiPost('/spin')
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
async function depositStarsApi(starsAmount) {
  return apiPost('/deposit/stars', { starsAmount })
}

// deposit helpers
function toNanoString(tonAmount) {
  return String(Math.round(tonAmount * 1e9))
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

// ===== EVENTS =====

// навигация по вкладкам
navButtons.forEach(btn => {
  btn.addEventListener('click', () => setScreen(btn.dataset.target))
})

// клики по карточкам на главной
document.querySelectorAll('[data-home-target]').forEach(card => {
  card.addEventListener('click', () => {
    const target = card.getAttribute('data-home-target')

    if (target === 'crash' || target === 'wheel') {
      setScreen(target)
      return
    }

    if (target === 'cases') {
      alert('Раздел кейсов скоро добавим.')
    }
  })
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
  balance = Number(prizeData.newBalance ?? balance - SPIN_PRICE)
  updateBalanceUI()

  const bearIndex = wheelSectors.findIndex(s => s?.name === 'Мишка')
  const sectorIndex = bearIndex >= 0 ? bearIndex : 0

  const N = wheelSectors.length
  const step = 360 / N
  const base = sectorIndex * step + step / 2

  const desiredAngle = 270
  const current = ((currentRotation % 360) + 360) % 360
  const delta = (((desiredAngle - base - current) % 360) + 360) % 360

  const extraRounds = FULL_ROUNDS + Math.random() * 1.5
  const totalRotation = extraRounds * 360 + delta
  const duration = 2.8 + extraRounds * 0.3

  const sectors = wheel.querySelectorAll('.sector')
  sectors.forEach(node => {
    const currentAngle = parseFloat(node.dataset.angle || '0')
    const newAngle = currentAngle + totalRotation
    node.dataset.angle = newAngle
    node.style.transition = `transform ${duration.toFixed(2)}s cubic-bezier(0.08, 0.72, 0.12, 0.99)`
    node.style.transform = `rotate(${newAngle}deg)`
  })

  currentRotation = (currentRotation + totalRotation) % 360

  setTimeout(() => {
    setLastPrizeText(currentPrize)
    openModal(currentPrize)
    isSpinning = false
    spinButton.disabled = false
  }, duration * 1000)
})


wheel?.addEventListener('transitionend', e => {
  if (e.propertyName !== 'transform') return
  if (!isSpinning) return

  currentRotation = ((currentRotation % 360) + 360) % 360

  wheel.style.transition = 'none'
wheel.style.transform = `translate(-50%, -50%) rotate(${currentRotation.toFixed(3)}deg)`
wheel.offsetHeight
wheel.style.transition = ''


  setLastPrizeText(currentPrize)
  openModal(currentPrize)

  isSpinning = false
  spinButton.disabled = false
})


modalSellBtn?.addEventListener('click', async () => {
  if (!currentPrize) return
  try {
    const data = await sellPrizeApi(currentPrize)
    balance = Number(data.newBalance ?? balance)
    updateBalanceUI()
    currentPrize = null
    closeModal()
    spinButton.disabled = false
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
      return
    }

    if (data.type === 'gift' && data.prize) {
      if (Array.isArray(data.inventory)) {
        inventory = data.inventory
      } else {
        inventory = [...(inventory || []), data.prize]
      }
      renderInventory()
      promoInput.value = ''
      alert('Промокод применён: Мишка зачислен в инвентарь.')
      return
    }

    alert('Промокод применён')
    promoInput.value = ''
  } catch (err) {
    alert(err.message || 'Ошибка промокода')
  }
})

// ===== DEPOSIT (TON + ЗВЁЗДЫ) =====
function getActiveDepositType() {
  const active = document.querySelector('.deposit-tab.active')
  return active?.dataset.depositType || 'ton'
}

depositTabs.forEach(tab => {
  tab.addEventListener('click', () => {
    depositTabs.forEach(t => t.classList.remove('active'))
    tab.classList.add('active')

    const type = tab.dataset.depositType
    if (type === 'ton') {
      if (depositTonBlock) depositTonBlock.style.display = ''
      if (depositStarsBlock) depositStarsBlock.style.display = 'none'
      if (depositConfirmBtn) {
        const connected = isWalletConnected()
        depositConfirmBtn.disabled = !connected
      }
    } else {
      if (depositTonBlock) depositTonBlock.style.display = 'none'
      if (depositStarsBlock) depositStarsBlock.style.display = ''
      if (depositConfirmBtn) depositConfirmBtn.disabled = false

      if (starsBalanceHint) starsBalanceHint.textContent = String(starsBalance)
      if (depositStarsInput) {
        const raw = String(depositStarsInput.value || '').trim()
        const stars = Number(raw)
        const ton = Number(((stars || 0) * 0.01).toFixed(2))
        if (starsToTonHint) {
          starsToTonHint.textContent = `Это будет ${ton} TON`
        }
      }
    }
  })
})

depositStarsInput?.addEventListener('input', () => {
  const raw = String(depositStarsInput.value || '').replace(',', '.').trim()
  const stars = Number(raw)
  const ton = Number(((stars || 0) * 0.01).toFixed(2))
  if (starsToTonHint) {
    starsToTonHint.textContent = `Это будет ${ton} TON`
  }
})

function openDepositModalFromAnyButton() {
  if (!depositModal) return

  const type = getActiveDepositType()
  const connected = isWalletConnected()

  if (type === 'ton') {
    if (depositAmountInput) depositAmountInput.disabled = !connected
    if (depositConfirmBtn) depositConfirmBtn.disabled = !connected
  } else {
    if (depositConfirmBtn) depositConfirmBtn.disabled = false
  }

  if (starsBalanceHint) starsBalanceHint.textContent = String(starsBalance)
  depositModal.classList.add('active')
}

walletStatusBtn?.addEventListener('click', openDepositModalFromAnyButton)
depositBtn?.addEventListener('click', openDepositModalFromAnyButton)
openDepositPlusBtn?.addEventListener('click', openDepositModalFromAnyButton)

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
  if (depositConfirmBtn && getActiveDepositType() === 'ton') {
    depositConfirmBtn.disabled = !connected
  }
  updateConnectButtonUI()
})

depositConfirmBtn?.addEventListener('click', async () => {
  const type = getActiveDepositType()

  if (type === 'stars') {
    try {
      const rawStars = String(depositStarsInput?.value || '')
        .replace(',', '.')
        .trim()
      const starsAmount = Number(rawStars)

      if (!Number.isInteger(starsAmount) || starsAmount <= 0) {
        alert('Введите корректное количество звёзд')
        return
      }
      if (starsAmount < 10) {
        alert('Минимум 10 звёзд для обмена')
        return
      }
      if (starsAmount > starsBalance) {
        alert('У вас недостаточно звёзд')
        return
      }

      depositConfirmBtn.disabled = true

      const r = await depositStarsApi(starsAmount)
      balance = Number(r.newBalance ?? balance)
      starsBalance = Number(r.newStars ?? starsBalance)
      updateBalanceUI()

      if (starsBalanceHint) starsBalanceHint.textContent = String(starsBalance)
      if (depositStarsInput) depositStarsInput.value = ''
      if (starsToTonHint) starsToTonHint.textContent = 'Это будет 0 TON'

      const ton = Number((starsAmount * 0.01).toFixed(2))
      alert(`Обмен завершён: ${starsAmount}⭐ → ${ton} TON`)
      depositModal.classList.remove('active')
    } catch (err) {
      alert(err.message || 'Ошибка обмена звёзд')
    } finally {
      depositConfirmBtn.disabled = false
    }
    return
  }

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

    await tonConnectUI.sendTransaction(tx, {
      modals: ['before', 'success', 'error'],
      notifications: ['before', 'success', 'error'],
      skipRedirectToWallet: 'never',
    })

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

    alert(
      'Транзакция отправлена. Если не зачислилось — подожди 1–2 минуты и попробуй ещё раз.',
    )
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
  } catch (err) {
    const msg = String(err.message || '')
    if (msg.includes('Прежде чем вывести')) {
      alert('Прежде чем вывести, нужно сделать минимальное пополнение 1 TON')
    } else {
      alert(msg || 'Ошибка заявки на вывод')
    }
  } finally {
    withdrawConfirmBtn.disabled = false
  }
})

// ===== CRASH =====
const crashCanvas = document.getElementById('crash-canvas')
const crashCtx = crashCanvas ? crashCanvas.getContext('2d') : null
const crashMultiplierEl = document.getElementById('crash-multiplier')
const crashStatusEl = document.getElementById('crash-status')
const crashBetInput = document.getElementById('crash-bet-input')
const crashAutoInput = document.getElementById('crash-auto-input')
const crashMainActionBtn = document.getElementById('crash-main-action')
const crashCurrentBetEl = document.getElementById('crash-current-bet')
const crashPotentialWinEl = document.getElementById('crash-potential-win')

let crashState = 'idle'
let crashMultiplier = 1.0
let crashPoint = null
let crashBetAmount = 0
let crashAutoCashoutAt = null
let crashHasCashedOut = false
let crashAnimFrame = null
let crashStartTime = null
let crashTime = 8000

function initCrashCanvas() {
  if (!crashCanvas || !crashCtx) return
  const dpr = window.devicePixelRatio || 1
  const rect = crashCanvas.getBoundingClientRect()
  crashCanvas.width = rect.width * dpr
  crashCanvas.height = rect.height * dpr
  crashCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
}

function generateCrashPoint() {
  const rand = Math.random() * 100

  if (rand < 99) {
    return 1.01 + Math.random() * (1.8 - 1.01)
  }

  if (rand < 99.91) {
    return 1.8 + Math.random() * (3.0 - 1.8)
  }

  return 3.0 + Math.random() * (7.0 - 3.0)
}

function drawCrashGraph() {
  if (!crashCtx || !crashCanvas) return
  const rect = crashCanvas.getBoundingClientRect()
  const w = rect.width
  const h = rect.height

  crashCtx.clearRect(0, 0, w, h)

  crashCtx.strokeStyle = 'rgba(148, 163, 184, 0.06)'
  crashCtx.lineWidth = 1
  for (let i = 0; i <= 4; i++) {
    const y = (h / 4) * i
    crashCtx.beginPath()
    crashCtx.moveTo(0, y)
    crashCtx.lineTo(w, y)
    crashCtx.stroke()
  }

  if (crashState === 'playing' || crashState === 'crashed') {
    const maxYMult = Math.max(crashPoint || 2, 2)
    const progress = Math.min((crashMultiplier - 1) / (maxYMult - 1), 1)

    crashCtx.strokeStyle =
      crashState === 'crashed'
        ? 'rgba(248, 113, 113, 0.4)'
        : 'rgba(56, 189, 248, 0.45)'
    crashCtx.lineWidth = 2
    crashCtx.beginPath()
    crashCtx.moveTo(0, h)

    for (let i = 0; i <= progress * 100; i++) {
      const x = (i / 100) * w
      const t = i / 100
      const mult = 1 + t * (crashMultiplier - 1)
      const y = h - ((mult - 1) * h) / Math.max(maxYMult - 1, 0.2)
      if (i === 0) crashCtx.moveTo(x, y)
      else crashCtx.lineTo(x, y)
    }
    crashCtx.stroke()
  }
}

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
  if (crashMultiplierEl)
    crashMultiplierEl.textContent = `${crashMultiplier.toFixed(2)}x`
  if (crashBetAmount > 0 && crashPotentialWinEl) {
    crashPotentialWinEl.textContent = `${(
      crashBetAmount * crashMultiplier
    ).toFixed(2)} TON`
  }
  if (crashCurrentBetEl) {
    crashCurrentBetEl.textContent =
      crashBetAmount > 0 ? `${crashBetAmount.toFixed(2)} TON` : '—'
  }
  updateCrashButtonUI()
}

function animateCrash() {
  if (crashState !== 'playing') return

  const elapsed = Math.max(0, Date.now() - crashStartTime)
  const timeProgress = elapsed / crashTime

  if (timeProgress >= 1) {
    crashMultiplier = crashPoint
    updateCrashMultiplierUI()
    drawCrashGraph()
    endCrash(false)
    return
  }

  const base = 1.7
  const expProgress =
    (Math.exp(base * timeProgress) - 1) / (Math.exp(base) - 1)

  crashMultiplier = 1 + (crashPoint - 1) * expProgress

  if (crashMultiplier >= crashPoint) {
    crashMultiplier = crashPoint
    updateCrashMultiplierUI()
    drawCrashGraph()
    endCrash(false)
    return
  }

  if (
    crashAutoCashoutAt &&
    crashMultiplier >= crashAutoCashoutAt &&
    crashState === 'playing' &&
    !crashHasCashedOut
  ) {
    cashoutCrash(true)
  }

  updateCrashMultiplierUI()
  drawCrashGraph()
  crashAnimFrame = requestAnimationFrame(animateCrash)
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

  const baseTimeMs = 8000
  const basePoint = 2.0
  const ratio = (crashPoint - 1) / (basePoint - 1)
  const minMs = 4000
  const maxMs = 12000
  crashTime = Math.max(minMs, Math.min(maxMs, baseTimeMs * ratio))

  if (crashStatusEl) {
    crashStatusEl.textContent = 'Летим...'
    crashStatusEl.style.color = '#e5e7eb'
  }

  updateCrashMultiplierUI()
  drawCrashGraph()
  animateCrash()
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

    if (crashStatusEl) {
      crashStatusEl.textContent = isAuto ? 'Авто-вывод!' : 'Вы забрали!'
      crashStatusEl.style.color = '#22c55e'
    }

    updateCrashButtonUI()
  } catch (err) {
    alert(err.message || 'Ошибка вывода')
  }
}

function endCrash() {
  crashState = 'crashed'
  if (crashAnimFrame) cancelAnimationFrame(crashAnimFrame)
  crashAnimFrame = null

  if (crashStatusEl && !crashHasCashedOut) {
    crashStatusEl.textContent = 'Бум!'
    crashStatusEl.style.color = '#f97373'
  }

  updateCrashMultiplierUI()
  drawCrashGraph()

  setTimeout(() => {
    crashState = 'idle'
    crashMultiplier = 1.0
    crashBetAmount = 0
    crashPoint = null
    crashAutoCashoutAt = null
    crashHasCashedOut = false

    if (crashStatusEl) {
      crashStatusEl.textContent = 'Скоро взлетаем'
      crashStatusEl.style.color = '#e5e7eb'
    }
    if (crashMultiplierEl) crashMultiplierEl.textContent = '1.00x'
    if (crashCurrentBetEl) crashCurrentBetEl.textContent = '—'
    if (crashPotentialWinEl) crashPotentialWinEl.textContent = '—'
    drawCrashGraph()
    updateCrashButtonUI()
  }, 2000)
}

crashMainActionBtn?.addEventListener('click', () => {
  if (crashState === 'idle') {
    startCrash()
  } else if (crashState === 'playing') {
    cashoutCrash(false)
  }
})

window.addEventListener('resize', () => {
  if (crashCanvas) {
    initCrashCanvas()
    drawCrashGraph()
  }
})

// ===== INIT =====
;(async function init() {
  updateTelegramUserUI()
  renderWheel()
  renderPrizesList()
  setLastPrizeText(null)

  if (crashCanvas) {
    initCrashCanvas()
    drawCrashGraph()
  }

  updateDepositButtonState()

  try {
    await fetchUserData()
  } catch (err) {
    alert('Ошибка авторизации/сервера: ' + (err.message || 'unknown'))
  }
})()



