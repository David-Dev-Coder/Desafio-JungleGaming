import { X } from 'lucide-react'
import type { Order } from '../domain/types'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { tokenIndex } from '../lib/utils'
import { SvgIcon } from './SvgIcon'
import { formatEth, multiplyEth, parseEth } from '../lib/eth'
import { Spinner } from '@/components/ui/spinner'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function formatDate(iso: string) {
  const date = new Date(iso)
  return `${String(date.getDate()).padStart(2, '0')} ${MONTHS[date.getMonth()]}, ${date.getFullYear()}`
}

function EnvelopeIcon() {
  return (
    <SvgIcon name="congrats" size={64} color="#D28A4C" />
  )
}

function DeclinedIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" stroke="#F87171" strokeWidth="2.5" aria-hidden="true">
      <circle cx="32" cy="32" r="24" />
      <path d="M24 24L40 40M40 24L24 40" />
    </svg>
  )
}

export function OrderModal({ order, wallet, onClose }: { order: Order; wallet?: string; onClose: () => void }) {
  const success = order.status === 'confirmed'
  const pending = order.status === 'pending'
  const itemsTotal = order.items.reduce((sum, { nft, quantity }) => sum + multiplyEth(nft.price, quantity), 0n)
  const fee = order.networkFee ?? formatEth(parseEth(order.total) - itemsTotal)
  const shortTx = `${order.tx.slice(0, 6)}...${order.tx.slice(-4)}`
  const walletLabel = wallet || 'Carteira conectada'

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="grid place-items-center max-w-[576px] gap-0 overflow-y-auto rounded-none max-h-full h-full xs:h-auto xs:border-b-8 xs:border-brand-primary bg-brand-ink xs:bg-[#241612] p-0 shadow-none"
      >
        <div className="w-full flex flex-col items-center gap-2 xs:gap-4">
          <DialogTitle className="sr-only">
            {pending ? 'Compra em processamento' : success ? 'Compra confirmada' : 'Compra recusada'}
          </DialogTitle>
          <DialogDescription className="sr-only">
            {pending
              ? 'A compra está sendo processada. Esta tela será atualizada quando o resultado estiver disponível.'
              : success
              ? 'Transação confirmada na Ethereum. A propriedade foi transferida para sua carteira conectada e registrada na rede.'
              : 'A transação foi recusada pela carteira. Nenhum valor foi cobrado e seus NFTs continuam disponíveis na sacola.'}
          </DialogDescription>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Fechar e voltar ao início"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 text-[#E89B55] hover:bg-transparent hover:text-[#DD9A5F]"
          >
            <X size={20} />
          </Button>

          <div className="px-4 xs:px-8 pt-2 xs:pb-6 pt-2 xs:pt-8 text-center">
            <div className="flex justify-center">{pending ? <Spinner className="size-10 text-[#E89B55]" /> : success ? <EnvelopeIcon /> : <DeclinedIcon />}</div>
            <p className={`mt-4 text-body-16-bold-16 ${success ? 'text-brand-secondary' : 'text-red-300'}`}>
              {pending ? 'Compra em processamento' : success ? 'Seus NFTs agora estão na sua carteira' : 'Não foi possível concluir a compra'}
            </p>
          </div>

          <dl className="w-full grid px-4 xs:px-8 py-4 xs:grid-cols-2 border-y border-brand-primary sm:grid-cols-[repeat(4,auto)] sm:divide-brand-primary sm:divide-x gap-2">
            {[
              ['ID da transação', shortTx],
              ['Data', formatDate(order.createdAt)],
              ['Total', `${order.total} ETH`],
              ['Carteira', walletLabel],
            ].map(([label, value]) => (
              <div
                key={label}
                className={`sm:pr-2 p-2 sm:p-0 bg-brand-primary-light/10 sm:bg-transparent h-fit`}
              >
                <dt className="text-body-14-bold-16 text-brand-secondary">{label}</dt>
                <dd className={`truncate text-body-15-regular text-brand-secondary sm:max-w-[120px]`}>{value}</dd>
              </div>
            ))}
          </dl>

          <div className="px-8 pb-7 pt-6">
            <h2 className="text-body-15-bold text-[#F7F3EC]">Detalhes da transação</h2>

            <div className="mt-4 hidden xs:flex items-center text-body-16-bold-16 text-[#F7F3EC]">
              <span className="flex-1">NFTs</span>
              <span className="w-20 text-center">Edições</span>
              <span className="w-24 text-right">Subtotal</span>
            </div>
            <div className="mt-2 border-t border-brand-border-soft" />

            <div className="mt-4 space-y-4">
              {order.items.map(({ nft, quantity }) => (
                <div key={nft.id} className="flex items-center gap-3">
                  <img src={nft.image} alt={nft.name} className="size-16 shrink-0 rounded-sm object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-15-bold text-[#F7F3EC]">{nft.name}</p>
                    <p className="mt-0.5 text-caption-12-regular-16 text-[#B39463]">ID do token: {tokenIndex(nft.id)}</p>
                  </div>
                  <div className="flex flex-col xs:flex-row items-center gap-3">
                    <span className="xs:w-20 text-center text-body-14-regular-16 text-brand-secondary">(× {quantity})</span>
                    <span className="xs:w-24 text-right text-body-16-bold xs:text-body-lg-18-bold text-text-accent">
                      {formatEth(multiplyEth(nft.price, quantity), 2)} ETH
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 space-y-2">
              <p className="flex items-center justify-end gap-8 text-body-14-regular-22 text-[#EFE6DA]">
                <span>Taxa de rede</span>
                <span className="w-24 text-right">{fee} ETH</span>
              </p>
              <p className="flex items-center justify-end gap-8 text-body-16-bold text-[#F7F3EC]">
                <span>Total</span>
                <span className="w-24 text-right text-[#E89B55]">{order.total} ETH</span>
              </p>
            </div>

            <div className="mt-2 border-t border-brand-border-soft" />

            <p className="mt-5 text-center text-body-14-regular-22 leading-relaxed text-[#B39463]">
              {pending
                ? 'Aguarde a resposta da simulação. Seus itens continuam no carrinho até a compra ser confirmada.'
                : success
                ? 'Transação confirmada na Ethereum. A propriedade foi transferida para sua carteira conectada e registrada na rede.'
                : 'A transação foi recusada pela carteira. Nenhum valor foi cobrado e seus NFTs continuam disponíveis na sacola.'}
            </p>

            {success && (
              <div className="mt-6 flex justify-center">
                <Button asChild className="h-10 rounded-sm bg-[#E89B55] px-5 text-body-14-bold-20 text-[#140D0A] hover:bg-[#DD9A5F]">
                  <a
                    href={`https://etherscan.io/tx/${order.tx}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Ver no Etherscan
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
