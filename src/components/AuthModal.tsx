import { createContext, useContext, useState, type ReactNode } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { api } from '../services/api'
import type { User } from '../domain/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Spinner } from '@/components/ui/spinner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { SvgIcon } from './SvgIcon'

export type AuthMode = 'login' | 'signup'

const AuthModalContext = createContext<(mode: AuthMode) => void>(() => {})

export const useAuthModal = () => useContext(AuthModalContext)

export function AuthModalProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<AuthMode>('login')

  return (
    <AuthModalContext.Provider
      value={(next) => {
        setMode(next)
        setOpen(true)
      }}
    >
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <AuthModal
          mode={mode}
          onChangeMode={setMode}
          onClose={() => setOpen(false)}
        />
      </Dialog>
    </AuthModalContext.Provider>
  )
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" width="18" height="18" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  )
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path fill="#1877F2" d="M22 12a10 10 0 1 0-11.56 9.88v-6.99H7.9V12h2.54V9.8c0-2.5 1.49-3.89 3.77-3.89 1.09 0 2.24.19 2.24.19v2.46h-1.26c-1.24 0-1.63.77-1.63 1.56V12h2.78l-.44 2.89h-2.34v6.99A10 10 0 0 0 22 12z" />
    </svg>
  )
}

function AuthModal({ mode, onChangeMode, onClose }: { mode: AuthMode; onChangeMode: (mode: AuthMode) => void; onClose: () => void }) {
  const client = useQueryClient()
  const [showPassword, setShowPassword] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')

  const auth = useMutation({
    mutationFn: async () =>
      (
        await api.post<{ user: User; token: string }>(
          mode === 'login' ? '/auth/login' : '/auth/register',
          mode === 'login' ? { email, password } : { name, email, password },
        )
      ).data,
    onSuccess: async (data) => {
      localStorage.setItem('jungle-token', data.token)
      client.setQueryData(['session'], { user: data.user })
      await client.invalidateQueries()
      onClose()
    },
    onError: (cause) =>
      setError(
        (cause as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? 'Não foi possível prosseguir. Tente novamente.',
      ),
  })

  const inputClass =
    'block h-11 w-full rounded-sm border border-[#55321F] bg-[#1E120C] px-3 text-body-14-regular-22 text-[#EFE6DA] placeholder:text-[#B39463] outline-none transition focus:border-[#D28A4C]'

  return (
    <DialogContent
      showCloseButton={false}
      className="grid place-items-center max-w-120 gap-0 rounded-none max-h-full h-full xs:h-auto xs:border-b-8 xs:border-brand-primary bg-brand-ink xs:bg-[#241612] px-4 py-4 xs:px-8 xs:py-12 shadow-none"
    >
      <div className="w-full flex flex-col items-center gap-2 xs:gap-4">
        <DialogTitle className="sr-only">
          {mode === 'login' ? 'Entrar na sua conta' : 'Criar uma conta'}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {mode === 'login'
            ? 'Entre para gerenciar sua carteira, coleção e perfil de criador.'
            : 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'}
        </DialogDescription>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Fechar"
          onClick={onClose}
          className="absolute right-4 top-3.5 text-[#E89B55] hover:bg-transparent hover:text-[#DD9A5F]"
        >
          <X size={20} />
        </Button>

        <div className="hidden xs:flex items-baseline justify-center gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onChangeMode('login')
              setError('')
            }}
            className={`h-auto rounded-none bg-transparent p-0 text-title-20-medium hover:bg-transparent ${
              mode === 'login' ? 'text-[#E89B55]' : 'text-[#F7F3EC] hover:text-[#E89B55]'
            }`}
          >
            Entrar
          </Button>
          <span aria-hidden="true" className="text-body-lg-19-bold text-[#B39463]">
            |
          </span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              onChangeMode('signup')
              setError('')
            }}
            className={`h-auto rounded-none bg-transparent p-0 text-title-20-medium hover:bg-transparent ${
              mode === 'signup' ? 'text-[#E89B55]' : 'text-[#F7F3EC] hover:text-[#E89B55]'
            }`}
          >
            Criar conta
          </Button>
        </div>

        <p className="mx-auto mt-10 xs:max-w-[330px] text-center text-caption-13-regular-16 text-[#EFE6DA] block xs:hidden">
          {mode === 'login'
            ? 'Entre para gerenciar sua carteira, coleção e perfil de criador.'
            : 'Crie seu perfil de colecionador e conecte uma carteira quando quiser.'}
        </p>

        <h2 className="text-display-32-bold text-brand-foreground mb-12 block xs:hidden">Kurio</h2>

        <p className="text-body-lg-18-bold text-brand-foreground mb-4 block xs:hidden">
          {mode === 'login' ? 'Entrar' : 'Criar perfil de colecionador'}
        </p>

        <form
          className="mx-auto xs:mt-6 flex w-full xs:max-w-[310px] flex-col"
          onSubmit={(event) => {
            event.preventDefault()
            setError('')
            if (mode === 'signup' && confirmPassword !== password) {
              setError('As senhas não coincidem.')
              return
            }
            auth.mutate()
          }}
        >
          {mode === 'signup' && (
            <Input
              required
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Nome de usuário"
              aria-label="Nome de usuário"
              autoComplete="username"
              className={inputClass}
            />
          )}
          <Input
            required
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Digite seu e-mail"
            aria-label="E-mail"
            autoComplete="email"
            className={`${inputClass} ${mode === 'signup' ? 'mt-3' : ''}`}
          />
          <div className="relative mt-3">
            <Input
              required
              type={showPassword ? 'text' : 'password'}
              minLength={8}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Senha"
              aria-label="Senha"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className={`${inputClass} pr-11`}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              onClick={() => setShowPassword((value) => !value)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#B39463] hover:bg-transparent hover:text-[#E89B55]"
            >
              {showPassword ? <SvgIcon name="eye" size={16} /> : <SvgIcon name="eyeOff" size={16} />}
            </Button>
          </div>

          {mode === 'signup' && (
            <Input
              required
              type={showPassword ? 'text' : 'password'}
              minLength={8}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder="Confirmar senha"
              aria-label="Confirmar senha"
              autoComplete="new-password"
              className={`${inputClass} mt-3`}
            />
          )}

          {mode === 'login' && (
            <Button
              type="button"
              variant="link"
              onClick={() => setError('A recuperação por e-mail não está disponível nesta demonstração. Use uma das credenciais de demonstração abaixo.')}
              className="mt-2 h-auto self-end p-0 text-body-14-regular-22 font-normal text-[#E89B55] hover:text-[#DD9A5F]"
            >
              Esqueceu a senha?
            </Button>
          )}

          {error && (
            <Alert variant="destructive" className="mt-3 bg-red-400/10 px-3 py-2">
              <AlertDescription className="text-center text-caption-12-regular-16">{error}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            disabled={auth.isPending}
            className="mt-4 h-11 w-full rounded-sm bg-[#E89B55] text-body-14-bold-20 text-[#140D0A] hover:bg-[#DD9A5F] disabled:opacity-40"
          >
            {auth.isPending ? <><Spinner /> Aguarde…</> : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </Button>
        </form>

        <div className="mt-5 flex items-center gap-4">
          <span aria-hidden="true" className="h-px flex-1 bg-[#55321F]" />
          <span className="text-caption-12-regular-16 text-[#B39463]">Ou continue com</span>
          <span aria-hidden="true" className="h-px flex-1 bg-[#55321F]" />
        </div>

        <div className="mx-auto mt-4 flex w-full xs:max-w-[310px] flex-col gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={() => setError('Login com Google não está disponível nesta demonstração. Use e-mail e senha.')}
            className="h-11 gap-2.5 rounded-sm border-[#55321F] bg-transparent text-body-14-regular-22 font-normal text-[#EFE6DA] hover:border-[#D28A4C] hover:bg-transparent"
          >
            <GoogleIcon />
            Continuar com Google
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setError('Login com Facebook não está disponível nesta demonstração. Use e-mail e senha.')}
            className="h-11 gap-2.5 rounded-sm border-[#55321F] bg-transparent text-body-14-regular-22 font-normal text-[#EFE6DA] hover:border-[#D28A4C] hover:bg-transparent"
          >
            <FacebookIcon />
            Continuar com Facebook
          </Button>
        </div>

        <a className="mx-auto mt-10 xs:max-w-[330px] text-center text-body-15-regular-15 text-brand-secondary block xs:hidden" 
          onClick={() => {
            if (mode === 'login') {
              onChangeMode('signup')
            } else {
              onChangeMode('login')
            }
            setError('')
          }}
        >
          {mode === 'login'
            ? 'Novo na Kurio? Crie uma conta'
            : 'Já tem uma conta? Entre'}
        </a>

        {mode === 'login' && (
          <p className="mt-4 text-center text-tiny-9-regular text-white/35">
            Demo: ana@jungle.test · senha Jungle123!
          </p>
        )}
      </div>
    </DialogContent>
  )
}
