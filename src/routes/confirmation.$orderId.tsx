import { createRoute, Link, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'
import { Route as rootRoute } from './__root'
import { OrderModal } from '../components/OrderModal'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Empty, EmptyContent, EmptyHeader, EmptyTitle } from '@/components/ui/empty'
import { api } from '../services/api'
import { subscribeToOrder } from '../services/realtime'
import type { Order } from '../domain/types'

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: '/confirmation/$orderId',
  validateSearch: (search: Record<string, unknown>) => ({
    wallet: typeof search.wallet === 'string' ? search.wallet : undefined,
  }),
  component: ConfirmationPage,
})

function ConfirmationPage() {
  const { orderId } = Route.useParams()
  const { wallet } = Route.useSearch()
  const navigate = useNavigate()
  const client = useQueryClient()
  const finalized = useRef<string | null>(null)
  const order = useQuery({ queryKey: ['order', orderId], queryFn: async () => (await api.get<Order>(`/orders/${orderId}`)).data, retry: false })

  useEffect(() => subscribeToOrder(orderId, (event) => client.setQueryData<Order>(['order', orderId], (current) => !current || event.version > current.version ? event.order : current)), [orderId, client])

  useEffect(() => {
    const current = order.data
    if (!current || current.status === 'pending') return
    const terminalKey = `${current.id}:${current.status}`
    if (finalized.current === terminalKey) return
    finalized.current = terminalKey
    sessionStorage.removeItem('jungle-pending-order-key')
    sessionStorage.removeItem('jungle-coupon')
    void client.invalidateQueries({ queryKey: ['cart'] })
    void client.invalidateQueries({ queryKey: ['quote'] })
    void client.invalidateQueries({ queryKey: ['wallets'] })
  }, [order.data, client])

  if (order.isPending) return <main className="mx-auto max-w-2xl px-5 py-20"><Skeleton className="h-72 rounded-3xl bg-brand-surface-card" /></main>
  if (order.isError || !order.data) return (
    <main className="mx-auto max-w-2xl px-5 py-20">
      <Empty className="border-none">
        <EmptyHeader>
          <EmptyTitle className="text-heading-28-bold">Pedido não encontrado</EmptyTitle>
        </EmptyHeader>
        <EmptyContent>
          <Button asChild className="bg-lime-300 text-brand-ink hover:bg-lime-200"><Link to="/">Voltar à loja</Link></Button>
        </EmptyContent>
      </Empty>
    </main>
  )

  return (
    <main className="min-h-[70vh]">
      <OrderModal order={order.data} wallet={wallet} onClose={() => void navigate({ to: '/' })} />
    </main>
  )
}
