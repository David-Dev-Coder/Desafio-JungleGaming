import { createRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState, type FormEvent, type ReactNode } from 'react'
import {
  Menu,
  Trash2,
} from 'lucide-react'
import { Route as rootRoute } from './__root'
import { useAuthModal } from '../components/AuthModal'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { api } from '../services/api'
import type { User, Wallet } from '../domain/types'
import { SvgIcon } from '../components/SvgIcon'

export const Route = createRoute({ getParentRoute: () => rootRoute, path: '/profile', component: ProfilePage })

const inputClass =
  'mt-2 block h-11 w-full rounded-sm border border-[#55321F] bg-[#241612] px-3 text-body-14-regular-22 text-[#EFE6DA] placeholder:text-[#B39463] outline-none transition focus:border-[#D28A4C] disabled:opacity-45'

const selectPlaceholderClass =
  'block h-11 w-full rounded-sm border border-[#55321F] bg-[#241612] px-3 text-body-14-regular-22 text-[#B39463] outline-none transition focus:border-[#D28A4C] mt-2'
const nonSelectClass =
  'block h-11 w-full rounded-sm border border-[#55321F] bg-[#241612] px-3 text-body-14-regular-22 text-[#F7F3EC] outline-none transition focus:border-[#D28A4C] mt-2'

const NETWORKS = ['Ethereum', 'Polygon', 'Base', 'Arbitrum']
const WALLET_TYPES = ['Exchange', 'Self-Custody', 'Hot Wallet', 'Cold Wallet']
type ProfileIconProps = { size?: number | string, className?: string }
const ProfileHeartIcon = ({ size, className }: ProfileIconProps) => <SvgIcon name="heart" fill="currentColor" size={size} className={className} />
const ProfileUserIcon = ({ size, className }: ProfileIconProps) => <SvgIcon name="user2" fill="currentColor" size={size} className={className} />
const ProfileLocationIcon = ({ size, className }: ProfileIconProps) => <SvgIcon name="location" fill="currentColor" size={size} className={className} />
const ProfileActivityIcon = ({ size, className }: ProfileIconProps) => <SvgIcon name="activity" fill="currentColor" stroke="currentColor" size={size} className={className} />
const ProfileCartIcon = ({ size, className }: ProfileIconProps) => <SvgIcon name="cart" fill="currentColor" size={size} className={className} />
const ProfileDownloadIcon = ({ size, className }: ProfileIconProps) => <SvgIcon name="download" fill="currentColor" stroke="currentColor" size={size} className={className} />
const ProfileDangerIcon = ({ size, className }: ProfileIconProps) => <SvgIcon name="danger" fill="currentColor" stroke="currentColor" size={size} className={className} />

type WalletDraft = {
  displayName: string
  nickname: string
  network: string
  profileName: string
  address: string
  secondaryEns: string
  walletType: string
  referralCode: string
  email: string
  ens: string
}

const menu = [
  { id: 'dados', label: 'Dados do perfil', icon: ProfileUserIcon },
  { id: 'carteiras', label: 'Carteiras', icon: ProfileLocationIcon },
  { id: 'atividade', label: 'Atividade', icon: ProfileCartIcon },
  { id: 'interesse', label: 'Lista de interesse', icon: ProfileHeartIcon },
  { id: 'ofertas', label: 'Ofertas', icon: ProfileActivityIcon },
  { id: 'arquivos', label: 'Arquivos baixados', icon: ProfileDownloadIcon },
  { id: 'suporte', label: 'Suporte', icon: ProfileDangerIcon },
]

function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <Label className="block font-normal text-body-14-regular-22 text-[#F7F3EC]">
      <span>
        {label}
        {required && <span className="ml-1 text-[#E89B55]">*</span>}
      </span>
      {children}
    </Label>
  )
}

function PasswordField({ label, name, autoComplete, hint }: { label: string; name: string; autoComplete: string; hint?: string }) {
  const [show, setShow] = useState(false)
  return (
    <Label className="block font-normal">
      <span className="text-body-14-regular-22 text-[#F7F3EC]">{label}</span>
      <span className="relative mt-2 block">
        <Input
          name={name}
          type={show ? 'text' : 'password'}
          autoComplete={autoComplete}
          {...(hint ? { minLength: 8, pattern: '.{8,}', title: hint } : {})}
          className={inputClass}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={show ? 'Ocultar senha' : 'Mostrar senha'}
          onClick={() => setShow((value) => !value)}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#B39463] hover:bg-transparent hover:text-[#E89B55]"
        >
          {show ? <SvgIcon name="eye" size={16} /> : <SvgIcon name="eyeOff" size={16} />}
        </Button>
      </span>
    </Label>
  )
}

function WalletForm({
  initial,
  locked,
  editLabel,
  submitLabel,
  onSubmit,
  onEdit,
}: {
  initial: Partial<WalletDraft>
  locked?: boolean
  editLabel?: string
  submitLabel: string
  onSubmit: (draft: WalletDraft) => void
  onEdit?: () => void
}) {
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (locked) {
      onEdit?.()
      return
    }
    const data = new FormData(event.currentTarget)
    onSubmit({
      displayName: String(data.get('displayName')).trim(),
      nickname: String(data.get('nickname')).trim(),
      network: String(data.get('network')),
      profileName: String(data.get('profileName')).trim(),
      address: String(data.get('address')).trim(),
      secondaryEns: String(data.get('secondaryEns') ?? '').trim(),
      walletType: String(data.get('walletType')),
      referralCode: String(data.get('referralCode')).trim(),
      email: String(data.get('email')).trim(),
      ens: `${String(data.get('ens')).trim().replace(/\.eth$/, '')}.eth`,
    })
  }

  return (
    <form onSubmit={submit} className="mt-6">
      <div className="grid gap-x-10 gap-y-5 lg:grid-cols-2">
        <Field label="Nome de exibição" required>
          <Input name="displayName" required defaultValue={initial.displayName} disabled={locked} className={inputClass} />
        </Field>
        <Field label="Apelido da carteira" required>
          <Input name="nickname" required defaultValue={initial.nickname} disabled={locked} className={inputClass} />
        </Field>
        <Field label="Rede" required>
          <NativeSelect
            name="network"
            required
            defaultValue={initial.network ?? ''}
            disabled={locked}
            wrapperClassName="mt-2 w-full"
            className={`${initial.network ? nonSelectClass : selectPlaceholderClass} pr-9 disabled:opacity-45`}
          >
            <NativeSelectOption value="" disabled>Selecione uma rede</NativeSelectOption>
            {NETWORKS.map((network) => (
              <NativeSelectOption key={network} value={network}>{network}</NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Nome do perfil" required>
          <Input name="profileName" required defaultValue={initial.profileName} disabled={locked} className={inputClass} />
        </Field>
        <Field label="Endereço da carteira" required>
          <Input name="address" required defaultValue={initial.address} disabled={locked} className={inputClass} placeholder="Endereço 0x da carteira" />
        </Field>
        <div>
          <span aria-hidden="true" className="invisible text-body-14-regular-22">.</span>
          <Input
            aria-label="ENS ou carteira secundária (opcional)"
            name="secondaryEns"
            defaultValue={initial.secondaryEns}
            disabled={locked}
            className={inputClass}
            placeholder="ENS ou carteira secundária (opcional)"
          />
        </div>
        <Field label="Tipo de carteira" required>
          <NativeSelect
            name="walletType"
            required
            defaultValue={initial.walletType ?? ''}
            disabled={locked}
            wrapperClassName="mt-2 w-full"
            className={`${initial.walletType ? nonSelectClass : selectPlaceholderClass} pr-9 disabled:opacity-45`}
          >
            <NativeSelectOption value="" disabled>Selecione uma carteira</NativeSelectOption>
            {WALLET_TYPES.map((type) => (
              <NativeSelectOption key={type} value={type}>{type}</NativeSelectOption>
            ))}
          </NativeSelect>
        </Field>
        <Field label="Código de indicação" required>
          <Input name="referralCode" defaultValue={initial.referralCode} disabled={locked} className={inputClass} placeholder="Ex.: KURIO10" />
        </Field>
        <Field label="E-mail" required>
          <Input name="email" type="email" required defaultValue={initial.email} disabled={locked} className={inputClass} />
        </Field>
        <Field label="Nome ENS" required>
          <span className="mt-2 flex gap-2">
            <NativeSelect
              aria-label="Sufixo ENS"
              disabled={locked}
              wrapperClassName="w-18 shrink-0"
              className="h-11 rounded-sm border-r-0 border-[#55321F] bg-[#241612] pl-2 pr-8 text-body-14-regular-22 text-[#EFE6DA] shadow-none focus:border-[#D28A4C] disabled:opacity-45"
            >
              <NativeSelectOption>.eth</NativeSelectOption>
            </NativeSelect>
            <Input
              name="ens"
              required
              defaultValue={initial.ens}
              disabled={locked}
              className="block h-11 min-w-0 flex-1 rounded-sm border-[#55321F] bg-[#241612] px-3 text-body-14-regular-22 text-[#EFE6DA] shadow-none focus-visible:border-[#D28A4C] disabled:opacity-45"
            />
          </span>
        </Field>
      </div>
      <Button
        type="submit"
        className="mt-7 h-10 bg-[#E89B55] px-6 text-body-14-bold-20 text-[#140D0A] hover:bg-[#DD9A5F]"
      >
        {locked ? (editLabel ?? 'Editar carteira') : submitLabel}
      </Button>
    </form>
  )
}

function ProfilePage() {
  const client = useQueryClient()
  const navigate = useNavigate()
  const openAuthModal = useAuthModal()
  const [tab, setTab] = useState('dados')
  const [message, setMessage] = useState('')
  const [principalDrafting, setPrincipalDrafting] = useState(false)
  const [principalEditing, setPrincipalEditing] = useState(false)
  const [secondaryDrafting, setSecondaryDrafting] = useState(false)
  const [sameAsPrincipal, setSameAsPrincipal] = useState(false)

  const profile = useQuery({ queryKey: ['profile'], queryFn: async () => (await api.get<User>('/profile')).data, retry: false })
  const wallets = useQuery({ queryKey: ['wallets'], queryFn: async () => (await api.get<Wallet[]>('/wallets')).data, enabled: !!profile.data })

  const principal = wallets.data?.[0]
  const secondaryWallets = wallets.data?.slice(1) ?? []

  const update = useMutation({
    mutationFn: async (data: Partial<User>) => (await api.patch<User>('/profile', data)).data,
    onSuccess: (data) => {
      client.setQueryData(['profile'], data)
      client.setQueryData(['session'], { user: data })
      setMessage('Perfil atualizado.')
    },
    onError: (cause) => setMessage((cause as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Não foi possível salvar o perfil.'),
  })

  const password = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => api.post('/profile/password', data),
    onSuccess: () => setMessage('Senha alterada.'),
    onError: (cause) => setMessage((cause as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Não foi possível alterar a senha.'),
  })

  const addWallet = useMutation({
    mutationFn: async ({ draft }: { draft: WalletDraft; kind: 'principal' | 'secondary' }) =>
      (await api.post('/wallets', draft)).data,
    onSuccess: async (_data, variables) => {
      setPrincipalDrafting(false)
      setSecondaryDrafting(false)
      setSameAsPrincipal(false)
      setMessage(
        variables.kind === 'principal'
          ? 'Carteira principal salva.'
          : 'Carteira secundária adicionada.',
      )
      await client.invalidateQueries({ queryKey: ['wallets'] })
    },
    onError: (cause) => setMessage((cause as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Endereço inválido.'),
  })

  const removeWallet = useMutation({
    mutationFn: async (address: string) => api.delete(`/wallets/${encodeURIComponent(address)}`),
    onSuccess: async () => {
      setPrincipalDrafting(false)
      setPrincipalEditing(false)
      setMessage('Carteira removida.')
      await client.invalidateQueries({ queryKey: ['wallets'] })
    },
  })

  const saveWallet = useMutation({
    mutationFn: async ({ address, draft }: { address: string; draft: WalletDraft }) =>
      (await api.patch(`/wallets/${encodeURIComponent(address)}`, draft)).data,
    onSuccess: async () => {
      setPrincipalEditing(false)
      setMessage('Carteira principal atualizada.')
      await client.invalidateQueries({ queryKey: ['wallets'] })
    },
    onError: (cause) => setMessage((cause as { response?: { data?: { message?: string } } }).response?.data?.message ?? 'Não foi possível salvar a carteira.'),
  })

  const saveAvatar = (avatar: string) => {
    if (profile.data) update.mutate({ ...profile.data, avatar })
  }

  const logout = useMutation({
    onMutate: async () => {
      // Prevent a session request started before logout from restoring stale user data.
      await client.cancelQueries({ queryKey: ['session'] })
    },
    mutationFn: async () => api.post('/auth/logout'),
    onSuccess: () => {
      localStorage.removeItem('jungle-token')
      client.setQueryData(['session'], { user: null })
      client.removeQueries({ predicate: (query) => query.queryKey[0] !== 'session' })
      void navigate({ to: '/' })
    },
  })

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const data = new FormData(event.currentTarget)
    update.mutate({
      name: String(data.get('name')).trim(),
      username: String(data.get('username')).trim(),
      ens: `${String(data.get('ens')).trim().replace(/\.eth$/, '')}.eth`,
      avatar: profile.data?.avatar,
    })
    const currentPassword = String(data.get('currentPassword') ?? '')
    const newPassword = String(data.get('newPassword') ?? '')
    const confirmPassword = String(data.get('confirmPassword') ?? '')
    if (currentPassword || newPassword) {
      if (newPassword !== confirmPassword) {
        setMessage('A confirmação de senha não corresponde.')
        return
      }
      password.mutate({ currentPassword, newPassword })
    }
  }

  if (profile.isPending) return <main className="mx-auto max-w-7xl py-16 px-5 lg:px-3 xl:px-0"><Skeleton className="h-72 rounded-lg bg-brand-surface-card" /></main>

  if (profile.isError)
    return (
      <main className="mx-auto max-w-xl px-5 py-24 text-center">
        <h1 className="text-heading-28-bold text-[#F7F3EC]">Entre na sua conta</h1>
        <p className="mt-2 text-body-14-regular-22 text-[#B39463]">Acesse seus dados, favoritos e carteiras.</p>
        <Button
          onClick={() => openAuthModal('login')}
          className="mt-6 h-10 bg-[#E89B55] px-6 text-body-14-bold-20 text-[#140D0A] hover:bg-[#DD9A5F]"
        >
          Entrar ou cadastrar
        </Button>
      </main>
    )

  const ensRoot = (profile.data.ens ?? `${profile.data.id}.eth`).replace(/\.eth$/, '')

  return (
    <main className="mx-auto max-w-7xl pt-8 px-5 lg:px-3 xl:px-0">
      {message && (
        <p role="status" className="mb-4 text-body-14-regular-22 text-[#E89B55]">
          {message}
        </p>
      )}
      <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-10">
        <div className="flex items-center justify-between gap-3 rounded-sm bg-[#241612] p-3 lg:hidden">
          <span className="text-body-14-bold-20 text-[#F7F3EC]">
            {menu.find((item) => item.id === tab)?.label ?? 'Meu perfil'}
          </span>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-2 border-[#55321F] bg-transparent text-[#F7F3EC] hover:bg-[#2F1D15] hover:text-[#E89B55]">
                <Menu size={16} />
                Menu
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 border-[#3F2319] bg-brand-ink text-text-primary">
              <SheetHeader className="border-b border-[#3F2319] pb-4">
                <SheetTitle className="text-body-lg-19-bold text-[#F7F3EC]">Meu perfil</SheetTitle>
                <SheetDescription className="sr-only">Menu de navegação do perfil</SheetDescription>
              </SheetHeader>
              <nav aria-label="Menu do perfil" className="px-2">
                <ul className="space-y-0.5">
                  {menu.map((item) => (
                    <li key={item.id}>
                      <SheetClose asChild>
                        <Button
                          variant="ghost"
                          onClick={() => setTab(item.id)}
                          className={`group h-auto w-full justify-start gap-3 rounded-none border-l-4 px-4 py-2.5 text-left text-body-14-regular-22 font-normal hover:bg-transparent ${
                            tab === item.id
                              ? 'border-[#E89B55] text-[#F7F3EC]'
                              : 'border-transparent text-[#E89B55] hover:text-[#F7F3EC]'
                          }`}
                        >
                          <item.icon size={16} className={`${
                            tab === item.id
                              ? 'text-[#F7F3EC]'
                            : 'text-[#E89B55] group-hover:text-[#F7F3EC]'
                          }`} />
                          {item.label}
                        </Button>
                      </SheetClose>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 border-t border-[#3F2319] pt-2">
                  <SheetClose asChild>
                    <Button
                      variant="ghost"
                      onClick={() => logout.mutate()}
                      className="h-auto w-full justify-start gap-3 rounded-none border-l-4 border-transparent px-4 py-2.5 text-left text-body-14-regular-22 font-normal text-[#E89B55] hover:bg-transparent hover:text-[#F7F3EC]"
                    >
                      <SvgIcon name="logout" size={16} />
                      Sair
                    </Button>
                  </SheetClose>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
        <nav aria-label="Menu do perfil" className="hidden h-fit bg-[#241612] py-4 lg:block">
          <p className="px-4 text-body-lg-19-bold text-[#F7F3EC]">Meu perfil</p>
          <ul className="mt-4 space-y-0.5">
            {menu.map((item) => (
              <li key={item.id}>
                <Button
                  variant="ghost"
                  onClick={() => setTab(item.id)}
                  className={`group h-auto w-full justify-start gap-3 rounded-none border-l-4 px-4 py-2.5 text-left text-body-14-regular-22 font-normal hover:bg-transparent ${
                    tab === item.id
                      ? 'border-[#E89B55] text-[#F7F3EC]'
                      : 'border-transparent text-[#E89B55] hover:text-[#F7F3EC]'
                  }`}
                >
                  <item.icon size={16} className={`${
                    tab === item.id
                      ? 'text-[#F7F3EC]'
                    : 'text-[#E89B55] group-hover:text-[#F7F3EC]'
                  }`} />
                  {item.label}
                </Button>
              </li>
            ))}
          </ul>
          <div className="mt-2 border-t border-[#3F2319] pt-2">
            <Button
              variant="ghost"
              onClick={() => logout.mutate()}
              className="h-auto w-full justify-start gap-3 rounded-none border-l-4 border-transparent px-4 py-2.5 text-left text-body-14-regular-22 font-normal text-[#E89B55] hover:bg-transparent hover:text-[#F7F3EC]"
            >
              <SvgIcon name="logout" size={16} />
              Sair
            </Button>
          </div>
        </nav>

        {tab === 'dados' && (
          <section>
            <h2 className="border-b border-[#3F2319] pb-3 text-body-lg-19-bold text-[#F7F3EC]">
              Perfil do colecionador
            </h2>
            <form onSubmit={submit} className="mt-6">
              <div className="grid gap-x-10 gap-y-6 lg:grid-cols-2">
                <Field label="Nome de exibição" required>
                  <Input name="name" required defaultValue={profile.data.name} className={inputClass} />
                </Field>
                <Field label="Nome de usuário" required>
                  <Input name="username" required defaultValue={profile.data.username ?? profile.data.id} className={inputClass} placeholder="kurio_collector" />
                </Field>
                <Field label="E-mail" required>
                  <Input value={profile.data.email} disabled readOnly className={inputClass} />
                </Field>
                <Field label="Nome ENS" required>
                  <span className="mt-2 flex gap-2">
                    <NativeSelect
                      aria-label="Sufixo ENS"
                      wrapperClassName="shrink-0"
                      className="h-11 rounded-sm border-[#55321F] bg-[#241612] pl-3 pr-8 text-body-14-regular-22 text-[#EFE6DA] shadow-none focus:border-[#D28A4C]"
                    >
                      <NativeSelectOption>.eth</NativeSelectOption>
                    </NativeSelect>
                    <Input name="ens" required defaultValue={ensRoot} className="block h-11 min-w-0 flex-1 rounded-sm border-[#55321F] bg-[#241612] px-3 text-body-14-regular-22 text-[#EFE6DA] shadow-none focus-visible:border-[#D28A4C]" />
                  </span>
                </Field>
                <div className="lg:col-start-2 lg:row-start-3">
                  <span className="block text-body-14-regular-22 text-[#F7F3EC]">Avatar</span>
                  <div className="mt-3 flex items-center gap-4">
                    <Avatar className="size-12 bg-[#241612] ring-1 ring-[#55321F]">
                      {profile.data.avatar ? (
                        <AvatarImage src={profile.data.avatar} alt="Avatar atual" className="object-cover" />
                      ) : null}
                      <AvatarFallback className="bg-transparent text-[#B39463]">
                        <SvgIcon name="imagePlus" size={18} />
                      </AvatarFallback>
                    </Avatar>
                    <Button type="button" tabIndex={-1} aria-hidden="true" className="pointer-events-none h-10 bg-[#E89B55] px-5 text-body-14-bold-20 text-[#140D0A] hover:bg-[#DD9A5F]">
                      Alterar
                    </Button>
                    <Button
                      type="button"
                      variant="link"
                      disabled={!profile.data.avatar}
                      onClick={() => saveAvatar('')}
                      className="h-auto p-0 text-body-14-regular-22 font-normal text-[#F7F3EC] hover:text-[#E89B55] disabled:opacity-40"
                    >
                      Remover
                    </Button>
                  </div>
                </div>
              </div>

              <h3 className="mt-10 text-body-lg-19-bold text-[#F7F3EC]">Alterar senha</h3>
              <div className="mt-4 max-w-sm">
                <PasswordField label="Senha atual" name="currentPassword" autoComplete="current-password" />
                <div className="mt-4">
                  <PasswordField label="Nova senha" name="newPassword" autoComplete="new-password" hint="A nova senha precisa ter ao menos 8 caracteres." />
                </div>
                <div className="mt-4">
                  <PasswordField label="Confirmar nova senha" name="confirmPassword" autoComplete="new-password" />
                </div>
              </div>
              <Button
                type="submit"
                disabled={update.isPending || password.isPending}
                className="mt-8 h-10 bg-[#E89B55] px-8 text-body-14-bold-20 text-[#140D0A] hover:bg-[#DD9A5F] disabled:opacity-40"
              >
                Salvar
              </Button>
            </form>
          </section>
        )}

        {tab === 'carteiras' && (
          <div>
            {!wallets.data ? (
              <Skeleton className="mt-6 h-72 rounded-lg bg-brand-surface-card" />
            ) : (
              <>
                <section>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="text-body-lg-19-bold text-[#F7F3EC]">Carteira principal</h2>
                    {!principal ? (
                      <Button
                        variant="link"
                        onClick={() => setPrincipalDrafting((value) => !value)}
                        className="h-auto p-0 text-body-14-bold-20 text-[#E89B55] hover:text-[#DD9A5F]"
                      >
                        {principalDrafting ? 'Remover' : 'Adicionar'}
                      </Button>
                    ) : (
                      <Button
                        variant="link"
                        onClick={() => principal && removeWallet.mutate(principal.address)}
                        className="h-auto p-0 text-body-14-bold-20 text-red-300 hover:text-red-200"
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                  <p className="mt-1 text-body-14-regular-22 text-[#B39463]">
                    Estas carteiras ficam disponíveis no pagamento e para receber
                    NFTs comprados.
                  </p>
                  {principalDrafting && !principal ? (
                    <WalletForm
                      key={`principal-${profile.data.id}`}
                      initial={{
                        displayName: profile.data.name,
                        nickname: `${profile.data.id}-wallet`,
                        network: '',
                        profileName: profile.data.username ?? profile.data.id,
                        address: '',
                        secondaryEns: '',
                        walletType: '',
                        referralCode: '',
                        email: profile.data.email,
                        ens: (profile.data.ens ?? `${profile.data.id}.eth`).replace(/\.eth$/, ''),
                      }}
                      submitLabel="Salvar carteira"
                      onSubmit={(draft) => addWallet.mutate({ draft, kind: 'principal' })}
                    />
                  ) : (
                    principal && (
                      <WalletForm
                        key={`principal-${principal.address}-${principalDrafting}`}
                        locked={!principalEditing}
                        editLabel="Editar carteira"
                        initial={{
                          displayName: principal.displayName ?? profile.data.name,
                          nickname: principal.nickname,
                          network: principal.network ?? '',
                          profileName: principal.profileName ?? profile.data.username ?? profile.data.id,
                          address: principal.address,
                          secondaryEns: principal.secondaryEns ?? '',
                          walletType: principal.walletType ?? '',
                          referralCode: principal.referralCode ?? '',
                          email: principal.email ?? profile.data.email,
                          ens: (principal.ens ?? profile.data.ens ?? `${profile.data.id}.eth`).replace(/\.eth$/, ''),
                        }}
                        submitLabel="Salvar carteira"
                        onSubmit={(draft) => saveWallet.mutate({ address: principal.address, draft })}
                        onEdit={() => setPrincipalEditing(true)}
                      />
                    )
                  )}
                </section>

                {principal && (
                  <section className="mt-14">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <h2 className="text-body-lg-19-bold text-[#F7F3EC]">Carteira secundária</h2>
                      <div className="flex items-center gap-6">
                        {secondaryDrafting && (
                          <Label htmlFor="same-as-principal" className="flex cursor-pointer items-center gap-2 text-body-14-regular-22 font-normal text-[#E89B55]">
                            <Checkbox
                              id="same-as-principal"
                              name="same-as-principal"
                              checked={sameAsPrincipal}
                              onCheckedChange={(checked) => setSameAsPrincipal(checked === true)}
                              className="border-[#B39463] data-[state=checked]:border-[#E89B55] data-[state=checked]:bg-[#E89B55] data-[state=checked]:text-brand-ink"
                            />
                            Igual à carteira principal
                          </Label>
                        )}
                        <Button
                          variant="link"
                          onClick={() => setSecondaryDrafting((value) => !value)}
                          className="h-auto p-0 text-body-14-bold-20 text-[#E89B55] hover:text-[#DD9A5F]"
                        >
                          {secondaryDrafting ? 'Remover' : 'Adicionar'}
                        </Button>
                      </div>
                    </div>
                    {secondaryWallets.length > 0 && (
                      <ul className="mt-5 space-y-2">
                        {secondaryWallets.map((wallet) => (
                          <li
                            key={wallet.address}
                            className="flex items-center justify-between gap-4 rounded-sm border border-[#55321F] bg-[#241612] px-4 py-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-body-14-bold-20 text-[#F7F3EC]">{wallet.nickname}</p>
                              <p className="mt-0.5 text-caption-12-regular-16 text-[#B39463]">
                                {wallet.network ?? 'Ethereum'} · {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label={`Remover ${wallet.nickname}`}
                              onClick={() => removeWallet.mutate(wallet.address)}
                              className="shrink-0 text-[#B39463] hover:bg-transparent hover:text-red-300"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </li>
                        ))}
                      </ul>
                    )}
                    {secondaryDrafting ? (
                      <WalletForm
                        key={`secondary-${sameAsPrincipal}`}
                        initial={
                          sameAsPrincipal
                            ? {
                                displayName: principal.displayName ?? profile.data.name,
                                nickname: `${profile.data.id}-secondary`,
                                network: principal.network ?? '',
                                profileName: principal.profileName ?? profile.data.username ?? profile.data.id,
                                address: principal.address,
                                secondaryEns: principal.secondaryEns ?? '',
                                walletType: principal.walletType ?? '',
                                referralCode: principal.referralCode ?? '',
                                email: principal.email ?? profile.data.email,
                                ens: (principal.ens ?? profile.data.ens ?? `${profile.data.id}.eth`).replace(/\.eth$/, ''),
                              }
                            : { email: profile.data.email }
                        }
                        submitLabel="Salvar carteira"
                        onSubmit={(draft) => addWallet.mutate({ draft, kind: 'secondary' })}
                      />
                    ) : (
                      secondaryWallets.length === 0 && (
                        <p className="mt-1 text-body-14-regular-22 text-[#B39463]">
                          Você ainda não adicionou uma carteira secundária.
                        </p>
                      )
                    )}
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {tab !== 'dados' && tab !== 'carteiras' && (
          <section>
            <h2 className="border-b border-[#3F2319] pb-3 text-body-lg-19-bold text-[#F7F3EC]">
              {menu.find((item) => item.id === tab)?.label}
            </h2>
            <p className="mt-4 text-body-14-regular-22 text-[#B39463]">
              Esta área estará disponível em breve.
            </p>
          </section>
        )}
      </div>
    </main>
  )
}
