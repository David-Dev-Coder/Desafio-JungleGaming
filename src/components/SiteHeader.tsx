import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useAuthModal } from "./AuthModal";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { api } from "../services/api";
import type { CartItem, User } from "../domain/types";
import { SvgIcon } from "./SvgIcon";

export function SiteHeader() {
  const openAuthModal = useAuthModal();
  const session = useQuery({
    queryKey: ["session"],
    queryFn: async () =>
      (await api.get<{ user: User | null }>("/auth/session")).data,
  });
  const cart = useQuery({
    queryKey: ["cart"],
    queryFn: async () => (await api.get<CartItem[]>("/cart")).data,
  });
  const cartCount =
    cart.data?.reduce((count, item) => count + item.quantity, 0) ?? 0;
  const user = session.data?.user;

  return (
    <header className="sticky top-0 z-20 bg-brand-ink/95 backdrop-blur pt-3">
      <nav
        aria-label="Navegação principal"
        className="mx-auto flex h-14 max-w-7xl items-center justify-between px-5 lg:px-3 xl:px-0 border-b border-brand-border"
      >
        <Link
          to="/"
          className="text-body-14-bold tracking-[.16em] text-text-primary"
        >
          KURIO
        </Link>
        <div className="hidden h-full items-center gap-4 md:gap-7 text-tiny-10-medium sm:flex">
          <Link
            to="/"
            className="flex h-full items-center border-b-2 border-[#D28A4C] px-1 text-body-16-regular-16 text-[#E89B55]"
          >
            Início
          </Link>
          <span className="flex h-full items-center border-b-2 border-transparent px-1 text-body-16-regular-16 text-foreground transition hover:border-[#D28A4C] hover:text-[#E89B55]">
            Mercado
          </span>
          <span className="flex h-full items-center border-b-2 border-transparent px-1 text-body-16-regular-16 text-foreground transition hover:border-[#D28A4C] hover:text-[#E89B55]">
            Criadores
          </span>
          <span className="flex h-full items-center border-b-2 border-transparent px-1 text-body-16-regular-16 text-foreground transition hover:border-[#D28A4C] hover:text-[#E89B55]">
            Aprenda
          </span>
        </div>
        <div className="flex items-center gap-2 md:gap-4">
          <a
            href="/#collection"
            aria-label="Buscar NFTs"
            className="grid size-8 place-items-center text-[#CFB28C] hover:text-[#E89B55]"
          >
            <SvgIcon name="search" size={20} />
          </a>
          <Link
            to="/cart"
            aria-label={`Sacola, ${cartCount} itens`}
            className="relative grid size-8 place-items-center text-[#CFB28C] hover:text-[#E89B55]"
          >
            <SvgIcon name="cart" size={20} />
            <span className="absolute right-0 top-1 grid size-3.5 place-items-center rounded-full ring-2 ring-brand-ink bg-[#D28A4C] text-tiny-9-bold text-brand-ink">
              {cartCount}
            </span>
          </Link>
          {user ? (
            <Link
              to="/profile"
              aria-label={`Perfil de ${user.name}`}
              title={`Perfil de ${user.name}`}
              className="ml-2 md:ml-4 rounded-full"
            >
              <Avatar className="size-9">
                {user.avatar ? <AvatarImage src={user.avatar} alt="" className="object-cover" /> : null}
                <AvatarFallback className="bg-[#D28A4C] text-body-16-bold uppercase text-brand-ink">
                  {user.name.trim().charAt(0) || user.email.charAt(0)}
                </AvatarFallback>
              </Avatar>
            </Link>
          ) : (
            <Button
              onClick={() => openAuthModal('login')}
              aria-label="Entrar"
              title="Entrar"
              size="sm"
              className="ml-2 md:ml-4 h-8 gap-1 rounded-sm bg-[#D28A4C] px-2 text-body-16-medium text-brand-ink hover:bg-[#DD9A5F]"
            >
              <SvgIcon name="logout" size={20} className="mt-0.5 size-5" />
              Entrar
            </Button>
          )}
        </div>
      </nav>
    </header>
  );
}
