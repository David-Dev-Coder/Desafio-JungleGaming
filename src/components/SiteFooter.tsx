import { Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion'
import { api } from "../services/api";
import { Fragment, useState } from "react";
import { toast } from "sonner";
import { SvgIcon, type SvgIconName } from "./SvgIcon";

const features = [
  { letter: 'W', title: 'Segurança da carteira', text: 'Proteja sua carteira e colecione arte digital verificada com confiança.' },
  { letter: 'C', title: 'Criadores em destaque', text: 'Conheça artistas, estúdios e comunidades que moldam a cultura digital na rede.' },
  { letter: 'D', title: 'Alertas de lançamentos', text: 'Receba calendários de cunhagem, novidades de listas de acesso e análises do mercado.' },
]

const socialIcons: SvgIconName[] = ["facebook", "instagram", "twitter", "linkedin", "youtube"];
const socialLabels = [
  "Facebook",
  "Instagram",
  "X (Twitter)",
  "LinkedIn",
  "YouTube",
];

type FooterLink = { label: string; to?: '/profile' | '/cart'; href?: string };

const footerGroups: { title: string; links: FooterLink[] }[] = [
  {
    title: 'Meu perfil',
    links: [
      { label: 'Meu perfil', to: '/profile' },
      { label: 'Minha coleção', to: '/cart' },
      { label: 'Atividade', to: '/profile' },
      { label: 'Estudo do criador', to: '/profile' },
      { label: 'Lista de interesse', to: '/profile' },
    ],
  },
  {
    title: 'Central de ajuda',
    links: [
      { label: 'Central de ajuda', href: '/#collection' },
      { label: 'Como comprar NFTs', href: '/#collection' },
      { label: 'Carteira e segurança', href: '/#collection' },
      { label: 'Política do mercado', href: '/#collection' },
      { label: 'Denunciar item', href: '/#collection' },
    ],
  },
  {
    title: 'Coleções',
    links: [
      { label: 'Arte digital', href: '/#collection' },
      { label: 'Fotografia', href: '/#collection' },
      { label: 'Música', href: '/#collection' },
      { label: 'Arte 3D', href: '/#collection' },
      { label: 'Utilidade', href: '/#collection' },
    ],
  },
];

function FooterLinkItem({ link }: { link: FooterLink }) {
  return link.to ? (
    <Link to={link.to} className="hover:text-[#E89B55]">{link.label}</Link>
  ) : (
    <a href={link.href} className="hover:text-[#E89B55]">{link.label}</a>
  );
}

export function SiteFooter() {
  const client = useQueryClient();
  const [newsletterEmail, setNewsletterEmail] = useState<string>('');
  const socialLinks = (
    <div className="mt-5 flex gap-2">
      {socialIcons.map((icon, index) => (
        <a
          key={index}
          href="#"
          aria-label={socialLabels[index]}
          className="grid size-8 place-items-center rounded-md border border-brand-border-soft text-brand-secondary transition hover:border-[#D28A4C] hover:text-[#E89B55]"
        >
          <SvgIcon name={icon} size={14} />
        </a>
      ))}
    </div>
  );
  const walletCompatibility = (
    <div className="mt-4 flex items-center gap-2 rounded-md border border-brand-border-soft px-3 py-1.5 text-tiny-9-regular uppercase tracking-[.08em] text-brand-secondary">
      {["Metamask", "WalletConnect", "Coinbase"].map((wallet, index) => (
        <Fragment key={wallet}>
          {index > 0 && (
            <span aria-hidden="true" className="text-[#55321F]">•</span>
          )}
          <span>{wallet}</span>
        </Fragment>
      ))}
    </div>
  );

  return (
    <footer className="mt-16 md:mt-24 pb-3">
      <div className="bg-[#241612] mx-auto max-w-7xl">
        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="grid gap-2 py-10 sm:grid-cols-2 lg:grid-cols-[2fr_2fr_2fr_3fr] lg:gap-x-4 lg:py-12">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="grid grid-cols-[auto_1fr] gap-4 items-center sm:gap-0 sm:flex sm:flex-col sm:items-start lg:border-l-2 lg:border-brand-primary/60 lg:pl-4 lg:first:border-none lg:first:pl-0"
              >
                <span
                  aria-hidden="true"
                  className="grid size-18 place-items-center rounded-full bg-brand-primary text-body-lg-18-bold-24 text-brand-ink"
                >
                  {feature.letter}
                </span>
                <div className="flex flex-col sm:gap-2 gap-0">
                  <h3 className="sm:mt-6 text-body-lg-18-bold-24 text-text-primary">
                    {feature.title}
                  </h3>
                  <p className="sm:mt-3 sm:max-w-[250px] text-body-14-regular-22 text-brand-secondary">
                    {feature.text}
                  </p>
                </div>
                {index === 1 && (
                  <span className="sr-only">
                    Conheça também coleções assistidas por curadores.
                  </span>
                )}
              </div>
            ))}
            <div className="lg:border-l-2 lg:border-brand-primary/60 lg:pl-4">
              <h3 className="text-body-lg-18-bold-24 text-text-primary">
                Antecipe-se ao próximo lançamento
              </h3>
              <form
                className="mt-5 flex"
                onSubmit={(event) => {
                  event.preventDefault();
                  toast.success("Inscrição confirmada", {
                    description: "Você receberá os próximos lançamentos por e-mail.",
                  });
                  setNewsletterEmail("");
                }}
              >
                <Input
                  type="email"
                  required
                  value={newsletterEmail}
                  onChange={(event) => setNewsletterEmail(event.target.value)}
                  placeholder="digite seu e-mail..."
                  aria-label="E-mail para novidades"
                  className="h-10 flex-1 rounded-l-sm rounded-r-none border-brand-border-soft bg-brand-surface-card text-body-14-regular-22 placeholder:text-brand-secondary dark:bg-input/40"
                />
                <Button
                  type="submit"
                  size="sm"
                  className="h-10 shrink-0 rounded-r-sm rounded-l-none px-5 text-body-14-medium-20 text-black"
                >
                  Enviar
                </Button>
              </form>
              <p className="mt-4 sm:max-w-[280px] text-body-14-regular-22 text-brand-secondary">
                Receba lançamentos selecionados, histórias de criadores e
                novidades do mercado.
              </p>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-7xl bg-[#38220F]">
          <div className="mx-auto grid items-center max-w-7xl gap-4 px-5 py-7 text-body-14-regular-22 text-[#EFE6DA] sm:grid-cols-2 lg:grid-cols-4 lg:px-8">
            <p className="font-bold tracking-[.16em] text-text-primary">KURIO</p>
            <p className="max-w-[230px]">
              Feito para colecionadores, criadores e cultura
            </p>
            <p>contato@email.com</p>
            <p>+55 11 4002 8922</p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-5 lg:px-8">
          <div className="hidden gap-10 py-10 sm:grid sm:grid-cols-2 lg:grid-cols-4 lg:gap-x-8 lg:py-12">
            {footerGroups.map((group) => (
              <div key={group.title}>
                <h3 className="text-body-lg-18-bold text-text-primary">{group.title}</h3>
                <ul className="mt-5 text-body-14-regular-30 text-foreground">
                  {group.links.map((link) => (
                    <li key={link.label}><FooterLinkItem link={link} /></li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <h3 className="text-body-lg-18-bold text-text-primary">Redes sociais</h3>
              {socialLinks}
              <h3 className="mt-8 text-body-lg-18-bold-24 text-text-primary">Carteiras compatíveis</h3>
              {walletCompatibility}
            </div>
          </div>
          <div className="py-6 sm:hidden">
            <Accordion type="multiple" className="w-full">
              {footerGroups.map((group) => (
                <AccordionItem key={group.title} value={group.title} className="border-brand-border-soft">
                  <AccordionTrigger className="text-body-lg-18-bold text-text-primary hover:no-underline">{group.title}</AccordionTrigger>
                  <AccordionContent>
                    <ul className="space-y-2 pb-2 text-body-14-regular-30 text-foreground">
                      {group.links.map((link) => (
                        <li key={link.label}><FooterLinkItem link={link} /></li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              ))}
              <AccordionItem value="social" className="border-b-0">
                <AccordionTrigger className="text-body-lg-18-bold text-text-primary hover:no-underline">Redes sociais</AccordionTrigger>
                <AccordionContent>
                  {socialLinks}
                  <h3 className="mt-6 text-body-lg-18-bold-24 text-text-primary">Carteiras compatíveis</h3>
                  {walletCompatibility}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl">
        <p className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-3 px-5 py-5 text-center text-body-14-medium-20 text-[#EFE6DA] lg:px-8">
          © 2026 Kurio. Propriedade digital para todos.
          <Button
            variant="link"
            onClick={async () => {
              await api.post("/reset");
              localStorage.removeItem("jungle-token");
              sessionStorage.removeItem("jungle-pending-order-key");
              sessionStorage.removeItem("jungle-coupon");
              client.clear();
              window.location.assign("/");
            }}
            className="h-auto p-0 text-tiny-10-medium font-medium text-brand-secondary hover:text-[#E89B55]"
          >
            Resetar demo
          </Button>
        </p>
      </div>
    </footer>
  );
}
