import { createRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Route as rootRoute } from "./__root";
import { api } from "../services/api";
import { RelatedItemsCarousel } from "../components/RelatedItemsCarousel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { tokenIndex } from "../lib/utils";
import type { CartItem, Nft, Quote } from "../domain/types";
import { SvgIcon } from "../components/SvgIcon";
import { subscribeToNft } from "../services/realtime";
import { formatEth, multiplyEth, parseEth } from "../lib/eth";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/cart",
  component: CartPage,
});

const TABLE_COLUMNS = "grid-cols-[5fr_2fr_3fr_2fr_2.5rem] gap-x-6";
const editionLabel = (editions: string[] | undefined, available: number) =>
  editions?.[1] ?? editions?.[0] ?? `1/${available}`;

function CartPage() {
  const client = useQueryClient();
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState(
    () => sessionStorage.getItem("jungle-coupon") ?? "",
  );

  const [couponMessage, setCouponMessage] = useState("");
  const cart = useQuery({
    queryKey: ["cart"],
    queryFn: async () => (await api.get<CartItem[]>("/cart")).data,
  });

  useEffect(() => {
    if (!cart.data?.length) return;
    const disconnect = cart.data.map(({ nft }) => subscribeToNft(nft.id, (event) => {
      client.setQueryData<CartItem[]>(["cart"], (current) => current?.map((item) => {
        if (item.nft.id !== event.id || event.version <= item.nft.version) return item;
        return { ...item, nft: event.nft };
      }));
      void client.invalidateQueries({ queryKey: ["quote"] });
    }));
    return () => disconnect.forEach((close) => close());
  }, [cart.data, client]);

  const catalog = useQuery({
    queryKey: ["nfts", "cart-recommendations"],
    queryFn: async () =>
      (await api.get<{ items: Nft[] }>("/nfts", { params: { limit: 50 } })).data
        .items,
  });

  const [recommendations, setRecommendations] = useState<Nft[] | null>(null);
  const recommendationsInitialized = useRef(false);

  useEffect(() => {
    if (
      recommendationsInitialized.current ||
      !catalog.data ||
      !cart.data
    ) {
      return;
    }

    recommendationsInitialized.current = true;
    const inCart = new Set(cart.data?.map(({ nft }) => nft.id) ?? []);
    const candidates = (catalog.data ?? []).filter(
      (nft) => !inCart.has(nft.id),
    );
    for (let index = candidates.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [candidates[index], candidates[randomIndex]] = [
        candidates[randomIndex],
        candidates[index],
      ];
    }
    setRecommendations(candidates.slice(0, 15));
  }, [catalog.data, cart.data]);

  const quote = useQuery({
    queryKey: ["quote", coupon, cart.data],
    queryFn: async () => (await api.post<Quote>("/quote", { coupon })).data,
    enabled: !!cart.data?.length,
    retry: false,
  });

  const update = useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) =>
      quantity
        ? api.put(`/cart/${id}`, { quantity })
        : api.delete(`/cart/${id}`),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["cart"] });
      await client.invalidateQueries({ queryKey: ["quote"] });
    },
  });

  const applyCoupon = async () => {
    try {
      await client.fetchQuery({
        queryKey: ["quote", coupon],
        queryFn: async () => (await api.post<Quote>("/quote", { coupon })).data,
      });
      if (coupon) sessionStorage.setItem("jungle-coupon", coupon);
      else sessionStorage.removeItem("jungle-coupon");
      await client.invalidateQueries({ queryKey: ["quote"] });
      setCouponMessage(coupon ? "Cupom JUNGLE10 aplicado." : "Cupom removido.");
    } catch (error) {
      setCouponMessage(
        (error as { response?: { data?: { message?: string } } }).response?.data
          ?.message || "Cupom inválido ou expirado.",
      );
    }
  };

  return (
    <main>
      <div className="sm:hidden">
        <header className="grid grid-cols-[1fr_auto_1fr] items-center px-4 pb-4 pt-6">
          <Link
            to="/"
            aria-label="Voltar à home"
            className="grid size-9 place-items-center rounded-full bg-[#241612] text-[#CFB28C] transition hover:text-[#E89B55]"
          >
            <SvgIcon name="arrowLeft" size={16} label="Voltar" />
          </Link>
          <h1 className="text-title-20-bold text-[#F7F3EC]">Carrinho de NFTs</h1>
          <div className="invisible" />
        </header>

        <section className="space-y-3 px-4 py-3" aria-label="Itens do carrinho">
          {cart.isPending ? (
            [0, 1, 2].map((item) => (
              <Skeleton key={item} className="h-[108px] rounded-xl bg-brand-surface-card" />
            ))
          ) : cart.data?.length ? (
            cart.data.map(({ nft, quantity }) => (
              <article key={nft.id} className="flex gap-3 rounded-xl bg-brand-surface-card">
                <Link to="/nft/$nftId" params={{ nftId: nft.id }} aria-label={`Ver detalhes de ${nft.name}`} className="shrink-0">
                  <img src={nft.image} alt={nft.name} loading="lazy" className="size-[88px] rounded-lg object-cover" />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col py-2 pr-2">
                  <div className="min-w-0">
                    <Link to="/nft/$nftId" params={{ nftId: nft.id }} className="block truncate text-[15px] font-bold leading-tight text-[#F7F3EC] transition hover:text-[#E89B55]">
                      {nft.name}
                    </Link>
                    <p className="mt-1 text-[11px] text-[#B39463]">
                      Edição: {editionLabel(nft.editions, nft.available)}
                    </p>
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-2">
                    <span className="text-[15px] font-bold text-[#E89B55]">
                      {formatEth(parseEth(nft.price), 2)} ETH
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        aria-label="Diminuir quantidade"
                        disabled={update.isPending || quantity <= 1}
                        onClick={() => update.mutate({ id: nft.id, quantity: quantity - 1 })}
                        className="grid size-6 place-items-center rounded-full bg-[#55321F] text-[#E89B55] transition hover:bg-[#68402A] disabled:opacity-40"
                      >
                        <SvgIcon name="minus" size={11} />
                      </button>
                      <span aria-live="polite" className="min-w-4 text-center text-[13px] font-bold text-[#F7F3EC]">
                        {quantity}
                      </span>
                      <button
                        type="button"
                        aria-label="Aumentar quantidade"
                        disabled={update.isPending || quantity >= nft.available}
                        onClick={() => update.mutate({ id: nft.id, quantity: quantity + 1 })}
                        className="grid size-6 place-items-center rounded-full bg-[#55321F] text-[#E89B55] transition hover:bg-[#68402A] disabled:opacity-40"
                      >
                        <SvgIcon name="plus" size={11} />
                      </button>
                      <button
                        type="button"
                        aria-label={`Remover ${nft.name}`}
                        disabled={update.isPending}
                        onClick={() => update.mutate({ id: nft.id, quantity: 0 })}
                        className="grid size-6 place-items-center rounded-full text-[#B39463] transition hover:bg-transparent hover:text-red-300 disabled:opacity-40"
                      >
                        <SvgIcon name="delete" size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-xl bg-[#3A2418] px-5 py-12 text-center">
              <p className="text-[15px] font-bold text-[#F7F3EC]">Seu carrinho está vazio</p>
              <p className="mt-1.5 text-[12px] text-[#B39463]">Descubra algo que combina com você.</p>
              <Link to="/" className="mt-4 inline-block rounded-full bg-brand-primary px-5 py-2 text-[12px] font-bold text-brand-ink transition hover:bg-brand-primary-light">
                Continuar explorando
              </Link>
            </div>
          )}
        </section>
      </div>

      <div className="mx-auto max-w-7xl pt-8 px-5 lg:px-3 xl:px-0">
        <nav
          aria-label="Navegação estrutural"
          className="hidden text-body-15-bold text-text-primary sm:block"
        >
          <Link to="/" className="hover:text-text-accent">
            Início
          </Link>
          <span className="mx-1.5">/</span>
          <span className="font-bold">Mercado</span>
          <span className="mx-1.5">/</span>
          <span className="font-bold">Carrinho</span>
        </nav>

      <div className="hidden sm:block">
        {!cart.data?.length && !cart.isPending ? (
        <Empty className="mt-10 border border-dashed border-brand-border-soft py-16">
          <EmptyHeader>
            <EmptyTitle className="text-body-lg-18-bold text-text-primary">Seu carrinho está vazio</EmptyTitle>
            <EmptyDescription className="text-body-14-regular-22 text-brand-secondary">Descubra algo que combina com você.</EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild className="h-10 bg-[#E89B55] px-6 text-body-14-bold-20 text-brand-ink hover:bg-[#DD9A5F]">
              <Link to="/">Continuar explorando</Link>
            </Button>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="mt-4 grid gap-10 lg:grid-cols-[minmax(0,1fr)_380px] lg:gap-12">
          <section>
            <div
              className={`border-b border-[#3F2319] pb-2.5 text-body-16-bold-16 text-text-primary grid ${TABLE_COLUMNS}`}
            >
              <p>NFTs</p>
              <p>Preço</p>
              <p>Edições</p>
              <p>Total</p>
              <span aria-hidden="true" />
            </div>
            <div className="space-y-2 lg:mt-3">
              {cart.data?.map(({ nft, quantity }) => (
                <article
                  key={nft.id}
                  className={`grid items-center gap-x-6 gap-y-3 rounded-tl-md lg:rounded-l-md bg-[#241612] lg:gap-6 ${TABLE_COLUMNS}`}
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <Link
                      to="/nft/$nftId"
                      params={{ nftId: nft.id }}
                      aria-label={`Ver detalhes de ${nft.name}`}
                      className="shrink-0"
                    >
                      <img
                        src={nft.image}
                        alt={nft.name}
                        className="size-18 rounded-sm object-cover"
                      />
                    </Link>
                    <div className="min-w-0">
                      <Link
                        to="/nft/$nftId"
                        params={{ nftId: nft.id }}
                        className="block truncate text-body-14-bold-20 text-text-primary transition hover:text-[#E89B55]"
                      >
                        {nft.name}
                      </Link>
                      <p className="mt-0.5 text-caption-12-regular-16 text-brand-secondary">
                        ID do token: {tokenIndex(nft.id)}
                      </p>
                    </div>
                  </div>
                  <div className="contents">
                    <p className="text-body-14-regular-22 text-[#EFE6DA]">
                      {nft.price} ETH
                    </p>
                    <div className="flex items-center gap-2.5">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Diminuir quantidade"
                        disabled={quantity <= 1}
                        onClick={() =>
                          update.mutate({ id: nft.id, quantity: quantity - 1 })
                        }
                        className="rounded-full size-0 px-3 py-5 bg-text-accent text-brand-ink hover:bg-[#DD9A5F] disabled:opacity-30"
                      >
                        <SvgIcon name="minus" size={13} />
                      </Button>
                      <span className="w-5 text-center text-body-14-bold-20 text-text-primary">
                        {quantity}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Aumentar quantidade"
                        disabled={quantity >= nft.available}
                        onClick={() =>
                          update.mutate({ id: nft.id, quantity: quantity + 1 })
                        }
                        className="rounded-full size-0 px-3 py-5 bg-text-accent text-brand-ink hover:bg-[#DD9A5F] disabled:opacity-30"
                      >
                        <SvgIcon name="plus" size={13} />
                      </Button>
                    </div>
                    <p className="text-body-14-bold-20 text-[#E89B55]">
                      {formatEth(multiplyEth(nft.price, quantity), 2)} ETH
                    </p>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remover ${nft.name}`}
                      onClick={() =>
                        update.mutate({ id: nft.id, quantity: 0 })
                      }
                      className="text-brand-secondary hover:bg-transparent hover:text-red-300"
                    >
                      <SvgIcon name="delete" size={24} />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
            {update.isError && (
              <Alert variant="destructive" className="mt-3 bg-card px-4 py-3">
                <AlertDescription className="text-body-14-regular-22">
                  Não foi possível atualizar a sacola: {(update.error as Error).message}
                </AlertDescription>
              </Alert>
            )}
          </section>

          <aside className="h-fit">
            <h2 className="border-b border-[#3F2319] pb-2.5 text-body-lg-18-bold text-text-primary">
              Resumo da carteira
            </h2>
            <form
              className="mt-6"
              onSubmit={(event) => {
                event.preventDefault();
                void applyCoupon();
              }}
            >
              <Label
                htmlFor="coupon"
                className="block text-body-14-bold-20 text-text-primary"
              >
                Código promocional
              </Label>
              <div className="mt-2 flex">
                <Input
                  id="coupon"
                  value={coupon}
                  onChange={(e) => setCoupon(e.target.value.toUpperCase())}
                  placeholder="Digite o código promocional..."
                  className="h-10 min-w-0 flex-1 rounded-l-sm rounded-r-none border-r-0 border-brand-border-soft bg-[#241612] px-3 text-body-14-regular-22 text-[#EFE6DA] shadow-none placeholder:text-brand-secondary focus-visible:border-[#D28A4C]"
                />
                <Button
                  type="submit"
                  className="h-10 shrink-0 rounded-l-none rounded-r-sm bg-[#E89B55] px-4 text-body-14-bold-20 text-brand-ink hover:bg-[#DD9A5F]"
                >
                  Aplicar
                </Button>
              </div>
            </form>
            {couponMessage && (
              <Alert
                role="status"
                variant={couponMessage.includes("inválido") ? "destructive" : "default"}
                className="mt-2 rounded-sm bg-[#241612] px-3 py-2"
              >
                <AlertDescription className="text-caption-12-regular-16">{couponMessage}</AlertDescription>
              </Alert>
            )}
            <div className="mt-6 space-y-4 text-body-15-regular text-[#EFE6DA]">
              <p className="flex justify-between">
                <span>Subtotal</span>
                <span className="text-body-lg-18-bold">{formatEth(parseEth(quote.data?.subtotal ?? "0"), 2)} ETH</span>
              </p>
              <p className="flex justify-between">
                <span>Desconto do lançamento</span>
                <span>(−) {formatEth(parseEth(quote.data?.discount ?? "0"), 2)}</span>
              </p>
              <p className="flex justify-between">
                <span>Taxa de rede</span>
                <span className="text-body-lg-18-bold">{quote.data?.networkFee ?? "—"} ETH</span>
              </p>
              <p className="mt-1 text-right text-caption-12-regular-16 text-brand-secondary">
                Taxa estimada
              </p>
            </div>
            <p className="mt-6 flex items-end justify-between text-body-16-bold text-text-primary">
              <span>Total</span>
              <span className="text-body-lg-18-bold text-[#E89B55]">
                {quote.data?.total ?? "—"} ETH
              </span>
            </p>
            <Button
              onClick={() => void navigate({ to: "/checkout" })}
              disabled={!cart.data?.length}
              className="mt-5 h-10 w-full bg-[#E89B55] text-body-14-bold-20 text-brand-ink hover:bg-[#DD9A5F] disabled:opacity-40"
            >
              Conectar e finalizar
            </Button>
            <Link
              to="/"
              className="mt-4 block text-center text-body-14-regular-22 text-brand-secondary transition hover:text-[#E89B55]"
            >
              Continuar explorando
            </Link>
            <p className="mt-3 text-center text-tiny-10-medium text-white/35">
              A cotação será atualizada antes da confirmação.
            </p>
          </aside>
          </div>
        )}
      </div>

      <div className="mt-16">
        <RelatedItemsCarousel
          title="Colecionadores também viram"
          items={recommendations ?? []}
        />
      </div>
      </div>
      {!!cart.data?.length && (
        <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-[22px] bg-[#2B1A12] px-4 pb-4 pt-3 shadow-[0_-12px_35px_rgba(0,0,0,.35)] sm:hidden">
          <form
            className="flex"
            onSubmit={(event) => {
              event.preventDefault();
              void applyCoupon();
            }}
          >
            <input
              value={coupon}
              onChange={(event) => setCoupon(event.target.value.toUpperCase())}
              placeholder="Digite o código promocional..."
              aria-label="Código promocional"
              className="h-12 min-w-0 flex-1 rounded-full border border-[#55321F] px-4 text-caption-13-regular-22 text-[#EFE6DA] outline-none placeholder:text-[#B39463] focus:border-[#D28A4C] -mr-8"
            />
            <button
              type="submit"
              className="h-12 shrink-0 rounded-full bg-linear-to-r from-[#86582f] to-[#D28A4C] px-4 text-body-15-bold text-brand-foreground transition hover:bg-[#C58250]"
            >
              Aplicar
            </button>
          </form>
          {couponMessage && (
            <p
              role="status"
              className={`mt-2 text-[10px] ${
                couponMessage.includes("inválido")
                  ? "text-[#ED1B2E]"
                  : "text-[#E89B55]"
              }`}
            >
              {couponMessage}
            </p>
          )}
          {update.isError && (
            <p role="alert" className="mt-2 text-[10px] text-[#ED1B2E]">
              Não foi possível atualizar a sacola.
            </p>
          )}

          <dl className="mt-3 space-y-2 text-[13px] text-[#EFE6DA]">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatEth(parseEth(quote.data?.subtotal ?? "0"), 2)} ETH</dd>
            </div>
            <div className="flex justify-between">
              <dt>Desconto do lançamento</dt>
              <dd>(−) {formatEth(parseEth(quote.data?.discount ?? "0"), 2)}</dd>
            </div>
            <div className="flex justify-between">
              <dt>Taxa de rede</dt>
              <dd>{formatEth(parseEth(quote.data?.networkFee ?? "0"))} ETH</dd>
            </div>
          </dl>
          <p className="mt-1 text-right text-[9px] text-[#E89B55]">
            Taxa estimada
          </p>
          <p className="mt-2 flex items-center justify-between text-[15px] font-bold text-[#F7F3EC]">
            <span>Total</span>
            <span className="text-[18px] text-[#E89B55]">{formatEth(parseEth(quote.data?.total ?? "0"))} ETH</span>
          </p>
          <button
            type="button"
            onClick={() => void navigate({ to: "/checkout" })}
            className="mt-3 h-13 w-full rounded-full bg-[#B97543] text-[13px] font-bold text-brand-ink transition hover:bg-[#C58250] disabled:opacity-50"
          >
            Conectar e finalizar
          </button>
        </div>
      )}
    </main>
  );
}
