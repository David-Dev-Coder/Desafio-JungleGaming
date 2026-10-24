import { createRootRoute, Link } from '@tanstack/react-router'
import { SiteLayout } from '../components/SiteLayout'
import { Button } from '@/components/ui/button'

export const Route = createRootRoute({
  component: SiteLayout,
  notFoundComponent: () => <main className="mx-auto max-w-2xl px-5 py-24 text-center"><p className="text-caption-12-bold uppercase tracking-[.2em] text-lime-300">404 · rota não encontrada</p><h1 className="mt-3 text-heading-28-bold">Essa página saiu da trilha.</h1><Button asChild className="mt-6 bg-lime-300 text-brand-ink hover:bg-lime-200"><Link to="/">Voltar ao marketplace</Link></Button></main>,
})
