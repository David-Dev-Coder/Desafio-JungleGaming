export type Nft = {
  id: string
  name: string
  collection: string
  image: string
  price: string
  available: number
  version: number
  description?: string
  attributes?: string[]
  editions?: string[]
  rating?: number
  reviews?: number
  creator?: string
  network?: string
  contract?: string
  royalty?: string
}
export type User = { id: string; name: string; email: string; avatar?: string; username?: string; ens?: string }
export type Wallet = {
  address: string
  nickname: string
  isPrimary?: boolean
  displayName?: string
  network?: string
  profileName?: string
  secondaryEns?: string
  walletType?: string
  referralCode?: string
  email?: string
  ens?: string
}
export type CartItem = { nft: Nft; quantity: number }
export type Quote = { items: CartItem[]; subtotal: string; discount: string; networkFee: string; total: string; coupon: string | null }
export type Order = { id: string; status: 'pending' | 'confirmed' | 'declined'; items: CartItem[]; subtotal?: string; discount?: string; networkFee?: string; total: string; tx: string; createdAt: string; version: number }
