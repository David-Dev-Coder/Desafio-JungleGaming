import type { Socket } from 'socket.io-client'

export function subscribeToNft(id: string, onUpdate: (value: { id: string; nft: import('../domain/types').Nft; version: number }) => void, onConnection?: (status: string) => void) {
  let socket: Socket | undefined
  let disposed = false
  void import('socket.io-client').then(({ io }) => {
    if (disposed) return
    socket = io(window.location.origin, { path: '/socket.io/', transports: ['websocket'], reconnection: true })
    socket.on('connect', () => { onConnection?.('Conectado'); socket?.emit('subscribe', { type: 'nft', id }) })
    socket.on('connect_error', () => onConnection?.('Reconectando'))
    socket.on('disconnect', () => onConnection?.('Desconectado'))
    socket.on('nft.updated', onUpdate)
  })
  return () => { disposed = true; socket?.disconnect() }
}

export function subscribeToOrder(id: string, onUpdate: (value: { id: string; order: import('../domain/types').Order; version: number }) => void) {
  let socket: Socket | undefined
  let disposed = false
  void import('socket.io-client').then(({ io }) => {
    if (disposed) return
    socket = io(window.location.origin, { path: '/socket.io/', transports: ['websocket'], reconnection: true })
    socket.on('connect', () => socket?.emit('subscribe', { type: 'order', id }))
    socket.on('order.updated', (event: { id: string; order: import('../domain/types').Order; version: number }) => { if (event.id === id) onUpdate(event) })
  })
  return () => { disposed = true; socket?.disconnect() }
}
