import { createRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreVertical } from "lucide-react";
import { SvgIcon } from "../components/SvgIcon";
import { Route as rootRoute } from "./__root";
import { useAuthModal } from "../components/AuthModal";
import { OrderModal } from "../components/OrderModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Spinner } from "@/components/ui/spinner";
import { api } from "../services/api";
import { tokenIndex } from "../lib/utils";
import type { CartItem, Order, Quote, User, Wallet } from "../domain/types";
import { subscribeToNft } from "../services/realtime";
import { formatEth, multiplyEth, parseEth } from "../lib/eth";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/checkout",
  component: CheckoutPage,
});

const NETWORKS = ["Ethereum", "Polygon", "Base", "Arbitrum"];
const WALLET_TYPES = ["Exchange", "Self-Custody", "Hot Wallet", "Cold Wallet"];
const WALLET_PROVIDERS = ["MetaMask", "WalletConnect", "Coinbase"];

const inputClass =
  "mt-2 block h-11 w-full rounded-sm border border-[#55321F] bg-[#241612] px-3 text-body-14-regular-22 text-[#EFE6DA] placeholder:text-[#B39463] outline-none transition focus:border-[#D28A4C] disabled:opacity-45";
const selectPlaceholderClass =
  "block h-11 w-full rounded-sm border border-[#55321F] bg-[#241612] pl-3 pr-9 text-body-14-regular-22 text-[#B39463] outline-none transition focus:border-[#D28A4C] disabled:opacity-45";
const nonSelectClass =
  "block h-11 w-full rounded-sm border border-[#55321F] bg-[#241612] pl-3 pr-9 text-body-14-regular-22 text-[#F7F3EC] outline-none transition focus:border-[#D28A4C] disabled:opacity-45";
const selectClass = (hasValue: boolean) =>
  hasValue ? nonSelectClass : selectPlaceholderClass;

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <Label className="block font-normal text-body-14-regular-22 text-[#F7F3EC]">
      <span>
        {label}
        {required && <span className="ml-1 text-[#E89B55]">*</span>}
      </span>
      {children}
    </Label>
  );
}

function CheckoutPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const openAuthModal = useAuthModal();
  const [decline, setDecline] = useState(false);
  const [error, setError] = useState("");
  const [priceChanged, setPriceChanged] = useState(false);
  const [coupon, setCoupon] = useState(
    () => sessionStorage.getItem("jungle-coupon") ?? "",
  );
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponDraft, setCouponDraft] = useState(coupon);
  const [couponError, setCouponError] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [walletView, setWalletView] = useState<"list" | "details">("list");
  const [selectedProvider, setSelectedProvider] = useState(WALLET_PROVIDERS[0]);
  const walletRef = useRef("Carteira conectada");
  const [key] = useState(() => {
    const existing = sessionStorage.getItem("jungle-pending-order-key");
    if (existing) return existing;
    const created = crypto.randomUUID();
    sessionStorage.setItem("jungle-pending-order-key", created);
    return created;
  });

  const session = useQuery({
    queryKey: ["session"],
    queryFn: async () =>
      (await api.get<{ user: User | null }>("/auth/session")).data,
  });
  const cart = useQuery({
    queryKey: ["cart"],
    queryFn: async () => (await api.get<CartItem[]>("/cart")).data,
  });
  const wallets = useQuery({
    queryKey: ["wallets"],
    queryFn: async () => (await api.get<Wallet[]>("/wallets")).data,
    enabled: !!session.data?.user,
  });
  const quote = useQuery({
    queryKey: ["quote", "checkout", coupon],
    queryFn: async () => (await api.post<Quote>("/quote", { coupon })).data,
    enabled: !!cart.data?.length,
  });

  useEffect(() => {
    if (!wallets.data) return;
    if (wallets.data.length === 0) {
      setSelectedAddress(null);
      setWalletView("details");
      return;
    }
    if (
      selectedAddress &&
      !wallets.data.some((wallet) => wallet.address === selectedAddress)
    ) {
      setSelectedAddress(null);
      setWalletView("list");
    }
  }, [wallets.data, selectedAddress]);

  useEffect(() => {
    if (!cart.data?.length) return;
    const disconnect = cart.data.map(({ nft }) =>
      subscribeToNft(nft.id, (event) => {
        client.setQueryData<CartItem[]>(["cart"], (current) =>
          current?.map((item) =>
            item.nft.id === event.id && event.version > item.nft.version
              ? { ...item, nft: event.nft }
              : item,
          ),
        );
        setPriceChanged(true);
        void client.invalidateQueries({ queryKey: ["quote", "checkout"] });
      }),
    );
    return () => disconnect.forEach((close) => close());
  }, [cart.data, client]);

  const order = useMutation({
    mutationFn: async (wallet?: Partial<Wallet>) =>
      (
        await api.post<Order>(
          "/orders",
          {
            coupon,
            fail: decline,
            wallet,
            quotedTotal: quote.data?.total,
            items: quote.data?.items.map(({ nft, quantity }) => ({
              id: nft.id,
              quantity,
              price: nft.price,
            })),
          },
          { headers: { "Idempotency-Key": key } },
        )
      ).data,
    onSuccess: async (createdOrder) => {
      await navigate({
        to: "/confirmation/$orderId",
        params: { orderId: createdOrder.id },
        search: { wallet: walletRef.current },
      });
    },
    onError: (cause) =>
      setError(
        (cause as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Não foi possível confirmar. Tente novamente.",
      ),
  });

  if (order.data)
    return (
      <main className="min-h-[70vh]">
        <OrderModal
          order={order.data}
          wallet={walletRef.current}
          onClose={() => void navigate({ to: "/" })}
        />
      </main>
    );
  if (session.data && !session.data.user)
    return (
      <main className="mx-auto max-w-xl px-5 py-20">
        <header className="fixed inset-x-0 top-0 z-20 flex h-14 items-center gap-3 border-b border-[#3F2319] bg-[#140D0A] px-4 sm:hidden">
          <Link
            to="/cart"
            aria-label="Voltar à sacola"
            className="grid size-9 place-items-center text-2xl text-[#F7F3EC]"
          >
            ‹
          </Link>
          <span className="text-[16px] font-semibold text-[#F7F3EC]">
            Pagamento com carteira
          </span>
        </header>
        <Empty className="border-none">
          <EmptyHeader>
            <EmptyTitle className="text-heading-28-bold">
              Entre para continuar
            </EmptyTitle>
            <EmptyDescription>
              Sua sacola será preservada enquanto você entra.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <Button onClick={() => openAuthModal("login")}>
              Entrar ou criar conta
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    );
  if (cart.data?.length === 0)
    return (
      <main className="mx-auto max-w-xl px-5 py-20">
        <header className="fixed inset-x-0 top-0 z-20 flex h-14 items-center gap-3 border-b border-[#3F2319] bg-[#140D0A] px-4 sm:hidden">
          <Link
            to="/cart"
            aria-label="Voltar à sacola"
            className="grid size-9 place-items-center text-2xl text-[#F7F3EC]"
          >
            ‹
          </Link>
          <span className="text-[16px] font-semibold text-[#F7F3EC]">
            Pagamento com carteira
          </span>
        </header>
        <Empty className="border-none">
          <EmptyHeader>
            <EmptyTitle className="text-heading-28-bold">
              Sua sacola está vazia
            </EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button asChild>
              <Link to="/">Voltar à loja</Link>
            </Button>
          </EmptyContent>
        </Empty>
      </main>
    );

  const user = session.data?.user;
  const activeWallet =
    walletView === "details"
      ? wallets.data?.find((wallet) => wallet.address === selectedAddress)
      : undefined;
  const locked = !!activeWallet;
  const walletListOpen = !!wallets.data?.length && walletView === "list";
  const ensRoot = (activeWallet?.ens ?? "").replace(/\.eth$/, "");

  const applyCoupon = async (event: React.FormEvent) => {
    event.preventDefault();
    setCouponError("");
    const next = couponDraft.trim().toUpperCase();
    try {
      await client.fetchQuery({
        queryKey: ["quote", "checkout", next],
        queryFn: async () =>
          (await api.post<Quote>("/quote", { coupon: next })).data,
      });
      setCoupon(next);
      if (next) sessionStorage.setItem("jungle-coupon", next);
      else sessionStorage.removeItem("jungle-coupon");
      setCouponOpen(false);
      await client.invalidateQueries({ queryKey: ["quote", "checkout"] });
    } catch (cause) {
      setCouponError(
        (cause as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Cupom inválido ou expirado.",
      );
    }
  };

  const submitProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (priceChanged || !quote.data) return;
    let walletLabel = selectedProvider;
    let walletDraft: Partial<Wallet> | undefined;
    if (!locked) {
      const data = new FormData(event.currentTarget);
      walletDraft = {
        displayName: String(data.get("displayName") ?? "").trim(),
        nickname: String(data.get("nickname") ?? "").trim(),
        network: String(data.get("network") ?? ""),
        profileName:
          String(data.get("profileName") ?? "").trim() || user?.name || "",
        address: String(data.get("address") ?? "").trim(),
        secondaryEns: String(data.get("secondaryEns") ?? "").trim(),
        walletType: String(data.get("walletType") ?? ""),
        referralCode: String(data.get("referralCode") ?? "").trim(),
        email: String(data.get("email") ?? "").trim() || user?.email || "",
        ens: `${String(data.get("ens") ?? "")
          .trim()
          .replace(/\.eth$/, "")}.eth`,
      };
      walletLabel = selectedProvider;
    }
    walletRef.current = walletLabel;
    order.mutate(walletDraft);
  };

  return (
    <main className="mx-auto max-w-7xl px-0 pb-0 pt-0 sm:px-5 sm:pb-0 sm:pt-8 lg:px-3 xl:px-0">
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
        <span className="font-bold">Pagamento</span>
      </nav>

      <div className="mt-6 hidden gap-12 sm:grid lg:grid-cols-[minmax(0,1fr)_420px] lg:gap-16">
        <section>
          <h1 className="text-title-20-medium text-text-primary">
            Perfil do colecionador
          </h1>

          {wallets.isPending ? (
            <p className="mt-6 text-body-14-regular-22 text-brand-secondary">
              Carregando carteiras…
            </p>
          ) : walletListOpen ? (
            <div className="mt-6 space-y-3" aria-label="Carteiras salvas">
              <h2 className="text-body-14-bold-20 text-text-primary">
                Selecione uma carteira
              </h2>
              <p className="text-caption-12-regular-16 text-brand-secondary">
                Escolha uma carteira para revisar os dados cadastrados.
              </p>
              {wallets.data?.map((wallet, index) => (
                <button
                  key={wallet.address}
                  type="button"
                  onClick={() => {
                    setSelectedAddress(wallet.address);
                    setWalletView("details");
                  }}
                  className="flex w-full items-center justify-between gap-4 rounded-sm border border-[#55321F] bg-[#241612] px-4 py-3 text-left transition hover:border-[#D28A4C]"
                >
                  <span className="min-w-0">
                    <span className="flex items-center gap-2 text-body-14-bold-20 text-[#F7F3EC]">
                      {wallet.nickname}
                      {(wallet.isPrimary || index === 0) && (
                        <span className="rounded-full bg-[#D28A4C]/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[#E89B55]">
                          Principal
                        </span>
                      )}
                    </span>
                    <span className="mt-1 block truncate text-caption-12-regular-16 text-[#B39463]">
                      {wallet.network ?? "Rede não informada"} ·{" "}
                      {wallet.address.slice(0, 7)}…{wallet.address.slice(-4)}
                    </span>
                  </span>
                  <span aria-hidden="true" className="text-[#E89B55]">
                    ›
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <form
              id="checkout-profile"
              key={locked ? activeWallet?.address : "custom"}
              onSubmit={(event) => void submitProfile(event)}
              className="mt-6"
            >
              <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
                <Field label="Nome de exibição" required>
                  <Input
                    name="displayName"
                    required
                    defaultValue={
                      activeWallet?.displayName ??
                      (locked ? user?.name : "") ??
                      ""
                    }
                    disabled={locked}
                    className={inputClass}
                  />
                </Field>
                <Field label="Nome de usuário" required>
                  <Input
                    name="nickname"
                    required
                    defaultValue={
                      activeWallet?.nickname ??
                      (locked ? user?.username : "") ??
                      ""
                    }
                    disabled={locked}
                    className={inputClass}
                  />
                </Field>
                <Field label="Rede" required>
                  <NativeSelect
                    name="network"
                    required
                    defaultValue={activeWallet?.network ?? ""}
                    disabled={locked}
                    wrapperClassName="mt-2 w-full"
                    className={selectClass(!!activeWallet?.network)}
                  >
                    <NativeSelectOption value="" disabled>
                      Selecione uma rede
                    </NativeSelectOption>
                    {NETWORKS.map((network) => (
                      <NativeSelectOption key={network} value={network}>
                        {network}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Nome do perfil" required>
                  <Input
                    name="profileName"
                    required
                    defaultValue={
                      activeWallet?.profileName ??
                      (locked ? user?.name : "") ??
                      ""
                    }
                    disabled
                    className={inputClass}
                  />
                </Field>
                <Field label="Endereço da carteira" required>
                  <Input
                    name="address"
                    required
                    defaultValue={activeWallet?.address ?? ""}
                    disabled={locked}
                    placeholder="Endereço 0x da carteira"
                    className={inputClass}
                  />
                </Field>
                <div className="flex flex-col">
                  <span
                    aria-hidden="true"
                    className="invisible text-sm leading-none"
                  >
                    .
                  </span>
                  <Input
                    aria-label="ENS ou carteira secundária (opcional)"
                    name="secondaryEns"
                    defaultValue={activeWallet?.secondaryEns ?? ""}
                    disabled={locked}
                    placeholder="ENS ou carteira secundária (opcional)"
                    className={inputClass}
                  />
                </div>
                <Field label="Tipo de carteira" required>
                  <NativeSelect
                    name="walletType"
                    required
                    defaultValue={activeWallet?.walletType ?? ""}
                    disabled={locked}
                    wrapperClassName="mt-2 w-full"
                    className={selectClass(!!activeWallet?.walletType)}
                  >
                    <NativeSelectOption value="" disabled>
                      Selecione uma carteira
                    </NativeSelectOption>
                    {WALLET_TYPES.map((type) => (
                      <NativeSelectOption key={type} value={type}>
                        {type}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Código de indicação" required>
                  <Input
                    name="referralCode"
                    required
                    defaultValue={activeWallet?.referralCode ?? ""}
                    disabled={locked}
                    placeholder="Ex.: KURIO10"
                    className={inputClass}
                  />
                </Field>
                <Field label="E-mail" required>
                  <Input
                    name="email"
                    type="email"
                    required
                    defaultValue={
                      activeWallet?.email ?? (locked ? user?.email : "") ?? ""
                    }
                    disabled
                    className={inputClass}
                  />
                </Field>
                <Field label="Nome ENS" required>
                  <span className="mt-2 flex gap-2">
                    <NativeSelect
                      aria-label="Sufixo ENS"
                      disabled={locked}
                      wrapperClassName="w-20 shrink-0"
                      className="h-11 rounded-sm border-r-0 border-[#55321F] bg-[#241612] pl-2 pr-8 text-body-14-regular-22 text-[#EFE6DA] shadow-none focus:border-[#D28A4C] disabled:opacity-45"
                    >
                      <NativeSelectOption>.eth</NativeSelectOption>
                    </NativeSelect>
                    <Input
                      name="ens"
                      required
                      defaultValue={ensRoot}
                      disabled={locked}
                      className="block h-11 min-w-0 flex-1 rounded-sm border-[#55321F] bg-[#241612] px-3 text-body-14-regular-22 text-[#EFE6DA] shadow-none focus-visible:border-[#D28A4C] disabled:opacity-45"
                    />
                  </span>
                </Field>
              </div>

              {locked && (
                <Button
                  type="button"
                  variant="link"
                  onClick={() => setWalletView("list")}
                  className="mt-5 h-auto p-0 text-caption-12-regular-16 text-[#E89B55] underline underline-offset-2 hover:text-[#DD9A5F]"
                >
                  Voltar à seleção de carteiras
                </Button>
              )}
              <Label className="mt-5 block font-normal">
                <span className="text-body-14-regular-22 text-[#F7F3EC]">
                  Observação do colecionador (opcional)
                </span>
                <Textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={4}
                  className="mt-2 min-h-28 resize-none rounded-sm border-[#55321F] bg-[#241612] px-3 py-2.5 text-body-14-regular-22 text-[#EFE6DA] shadow-none focus-visible:border-[#D28A4C]"
                />
              </Label>
            </form>
          )}
        </section>

        <aside className="h-fit">
          <h2 className="text-body-lg-18-bold text-text-primary">Seus NFTs</h2>
          <div className="mt-3 flex items-center justify-between text-text-primary pb-2 border-b-2 border-brand-border">
            <span className="text-body-16-medium-16">NFTs</span>
            <span className="text-body-16-bold-16">Subtotal</span>
          </div>

          <div className="mt-3 space-y-4">
            {quote.data?.items.map(({ nft, quantity }) => (
              <div
                key={nft.id}
                className="flex items-center justify-between bg-brand-surface-card"
              >
                <div className="flex items-center gap-2">
                  <img
                    src={nft.image}
                    alt={nft.name}
                    className="size-16 shrink-0 rounded-sm object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-14-bold-20 text-text-primary">
                      {nft.name}
                    </p>
                    <p className="mt-0.5 text-caption-12-regular-16 text-brand-secondary">
                      ID do token: {tokenIndex(nft.id)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <p className="text-caption-14-regular-16 text-brand-secondary shrink-0">
                    (× {quantity})
                  </p>
                  <p className="shrink-0 text-body-lg-18-bold text-text-accent mr-4">
                    {formatEth(multiplyEth(nft.price, quantity), 2)} ETH
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 text-center text-caption-12-regular-16 text-text-primary">
            Tem um código promocional?{" "}
            <Button
              type="button"
              variant="link"
              onClick={() => setCouponOpen((value) => !value)}
              className="h-auto p-0 text-[#E89B55] underline underline-offset-2 hover:text-[#DD9A5F]"
            >
              Aplique aqui
            </Button>
          </div>
          {couponOpen && (
            <form
              onSubmit={(event) => void applyCoupon(event)}
              className="mt-3 flex"
            >
              <Input
                value={couponDraft}
                onChange={(event) =>
                  setCouponDraft(event.target.value.toUpperCase())
                }
                placeholder="Digite o código"
                aria-label="Código promocional"
                className="h-9 min-w-0 flex-1 rounded-l-sm rounded-r-none border-r-0 border-[#55321F] bg-[#1E120C] px-3 text-caption-12-regular-16 text-[#EFE6DA] shadow-none placeholder:text-[#B39463] focus-visible:border-[#D28A4C]"
              />
              <Button
                type="submit"
                className="h-9 shrink-0 rounded-l-none rounded-r-sm bg-[#E89B55] px-3 text-caption-12-bold text-[#140D0A] hover:bg-[#DD9A5F]"
              >
                Aplicar
              </Button>
            </form>
          )}
          {couponError && (
            <Alert
              variant="destructive"
              className="mt-2 rounded-sm bg-[#241612] px-3 py-2 text-center"
            >
              <AlertDescription className="text-caption-12-regular-16">
                {couponError}
              </AlertDescription>
            </Alert>
          )}

          <div className="mt-5 space-y-3 text-body-15-regular text-[#EFE6DA]">
            <p className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatEth(parseEth(quote.data?.subtotal ?? "0"), 2)} ETH</span>
            </p>
            <p className="flex justify-between">
              <span>Desconto do lançamento</span>
              <span>(−) {formatEth(parseEth(quote.data?.discount ?? "0"), 2)}</span>
            </p>
            <p className="flex justify-between">
              <span>Taxa de rede</span>
              <span>{quote.data?.networkFee ?? "—"} ETH</span>
            </p>
            <p className="text-right text-caption-12-regular-16 text-brand-secondary">
              Taxa estimada
            </p>
          </div>

          <p className="mt-4 flex items-end justify-between border-t border-[#3F2319] pt-4 text-body-16-bold text-text-primary">
            <span>Total</span>
            <span className="text-body-lg-18-bold text-[#E89B55]">
              {quote.data?.total ?? "—"} ETH
            </span>
          </p>

          <h3 className="mt-8 text-center text-body-lg-18-bold text-text-primary">
            Carteira e rede
          </h3>
          <RadioGroup
            value={selectedProvider}
            onValueChange={setSelectedProvider}
            className="mt-4 gap-2.5"
          >
            {WALLET_PROVIDERS.map((provider) => {
              const isSelected = selectedProvider === provider;
              return (
                <Label
                  key={provider}
                  htmlFor={`provider-${provider}`}
                  className={`flex h-11 cursor-pointer items-center gap-3 rounded-sm border px-4 font-normal transition ${
                    isSelected
                      ? "border-[#E89B55] bg-[#241612]"
                      : "border-[#55321F] hover:border-[#8A5A38]"
                  }`}
                >
                  <RadioGroupItem
                    id={`provider-${provider}`}
                    value={provider}
                    className="sr-only"
                  />
                  <span
                    className={`grid size-4 shrink-0 place-items-center rounded-full border ${isSelected ? "border-[#E89B55]" : "border-[#B39463]"}`}
                  >
                    {isSelected && (
                      <span className="size-2 rounded-full bg-[#E89B55]" />
                    )}
                  </span>
                  <span className="truncate text-body-14-regular-22 text-[#EFE6DA]">
                    {provider}
                  </span>
                </Label>
              );
            })}
          </RadioGroup>

          {priceChanged && (
            <Alert className="mt-4 rounded-sm border-[#8A5A38] bg-[#241612] px-3 py-3 text-caption-12-regular-16 text-[#EFE6DA]">
              <AlertDescription className="text-caption-12-regular-16 text-[#EFE6DA]">
                O preço ou estoque mudou. A nova cotação foi carregada; revise
                antes de confirmar.
                <Button
                  type="button"
                  variant="link"
                  className="mt-2 h-auto p-0 text-caption-12-regular-16 font-normal text-brand-secondary"
                  onClick={() => setPriceChanged(false)}
                >
                  Entendi a nova cotação
                </Button>
              </AlertDescription>
            </Alert>
          )}
          {error && (
            <Alert
              variant="destructive"
              className="mt-4 rounded-sm bg-[#241612] px-3 py-3"
            >
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Label
            htmlFor="decline-wallet"
            className="mt-4 flex cursor-pointer items-center gap-2 text-caption-12-regular-16 font-normal text-brand-secondary"
          >
            <Checkbox
              id="decline-wallet"
              checked={decline}
              onCheckedChange={(checked) => setDecline(checked === true)}
              className="border-[#B39463] data-[state=checked]:border-[#E89B55] data-[state=checked]:bg-[#E89B55] data-[state=checked]:text-brand-ink"
            />
            Simular recusa da carteira
          </Label>

          <Button
            form="checkout-profile"
            type="submit"
            disabled={
              !session.data?.user ||
              order.isPending ||
              !quote.data ||
              priceChanged ||
              walletListOpen ||
              wallets.isPending
            }
            className="mt-4 h-11 w-full bg-[#E89B55] text-body-14-bold-20 text-[#140D0A] hover:bg-[#DD9A5F] disabled:opacity-40"
          >
            {order.isPending ? (
              <>
                <Spinner /> Processando…
              </>
            ) : (
              "Confirmar compra"
            )}
          </Button>
          <p className="mt-3 text-center text-tiny-10-medium text-white/35">
            Ao confirmar, você aceita a simulação desta compra.
          </p>
        </aside>
      </div>

      <div className="sm:hidden">
        <div>
          <header className="relative grid grid-cols-[1fr_auto_1fr] items-center px-4 pb-4 pt-6">
            <Link
              to="/cart"
              aria-label="Voltar ao carrinho"
              className="grid size-9 place-items-center rounded-full bg-[#241612] text-[#CFB28C] transition hover:text-[#E89B55]"
            >
              <SvgIcon name="arrowLeft" size={16} />
            </Link>
            <h1 className="text-title-20-bold text-[#F7F3EC]">
              Pagamento com carteira
            </h1>
            <div className="invisible" />
          </header>

          <section aria-label="Carteira conectada" className="px-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[14px] font-bold text-[#F7F3EC]">
                {walletListOpen || locked
                  ? "Carteira conectada"
                  : "Cadastrar carteira"}
              </h2>
              {wallets.data?.length ? (
                <button
                  type="button"
                  onClick={() => {
                    if (walletListOpen) {
                      setSelectedAddress(null);
                      setWalletView("details");
                    } else {
                      setSelectedAddress(null);
                      setWalletView("list");
                    }
                  }}
                  className="text-[12px] font-bold text-[#E89B55] transition hover:text-[#DD9A5F]"
                >
                  {walletListOpen
                    ? "Trocar carteira"
                    : "Voltar à seleção de carteiras"}
                </button>
              ) : null}
            </div>

            {wallets.isPending ? (
              <p className="mt-4 text-[12px] text-[#B39463]">
                Carregando carteiras…
              </p>
            ) : walletListOpen ? (
              <div
                role="radiogroup"
                aria-label="Carteiras salvas"
                className="mt-3 space-y-3"
              >
                {wallets.data?.map((wallet) => {
                  const isSelected = selectedAddress === wallet.address;
                  const lineOne =
                    wallet.ens ||
                    `${wallet.address.slice(0, 7)}…${wallet.address.slice(-4)}`;
                  return (
                    <div
                      key={wallet.address}
                      className="flex items-center justify-between gap-2 rounded-xl bg-brand-surface-card px-3.5 py-2.5"
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => setSelectedAddress(wallet.address)}
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      >
                        <span
                          aria-hidden="true"
                          className={`grid size-5 shrink-0 place-items-center rounded-full border transition ${isSelected ? "border-[#E89B55]" : "border-[#B39463]/70"}`}
                        >
                          {isSelected && (
                            <span className="size-3 rounded-full bg-[#E89B55]" />
                          )}
                        </span>
                        <span className="min-w-0">
                          <span className="truncate text-[15px] font-bold text-[#F7F3EC]">
                            {wallet.nickname}
                          </span>
                          <span className="mt-0.5 block truncate text-[12px] text-[#B39463]">
                            {lineOne}
                          </span>
                          <span className="block truncate text-[12px] text-[#B39463]">
                            {wallet.network
                              ? `Rede ${wallet.network}`
                              : "Rede não informada"}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        aria-label={`Ver dados de ${wallet.nickname}`}
                        onClick={() => {
                          setSelectedAddress(wallet.address);
                          setWalletView("details");
                        }}
                        className="grid size-8 shrink-0 place-items-center rounded-full text-[#B39463] transition hover:text-[#E89B55]"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <form
                id="checkout-profile-mobile"
                key={locked ? activeWallet?.address : "custom"}
                onSubmit={(event) => void submitProfile(event)}
                className="mt-2 space-y-3"
              >
                <Field label="Nome de exibição" required>
                  <Input
                    name="displayName"
                    required
                    defaultValue={
                      activeWallet?.displayName ??
                      (locked ? user?.name : "") ??
                      ""
                    }
                    disabled={locked}
                    className="mt-2 block h-10 w-full rounded-lg border border-[#55321F] bg-[#241612] px-3 text-[13px] text-[#EFE6DA] placeholder:text-[#B39463] outline-none transition focus:border-[#D28A4C] disabled:opacity-45"
                  />
                </Field>
                <Field label="Nome de usuário" required>
                  <Input
                    name="nickname"
                    required
                    defaultValue={activeWallet?.nickname ?? ""}
                    disabled={locked}
                    className="mt-2 block h-10 w-full rounded-lg border border-[#55321F] bg-[#241612] px-3 text-[13px] text-[#EFE6DA] placeholder:text-[#B39463] outline-none transition focus:border-[#D28A4C] disabled:opacity-45"
                  />
                </Field>
                <Field label="Rede" required>
                  <NativeSelect
                    name="network"
                    required
                    defaultValue={activeWallet?.network ?? ""}
                    disabled={locked}
                    wrapperClassName="mt-2 w-full"
                    className={selectClass(!!activeWallet?.network)}
                  >
                    <NativeSelectOption value="" disabled>
                      Selecione uma rede
                    </NativeSelectOption>
                    {NETWORKS.map((network) => (
                      <NativeSelectOption key={network} value={network}>
                        {network}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Nome do perfil" required>
                  <Input
                    name="profileName"
                    required
                    defaultValue={activeWallet?.profileName ?? user?.name ?? ""}
                    disabled
                    className="mt-2 block h-10 w-full rounded-lg border border-[#55321F] bg-[#241612] px-3 text-[13px] text-[#EFE6DA] disabled:opacity-45"
                  />
                </Field>
                <Field label="Endereço da carteira" required>
                  <Input
                    name="address"
                    required
                    defaultValue={activeWallet?.address ?? ""}
                    disabled={locked}
                    placeholder="Endereço 0x da carteira"
                    className="mt-2 block h-10 w-full rounded-lg border border-[#55321F] bg-[#241612] px-3 text-[13px] text-[#EFE6DA] placeholder:text-[#B39463] disabled:opacity-45"
                  />
                </Field>
                <div>
                  <span aria-hidden="true" className="invisible text-[13px]">
                    .
                  </span>
                  <Input
                    aria-label="ENS ou carteira secundária (opcional)"
                    name="secondaryEns"
                    defaultValue={activeWallet?.secondaryEns ?? ""}
                    disabled={locked}
                    placeholder="ENS ou carteira secundária (opcional)"
                    className="mt-2 block h-10 w-full rounded-lg border border-[#55321F] bg-[#241612] px-3 text-[13px] text-[#EFE6DA] placeholder:text-[#B39463] disabled:opacity-45"
                  />
                </div>
                <Field label="Tipo de carteira" required>
                  <NativeSelect
                    name="walletType"
                    required
                    defaultValue={activeWallet?.walletType ?? ""}
                    disabled={locked}
                    wrapperClassName="mt-2 w-full"
                    className={selectClass(!!activeWallet?.walletType)}
                  >
                    <NativeSelectOption value="" disabled>
                      Selecione uma carteira
                    </NativeSelectOption>
                    {WALLET_TYPES.map((type) => (
                      <NativeSelectOption key={type} value={type}>
                        {type}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field label="Código de indicação" required>
                  <Input
                    name="referralCode"
                    required
                    defaultValue={activeWallet?.referralCode ?? ""}
                    disabled={locked}
                    placeholder="Ex.: KURIO10"
                    className="mt-2 block h-10 w-full rounded-lg border border-[#55321F] bg-[#241612] px-3 text-[13px] text-[#EFE6DA] placeholder:text-[#B39463] disabled:opacity-45"
                  />
                </Field>
                <Field label="E-mail" required>
                  <Input
                    name="email"
                    type="email"
                    required
                    defaultValue={activeWallet?.email ?? user?.email ?? ""}
                    disabled
                    className="mt-2 block h-10 w-full rounded-lg border border-[#55321F] bg-[#241612] px-3 text-[13px] text-[#EFE6DA] disabled:opacity-45"
                  />
                </Field>
                <Field label="Nome ENS" required>
                  <span className="mt-2 flex gap-2">
                    <NativeSelect
                      aria-label="Sufixo ENS"
                      disabled={locked}
                      wrapperClassName="w-18 shrink-0"
                      className="h-10 rounded-lg border-r-0 border-[#55321F] bg-[#241612] pl-2 pr-7 text-[13px] text-[#EFE6DA] shadow-none focus:border-[#D28A4C] disabled:opacity-45"
                    >
                      <NativeSelectOption>.eth</NativeSelectOption>
                    </NativeSelect>
                    <Input
                      name="ens"
                      required
                      defaultValue={ensRoot}
                      disabled={locked}
                      className="block h-10 min-w-0 flex-1 rounded-lg border-[#55321F] bg-[#241612] px-3 text-[13px] text-[#EFE6DA] shadow-none focus-visible:border-[#D28A4C] disabled:opacity-45"
                    />
                  </span>
                </Field>
                <p className="mt-4 block">
                  <span className="text-[12px] text-[#F7F3EC]">
                    Observação do colecionador (opcional)
                  </span>
                  <Textarea
                    value={notes}
                    onChange={(event) => setNotes(event.target.value)}
                    rows={3}
                    className="mt-2 min-h-20 resize-none rounded-lg border-[#55321F] bg-[#241612] px-3 py-2 text-[13px] text-[#EFE6DA] shadow-none focus-visible:border-[#D28A4C]"
                  />
                </p>
              </form>
            )}
          </section>

          <section aria-label="Carteira e rede" className="px-4">
            <h2 className="mt-6 text-[14px] font-bold text-[#F7F3EC]">
              Carteira e rede
            </h2>
            <div
              role="radiogroup"
              aria-label="Selecione o provedor da carteira"
              className="mt-3 space-y-4"
            >
              {WALLET_PROVIDERS.map((provider) => {
                const isSelected = selectedProvider === provider;
                return (
                  <button
                    key={provider}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => setSelectedProvider(provider)}
                    className="flex w-full items-center justify-between gap-4 rounded-xl bg-brand-surface-card px-3.5 py-3 text-left transition hover:ring-1 hover:ring-[#D28A4C]/60"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full border border-[#55321F] text-[13px] font-bold text-[#E89B55]">
                        {provider[0]}
                      </span>
                      <span className="truncate text-[14px] text-[#EFE6DA]">
                        {provider === "Coinbase" ? "Coinbase Wallet" : provider}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`grid size-5 shrink-0 place-items-center rounded-full border transition ${isSelected ? "border-[#E89B55]" : "border-[#B39463]/70"}`}
                    >
                      {isSelected && (
                        <span className="size-3 rounded-full bg-[#E89B55]" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="px-4">
            {priceChanged && (
              <div className="mt-4 rounded-lg border border-[#8A5A38] bg-[#241612] px-3 py-2.5 text-[11px] text-[#EFE6DA]">
                O preço ou estoque mudou. A nova cotação foi carregada; revise
                antes de confirmar.
                <button
                  type="button"
                  onClick={() => setPriceChanged(false)}
                  className="mt-1.5 block text-[11px] font-bold text-[#E89B55] underline underline-offset-2"
                >
                  Entendi a nova cotação
                </button>
              </div>
            )}
            {error && (
              <p role="alert" className="mt-4 text-[11px] text-[#ED1B2E]">
                {error}
              </p>
            )}
            <p className="mt-5 flex items-center gap-2 text-[12px] text-[#B39463]">
              Tem um código promocional?{" "}
              <button
                type="button"
                onClick={() => setCouponOpen((value) => !value)}
                className="text-[12px] font-bold text-[#E89B55] underline underline-offset-2 hover:text-[#DD9A5F]"
              >
                Aplique aqui
              </button>
            </p>
            {couponOpen && (
              <form
                onSubmit={(event) => void applyCoupon(event)}
                className="mt-2 flex"
              >
                <Input
                  value={couponDraft}
                  onChange={(event) =>
                    setCouponDraft(event.target.value.toUpperCase())
                  }
                  placeholder="Digite o código"
                  aria-label="Código promocional"
                  className="h-10 min-w-0 flex-1 rounded-l-full rounded-r-none border-r-0 border-[#55321F] bg-[#1E120C] px-4 text-[12px] text-[#EFE6DA] shadow-none placeholder:text-[#B39463] focus-visible:border-[#D28A4C]"
                />
                <button
                  type="submit"
                  className="h-10 shrink-0 rounded-r-full bg-[#B97543] px-4 text-[12px] font-bold text-brand-ink transition hover:bg-[#C58250]"
                >
                  Aplicar
                </button>
              </form>
            )}
            {couponError && (
              <p className="mt-2 text-[11px] text-[#ED1B2E]" role="alert">
                {couponError}
              </p>
            )}
            <p className="mt-4 flex items-center justify-end gap-3">
              <span className="text-[15px] font-bold text-[#F7F3EC]">
                Total:
              </span>
              <span className="text-[18px] font-bold text-[#E89B55]">
                {quote.data?.total ?? "—"} ETH
              </span>
            </p>
            <label className="mt-5 flex cursor-pointer items-center gap-2 text-[11px] text-[#B39463]">
              <Checkbox
                checked={decline}
                onCheckedChange={(checked) => setDecline(checked === true)}
                className="border-[#B39463] data-[state=checked]:border-[#E89B55] data-[state=checked]:bg-[#E89B55] data-[state=checked]:text-brand-ink"
              />
              Simular recusa da carteira
            </label>
          </section>
        </div>
        <div className="fixed inset-x-0 bottom-0 z-30 mx-auto w-full rounded-t-[22px] bg-[#2B1A12] px-4 pb-4 pt-3.5 shadow-[0_-12px_35px_rgba(0,0,0,.35)]">
          <button
            type={walletListOpen ? "button" : "submit"}
            form={walletListOpen ? undefined : "checkout-profile-mobile"}
            onClick={walletListOpen ? () => order.mutate(undefined) : undefined}
            disabled={
              !session.data?.user ||
              order.isPending ||
              !quote.data ||
              priceChanged ||
              wallets.isPending
            }
            className="h-13 w-full rounded-full bg-[#B97543] text-[13px] font-bold text-brand-ink transition hover:bg-[#C58250] disabled:opacity-50"
          >
            {order.isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner /> Processando…
              </span>
            ) : (
              "Confirmar compra"
            )}
          </button>
          <p className="mt-2 text-center text-[9px] text-white/35">
            Ao confirmar, você aceita a simulação desta compra.
          </p>
        </div>
      </div>
    </main>
  );
}
