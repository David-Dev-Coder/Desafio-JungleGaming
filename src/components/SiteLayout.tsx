import { useEffect, useRef } from "react";
import { Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { SiteHeader } from "./SiteHeader";
import { SiteFooter } from "./SiteFooter";
import { AuthModalProvider } from "./AuthModal";
import { Toaster } from "@/components/ui/sonner";
import { api } from "../services/api";
import type { CartItem } from "../domain/types";

export function SiteLayout() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const isMergedResponsive = pathname === "/" || pathname.startsWith("/nft/") || pathname === "/cart" || pathname === "/checkout";
  const isCartPage = pathname === "/cart";
  const cart = useQuery({
    queryKey: ["cart"],
    queryFn: async () => (await api.get<CartItem[]>("/cart")).data,
    enabled: isCartPage,
  });
  const routeFocusRef = useRef<HTMLDivElement>(null);
  const previousPathname = useRef(pathname);

  useEffect(() => {
    if (previousPathname.current === pathname) return;

    previousPathname.current = pathname;
    routeFocusRef.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <AuthModalProvider>
      <div className="min-h-screen bg-[#140D0A] text-[#F7F3EC]">
        <div ref={routeFocusRef} tabIndex={-1} className="sr-only" />
        <div className={isMergedResponsive ? "hidden sm:block" : undefined}>
          <SiteHeader />
        </div>
        <Outlet />
        {pathname !== "/profile" && <SiteFooter />}
        {pathname === "/" && <div aria-hidden="true" className="h-[70px] sm:hidden" />}
        {pathname.startsWith("/nft/") && <div aria-hidden="true" className="h-[130px] sm:hidden" />}
        {pathname === "/profile" && <div aria-hidden="true" className="h-[100px] sm:hidden" />}
        {isCartPage && !!cart.data?.length && <div aria-hidden="true" className="h-[300px] sm:hidden" />}
        {pathname === "/checkout" && <div aria-hidden="true" className="h-[120px] sm:hidden" />}
        <Toaster position="bottom-right" />
      </div>
    </AuthModalProvider>
  );
}
