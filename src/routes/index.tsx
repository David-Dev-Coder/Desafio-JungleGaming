import { useEffect, useRef, useState } from "react";
import { createRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Route as rootRoute } from "./__root";
import { api } from "../services/api";
import type { Nft, User } from "../domain/types";
import { SvgIcon } from "../components/SvgIcon";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
} from "@/components/ui/pagination";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";

type SearchParams = {
  q?: string;
  category?: string;
  sort?: string;
  page?: number;
  minPrice?: number;
  maxPrice?: number;
};

const HERO_IMAGE_FALLBACK =
  "/assets/img/8459204731e6eba9d474cbc8ebc37071360d3ba5.png";
const ARTICLE_IMAGE_FALLBACKS = [
  "/assets/img/2986a7cb16d09de8970824d2dd58bf0bb021702c.png",
  "/assets/img/87580f2def9af0ce13f4b6f6ce17bb2449bcfc16.png",
  "/assets/img/8459204731e6eba9d474cbc8ebc37071360d3ba5.png",
  "/assets/img/9df2ff42dd27ba657621c304557d1a855a4be6a5.png",
];
const SORT_OPTIONS = [
  { value: "featured", label: "Listados recentemente" },
  { value: "price-asc", label: "Menor preço" },
  { value: "price-desc", label: "Maior preço" },
];

const collectionFilters = [
  { label: "Arte digital", category: "Jungle Guardians" },
  { label: "Fotografia" },
  { label: "Música" },
  { label: "Arte 3D" },
  { label: "Colecionáveis", category: "Ancient Artifacts" },
  { label: "Generativa", category: "Jungle Treasures" },
  { label: "Jogos" },
  { label: "Assinaturas" },
  { label: "Utilidade" },
];

const networks = [
  { name: "Ethereum", count: 119 },
  { name: "Polygon", count: 78 },
  { name: "Solana", count: 86 },
];

const articles = [
  {
    day: "12 de setembro",
    read: "Leitura de 6 min",
    title: "Como funciona a propriedade de NFTs",
    text: "Aprenda a colecionar, negociar e verificar ativos digitais.",
  },
  {
    day: "13 de setembro",
    read: "Leitura de 2 min",
    title: "10 artistas digitais para acompanhar",
    text: "Conheça criadores que moldam a cultura digital.",
  },
  {
    day: "14 de setembro",
    read: "Leitura de 3 min",
    title: "Raridade, atributos e procedência",
    text: "Entenda raridade, procedência, direitos autorais e utilidade.",
  },
  {
    day: "15 de setembro",
    read: "Leitura de 2 min",
    title: "Como proteger sua carteira",
    text: "Proteja sua carteira, seus ativos e sua identidade.",
  },
];

const formatEth = (value: string) =>
  `${Number(value).toFixed(2).replace(".", ",")} ETH`;

export const Route = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  validateSearch: (search: Record<string, unknown>): SearchParams => ({
    q: typeof search.q === "string" ? search.q : "",
    category: typeof search.category === "string" ? search.category : "",
    sort: typeof search.sort === "string" ? search.sort : "featured",
    page: Math.max(1, Number(search.page) || 1),
    minPrice:
      search.minPrice === undefined ? undefined : Number(search.minPrice),
    maxPrice:
      search.maxPrice === undefined ? undefined : Number(search.maxPrice),
  }),
  component: HomePage,
});

function HomePage() {
  const rawSearch = Route.useSearch();
  const search = {
    q: rawSearch.q ?? "",
    category: rawSearch.category ?? "",
    sort: rawSearch.sort ?? "featured",
    page: rawSearch.page ?? 1,
    minPrice: rawSearch.minPrice,
    maxPrice: rawSearch.maxPrice,
  };
  const navigate = Route.useNavigate();
  const client = useQueryClient();
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
  const catalog = useQuery({
    queryKey: ["nfts", search],
    queryFn: async () =>
      (
        await api.get<{
          items: Nft[];
          total: number;
          page: number;
          pages: number;
        }>("/nfts", { params: search })
      ).data,
    placeholderData: (previous) => previous,
  });
  const filterCatalog = useQuery({
    queryKey: ["nfts", "home-filter-counts"],
    queryFn: async () =>
      (await api.get<{ items: Nft[] }>("/nfts", { params: { limit: 50 } })).data
        .items,
  });
  const toggleFavorite = useMutation({
    mutationFn: async (id: string) =>
      (await api.put<string[]>(`/favorites/${id}`)).data,
    onSuccess: (data) =>
      client.setQueryData(["favorites", session.data?.user?.id], data),
  });
  const changeSearch = (patch: Partial<SearchParams>) =>
    void navigate({
      search: (previous) => ({ ...previous, ...patch, page: patch.page ?? 1 }),
    });
  const [priceRange, setPriceRange] = useState([
    search.minPrice ?? 0.02,
    search.maxPrice ?? 12.3,
  ]);
  useEffect(
    () => setPriceRange([search.minPrice ?? 0.02, search.maxPrice ?? 12.3]),
    [search.minPrice, search.maxPrice],
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const items = catalog.data?.items ?? [];
  const pages = catalog.data?.pages ?? 0;
  const featured = items[0];
  const heroItems = useRef<Nft[]>([]);
  if (heroItems.current.length === 0 && items.length > 0)
    heroItems.current = items.slice(0, 2);
  const heroFeatured = heroItems.current[0] ?? featured;
  const heroSecondary = heroItems.current[1];
  const allNfts = filterCatalog.data ?? [];
  const hasPriceFilter =
    (search.minPrice !== undefined && search.minPrice > 0.02) ||
    (search.maxPrice !== undefined && search.maxPrice < 12.3);
  const activeFilterCount = [
    search.q,
    search.category,
    search.sort !== "featured" ? search.sort : "",
    hasPriceFilter ? "price" : "",
  ].filter(Boolean).length;
  const clearFilters = () => {
    setPriceRange([0.02, 12.3]);
    void navigate({
      search: {
        q: "",
        category: "",
        sort: "featured",
        page: 1,
        minPrice: undefined,
        maxPrice: undefined,
      },
    });
  };
  const applyPriceFilter = () =>
    void changeSearch({ minPrice: priceRange[0], maxPrice: priceRange[1] });
  const filtersContent = (
    <Accordion
      type="multiple"
      defaultValue={["collections", "price", "network"]}
      className="w-full"
    >
      <AccordionItem value="collections" className="border-b-0">
        <AccordionTrigger className="px-4 py-3 text-body-lg-18-bold hover:no-underline">
          Coleções
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <ToggleGroup
            type="single"
            value={search.category}
            onValueChange={(value) => changeSearch({ category: value })}
            className="flex-col items-stretch gap-0.5"
          >
            {collectionFilters.map((collection) => {
              const count = collection.category
                ? allNfts.filter(
                    (nft) => nft.collection === collection.category,
                  ).length
                : 0;
              return collection.category && count > 0 ? (
                <ToggleGroupItem
                  key={collection.label}
                  value={collection.category}
                  aria-label={`Filtrar por ${collection.label}`}
                  className="h-auto w-full justify-between rounded px-1.5 py-1.5 text-body-15-regular-15 font-normal text-brand-secondary hover:bg-transparent hover:text-[#E89B55] data-[state=on]:bg-transparent data-[state=on]:text-[#E89B55]"
                >
                  <span>{collection.label}</span>
                  <span>({count})</span>
                </ToggleGroupItem>
              ) : (
                <p
                  key={collection.label}
                  title="Sem NFTs com esta tag"
                  className="flex cursor-not-allowed items-center justify-between rounded px-1.5 py-1.5 text-body-15-regular-15 text-brand-secondary/70"
                >
                  <span>{collection.label}</span>
                  <span>({count})</span>
                </p>
              );
            })}
          </ToggleGroup>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="price" className="border-b-0">
        <AccordionTrigger className="px-4 py-3 text-body-lg-18-bold hover:no-underline">
          Faixa de preço
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4 pt-2">
          <Slider
            value={priceRange}
            onValueChange={setPriceRange}
            min={0.02}
            max={12.3}
            step={0.01}
            aria-label="Faixa de preço"
          />
          <p className="mt-3 text-caption-12-regular-16 text-brand-secondary">
            Preço: {formatEth(String(priceRange[0]))} –{" "}
            {formatEth(String(priceRange[1]))}
          </p>
          <Button
            type="button"
            size="sm"
            onClick={applyPriceFilter}
            className="mt-3 h-8 rounded-sm bg-[#D28A4C] px-4 text-tiny-11-bold text-[#140D0A] hover:bg-[#DD9A5F]"
          >
            Aplicar
          </Button>
        </AccordionContent>
      </AccordionItem>
      <AccordionItem value="network" className="border-b-0">
        <AccordionTrigger className="px-4 py-3 text-body-lg-18-bold hover:no-underline">
          Rede
        </AccordionTrigger>
        <AccordionContent className="px-4 pb-4">
          <div className="space-y-2">
            {networks.map((network) => (
              <p
                key={network.name}
                className="flex items-center justify-between text-tiny-11-medium text-brand-secondary"
              >
                <span>{network.name}</span>
                <span>
                  (
                  {allNfts.filter((nft) => nft.network === network.name).length}
                  )
                </span>
              </p>
            ))}
          </div>
        </AccordionContent>
      </AccordionItem>
      {activeFilterCount > 0 && (
        <div className="px-4 pb-2">
          <Button
            variant="link"
            onClick={clearFilters}
            className="h-auto p-0 text-body-14-regular-22 font-normal text-[#E89B55]"
          >
            Limpar filtros
          </Button>
        </div>
      )}
    </Accordion>
  );

  return (
    <main className="space-y-6 sm:space-y-24 pb-12 sm:pb-0">
      <section className="bg-[#140D0A]">
        <div className="flex items-center gap-2.5 px-4 pt-5 sm:hidden">
          <label className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-xl bg-[#241612] px-3 text-brand-secondary focus-within:border-[#D28A4C]">
            <SvgIcon name="search" size={16} />
            <input
              value={search.q}
              onChange={(event) => changeSearch({ q: event.target.value })}
              placeholder="Explorar coleções"
              aria-label="Explorar coleções"
              className="min-w-0 flex-1 bg-transparent text-body-14-medium-16 text-text-primary outline-none placeholder:text-brand-secondary"
            />
          </label>
          <button
            type="button"
            onClick={() => setFiltersOpen(true)}
            aria-label="Abrir filtros"
            className="relative grid size-11 shrink-0 place-items-center rounded-xl bg-[#D28A4C] text-[#140D0A] transition hover:bg-[#DD9A5F]"
          >
            <SvgIcon name="filter" size={24} />
            {activeFilterCount > 0 && (
              <span
                aria-label="Filtros ativos"
                className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-[#140D0A] bg-[#E89B55]"
              />
            )}
          </button>
        </div>
        <section className="relative mx-4 mt-3.5 min-h-[186px] overflow-hidden rounded-[24px] bg-linear-to-r from-[#D28A4C33]/90 to-[#D28A4C0A]/70 p-4 sm:hidden">
          <div className="absolute aspect-square left-[-35%] top-[-20%] h-[140%] rounded-full bg-linear-to-b from-[#DD9A5F6E]/70 to-[#D28A4C0A]/30" />
          <div className="absolute aspect-square left-1/2 -translate-x-1/2 top-[60%] -translate-y-1/2 h-[140%] rounded-full bg-linear-to-b from-[#DD9A5F6E]/70 to-transparent" />
          <div className="relative z-10 max-w-[58%]">
            <p className="text-caption-12-regular-16 text-brand-foreground">
              Bem-vindo à Kurio
            </p>
            <h1 className="mt-2 text-body-lg-18-bold-24 leading-7 text-[#FFF6E8]">
              SEJA DONO DA CULTURA DIGITAL
            </h1>
            <p className="mt-2.5 text-caption-12-regular-18 text-text-secondary">
              Descubra NFTs selecionados de criadores do mundo todo.
            </p>
            <a
              href="#collection"
              className="mt-2 inline-flex items-center gap-1 text-caption-12-bold uppercase text-[#E89B55]"
            >
              Explorar <SvgIcon name="arrowRight" className="ml-1" size={12} />
            </a>
          </div>
          {heroFeatured && (
            <Link
              to="/nft/$nftId"
              params={{ nftId: heroFeatured.id }}
              aria-label={`Ver NFT em destaque ${heroFeatured.name}`}
              className="absolute right-3 top-3 h-[142px] w-[37%] shadow-xl"
            >
              <img
                src={heroFeatured.image}
                alt={heroFeatured.name}
                className="size-full object-cover rounded-2xl"
              />
              {heroSecondary && (
                <img
                  src={heroSecondary.image}
                  alt=""
                  className="absolute -bottom-1.5 left-3 size-14 rounded-xl object-cover"
                />
              )}
            </Link>
          )}
          <div
            className="mt-3 flex justify-center gap-1.5 absolute bottom-2 left-1/2 -translate-x-1/2"
            aria-label="Destaques, 1 de 3"
          >
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                className={`size-1.5 rounded-full bg-text-accent`}
              />
            ))}
          </div>
        </section>
        <div className="mx-auto mt-3 hidden max-w-7xl items-center gap-10 px-5 sm:grid lg:grid-cols-[1.05fr_.95fr] lg:px-8">
          <div className="order-2 lg:order-1 py-4">
            <p className="mb-6 text-body-14-medium-16 text-text-primary/85">
              Bem-vindo à Kurio
            </p>
            <h1 className="max-w-xl text-display-32-bold sm:text-display-43-bold tracking-[.06em]">
              SEJA DONO DO FUTURO
              <br />
              DA ARTE DIGITAL
            </h1>
            <p className="mt-5 max-w-md text-body-14-regular-24 leading-6 text-brand-secondary">
              Descubra NFTs selecionados de criadores emergentes e consagrados.
              Colecione arte digital rara, apoie artistas e tenha uma parte da
              cultura da internet.
            </p>
            <Button
              asChild
              size="sm"
              className="mt-7 h-9 rounded-sm px-6 text-body-16-bold-20 uppercase"
            >
              <a className="text-black" href="#collection">
                Explorar
              </a>
            </Button>
            <div
              aria-hidden="true"
              className="mt-9 flex justify-center gap-2 lg:justify-end"
            >
              {[0, 1, 2].map((dot) => (
                <span
                  key={dot}
                  className={`size-2 rounded-full bg-text-accent`}
                />
              ))}
            </div>
          </div>
          <div className="order-1 mx-auto w-full max-w-[450px] lg:order-2">
            <div className="overflow-hidden rounded-xl border border-brand-border-soft bg-[#241612]">
              <img
                src={heroFeatured?.image ?? HERO_IMAGE_FALLBACK}
                alt={
                  heroFeatured
                    ? `NFT em destaque: ${heroFeatured.name}`
                    : "Arte digital em destaque"
                }
                className="aspect-[1.12/1] w-full object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <section
        id="collection"
        className="mx-auto max-w-7xl px-5 lg:px-3 xl:px-0"
      >
        <div className="grid items-start gap-6 lg:grid-cols-[310px_1fr]">
          <aside className="hidden lg:block">
            <div className="mb-8 bg-card">{filtersContent}</div>
            {featured && (
              <Link
                to="/nft/$nftId"
                params={{ nftId: featured.id }}
                className="block overflow-hidden rounded-b-xl bg-card transition hover:border-[#D28A4C]/60"
              >
                <div className="px-4 pt-4">
                  <p className="text-heading-24-bold tracking-[.08em] text-[#E89B55] mb-2">
                    NFT EM DESTAQUE
                  </p>
                  <p className="mt-1.5 text-title-22-bold text-text-primary text-center">
                    OFERTA LIMITADA
                  </p>
                </div>
                <img
                  src={featured.image}
                  alt={featured.name}
                  className="mt-3 aspect-[1/1.2] w-full object-cover rounded-xl"
                />
              </Link>
            )}
          </aside>

          <div className="min-w-0">
            <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
              <Drawer open={filtersOpen} onOpenChange={setFiltersOpen}>
                <DrawerTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-brand-border-soft bg-card text-text-primary hover:bg-[#2F1D15] hover:text-[#E89B55]"
                  >
                    <SvgIcon name="slidersHorizontal" size={16} />
                    Filtros
                    {activeFilterCount > 0 && (
                      <span className="grid size-5 place-items-center rounded-full bg-[#D28A4C] text-tiny-9-bold text-brand-ink">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </DrawerTrigger>
                <DrawerContent className="border-[#3F2319] bg-brand-ink text-text-primary">
                  <DrawerHeader className="border-b border-[#3F2319] pb-4 text-left">
                    <DrawerTitle className="text-body-lg-19-bold text-[#F7F3EC]">
                      Filtros
                    </DrawerTitle>
                    <DrawerDescription className="sr-only">
                      Refine a coleção por categoria, preço e rede
                    </DrawerDescription>
                  </DrawerHeader>
                  <div className="overflow-y-auto px-2 pb-4">
                    {filtersContent}
                  </div>
                  <DrawerFooter className="border-t border-[#3F2319]">
                    <DrawerClose asChild>
                      <Button className="w-full">Ver resultados</Button>
                    </DrawerClose>
                    {activeFilterCount > 0 && (
                      <Button
                        variant="outline"
                        onClick={clearFilters}
                        className="w-full border-[#55321F] bg-transparent text-[#F7F3EC] hover:bg-[#2F1D15] hover:text-[#E89B55]"
                      >
                        Limpar filtros
                      </Button>
                    )}
                  </DrawerFooter>
                </DrawerContent>
              </Drawer>
              <span className="text-caption-12-regular-16 text-brand-secondary">
                {catalog.data?.total ?? 0} itens
              </span>
            </div>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <Tabs
                value={search.sort === "price-desc" ? "trending" : "all"}
                onValueChange={(value) =>
                  changeSearch({
                    sort: value === "trending" ? "price-desc" : "featured",
                    q: "",
                    category: "",
                  })
                }
                className="w-full min-w-0 sm:w-auto"
              >
                <TabsList
                  variant="line"
                  className="h-10 w-full max-w-full justify-start gap-4 overflow-x-auto rounded-none [scrollbar-width:none] sm:w-fit sm:gap-6 [&::-webkit-scrollbar]:hidden"
                >
                  <TabsTrigger
                    value="all"
                    className="flex-none rounded-none px-0 pb-3"
                  >
                    <span className="sm:hidden">Todos</span>
                    <span className="hidden sm:inline">Todos os NFTs</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="new"
                    onClick={() => changeSearch({ sort: "featured", page: 1 })}
                    className="flex-none rounded-none px-0 pb-3"
                  >
                    <span className="sm:hidden">Novos</span>
                    <span className="hidden sm:inline">Novos lançamentos</span>
                  </TabsTrigger>
                  <TabsTrigger
                    value="trending"
                    className="flex-none rounded-none px-0 pb-3"
                  >
                    Em alta
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="flex items-center gap-1.5 text-body-15-regular-15 text-foreground">
                Ordenar por:
                <Select
                  value={search.sort}
                  onValueChange={(sort) => changeSearch({ sort })}
                >
                  <SelectTrigger
                    size="sm"
                    aria-label="Ordenar NFTs"
                    className="w-fit gap-1 rounded-sm border-0 bg-transparent px-1.5 text-tiny-11-medium shadow-none text-text-primary dark:bg-transparent"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem
                        key={option.value}
                        value={option.value}
                        className="text-tiny-11-medium"
                      >
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {catalog.isError && (
              <div className="flex flex-col items-center gap-2">
                <Alert className="w-full border-destructive/30 bg-card p-4 text-center">
                  <AlertDescription className="text-body-14-regular-22 text-text-primary">
                    Não conseguimos carregar a coleção.
                  </AlertDescription>
                </Alert>
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => void catalog.refetch()}
                  className="text-[#E89B55]"
                >
                  Tentar novamente
                </Button>
              </div>
            )}
            {catalog.isPending && (
              <div
                role="status"
                className="grid grid-cols-2 gap-3 xl:grid-cols-3"
              >
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <Skeleton
                    key={item}
                    className="aspect-[.78] rounded-2xl bg-card"
                  />
                ))}
              </div>
            )}
            {catalog.data &&
              (items.length ? (
                <div className="grid grid-cols-2 gap-x-3 gap-y-3 xl:grid-cols-3">
                  {items.map((nft, index) => {
                    const isFavorite = favorites.data?.includes(nft.id);
                    return (
                      <article
                        key={nft.id}
                        className={`group relative overflow-hidden rounded-[18px] bg-[#241612] p-1.5 transition hover:ring-1 hover:ring-[#D28A4C]/60 ${index % 2 ? "translate-y-2 sm:translate-y-0" : ""}`}
                      >
                        <div className="relative overflow-hidden rounded-[13px] bg-[#2F1D15]">
                          <Link
                            to="/nft/$nftId"
                            params={{ nftId: nft.id }}
                            aria-label={`Ver ${nft.name}`}
                            className="block"
                          >
                            <img
                              src={nft.image}
                              alt={nft.name}
                              loading="lazy"
                              className="aspect-[.92/1] w-full object-cover transition duration-500 group-hover:scale-[1.03]"
                            />
                          </Link>
                          {session.data?.user && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => toggleFavorite.mutate(nft.id)}
                              aria-label={
                                isFavorite
                                  ? `Remover ${nft.name} dos favoritos`
                                  : `Adicionar ${nft.name} aos favoritos`
                              }
                              className="absolute right-2 top-2 size-7 rounded-full border border-[#F7F3EC]/20 bg-[#241612]/75 p-0 text-[#F7F3EC] backdrop-blur hover:bg-[#241612]/75 hover:text-[#E89B55]"
                            >
                              <SvgIcon
                                name="heart"
                                size={14}
                                fill={isFavorite ? "#D28A4C" : "#F7F3EC"}
                              />
                            </Button>
                          )}
                          {index === 2 && (
                            <span className="absolute left-0 top-2 bg-[#D28A4C] px-2 py-1 text-[8px] font-bold uppercase text-[#140D0A] block md:hidden">
                              Raro
                            </span>
                          )}
                        </div>
                        <div className="px-1.5 pb-1 pt-2.5">
                          <h3 className="truncate text-body-15-regular text-text-primary">
                            {nft.name}
                          </h3>
                          <p className="mt-0.5 text-body-16-bold text-[#E89B55]">
                            {formatEth(nft.price)}
                          </p>
                        </div>
                      </article>
                    );
                  })}
                </div>
              ) : (
                <Empty className="border border-dashed border-brand-border-soft py-16">
                  <EmptyHeader>
                    <EmptyTitle className="text-body-lg-18-bold">
                      Nenhum item por aqui
                    </EmptyTitle>
                    <EmptyDescription className="text-body-14-regular-22 text-brand-secondary">
                      Tente remover um filtro ou buscar outro termo.
                    </EmptyDescription>
                  </EmptyHeader>
                  <EmptyContent>
                    <Button
                      variant="link"
                      onClick={clearFilters}
                      className="h-auto p-0 text-body-14-regular-22 font-normal text-[#E89B55]"
                    >
                      Limpar filtros
                    </Button>
                  </EmptyContent>
                </Empty>
              ))}

            {pages > 1 && (
              <div className="flex justify-end">
                <Pagination className="mt-8">
                  <PaginationContent className="gap-2">
                    {Array.from({ length: pages }, (_, i) => i + 1).map(
                      (page) => (
                        <PaginationItem key={page}>
                          <Button
                            size="icon"
                            aria-current={
                              page === search.page ? "page" : undefined
                            }
                            aria-label={`Ir para página ${page}`}
                            onClick={() => changeSearch({ page })}
                            variant={page === search.page ? "default" : "ghost"}
                            className={
                              page === search.page
                                ? "rounded-sm border border-[#D28A4C] bg-[#D28A4C] text-body-lg-18-bold text-brand-ink hover:bg-[#DD9A5F]"
                                : "rounded-sm border border-brand-border-soft bg-[#140D0A] text-body-lg-18-bold text-text-primary hover:bg-[#2F1D15] hover:text-text-primary"
                            }
                          >
                            {page}
                          </Button>
                        </PaginationItem>
                      ),
                    )}
                    <PaginationItem>
                      <Button
                        size="icon"
                        variant="ghost"
                        aria-label="Próxima página"
                        disabled={search.page >= pages}
                        onClick={() => changeSearch({ page: search.page + 1 })}
                        className="rounded-sm border border-brand-border-soft bg-[#140D0A] text-text-primary hover:bg-[#2F1D15] hover:text-text-primary disabled:opacity-40"
                      >
                        <SvgIcon name="chevronRight" size={14} />
                      </Button>
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
        </div>
      </section>

      <section id="creators" className="mx-auto max-w-7xl px-5 lg:px-3 xl:px-0">
        <div className="grid gap-4 md:grid-cols-2">
          {articles.slice(0, 2).map((article, index) => {
            const nft = items[index + 1] ?? items[0];
            return nft ? (
              <Link
                key={article.title}
                to="/nft/$nftId"
                params={{ nftId: nft.id }}
                className="group flex min-h-36 overflow-hidden rounded-md bg-card transition hover:ring-1 hover:ring-[#D28A4C]/60"
              >
                <img
                  src={nft.image}
                  alt=""
                  className="rounded-md w-1/2 object-cover"
                />
                <div className="flex flex-col justify-center items-end p-5">
                  <h3 className="text-body-lg-18-bold-24 text-right text-text-primary">
                    {index === 0
                      ? "Lançamentos gênesis de edição limitada"
                      : "Arte digital selecionada e muito mais"}
                  </h3>
                  <p className="mt-2 text-body-14-regular-24 text-right text-brand-secondary">
                    {index === 0
                      ? "Coleione edições escassas diretamente dos criadores antes da revelação pública."
                      : "Explore novos artistas, coleções verificadas e obras digitais que definem a cultura."}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1.5 rounded-sm bg-[#D28A4C] px-6 py-3 text-body-14-bold-20 text-black transition group-hover:bg-[#DD9A5F]">
                    Explorar <SvgIcon name="arrowRight" size={13} />
                  </span>
                </div>
              </Link>
            ) : null;
          })}
        </div>
      </section>

      <section
        id="journal"
        className="mx-auto max-w-7xl px-5 lg:px-3 xl:px-0 text-center"
      >
        <h2 className="text-heading-28-bold text-text-primary">
          Diário da Cunhagem
        </h2>
        <p className="mt-2 text-body-14-regular-15 text-brand-secondary">
          Histórias, guias e insights para colecionadores sobre o universo da
          propriedade digital.
        </p>
        <div className="mt-10 grid gap-4 text-left sm:grid-cols-2 xl:grid-cols-4">
          {articles.map((article, index) => (
            <article
              key={article.title}
              className="overflow-hidden rounded-md bg-card transition hover:-translate-y-0.5 hover:ring-1 hover:ring-[#D28A4C]/60"
            >
              <img
                src={
                  items[index]?.image ??
                  ARTICLE_IMAGE_FALLBACKS[index] ??
                  ARTICLE_IMAGE_FALLBACKS[0]
                }
                alt={article.title}
                className="aspect-[1.4/1] w-full object-cover"
              />
              <div className="p-3.5">
                <p className="text-caption-12-regular-16 text-brand-secondary">
                  {article.day} <span className="mx-2">|</span>
                  {article.read}
                </p>
                <h3 className="mt-2 text-body-16-bold text-text-primary">
                  {article.title}
                </h3>
                <p className="mt-1.5 text-caption-12-regular-16 text-brand-secondary">
                  {article.text}
                </p>
                <a
                  href="#journal"
                  className="mt-2 inline-block text-caption-12-regular-14 text-[#E89B55] hover:underline"
                >
                  Ler mais →
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <nav
        aria-label="Navegação mobile"
        className="fixed inset-x-0 bottom-0 z-30 flex h-[70px] items-center justify-around px-3 rounded-t-3xl bg-brand-surface-card sm:hidden"
      >
        <Link
          to="/"
          aria-label="Início"
          className="grid size-10 place-items-center text-[#E89B55]"
        >
          <SvgIcon name="home" size={18} fill="currentColor" />
        </Link>
        <a
          href="/#collection"
          aria-label="Favoritos"
          className="grid size-10 place-items-center text-[#CFB28C]"
        >
          <SvgIcon name="heart" size={18} fill="currentColor" />
        </a>
        <span
          aria-hidden="true"
          className="-mt-14 grid size-16 place-items-center rounded-full border-4 border-[#241612] bg-linear-to-b from-[#D28A4C]/40 to-[#D28A4C] text-[#140D0A] shadow-lg"
        >
          <SvgIcon name="scam" className="text-brand-foreground" size={24} />
        </span>
        <Link
          to="/cart"
          aria-label="Carrinho"
          className="grid size-10 place-items-center text-[#CFB28C]"
        >
          <SvgIcon name="cartMobile" size={18} />
        </Link>
        <Link
          to="/profile"
          aria-label="Perfil"
          className="grid size-10 place-items-center text-[#CFB28C]"
        >
          <SvgIcon name="user" size={18} />
        </Link>
      </nav>
    </main>
  );
}
