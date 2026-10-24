import { createRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Route as rootRoute } from "./__root";
import { api } from "../services/api";
import { subscribeToNft } from "../services/realtime";
import { RelatedItemsCarousel } from "../components/RelatedItemsCarousel";
import { useAuthModal } from "../components/AuthModal";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { tokenIndex } from "../lib/utils";
import type { Nft, User } from "../domain/types";
import { SvgIcon } from "../components/SvgIcon";
import { formatEth, multiplyEth, parseEth } from "../lib/eth";

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/nft/$nftId",
  component: DetailPage,
});

const THUMBNAILS = 4;
const RELATED_SHOWN = 15;

const sampleReviews = [
  {
    author: "Ana Costa",
    date: "12/09/2026",
    stars: 5,
    text: "Arte impecável e o certificado de autenticidade chegou em segundos. A peça superou o que eu esperava do drop.",
  },
  {
    author: "Leo Martins",
    date: "28/08/2026",
    stars: 4,
    text: "Colecionável belíssimo. O processo de cunhagem foi tranquilo e os metadados estão íntegros na rede.",
  },
  {
    author: "Mari Sales",
    date: "02/08/2026",
    stars: 5,
    text: "Acompanho o criador há tempos e essa edição foi a melhor até agora. Recomendo para quem valoriza detalhes.",
  },
];

function DetailPage() {
  const { nftId } = Route.useParams();
  const navigate = useNavigate();
  const openAuthModal = useAuthModal();
  const client = useQueryClient();
  const [quantity, setQuantity] = useState(1);
  const [notice, setNotice] = useState("");
  const [realtime, setRealtime] = useState("Conectando");
  const [activeImage, setActiveImage] = useState(0);
  const [activeTab, setActiveTab] = useState<"details" | "reviews">("details");

  const nft = useQuery({
    queryKey: ["nft", nftId],
    queryFn: async () => (await api.get<Nft>(`/nfts/${nftId}`)).data,
  });

  const session = useQuery({
    queryKey: ["session"],
    queryFn: async () =>
      (await api.get<{ user: User | null }>("/auth/session")).data,
  });

  const favorites = useQuery({
    queryKey: ["favorites", session.data?.user?.id],
    queryFn: async () => (await api.get<string[]>("/favorites")).data,
    enabled: !!session.data?.user,
  });

  useEffect(
    () =>
      subscribeToNft(
        nftId,
        (event) => {
          client.setQueryData(["nft", nftId], (current: Nft | undefined) =>
            !current || event.version >= current.version ? event.nft : current,
          );
          void client.invalidateQueries({ queryKey: ["cart"] });
          setNotice(
            `Atualização em tempo real recebida (versão ${event.version}).`,
          );
        },
        setRealtime,
      ),
    [nftId, client],
  );

  const item = nft.data;
  const collection = item?.collection;

  const related = useQuery({
    queryKey: ["nfts", "collection", collection],
    queryFn: async () =>
      (
        await api.get<{ items: Nft[] }>(
          "/nfts",
          { params: { category: collection, limit: RELATED_SHOWN + 1 } },
        )
      ).data.items,
    enabled: !!collection,
  });

  const relatedItems = (related.data ?? [])
    .filter((relatedNft) => relatedNft.id !== nftId)
    .slice(0, RELATED_SHOWN);
  const add = useMutation({
    mutationFn: async () =>
      (await api.put(`/cart/${nftId}`, { quantity })).data,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["cart"] });
      setNotice("Adicionado à sacola.");
    },
    onError: (error) =>
      setNotice(
        (error as Error).message || "Não foi possível adicionar à sacola.",
      ),
  });

  const favorite = useMutation({
    mutationFn: async () => (await api.put(`/favorites/${nftId}`)).data,
    onSuccess: (data) =>
      client.setQueryData(["favorites", session.data?.user?.id], data),
  });

  const simulateUpdate = useMutation({
    mutationFn: async () =>
      (
        await api.post(`/scenarios/nft-update/${nftId}`, {
          price: formatEth(parseEth(nft.data?.price ?? "0") + parseEth("0.05"), 2),
        })
      ).data,
    onSuccess: () =>
      setNotice("Preço alterado no cenário; aguardando atualização Socket.IO."),
    onError: (cause) =>
      setNotice(
        (cause as { response?: { data?: { message?: string } } }).response?.data
          ?.message ?? "Não foi possível disparar a alteração simulada.",
      ),
  });

  if (nft.isPending)
    return (
      <main className="mx-auto max-w-7xl px-5 lg:px-3 xl:px-0 py-12">
        <Skeleton className="aspect-[1.5/1] max-w-5xl rounded-lg bg-brand-surface-card" />
      </main>
    );

  if (nft.isError || !item)
    return (
      <main className="mx-auto max-w-3xl px-5 py-24 text-center">
        <p className="text-caption-12-regular-16 uppercase tracking-[.2em] text-text-accent">
          404 · item não encontrado
        </p>
        <h1 className="mt-3 text-heading-28-bold">
          Esta peça não está mais na coleção.
        </h1>
        <Button asChild className="mt-7 bg-lime-300 text-brand-ink hover:bg-lime-200">
          <Link to="/">Voltar à exploração</Link>
        </Button>
      </main>
    );

  const favorited = favorites.data?.includes(item.id) ?? false;
  const edition = item.editions ?? [`1/${item.available}`, "ABERTA"];

  return (
    <main className="pb-8 lg:pb-16 sm:pb-0">
      <div className="sm:hidden">
        <header className="flex items-center justify-between px-5 pt-6 mb-4">
          <Link
            to="/"
            aria-label="Voltar à home"
            className="grid size-9 place-items-center rounded-full bg-[#241612] text-[#CFB28C] transition hover:text-[#E89B55]"
          >
            <SvgIcon name="arrowLeft" size={16} label="Voltar" />
          </Link>
          <button
            type="button"
            aria-label={favorited ? "Remover dos favoritos" : "Adicionar aos favoritos"}
            onClick={() => (session.data?.user ? favorite.mutate() : openAuthModal("login"))}
            className={`grid size-9 place-items-center rounded-full bg-[#241612] transition ${favorited ? "text-[#E89B55]" : "text-[#CFB28C] hover:text-[#E89B55]"}`}
          >
            <SvgIcon name="heart" size={17} fill={favorite ? '#D28A4C' : '#F7F3EC'} />
          </button>
        </header>

        <div className="relative mx-5 overflow-hidden rounded-t-[22px] bg-[#241612]">
          <img
            src={item.image}
            alt={item.name}
            className="aspect-[1.2/1] w-full object-cover"
          />
        </div>

        <section className="relative -mt-2 rounded-[22px] bg-brand-surface-card px-5 py-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="mt-1 text-title-20-bold text-[#F7F3EC]">
                {item.name}
              </h1>
            </div>
            <span
              aria-label={`Nota ${item.rating ?? 4.8} de 5, ${item.reviews ?? 19} avaliações`}
              className="mt-1 flex shrink-0 items-center gap-1 rounded-full border border-[#55321F] px-2 py-1 text-[10px] text-[#F7F3EC]"
            >
              <SvgIcon name="star" size={12} className="text-[#E89B55]" />
              {item.rating ?? "4.8"}
              <span className="text-[#B39463]">({item.reviews ?? 19})</span>
            </span>
          </div>

          <p className="mt-3 text-body-14-regular-24 text-brand-secondary">
            {item.description ??
              `Um colecionável digital da coleção ${item.collection}, verificado na rede ${item.network ?? "Ethereum"}.`}
          </p>

          <div className="mt-4">
            <h2 className="text-body-15-bold text-[#F7F3EC]">Edição:</h2>
            <div className="mt-2 flex flex-wrap gap-2">
              {edition.map((value) => (
                <span
                  key={value}
                  className={`rounded-[48%] border px-2.5 py-0.5 text-caption-12-regular-16 text-text-accent ${
                    value === edition[1]
                      ? "border-[#D28A4C]"
                      : "border-brand-border-soft text-brand-secondary"
                  }`}
                >
                  {value}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-4 space-y-2 text-body-15-regular text-brand-secondary">
            <p>
              <span>ID do token:</span> {tokenIndex(item.id)}
            </p>
            <p>
              <span>Coleção:</span> {item.collection}
            </p>
            <p>
              <span>Atributos:</span>{" "}
              {(item.attributes ?? []).join(", ") || "Arte digital"}
            </p>
          </div>

          <div className="mt-4 flex items-center gap-3 text-body-14-bold-20 text-text-primary">
            Compartilhar este NFT:
            {(["linkedin", "mail", "twitter"] as const).map((icon, index) => (
              <Button
                key={index}
                asChild
                variant="ghost"
                size="icon-sm"
                className="text-brand-secondary hover:bg-transparent hover:text-[#E89B55]"
              >
                <a href="#" aria-label={["LinkedIn", "E-mail", "Twitter"][index]}>
                  <SvgIcon name={icon} fill="#F7F3EC" size={15} />
                </a>
              </Button>
            ))}
          </div>
          {notice && (
            <p
              role={add.isError || favorite.isError ? "alert" : "status"}
              className={`mt-2 text-[10px] ${add.isError || favorite.isError ? "text-[#ED1B2E]" : "text-[#E89B55]"}`}
            >
              {notice}{" "}
              {notice === "Adicionado à sacola." && (
                <Link to="/cart" className="underline">
                  Ver sacola
                </Link>
              )}
            </p>
          )}
        </section>
      </div>

      <div className="mx-auto space-y-8 lg:space-y-16 max-w-7xl px-5 pt-8 lg:px-8">
        <div>
          <nav
            aria-label="Navegação estrutural"
            className="hidden text-body-15-bold text-text-primary sm:block"
          >
            <Link to="/" className="hover:text-text-accent">
              Início
            </Link>
            <span className="mx-1.5">/</span>
            <span className="font-bold">Mercado</span>
          </nav>

          <div className="mt-4 hidden gap-6 sm:grid md:grid-cols-[auto_1fr] lg:grid-cols-[auto_minmax(0,1fr)_minmax(0,1.3fr)] lg:gap-7">
            <div className="order-2 flex gap-6 md:order-1 md:flex-col lg:gap-4">
              {Array.from({ length: THUMBNAILS }, (_, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  onClick={() => setActiveImage(index)}
                  aria-label={`Imagem ${index + 1} de ${item.name}`}
                  className={`h-auto shrink-0 overflow-hidden rounded-lg border-2 p-0 hover:bg-transparent ${
                    activeImage === index
                      ? "border-text-accent"
                      : "border-transparent hover:border-brand-border"
                  }`}
                >
                  <img
                    src={item.image}
                    alt=""
                    className="aspect-square w-full object-cover size-25"
                  />
                </Button>
              ))}
            </div>
            <div className="order-1 self-start rounded-xl bg-[#1E120C] p-4 md:order-2">
              <div className="relative">
                <img
                  src={item.image}
                  alt={item.name}
                  className="aspect-square w-full object-cover rounded-xl"
                />
                <span
                  aria-hidden="true"
                  className="absolute -right-1.5 -top-1.5 grid p-2 place-items-center rounded-full bg-brand-surface-dark"
                >
                  <SvgIcon name="search" size={16} />
                </span>
              </div>
            </div>

            <section className="order-3 flex flex-col md:col-span-2 lg:col-auto">
              <h1 className="text-display-32-bold text-text-primary">{item.name}</h1>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-b border-brand-border pb-1">
                <p className="text-body-lg-19-bold text-text-accent">
                  {item.price} ETH
                </p>
                <div className="flex items-center gap-1.5">
                  <span
                    aria-label={`Nota ${item.rating ?? 4} de 5`}
                    className="flex gap-1 text-text-accent"
                  >
                    {Array.from({ length: 5 }, (_, index) => (
                      <SvgIcon
                        key={index}
                        name="star"
                        size={13}
                        className={
                          index < (item.rating ?? 4) ? "" : "opacity-30"
                        }
                      />
                    ))}
                  </span>
                  <span className="text-body-15-regular text-[#EFE6DA]">
                    {item.reviews} avaliações de colecionadores
                  </span>
                </div>
              </div>

              <h2 className="mt-4 text-body-14-bold-20 text-text-primary">
                Sobre este NFT:
              </h2>
              <p className="mt-2 text-body-14-regular-22 text-brand-secondary">
                {item.description}
              </p>

              <h2 className="mt-4 text-body-14-bold-20 text-text-primary">
                Edição:
              </h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {edition.map((value) => (
                  <span
                    key={value}
                    className={`rounded-[48%] border px-2.5 py-0.5 text-caption-12-regular-16 text-text-accent ${
                      value === edition[1]
                        ? "border-[#D28A4C]"
                        : "border-brand-border-soft text-brand-secondary"
                    }`}
                  >
                    {value}
                  </span>
                ))}
              </div>

              <div className="mt-6 flex flex-wrap justify-between">
                <div className="flex items-center gap-2.5">
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Diminuir quantidade"
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((n) => Math.max(1, n - 1))}
                    className="rounded-full size-0 px-3 py-5 bg-text-accent text-brand-ink hover:bg-[#DD9A5F] disabled:opacity-30"
                  >
                    <SvgIcon name="minus" size={20} />
                  </Button>
                  <span className="w-5 text-center text-title-20-regular">
                    {quantity}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Aumentar quantidade"
                    disabled={quantity >= item.available}
                    onClick={() =>
                      setQuantity((n) => Math.min(item.available, n + 1))
                    }
                    className="rounded-full size-0 px-3 py-5 bg-text-accent text-brand-ink hover:bg-[#DD9A5F] disabled:opacity-30"
                  >
                    <SvgIcon name="plus" size={20} />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => add.mutate()}
                    disabled={add.isPending || item.available < 1}
                    className="h-10 bg-text-accent px-6 text-body-14-bold-20 text-brand-ink hover:bg-[#DD9A5F] disabled:opacity-40"
                  >
                    {add.isPending ? <><Spinner /> Comprando…</> : "COMPRAR"}
                  </Button>
                  <Button
                    variant="outline"
                    aria-label="Favoritar"
                    onClick={() =>
                      session.data?.user ? favorite.mutate() : openAuthModal('login')
                    }
                    className="h-10 gap-2 rounded-md border-[#D28A4C] bg-transparent px-4 text-body-14-regular-22 font-normal text-text-accent hover:border-brand-primary-dark/80 hover:bg-transparent hover:text-brand-primary-dark/80"
                  >
                    <SvgIcon
                      name="heart"
                      size={15}
                      fill={favorited ? "currentColor" : "none"}
                    />
                    Favoritar
                  </Button>
                </div>
              </div>
              {(add.isError || notice) && (
                <p
                  role={add.isError ? "alert" : "status"}
                  className={`mt-3 text-body-14-regular-22 ${
                    add.isError ? "text-red-300" : "text-[#E89B55]"
                  }`}
                >
                  {add.isError
                    ? (add.error as Error).message
                    : `${notice} `}
                  {!add.isError && (
                    <Link to="/cart" className="underline">
                      Ver carrinho
                    </Link>
                  )}
                </p>
              )}

              <div className="mt-5 space-y-2 text-body-14-regular-22">
                <p className="text-brand-secondary">
                  <span className="font-bold">ID do token:</span>{" "}
                  {tokenIndex(item.id)}
                </p>
                <p className="text-brand-secondary">
                  <span className="font-bold">Coleção:</span>{" "}
                  <span className="text-brand-secondary">{item.collection}</span>
                </p>
                <p className="text-brand-secondary">
                  <span className="font-bold">Atributos:</span>{" "}
                  <span className="text-brand-secondary">
                    {(item.attributes ?? []).join(", ")}
                  </span>
                </p>
              </div>

              <div className="mt-4 flex items-center gap-3 text-body-14-bold-20 text-text-primary">
                Compartilhar este NFT:
                {(["linkedin", "mail", "twitter"] as const).map((icon, index) => (
                  <Button
                    key={index}
                    asChild
                    variant="ghost"
                    size="icon-sm"
                    className="text-brand-secondary hover:bg-transparent hover:text-[#E89B55]"
                  >
                    <a
                      href="#"
                      aria-label={["LinkedIn", "E-mail", "Twitter"][index]}
                    >
                      <SvgIcon name={icon} fill="#F7F3EC" size={15} />
                    </a>
                  </Button>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <span role="status" className="text-tiny-10-medium text-white/35">
                  Socket.IO · {realtime}
                </span>
                <Button
                  variant="link"
                  onClick={() => simulateUpdate.mutate()}
                  disabled={simulateUpdate.isPending}
                  className="h-auto p-0 text-tiny-11-medium font-medium text-white/35 underline decoration-white/20 hover:text-[#E89B55]"
                >
                  Simular alteração de preço ao vivo
                </Button>
              </div>
            </section>
          </div>
        </div>

        <section>
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as "details" | "reviews")}
          >
            <TabsList variant="line" className="h-auto w-full justify-start gap-8 rounded-none border-b border-[#3F2319] p-0">
              <TabsTrigger value="details" className="flex-none rounded-none px-0 pb-3 text-body-14-bold-20">
                Detalhes do NFT
              </TabsTrigger>
              <TabsTrigger value="reviews" className="flex-none rounded-none px-0 pb-3 text-body-14-bold-20">
                <span className="hidden sm:inline">Avaliações de colecionadores ({item.reviews})</span>
                <span className="sm:hidden">Avaliações ({item.reviews})</span>
              </TabsTrigger>
            </TabsList>

          <TabsContent value="details">
            <div className="space-y-6 py-8 text-body-14-regular-22 text-[#EFE6DA]">
              <p className="text-brand-secondary">
                {item.name} é uma obra digital{" "}
                {edition.find((value) => value !== "ABERTA" && value !== "1/1") ??
                  edition[0]}{" "}
                finalizada à mão da coleção {item.collection}. Cada atributo
                fica armazenado nos metadados do token e verificado na{" "}
                {item.network ?? "Ethereum"}. A obra explora identidade,
                movimento e luz em um mundo digital sem fronteiras.
              </p>
              <p className="text-brand-secondary">
                A propriedade inclui a arte em alta resolução, lançamentos
                exclusivos para colecionadores e um registro permanente de
                procedência registrada na rede. {item.creator} recebe{" "}
                {item.royalty}, apoiando novos trabalhos e lançamentos da
                comunidade.
              </p>
              <div className="space-y-6 [&_p:first-child]:font-bold [&_p:first-child]:text-text-primary">
                <div>
                  <p>Rede:</p>
                  <p className="text-brand-secondary">
                    Cunhada na {item.network ?? "Ethereum"} com procedência
                    imutável e metadados armazenados no IPFS.
                  </p>
                </div>
                <div>
                  <p>Contrato:</p>
                  <p className="text-brand-secondary">
                    {item.contract} · Contrato inteligente ERC-721 verificado.
                  </p>
                </div>
                <div>
                  <p>Direitos autorais:</p>
                  <p className="text-brand-secondary">
                    {item.royalty}, pagos automaticamente pelos mercados
                    compatíveis.
                  </p>
                </div>
              </div>
            </div>
          </TabsContent>
          <TabsContent value="reviews">
            <div className="space-y-8 py-8">
              {sampleReviews.map((review) => (
                <article key={review.author}>
                  <div className="flex items-center gap-2">
                    <span className="text-body-14-bold-20 text-text-primary">
                      {review.author}
                    </span>
                    <span
                      aria-label={`Nota ${review.stars} de 5`}
                      className="flex gap-0.5 text-[#E89B55]"
                    >
                      {Array.from({ length: 5 }, (_, index) => (
                        <SvgIcon
                          key={index}
                          name="star"
                          size={13}
                          className={
                            index < review.stars ? "" : "opacity-30"
                          }
                        />
                      ))}
                    </span>
                    <span className="text-caption-12-regular-16 text-brand-secondary">
                      {review.date}
                    </span>
                  </div>
                  <p className="mt-2 max-w-3xl text-body-14-regular-22 text-brand-secondary">
                    {review.text}
                  </p>
                </article>
              ))}
            </div>
          </TabsContent>
          </Tabs>
        </section>

        <div>
          <RelatedItemsCarousel
            title="Mais desta coleção"
            items={relatedItems}
          />
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 rounded-t-[22px] bg-[#2B1A12] px-4 pb-4 pt-4 shadow-[0_-12px_35px_rgba(0,0,0,.35)] sm:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-body-15-bold text-brand-secondary">Qtd.</span>
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Diminuir quantidade"
              disabled={quantity <= 1}
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="rounded-full bg-text-accent text-brand-ink hover:bg-[#DD9A5F] disabled:opacity-30"
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
              disabled={quantity >= item.available}
              onClick={() =>
                setQuantity((value) => Math.min(item.available, value + 1))
              }
              className="rounded-full bg-text-accent text-brand-ink hover:bg-[#DD9A5F] disabled:opacity-30"
            >
              <SvgIcon name="plus" size={13} />
            </Button>
          </div>
          <span className="text-title-20-bold text-text-accent">
            {formatEth(multiplyEth(item.price, quantity), 2)} ETH
          </span>
        </div>

        <div className="mt-3 flex gap-3">
          <button
            type="button"
            disabled={add.isPending || item.available < 1}
            onClick={() =>
              add.mutate(undefined, {
                onSuccess: () => void navigate({ to: "/cart" }),
              })
            }
            className="py-2 px-10 rounded-full bg-[#B97543] text-body-16-bold-20 font-bold text-brand-ink transition hover:bg-[#C58250] disabled:opacity-50"
          >
            {add.isPending ? "Adicionando…" : "Comprar NFT"}
          </button>
          <button
            type="button"
            aria-label="Adicionar à sacola"
            disabled={add.isPending || item.available < 1}
            onClick={() => add.mutate()}
            className="grid size-13 place-items-center rounded-full bg-brand-border border border-brand-border-soft text-text-accent transition hover:bg-[#4A2C1C] disabled:opacity-50"
          >
            <SvgIcon name="cartMobile" size={18} />
          </button>
        </div>
      </div>
    </main>
  );
}
