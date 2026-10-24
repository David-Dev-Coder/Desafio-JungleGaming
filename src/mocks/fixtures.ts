export type MockNft = {
  id: string
  name: string
  collection: string
  image: string
  price: string
  available: number
  version: number
  description: string
  attributes: string[]
  editions: string[]
  rating: number
  reviews: number
  creator: string
  network: string
  contract: string
  royalty: string
}

type NftBase = Pick<MockNft, 'id' | 'name' | 'collection' | 'image' | 'price' | 'available'>

const bases: NftBase[] = [
  { id: '001', name: 'Spirit of the Canopy', collection: 'Jungle Guardians', image: '/assets/img/2986a7cb16d09de8970824d2dd58bf0bb021702c.png', price: '0.42', available: 12 },
  { id: '002', name: 'The Last Bloom', collection: 'Jungle Guardians', image: '/assets/img/9df2ff42dd27ba657621c304557d1a855a4be6a5.png', price: '0.68', available: 4 },
  { id: '003', name: 'Mossbound Relic', collection: 'Ancient Artifacts', image: '/assets/img/2986a7cb16d09de8970824d2dd58bf0bb021702c.png', price: '0.25', available: 23 },
  { id: '004', name: 'Tropical Paradise', collection: 'Jungle Treasures', image: '/assets/img/9df2ff42dd27ba657621c304557d1a855a4be6a5.png', price: '0.75', available: 8 },
  { id: '005', name: 'Canopy Warden', collection: 'Jungle Guardians', image: '/assets/img/87580f2def9af0ce13f4b6f6ce17bb2449bcfc16.png', price: '0.31', available: 17 },
  { id: '006', name: 'Emerald Sentinel', collection: 'Jungle Guardians', image: '/assets/img/9df2ff42dd27ba657621c304557d1a855a4be6a5.png', price: '1.20', available: 2 },
  { id: '007', name: 'Temple of Vines', collection: 'Ancient Artifacts', image: '/assets/img/87580f2def9af0ce13f4b6f6ce17bb2449bcfc16.png', price: '0.19', available: 31 },
  { id: '008', name: 'Sunstone Totem', collection: 'Ancient Artifacts', image: '/assets/img/87580f2def9af0ce13f4b6f6ce17bb2449bcfc16.png', price: '0.54', available: 6 },
  { id: '009', name: 'River Spirit', collection: 'Jungle Treasures', image: '/assets/img/8459204731e6eba9d474cbc8ebc37071360d3ba5.png', price: '0.37', available: 14 },
  { id: '010', name: 'Moonlit Canopy', collection: 'Jungle Treasures', image: '/assets/img/9df2ff42dd27ba657621c304557d1a855a4be6a5.png', price: '0.88', available: 3 },
  { id: '011', name: 'Wildwood Oracle', collection: 'Jungle Guardians', image: '/assets/img/9df2ff42dd27ba657621c304557d1a855a4be6a5.png', price: '0.46', available: 9 },
  { id: '012', name: 'Obsidian Bloom', collection: 'Ancient Artifacts', image: '/assets/img/2986a7cb16d09de8970824d2dd58bf0bb021702c.png', price: '0.63', available: 5 },
  { id: '013', name: 'Primal Echo', collection: 'Jungle Treasures', image: '/assets/img/9df2ff42dd27ba657621c304557d1a855a4be6a5.png', price: '0.28', available: 20 },
  { id: '014', name: 'Keeper of Roots', collection: 'Ancient Artifacts', image: '/assets/img/8459204731e6eba9d474cbc8ebc37071360d3ba5.png', price: '1.05', available: 1 },
  { id: '015', name: 'Verdant Dreamer', collection: 'Jungle Guardians', image: '/assets/img/2986a7cb16d09de8970824d2dd58bf0bb021702c.png', price: '0.57', available: 11 },
  { id: '016', name: 'Fernfire Mask', collection: 'Jungle Treasures', image: '/assets/img/87580f2def9af0ce13f4b6f6ce17bb2449bcfc16.png', price: '0.34', available: 16 },
  { id: '017', name: 'Golden Canopy', collection: 'Jungle Guardians', image: '/assets/img/9df2ff42dd27ba657621c304557d1a855a4be6a5.png', price: '1.42', available: 2 },
  { id: '018', name: 'Whispering Idol', collection: 'Ancient Artifacts', image: '/assets/img/8459204731e6eba9d474cbc8ebc37071360d3ba5.png', price: '0.81', available: 7 },
  { id: '019', name: 'Rainforest Pulse', collection: 'Jungle Treasures', image: '/assets/img/2986a7cb16d09de8970824d2dd58bf0bb021702c.png', price: '0.22', available: 28 },
  { id: '020', name: 'Watcher of Dawn', collection: 'Jungle Guardians', image: '/assets/img/87580f2def9af0ce13f4b6f6ce17bb2449bcfc16.png', price: '0.96', available: 4 },
  { id: '021', name: 'Ancient Seed', collection: 'Ancient Artifacts', image: '/assets/img/9df2ff42dd27ba657621c304557d1a855a4be6a5.png', price: '0.17', available: 35 },
  { id: '022', name: 'Canopy Afterglow', collection: 'Jungle Treasures', image: '/assets/img/8459204731e6eba9d474cbc8ebc37071360d3ba5.png', price: '0.73', available: 9 },
  { id: '023', name: 'Emerald Grove', collection: 'Jungle Guardians', image: '/assets/img/2986a7cb16d09de8970824d2dd58bf0bb021702c.png', price: '1.18', available: 3 },
  { id: '024', name: 'Vinekeeper Seal', collection: 'Ancient Artifacts', image: '/assets/img/87580f2def9af0ce13f4b6f6ce17bb2449bcfc16.png', price: '0.49', available: 13 },
  { id: '025', name: 'Tide of Leaves', collection: 'Jungle Treasures', image: '/assets/img/9df2ff42dd27ba657621c304557d1a855a4be6a5.png', price: '0.39', available: 18 },
  { id: '026', name: 'The Rootbound Crown', collection: 'Ancient Artifacts', image: '/assets/img/8459204731e6eba9d474cbc8ebc37071360d3ba5.png', price: '1.67', available: 1 },
]

const creators = ['Nova Sato', 'Bia Nakamura', 'Tuca Ferraz', 'Duda Reyes']
const attributeSets = [
  ['Óculos', 'Esmeralda', 'Raro'],
  ['Coroa', 'Dourado', 'Épico'],
  ['Boné', 'Jaspe', 'Comum'],
  ['Fones', 'Âmbar', 'Raro'],
  ['Capacete', 'Obsidiana', 'Lendário'],
]

export const initialNfts: MockNft[] = bases.map((nft, index) => ({
  ...nft,
  version: 1,
  description: `Um colecionável digital finalizado à mão da coleção ${nft.collection}, verificado na Ethereum, com arte desbloqueável e acesso para colecionadores.`,
  attributes: attributeSets[index % attributeSets.length],
  editions: ['1/1', `1/${nft.available}`, 'ABERTA'],
  rating: 4 + (index % 2),
  reviews: 7 + ((index * 7) % 29),
  creator: creators[index % creators.length],
  network: 'Ethereum',
  contract: '0x7A42...19E8',
  royalty: '5% nas vendas secundárias',
}))
