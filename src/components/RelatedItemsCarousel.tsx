import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from "@/components/ui/carousel";
import type { Nft } from "../domain/types";
import { formatEth, parseEth } from "../lib/eth";

type RelatedItemsCarouselProps = {
  title: string;
  items: Nft[];
  itemHref?: (item: Nft) => string;
};

export function RelatedItemsCarousel({
  title,
  items,
  itemHref,
}: RelatedItemsCarouselProps) {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap());
    const onSelect = () => setCurrent(api.selectedScrollSnap());
    api.on("select", onSelect);
    return () => {
      api.off("select", onSelect);
    };
  }, [api]);

  if (items.length === 0) return null;

  return (
    <section aria-label={title}>
      <h2 className="mb-5 border-b border-brand-border pb-2 text-body-lg-17-bold text-text-accent">
        {title}
      </h2>
      <Carousel setApi={setApi} opts={{ align: "start", slidesToScroll: 1 }} aria-label={title} className="px-1">
        <CarouselContent className="py-2 px-2">
          {items.map((item, index) => {
            const oldPrice =
              index % 5 === 1
                ? formatEth(parseEth(item.price) * 115n / 100n, 2)
                : null;

            const card = (
                <div className="group relative block rounded-md bg-card p-1.5 transition duration-300 hover:-translate-y-0.5 hover:ring-1 hover:ring-[#D28A4C]/60">
                  <div className="overflow-hidden rounded-sm bg-brand-surface-raised">
                    <img
                      src={item.image}
                      alt={item.name}
                      loading="lazy"
                      className="aspect-[1.1/1] w-full object-cover transition duration-500 group-hover:scale-[1.02]"
                    />
                  </div>
                  <div className="space-y-2 px-1.5 pb-1 pt-3">
                    <h3 className="truncate text-body-16-regular-16 text-text-primary">
                      {item.name}
                    </h3>
                    <p className="text-body-lg-18-bold text-text-accent">
                      {item.price} ETH
                      {oldPrice && (
                        <span className="ml-2 text-body-lg-18-regular text-text-secondary">
                          {oldPrice} ETH
                        </span>
                      )}
                    </p>
                  </div>
                </div>
            );

            return (
              <CarouselItem key={item.id} className="basis-full sm:basis-1/2 lg:basis-1/3 xl:basis-1/5">
                {itemHref ? <a href={itemHref(item)}>{card}</a> : (
                  <Link to="/nft/$nftId" params={{ nftId: item.id }}>{card}</Link>
                )}
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="left-2 top-[38%] size-8 border-brand-border-soft bg-brand-ink/85 text-text-primary hover:bg-[#D28A4C] hover:text-brand-ink" />
        <CarouselNext className="right-2 top-[38%] size-8 border-brand-border-soft bg-brand-ink/85 text-text-primary hover:bg-[#D28A4C] hover:text-brand-ink" />
      </Carousel>
      {count > 1 && (
        <nav
          aria-label={"Navegação: " + title}
          className="mt-5 flex items-center justify-center gap-1"
        >
          {Array.from({ length: count }, (_, page) => (
            <Button
              key={page}
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => api?.scrollTo(page)}
              aria-label={
                "Ir para página " + (page + 1) + " de " + count
              }
              aria-current={current === page ? "page" : undefined}
              className="rounded-full hover:bg-transparent"
            >
              <span
                aria-hidden="true"
                className={
                  "size-3 rounded-full border border-text-accent transition-colors " +
                  (current === page
                    ? "bg-text-accent"
                    : "hover:bg-text-accent/50")
                }
              />
            </Button>
          ))}
        </nav>
      )}
    </section>
  );
}
