import { http, HttpResponse, delay, ws } from 'msw'
import { toSocketIo } from '@mswjs/socket.io-binding'
import { initialNfts, type MockNft } from './fixtures'
import { discountEth, formatEth, multiplyEth, parseEth } from '../lib/eth'

type User = { id: string; name: string; email: string; avatar?: string }
type Wallet = { address: string; nickname: string; isPrimary?: boolean; displayName?: string; network?: string; profileName?: string; secondaryEns?: string; walletType?: string; referralCode?: string; email?: string; ens?: string }
type State = { nfts: MockNft[]; user: User | null; profiles: Record<string, User>; passwordHashes: Record<string, string>; carts: Record<string, Record<string, number>>; favoritesByUser: Record<string, string[]>; orders: Record<string, Order>; orderPayloads: Record<string, string>; walletsByUser: Record<string, Wallet[]> }
type Order = { id: string; status: 'pending' | 'confirmed' | 'declined'; resolution: 'confirmed' | 'declined'; resolveAt: number; pendingWallet?: Wallet; items: Array<{ nft: MockNft; quantity: number }>; subtotal: string; discount: string; networkFee: string; total: string; tx: string; createdAt: string; version: number; ownerId: string }
const STATE_KEY = 'jungle-mock-state-v4'
const normalizeNftImage = (nft: MockNft): MockNft => ({
  ...nft,
  image: nft.image.startsWith('/') || /^[a-z][a-z\d+.-]*:/i.test(nft.image)
    ? nft.image
    : `/${nft.image}`,
})
const mergeFixtureNfts = (savedNfts?: MockNft[]) => {
  const saved = (savedNfts ?? []).map(normalizeNftImage)
  const savedIds = new Set(saved.map((nft) => nft.id))
  const newlyAdded = structuredClone(initialNfts)
    .filter((nft) => !savedIds.has(nft.id))
    .map(normalizeNftImage)
  return [...saved, ...newlyAdded]
}
const readState = (): State => {
  try {
    const saved = localStorage.getItem(STATE_KEY)
    if (saved) {
      const value = JSON.parse(saved) as Partial<State> & { cart?: Record<string, number>; favorites?: string[]; wallets?: Wallet[] }
      const user = value.user ?? null
      return { nfts: mergeFixtureNfts(value.nfts), user, profiles: user ? { [user.id]: user } : {}, passwordHashes: value.passwordHashes ?? {}, carts: value.carts ?? { guest: value.cart ?? {} }, favoritesByUser: value.favoritesByUser ?? (user ? { [user.id]: value.favorites ?? [] } : {}), orders: value.orders ?? {}, orderPayloads: value.orderPayloads ?? {}, walletsByUser: value.walletsByUser ?? (user ? { [user.id]: value.wallets ?? [] } : {}) }
    }
  } catch { /* use deterministic seed */ }
  return { nfts: structuredClone(initialNfts), user: null, profiles: {}, passwordHashes: {}, carts: { guest: {} }, favoritesByUser: {}, orders: {}, orderPayloads: {}, walletsByUser: {} }
}
const state = readState()
const save = () => localStorage.setItem(STATE_KEY, JSON.stringify(state))
const credentials = [
  { email: 'ana@jungle.test', password: 'Jungle123!', name: 'Ana Costa' },
  { email: 'leo@jungle.test', password: 'Jungle123!', name: 'Leo Martins' },
]
const activeCart = () => state.carts[state.user?.id ?? 'guest'] ?? (state.carts[state.user?.id ?? 'guest'] = {})
const activeWallets = () => state.walletsByUser[state.user!.id] ?? (state.walletsByUser[state.user!.id] = [])
const toPublicOrder = ({ ownerId, resolution, resolveAt, pendingWallet, ...order }: Order) => { void ownerId; void resolution; void resolveAt; void pendingWallet; return order }
const getPublicOrder = (id: string) => Object.values(state.orders).find((item) => item.id === id && item.ownerId === state.user?.id)
const emitOrder = (order: Order) => {
  const publicOrder = toPublicOrder(order)
  for (const client of socketClients) {
    const subscription = orderSubscriptions.get(client)
    if (subscription?.userId === order.ownerId && subscription.orderIds.has(order.id)) {
      client.emit('order.updated', { id: order.id, order: publicOrder, version: order.version })
    }
  }
}
const finalizeOrder = (order: Order) => {
  if (order.status !== 'pending') return order
  order.status = order.resolution
  order.version += 1
  if (order.status === 'confirmed') {
    if (order.pendingWallet) {
      const wallets = state.walletsByUser[order.ownerId] ?? (state.walletsByUser[order.ownerId] = [])
      wallets.push(order.pendingWallet)
    }
    for (const { nft, quantity } of order.items) {
      const current = state.nfts.find((item) => item.id === nft.id)
      if (current) current.available = Math.max(0, current.available - quantity)
      delete (state.carts[order.ownerId] ?? {})[nft.id]
    }
  }
  save()
  emitOrder(order)
  return order
}
const reconcileOrder = (order: Order) => {
  if (order.status !== 'pending') return order
  if (Date.now() >= order.resolveAt) return finalizeOrder(order)
  scheduleOrderResolution(order)
  return order
}
const hashPassword = async (value: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))).map((byte) => byte.toString(16).padStart(2, '0')).join('')
const getCart = () => Object.entries(activeCart()).flatMap(([id, quantity]) => {
  const nft = state.nfts.find((item) => item.id === id)
  return nft ? [{ nft, quantity }] : []
})
const quote = (coupon = '') => {
  const items = getCart()
  const subtotal = items.reduce((sum, item) => sum + multiplyEth(item.nft.price, item.quantity), 0n)
  const discount = coupon.toUpperCase() === 'JUNGLE10' ? discountEth(subtotal, 10n) : 0n
  const networkFee = items.length ? parseEth('0.012') : 0n
  return { items, subtotal: formatEth(subtotal), discount: formatEth(discount), networkFee: formatEth(networkFee), total: formatEth(subtotal - discount + networkFee), coupon: coupon || null }
}

const socketUrl = typeof window === 'undefined' ? 'ws://localhost:5173/*' : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/*`
const socket = ws.link(socketUrl)
const socketClients = new Set<ReturnType<typeof toSocketIo>['client']>()
const orderTimers = new Map<string, ReturnType<typeof setTimeout>>()
const orderSubscriptions = new Map<ReturnType<typeof toSocketIo>['client'], { userId: string | null; orderIds: Set<string> }>()
const scheduleOrderResolution = (order: Order) => {
  if (order.status !== 'pending' || orderTimers.has(order.id)) return
  orderTimers.set(order.id, setTimeout(() => {
    orderTimers.delete(order.id)
    finalizeOrder(order)
  }, Math.max(0, order.resolveAt - Date.now())))
}
const socketHandler = socket.addEventListener('connection', (connection) => {
  const { client } = toSocketIo(connection)
  socketClients.add(client)
  orderSubscriptions.set(client, { userId: state.user?.id ?? null, orderIds: new Set() })
  connection.client.addEventListener('close', () => { socketClients.delete(client); orderSubscriptions.delete(client) })
  client.on('subscribe', (_event, resource: { type: string; id: string }) => {
    if (resource.type === 'nft') {
      const nft = state.nfts.find((item) => item.id === resource.id)
      if (nft) client.emit('nft.updated', { id: nft.id, nft, version: nft.version })
    } else if (resource.type === 'order') {
      const subscription = orderSubscriptions.get(client)
      if (!subscription || subscription.userId !== state.user?.id) return
      subscription.orderIds.add(resource.id)
      const order = getPublicOrder(resource.id)
      if (order) client.emit('order.updated', { id: order.id, order: toPublicOrder(reconcileOrder(order)), version: order.version })
    }
  })
})

export const handlers = [
  http.get('/api/health', () => HttpResponse.json({ ok: true, mock: true })),
  http.post('/api/reset', () => { orderTimers.forEach(clearTimeout); orderTimers.clear(); Object.assign(state, { nfts: structuredClone(initialNfts), user: null, profiles: {}, passwordHashes: {}, carts: { guest: {} }, favoritesByUser: {}, orders: {}, orderPayloads: {}, walletsByUser: {} }); save(); return HttpResponse.json({ ok: true }) }),
  http.post('/api/scenarios/nft-update/:id', async ({ params, request }) => {
    const nft = state.nfts.find((item) => item.id === params.id)
    if (!nft) return HttpResponse.json({ message: 'NFT não encontrado.' }, { status: 404 })
    const update = await request.json() as { price?: string; available?: number }
    if (update.price !== undefined) nft.price = update.price
    if (update.available !== undefined) nft.available = Math.max(0, update.available)
    nft.version += 1; save()
    const event = { id: nft.id, nft: { ...nft }, version: nft.version }
    for (const client of socketClients) client.emit('nft.updated', event)
    return HttpResponse.json(event)
  }),
  http.get('/api/nfts', async ({ request }) => {
    const url = new URL(request.url)
    const scenario = url.searchParams.get('scenario')
    if (scenario === 'offline') return HttpResponse.error()
    if (scenario === 'server-error') return HttpResponse.json({ message: 'Falha simulada.' }, { status: 503 })
    if (scenario === 'empty') return HttpResponse.json({ items: [], total: 0, page: 1, pages: 0 })
    if (scenario === 'slow') await delay(1_500)
    const q = (url.searchParams.get('q') ?? '').toLocaleLowerCase('pt-BR')
    const category = url.searchParams.get('category') ?? ''
    const sort = url.searchParams.get('sort') ?? 'featured'
    const page = Math.max(1, Number(url.searchParams.get('page') ?? 1))
    const minPriceParam = url.searchParams.get('minPrice')
    const maxPriceParam = url.searchParams.get('maxPrice')
    const minPrice = minPriceParam === null ? Number.NEGATIVE_INFINITY : Number(minPriceParam)
    const maxPrice = maxPriceParam === null ? Number.POSITIVE_INFINITY : Number(maxPriceParam)
    const requestedLimit = Number(url.searchParams.get('limit'))
    const pageSize = Number.isFinite(requestedLimit) && requestedLimit > 0
      ? Math.min(50, Math.floor(requestedLimit))
      : 6
    let result = state.nfts.filter((nft) => (!q || `${nft.name} ${nft.collection}`.toLocaleLowerCase('pt-BR').includes(q)) && (!category || nft.collection === category) && Number(nft.price) >= minPrice && Number(nft.price) <= maxPrice)
    if (sort === 'price-asc') result = [...result].sort((a, b) => Number(a.price) - Number(b.price))
    if (sort === 'price-desc') result = [...result].sort((a, b) => Number(b.price) - Number(a.price))
    const total = result.length
    return HttpResponse.json({ items: result.slice((page - 1) * pageSize, page * pageSize), total, page, pages: Math.ceil(total / pageSize) })
  }),
  http.get('/api/nfts/:id', ({ params }) => {
    const nft = state.nfts.find((item) => item.id === params.id)
    return nft ? HttpResponse.json(nft) : HttpResponse.json({ message: 'NFT não encontrado.' }, { status: 404 })
  }),
  http.post('/api/auth/login', async ({ request }) => {
    const body = await request.json() as { email: string; password: string }
    const match = credentials.find((user) => user.email === body.email)
    const id = body.email.split('@')[0]
    const passwordMatches = state.passwordHashes[id] ? state.passwordHashes[id] === await hashPassword(body.password) : match?.password === body.password
    if (!match || !passwordMatches) return HttpResponse.json({ message: 'E-mail ou senha inválidos.' }, { status: 401 })
    state.user = state.profiles[id] ?? { id, name: match.name, email: match.email }
    state.profiles[id] = state.user
    state.carts[state.user.id] = { ...state.carts.guest, ...state.carts[state.user.id] }; delete state.carts.guest
    save()
    return HttpResponse.json({ user: state.user, token: `mock-${state.user.id}` })
  }),
  http.post('/api/auth/register', async ({ request }) => {
    const body = await request.json() as { name: string; email: string; password: string }
    if (credentials.some((user) => user.email === body.email) || Object.values(state.profiles).some((user) => user.email === body.email)) return HttpResponse.json({ message: 'Este e-mail já possui cadastro.' }, { status: 409 })
    if (body.password.length < 8) return HttpResponse.json({ message: 'A senha precisa ter ao menos 8 caracteres.' }, { status: 422 })
    const id = body.email.split('@')[0]
    state.user = state.profiles[id] ?? { id, name: body.name, email: body.email }
    state.profiles[id] = state.user
    state.passwordHashes[id] = await hashPassword(body.password)
    state.carts[state.user.id] = { ...state.carts.guest, ...state.carts[state.user.id] }; delete state.carts.guest
    save()
    return HttpResponse.json({ user: state.user, token: `mock-${state.user.id}` }, { status: 201 })
  }),
  http.get('/api/auth/session', () => HttpResponse.json({ user: state.user })),
  http.post('/api/auth/logout', () => { state.user = null; save(); return HttpResponse.json({ ok: true }) }),
  http.get('/api/favorites', () => state.user ? HttpResponse.json(state.favoritesByUser[state.user.id] ?? []) : HttpResponse.json({ message: 'Faça login.' }, { status: 401 })),
  http.put('/api/favorites/:id', ({ params }) => {
    if (!state.user) return HttpResponse.json({ message: 'Faça login.' }, { status: 401 })
    const id = String(params.id); const favorites = state.favoritesByUser[state.user.id] ?? []
    state.favoritesByUser[state.user.id] = favorites.includes(id) ? favorites.filter((item) => item !== id) : [...favorites, id]; save()
    return HttpResponse.json(state.favoritesByUser[state.user.id])
  }),
  http.get('/api/cart', () => HttpResponse.json(getCart())),
  http.put('/api/cart/:id', async ({ params, request }) => {
    const { quantity } = await request.json() as { quantity: number }
    const nft = state.nfts.find((item) => item.id === params.id)
    if (!nft) return HttpResponse.json({ message: 'NFT não encontrado.' }, { status: 404 })
    if (quantity > nft.available) return HttpResponse.json({ message: 'Quantidade acima do estoque disponível.' }, { status: 409 })
    if (quantity < 1) delete activeCart()[String(params.id)]; else activeCart()[String(params.id)] = quantity
    save(); return HttpResponse.json(getCart())
  }),
  http.delete('/api/cart/:id', ({ params }) => { delete activeCart()[String(params.id)]; save(); return HttpResponse.json(getCart()) }),
  http.post('/api/quote', async ({ request }) => {
    const { coupon = '' } = await request.json() as { coupon?: string }
    if (coupon && coupon.toUpperCase() !== 'JUNGLE10') return HttpResponse.json({ message: 'Cupom inválido ou expirado.' }, { status: 422 })
    return HttpResponse.json(quote(coupon))
  }),
  http.post('/api/orders', async ({ request }) => {
    if (!state.user) return HttpResponse.json({ message: 'Faça login para continuar.' }, { status: 401 })
    const key = request.headers.get('Idempotency-Key')
    if (!key) return HttpResponse.json({ message: 'Chave idempotente obrigatória.' }, { status: 400 })
    const orderKey = `${state.user.id}:${key}`
    const body = await request.json() as { coupon?: string; fail?: boolean; items?: Array<{ id: string; quantity: number; price: string }>; quotedTotal?: string; wallet?: Partial<Wallet> }
    const payload = JSON.stringify(body)
    const existing = state.orders[orderKey]
    if (existing) {
      if (state.orderPayloads[orderKey] !== payload) return HttpResponse.json({ message: 'A chave de idempotência já foi usada com dados diferentes.' }, { status: 409 })
      return HttpResponse.json(toPublicOrder(reconcileOrder(existing)))
    }
    const summary = quote(body.coupon)
    const currentItems = summary.items.map(({ nft, quantity }) => ({ id: nft.id, quantity, price: nft.price }))
    if (JSON.stringify(body.items ?? []) !== JSON.stringify(currentItems) || body.quotedTotal !== summary.total) return HttpResponse.json({ message: 'Preço ou disponibilidade mudou. Revise a cotação antes de confirmar.' }, { status: 409 })
    if (summary.items.some(({ nft, quantity }) => quantity > nft.available)) return HttpResponse.json({ message: 'Disponibilidade alterada. Revise o carrinho.' }, { status: 409 })
    if (!body.fail && body.wallet) {
      const address = body.wallet.address ?? ''
      if (!/^0x[a-fA-F0-9]{6,}$/.test(address)) return HttpResponse.json({ message: 'Informe um endereço de carteira válido.' }, { status: 422 })
      if (activeWallets().some((wallet) => wallet.address === address)) return HttpResponse.json({ message: 'Esta carteira já está cadastrada.' }, { status: 409 })
    }
    const order: Order = { id: `JG-${Date.now().toString(36).toUpperCase()}`, status: 'pending', resolution: body.fail ? 'declined' : 'confirmed', resolveAt: Date.now() + 1_500, items: summary.items.map(({ nft, quantity }) => ({ nft: { ...nft }, quantity })), subtotal: summary.subtotal, discount: summary.discount, networkFee: summary.networkFee, total: summary.total, tx: `0x${crypto.randomUUID().replaceAll('-', '')}`, createdAt: new Date().toISOString(), version: 1, ownerId: state.user.id }
    state.orders[orderKey] = order; state.orderPayloads[orderKey] = payload
    if (body.wallet?.address) {
      const wallets = activeWallets()
      order.pendingWallet = { ...body.wallet, address: body.wallet.address, nickname: body.wallet.nickname?.trim() || `Carteira ${wallets.length + 1}`, isPrimary: wallets.length === 0 || !wallets.some((wallet) => wallet.isPrimary) }
    }
    save(); emitOrder(order)
    scheduleOrderResolution(order)
    return HttpResponse.json(toPublicOrder(order), { status: 201 })
  }),
  http.get('/api/orders/:id', ({ params }) => {
    if (!state.user) return HttpResponse.json({ message: 'Faça login.' }, { status: 401 })
    const order = getPublicOrder(String(params.id))
    if (!order) return HttpResponse.json({ message: 'Pedido não encontrado.' }, { status: 404 })
    return HttpResponse.json(toPublicOrder(reconcileOrder(order)))
  }),
  http.get('/api/profile', () => state.user ? HttpResponse.json(state.user) : HttpResponse.json({ message: 'Faça login.' }, { status: 401 })),
  http.patch('/api/profile', async ({ request }) => {
    if (!state.user) return HttpResponse.json({ message: 'Faça login.' }, { status: 401 })
    Object.assign(state.user, await request.json() as Partial<User>); state.profiles[state.user.id] = state.user; save(); return HttpResponse.json(state.user)
  }),
  http.post('/api/profile/password', async ({ request }) => {
    if (!state.user) return HttpResponse.json({ message: 'Faça login.' }, { status: 401 })
    const { currentPassword, newPassword } = await request.json() as { currentPassword: string; newPassword: string }
    const account = credentials.find((user) => user.email === state.user?.email)
    const matches = state.passwordHashes[state.user.id] ? state.passwordHashes[state.user.id] === await hashPassword(currentPassword) : account?.password === currentPassword
    if (!matches) return HttpResponse.json({ message: 'Senha atual incorreta.' }, { status: 422 })
    if (newPassword.length < 8) return HttpResponse.json({ message: 'A nova senha precisa ter ao menos 8 caracteres.' }, { status: 422 })
    state.passwordHashes[state.user.id] = await hashPassword(newPassword); save(); return HttpResponse.json({ ok: true })
  }),
  http.get('/api/wallets', () => state.user ? HttpResponse.json(activeWallets()) : HttpResponse.json({ message: 'Faça login.' }, { status: 401 })),
  http.post('/api/wallets', async ({ request }) => {
    if (!state.user) return HttpResponse.json({ message: 'Faça login.' }, { status: 401 })
    const { address = '', nickname = '', ...rest } = await request.json() as Partial<Wallet>
    if (!/^0x[a-fA-F0-9]{6,}$/.test(address)) return HttpResponse.json({ message: 'Informe um endereço de carteira válido.' }, { status: 422 })
    const wallets = activeWallets()
    if (wallets.some((wallet) => wallet.address === address)) return HttpResponse.json({ message: 'Esta carteira já está cadastrada.' }, { status: 409 })
    wallets.push({ address, nickname: (nickname || '').trim() || `Carteira ${wallets.length + 1}`, ...rest })
    save(); return HttpResponse.json(wallets, { status: 201 })
  }),
  http.patch('/api/wallets/:address', async ({ params, request }) => {
    if (!state.user) return HttpResponse.json({ message: 'Faça login.' }, { status: 401 })
    const wallet = activeWallets().find((item) => item.address === params.address)
    if (!wallet) return HttpResponse.json({ message: 'Carteira não encontrada.' }, { status: 404 })
    const rest = { ...((await request.json()) as Partial<Wallet>) }
    delete rest.address
    Object.assign(wallet, rest); save()
    return HttpResponse.json(activeWallets())
  }),
  http.delete('/api/wallets/:address', ({ params }) => { if (!state.user) return HttpResponse.json({ message: 'Faça login.' }, { status: 401 }); state.walletsByUser[state.user.id] = activeWallets().filter((wallet) => wallet.address !== params.address); save(); return HttpResponse.json(activeWallets()) }),
  socketHandler,
]
