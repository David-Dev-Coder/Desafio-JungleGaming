import { createRoute, Link, useNavigate } from '@tanstack/react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent } from 'react'
import { Route as rootRoute } from './__root'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { api } from '../services/api'
import type { User } from '../domain/types'

export const Route = createRoute({ getParentRoute: () => rootRoute, path: '/login', validateSearch: (search: Record<string, unknown>) => typeof search.returnTo === 'string' ? { returnTo: search.returnTo } : {}, component: LoginPage })
function LoginPage() {
  const [register, setRegister] = useState(false); const [name, setName] = useState(''); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [error, setError] = useState('')
  const navigate = useNavigate(); const client = useQueryClient(); const { returnTo } = Route.useSearch()
  const auth = useMutation({ mutationFn: async () => (await api.post<{ user: User; token: string }>(register ? '/auth/register' : '/auth/login', { name, email, password })).data, onSuccess: async (data) => { localStorage.setItem('jungle-token', data.token); client.setQueryData(['session'], { user: data.user }); await client.invalidateQueries(); void navigate({ to: returnTo === '/checkout' ? '/checkout' : '/profile' }) }, onError: (cause) => setError((cause as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Não foi possível entrar. Tente novamente.') })
  const submit = (event: FormEvent) => { event.preventDefault(); setError(''); auth.mutate() }
  return <main className="mx-auto grid min-h-[calc(100vh-160px)] max-w-6xl items-center gap-10 px-5 py-12 lg:grid-cols-2 lg:px-8"><div className="hidden lg:block"><p className="text-caption-12-bold uppercase tracking-[.24em] text-lime-300">Uma nova forma de colecionar</p><h1 className="mt-4 max-w-lg text-display-43-bold leading-[1.02]">Entre no mundo <span className="text-lime-300">Jungle.</span></h1><p className="mt-5 max-w-md leading-relaxed text-white/50">Guarde seus itens, acompanhe suas coleções e continue de onde parou.</p><div className="mt-9 flex gap-2">{[1,2,3].map((n) => <span key={n} className="size-2 rounded-full bg-lime-300/60"/>)}</div></div>
    <form onSubmit={submit} className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-[#241612] p-6 sm:p-9"><p className="text-caption-12-bold uppercase tracking-[.2em] text-lime-300">Conta Jungle</p><h2 className="mt-2 text-heading-28-bold">{register ? 'Criar conta' : 'Bem-vindo de volta'}</h2><p className="mt-2 text-body-14-regular-22 text-white/45">{register ? 'Cadastre-se para começar sua coleção.' : 'Acesse sua conta para continuar.'}</p>
      {register && <Label className="mt-6 block font-normal text-body-14-regular-22">Nome completo<Input required autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-2 h-12 rounded-md border-white/10 bg-black/20 px-3 text-body-14-regular-24 text-white shadow-none placeholder:text-white/30 focus-visible:border-lime-300" placeholder="Seu nome"/></Label>}
      <Label className="mt-6 block font-normal text-body-14-regular-22">E-mail<Input required type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 h-12 rounded-md border-white/10 bg-black/20 px-3 text-body-14-regular-24 text-white shadow-none placeholder:text-white/30 focus-visible:border-lime-300" placeholder="voce@email.com"/></Label>
      <Label className="mt-4 block font-normal text-body-14-regular-22">Senha<Input required type="password" minLength={8} autoComplete={register ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 h-12 rounded-md border-white/10 bg-black/20 px-3 text-body-14-regular-24 text-white shadow-none placeholder:text-white/30 focus-visible:border-lime-300" placeholder="Mínimo 8 caracteres"/></Label>
      {error && (
        <Alert variant="destructive" className="mt-4 rounded-xl bg-red-400/10 p-3">
          <AlertDescription className="text-body-14-regular-22">{error}</AlertDescription>
        </Alert>
      )}
      <Button type="submit" disabled={auth.isPending} className="mt-6 w-full bg-lime-300 text-body-14-bold-20 text-brand-ink hover:bg-lime-200">{auth.isPending ? <><Spinner /> Aguarde…</> : register ? 'Criar minha conta' : 'Entrar'}</Button>
      {!register && <p className="mt-4 text-center text-tiny-11-medium text-white/35">Demo: ana@jungle.test · senha Jungle123!</p>}
      <p className="mt-6 text-center text-body-14-regular-22 text-white/45">{register ? 'Já tem uma conta?' : 'Ainda não tem conta?'} <Button type="button" variant="link" onClick={() => { setRegister(!register); setError('') }} className="h-auto p-0 font-semibold text-lime-300">{register ? 'Entrar' : 'Cadastre-se'}</Button></p>
      <Link to="/" className="mt-6 block text-center text-caption-12-regular-16 text-white/35 hover:text-white">Voltar para a loja</Link>
    </form></main>
}
