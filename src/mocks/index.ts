export async function startMocks() {
  if (import.meta.env.VITE_ENABLE_MSW !== 'true') return
  const { worker } = await import('./worker')
  await worker.start({ onUnhandledRequest: 'bypass', serviceWorker: { url: '/mockServiceWorker.js' } })
}
