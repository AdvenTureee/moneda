'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState, type ComponentType, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  Brain,
  Buildings,
  CaretDown,
  ChartBar,
  ChartPieSlice,
  CreditCard,
  Devices,
  Eye,
  Fire,
  HandPointing,
  ListBullets,
  LockKey,
  MapPin,
  Moon,
  Plus,
  Receipt,
  ShieldCheck,
  Sparkle,
  Sun,
  Trash,
  UploadSimple,
  Wallet,
  WhatsappLogo,
} from '@phosphor-icons/react';
import { useTheme } from '@/components/ThemeProvider';
import TrackedMascot from '@/components/TrackedMascot';
import MoFooter from '@/components/MoFooter';
import MoSkate from './MoSkate';

interface HomeLandingProps {
  whatsappUrl: string;
}

type IconComponent = ComponentType<{
  size?: number;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  className?: string;
  'aria-hidden'?: boolean;
}>;

const easeOut = [0.4, 0, 0.2, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0 },
};

const staggerGroup = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.06 },
  },
};

const summaryItems = [
  { label: 'Visualização', href: '#visualizacao', icon: Eye },
  { label: 'Ciclo', href: '#ciclo', icon: CreditCard },
  { label: 'Produto', href: '#produto', icon: CreditCard },
  { label: 'Como funciona', href: '#como-funciona', icon: ListBullets },
  { label: 'Privacidade & FAQ', href: '#privacidade', icon: ShieldCheck },
];

const featureRows = [
  {
    icon: WhatsappLogo,
    title: 'Lançamento pelo WhatsApp',
    text: 'Em breve, registre gastos por mensagem no momento em que acontecem.',
  },
  {
    icon: Devices,
    title: 'Use pelo navegador',
    text: 'Celular ou computador, sem instalar nada.',
  },
  {
    icon: Wallet,
    title: 'Gastos e ganhos juntos',
    text: 'Entradas e saídas aparecem no mesmo contexto.',
  },
  {
    icon: UploadSimple,
    title: 'Comprovante no registro',
    text: 'Recibo e contexto ficam junto do lançamento.',
  },
  {
    icon: Brain,
    title: 'Pergunte para a Mo',
    text: 'Entenda onde pesou e o que mudou no mês.',
  },
];

const cycleHighlight = {
  icon: CreditCard,
  tag: 'Métrica',
  title: 'Seu mês começa no fechamento da fatura.',
  mantra: 'Moneda mede o ciclo, não o calendário.',
  text: 'O gasto entra no período que realmente pesa: a próxima fatura.',
  cycleStart: 'Fecha dia 10',
  cycleEnd: 'Ciclo 10 a 09',
};

const ideas = [
  {
    title: 'Registre sem planilha',
    text: 'Lance gastos e ganhos direto no web app.',
  },
  {
    title: 'Veja o mês organizado',
    text: 'Categorias, feed e orçamento ficam no mesmo lugar.',
  },
  {
    title: 'Pergunte para a Mo',
    text: 'Receba respostas curtas sobre seus hábitos.',
  },
];

const flowSteps = [
  {
    icon: Devices,
    title: 'Crie sua conta',
    text: 'Entre pelo navegador e defina seu mês.',
  },
  {
    icon: Receipt,
    title: 'Registre o mês',
    text: 'Adicione gastos, ganhos e comprovantes.',
  },
  {
    icon: Brain,
    title: 'Leia com a Mo',
    text: 'Pergunte o que mudou e onde ajustar.',
  },
];

const trustItems = [
  { icon: LockKey, text: 'Dados sensíveis protegidos desde o primeiro registro.' },
  { icon: ShieldCheck, text: 'Preferências ficam sob seu controle no perfil.' },
  { icon: Trash, text: 'Exclusão de conta disponível quando quiser sair.' },
];

const faqs = [
  {
    q: 'Preciso instalar outro app?',
    a: 'Não. O web app funciona no navegador do celular ou computador. A experiência pelo WhatsApp está em desenvolvimento.',
  },
  {
    q: 'A Mo julga meus gastos?',
    a: 'Não. A Mo mostra padrões e explica o mês com clareza, sem bronca e sem culpa.',
  },
  {
    q: 'O que a demonstração mostra?',
    a: 'Ela mostra o web app disponível hoje e a direção da experiência por mensagem que vem depois.',
  },
  {
    q: 'Posso apagar meus dados?',
    a: 'Sim. O perfil do app inclui opções de privacidade e exclusão de conta.',
  },
];

const feedItems = [
  {
    icon: Receipt,
    title: 'Almoço no centro',
    meta: 'Alimentação, hoje',
    amount: 'R$ 42,00',
  },
  {
    icon: CreditCard,
    title: 'Uber para reunião',
    meta: 'Transporte, ontem',
    amount: 'R$ 28,90',
  },
  {
    icon: ListBullets,
    title: 'Mercado da semana',
    meta: 'Mercado, sexta',
    amount: 'R$ 186,40',
  },
];

function Surface({
  id,
  children,
  className = '',
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div id={id} className={`rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] shadow-[var(--shadow-card-soft)] ${className}`}>
      {children}
    </div>
  );
}

function Section({
  id,
  children,
  className = '',
}: {
  id?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-24 px-4 py-12 sm:px-6 sm:py-16 lg:px-8 ${className}`}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

function SectionTitle({
  eyebrow,
  title,
  children,
  align = 'left',
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
  align?: 'left' | 'center';
}) {
  return (
    <div className={align === 'center' ? 'mx-auto max-w-3xl text-center' : 'max-w-2xl'}>
      {eyebrow && (
        <p className="mb-1 font-heading text-[clamp(2rem,4vw,3.5rem)] font-bold leading-tight text-[var(--color-brand-green)]">
          {eyebrow}
        </p>
      )}
      <h2 className="font-heading text-[clamp(1.125rem,1.8vw,1.5rem)] font-semibold leading-relaxed text-[var(--color-text-secondary)]">
        {title}
      </h2>
      {children && (
        <p className={`mt-4 text-base leading-relaxed text-[var(--color-text-secondary)] ${align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-xl'}`}>
          {children}
        </p>
      )}
    </div>
  );
}

function IconBadge({ icon: Icon }: { icon: IconComponent }) {
  return (
    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-[var(--color-surface-alt)] text-[var(--color-brand-blue-dark)]">
      <Icon size={21} weight="bold" aria-hidden />
    </span>
  );
}

function CtaButton({ large = false, children = 'Criar conta' }: { large?: boolean; children?: ReactNode }) {
  return (
    <motion.a
      href="/signup"
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      transition={{ duration: 0.15, ease: easeOut }}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[var(--color-brand-blue)] font-bold text-[var(--home-primary-action-fg)] transition-colors hover:bg-[var(--color-brand-blue-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2 ${
        large ? 'min-h-14 px-6 text-base' : 'min-h-11 px-5 text-sm'
      }`}
    >
      <Plus size={18} weight="bold" aria-hidden />
      {children}
    </motion.a>
  );
}

function ThemeToggleButton() {
  const { isDark, toggleTheme } = useTheme();
  const Icon = isDark ? Sun : Moon;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-brand-blue)] text-[var(--home-primary-action-fg)] transition-colors hover:bg-[var(--color-brand-blue-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2"
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      aria-pressed={isDark}
    >
      <Icon size={18} weight="bold" aria-hidden />
    </button>
  );
}

function ProductMock({ compact = false }: { compact?: boolean }) {
  return (
    <Surface className={`relative ${compact ? 'p-4' : 'p-5'}`}>
      <Sparkle
        size={44}
        weight="fill"
        className="absolute -top-5 right-1 rotate-12 text-[var(--color-brand-green)]"
        aria-hidden
      />
      <div className="flex items-center gap-4 border-b border-[var(--color-border)] pb-4">
        <TrackedMascot variant="idle" size={96} />
        <div>
          <p className="text-lg font-bold text-[var(--color-text-primary)]">Moneda Web App</p>
          <p className="text-sm text-[var(--color-text-secondary)]">Controle financeiro inteligente</p>
        </div>
      </div>

      <div className="grid gap-3 pt-4">
        <div className="rounded-xl bg-[var(--color-surface-alt)] p-4">
            <p className="text-sm text-[var(--color-text-secondary)]">Orçamento do mês</p>
          <div className="mt-2 flex items-end justify-between gap-4">
            <p className="text-2xl font-bold tabular-nums text-[var(--color-text-primary)]">R$ 1.225,67</p>
            <span className="rounded-full bg-[var(--color-warning-bg)] px-3 py-1 text-xs font-bold text-[var(--color-warning)]">
              acima
            </span>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-[0.9fr_1.1fr]">
          <div className="rounded-xl bg-[var(--color-surface-alt)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">Categorias</p>
              <span className="text-sm font-bold tabular-nums text-[var(--color-success)]">38%</span>
            </div>
            <div className="grid grid-cols-10 gap-1" aria-label="Distribuição de gastos por categoria">
              {Array.from({ length: 60 }, (_, index) => (
                <span
                  key={index}
                  className={`aspect-square rounded-[4px] ${
                    index < 22
                      ? 'bg-[var(--color-success)]'
                      : index < 38
                        ? 'bg-[var(--color-brand-blue)]'
                        : index < 51
                          ? 'bg-[var(--color-warning)]'
                          : 'bg-[var(--color-border)]'
                  }`}
                />
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-[var(--color-surface-alt)] p-4">
            <p className="mb-3 text-sm font-semibold text-[var(--color-text-primary)]">Últimos registros</p>
            <div className="grid gap-3">
              {feedItems.slice(0, compact ? 2 : 3).map((item) => (
                <div key={item.title} className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[var(--color-surface)] text-[var(--color-brand-blue-dark)]">
                    <item.icon size={17} weight="bold" aria-hidden />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[var(--color-text-primary)]">{item.title}</p>
                    <p className="truncate text-xs text-[var(--color-text-secondary)]">{item.meta}</p>
                  </div>
                  <p className="shrink-0 text-sm font-bold tabular-nums text-[var(--color-error)]">
                    -{item.amount}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

    </Surface>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[var(--color-bg)]">
      <div className="mx-auto grid min-h-16 w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-self-start">
          <ThemeToggleButton />
        </div>
        <Link
          href="/"
          className="justify-self-center font-heading text-2xl font-bold leading-none text-[var(--color-text-primary)]"
        >
          Moneda
        </Link>
        <nav className="justify-self-end">
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="hidden min-h-10 items-center rounded-full px-4 text-sm font-semibold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-primary)] min-[520px]:inline-flex"
            >
              Entrar
            </Link>
            <Link
              href="/signup"
              aria-label="Criar conta"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-brand-blue)] text-sm font-bold text-[var(--home-primary-action-fg)] transition-colors hover:bg-[var(--color-brand-blue-dark)] sm:w-auto sm:px-4"
            >
              <span className="hidden sm:inline">Criar conta</span>
              <ArrowRight size={17} weight="bold" className="sm:hidden" aria-hidden />
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

function HeroSection() {
  const reduceMotion = useReducedMotion();
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  return (
    <section className="px-4 pb-10 pt-12 sm:px-6 sm:pb-14 sm:pt-16 lg:px-8">
      <div className={`transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
        <div className="mx-auto grid w-full max-w-6xl items-center gap-10 lg:grid-cols-[0.95fr_1.05fr]">
        <motion.div
          variants={staggerGroup}
          initial={reduceMotion ? false : 'hidden'}
          animate="show"
          className="max-w-2xl"
        >
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.25, ease: easeOut }}
            className="text-sm font-semibold text-[var(--color-brand-blue-dark)]"
          >
            Web app disponível agora. WhatsApp em desenvolvimento.
          </motion.p>
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.3, ease: easeOut }}
            className="mt-4 font-heading text-[clamp(2.75rem,6vw,4.5rem)] font-bold leading-[1.05] text-[var(--color-text-primary)]"
          >
            Seu dinheiro claro, sem planilha.
          </motion.h1>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.3, ease: easeOut }}
            className="mt-5 max-w-xl text-base leading-relaxed text-[var(--color-text-secondary)]"
          >
             Registre o mês no web app e pergunte para a Mo o que mudou, onde pesou e onde ajustar.
          </motion.p>
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.3, ease: easeOut }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <CtaButton large />
            <a
              href="#produto"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-alt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-border-focus)] focus-visible:ring-offset-2"
            >
              <Eye size={18} weight="bold" aria-hidden />
              Ver produto
            </a>
          </motion.div>
        </motion.div>

        <ProductMock compact />
        </div>
      </div>
    </section>
  );
}

function FloatingSummary() {
  const [mounted, setMounted] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const sectionIds = ['visualizacao', 'ciclo', 'produto', 'como-funciona', 'privacidade', 'faq'];

    const handleScroll = () => {
      if (window.scrollY < 200) {
        setActiveSection('');
        return;
      }

      let current = '';
      for (const id of sectionIds) {
        const el = document.getElementById(id);
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= window.innerHeight * 0.4) {
            current = id === 'faq' ? 'privacidade' : id;
          }
        }
      }

      setActiveSection(current);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const el = document.getElementById('landing-footer');
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setFooterVisible(entry.isIntersecting),
      { threshold: 0 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hide = !mounted || !activeSection || footerVisible ? 'opacity-0 pointer-events-none' : 'opacity-100';

  return (
    <>
      {/* MENU MOBILE: Limpo, sem fade estranho */}
      <nav
        aria-label="Navegação rápida"
        className={`fixed bottom-3 left-1/2 z-50 -translate-x-1/2 w-auto max-w-[90vw] transition-opacity duration-300 md:hidden ${hide}`}
      >
        <div className="relative rounded-full bg-[var(--color-bg)]/80 backdrop-blur-md px-4 py-1.5 shadow-[var(--shadow-card-soft)] border border-[var(--color-border)]">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth whitespace-nowrap">
            {summaryItems.map((item) => {
              const sectionId = item.href.replace('#', '');
              const isActive = activeSection === sectionId;
              return (
                <a
                  key={item.href}
                  href={item.href}
                  className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition-colors ${
                    isActive
                      ? 'bg-[var(--color-brand-blue)] text-white'
                      : 'text-[var(--color-text-tertiary)] hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-secondary)]'
                  }`}
                  aria-label={item.label}
                >
                  <item.icon size={16} weight={isActive ? 'fill' : 'bold'} aria-hidden />
                </a>
              );
            })}
          </div>
        </div>
      </nav>

      {/* MENU DESKTOP */}
      <nav
        aria-label="Navegação rápida"
        className={`fixed left-6 top-1/2 z-50 hidden -translate-y-1/2 transition-opacity duration-300 md:block ${hide}`}
      >
        <div className="flex flex-col items-start gap-2 rounded-xl bg-[var(--color-bg)]/50 backdrop-blur-md border border-[var(--color-border)] px-3 py-2">
          {summaryItems.map((item) => {
            const sectionId = item.href.replace('#', '');
            const isActive = activeSection === sectionId;
            return (
              <a
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-1.5 text-[10px] font-heading font-semibold uppercase tracking-[0.15em] transition-all duration-200 ${
                  isActive
                    ? 'text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-tertiary)] hover:text-[var(--color-text-secondary)]'
                }`}
              >
                <span
                  className={`inline-block h-px transition-all duration-200 ${
                    isActive ? 'w-2.5 bg-[var(--color-text-primary)]' : 'w-1.5 bg-[var(--color-border)] group-hover:w-2'
                  }`}
                />
                {item.label}
              </a>
            );
          })}
        </div>
      </nav>
    </>
  );
}

function ProductSection() {
  return (
    <Section id="produto">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <SectionTitle eyebrow="Produto" title="Controle o mês no web app.">
          Uma rotina simples para registrar entradas, saídas e comprovantes sem abrir planilha.
        </SectionTitle>

        <Surface className="relative p-4 sm:p-5">
          <img
            src="/2-coins.svg"
            alt=""
            className="pointer-events-none absolute -top-3 -right-3 h-10 w-10 select-none"
          />
          <div className="grid divide-y divide-[var(--color-border)]">
            {featureRows.map((feature) => (
              <div key={feature.title} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                <IconBadge icon={feature.icon} />
                <div>
                  <h3 className="text-base font-bold text-[var(--color-text-primary)]">{feature.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">{feature.text}</p>
                </div>
              </div>
            ))}
          </div>
        </Surface>
      </div>
    </Section>
  );
}

function ExplainSection() {
  return (
    <Section>
      <SectionTitle align="center" eyebrow="Sem planilha" title="Tudo entra. Tudo faz sentido.">
        O Moneda junta registro, leitura e pergunta em uma rotina só.
      </SectionTitle>

      <Surface className="relative mt-12 sm:mt-16 p-4 sm:p-5">
        <MoSkate
          variant="happy"
          size={88}
          className="pointer-events-none absolute -top-[82px] right-2 sm:right-8 select-none"
        />
        <div className="grid gap-0 divide-y divide-[var(--color-border)] md:grid-cols-3 md:divide-x md:divide-y-0">
          {ideas.map((item, index) => (
            <div key={item.title} className="p-4 first:pt-0 last:pb-0 md:py-0 md:first:pl-0 md:last:pr-0">
              <p className="text-sm font-bold tabular-nums text-[var(--color-brand-blue-dark)]">
                {String(index + 1).padStart(2, '0')}
              </p>
              <h3 className="mt-3 text-base font-bold text-[var(--color-text-primary)]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{item.text}</p>
            </div>
          ))}
        </div>
      </Surface>
    </Section>
  );
}

function FlowSection() {
  return (
    <Section id="como-funciona">
      <SectionTitle align="center" eyebrow="Como funciona" title="Começa simples. Termina claro.">
        O caminho real: criar conta, registrar o mês e entender o resultado.
      </SectionTitle>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {flowSteps.map((step, index) => (
          <Surface key={step.title} className="relative p-5">
            {index === 0 && (
              <img
                src="/3-coins.svg"
                alt=""
            className="pointer-events-none absolute -top-3 -right-3 h-10 w-10 select-none"
              />
            )}
            <div className="flex items-start justify-between gap-4">
              <IconBadge icon={step.icon} />
              <span className="text-2xl font-bold tabular-nums text-[var(--color-text-tertiary)]">
                {index + 1}
              </span>
            </div>
            <h3 className="mt-6 text-base font-bold text-[var(--color-text-primary)]">{step.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{step.text}</p>
          </Surface>
        ))}
      </div>
    </Section>
  );
}

function PreviewCarousel() {
  const { isDark } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMounted(true); }, []);

  const screenshots = useMemo(
    () =>
      isDark
        ? [
            { src: '/dash-dark.PNG', alt: 'Dashboard' },
            { src: '/feed-dark.PNG', alt: 'Feed' },
          ]
        : [
            { src: '/dash-light.PNG', alt: 'Dashboard' },
            { src: '/feed-light.PNG', alt: 'Feed' },
          ],
    [isDark],
  );

  const goTo = useCallback((index: number) => {
    const boundedIndex = Math.max(0, Math.min(index, screenshots.length - 1));
    setActiveIndex(boundedIndex);
  }, [screenshots.length]);

  const handleDragStart = () => {
    if (!hasInteracted) setHasInteracted(true);
  };

  const handleDragEnd = (event: any, info: any) => {
    const swipeThreshold = 40;
    const velocityThreshold = 200;

    const offset = info.offset.x;
    const velocity = info.velocity.x;

    if (offset < -swipeThreshold || velocity < -velocityThreshold) {
      if (activeIndex < screenshots.length - 1) {
        goTo(activeIndex + 1);
      } else {
        goTo(activeIndex);
      }
    } else if (offset > swipeThreshold || velocity > velocityThreshold) {
      if (activeIndex > 0) {
        goTo(activeIndex - 1);
      } else {
        goTo(activeIndex);
      }
    } else {
      goTo(activeIndex);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden select-none transition-opacity duration-700 ${mounted ? 'opacity-100' : 'opacity-0'}`}
    >
      {!hasInteracted && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute top-0 left-0 right-0 h-[calc(100%-3rem)] z-20 flex flex-col items-center justify-center bg-[var(--color-bg)]/20 backdrop-blur-[1px] pointer-events-none"
        >
          <div className="flex flex-col items-center gap-2 rounded-xl bg-[var(--color-surface)]/90 px-4 py-3 shadow-[var(--shadow-card-soft)] border border-[var(--color-border)]">
            <motion.div
              animate={{
                x: [-24, 24, -24],
                scale: [1, 0.95, 1],
              }}
              transition={{
                duration: 2.2,
                repeat: Infinity,
                ease: 'easeInOut',
              }}
              className="text-[var(--color-brand-blue)]"
            >
              <HandPointing size={32} weight="fill" />
            </motion.div>
            <span className="text-xs font-semibold tracking-wide text-[var(--color-text-secondary)]">
              Arraste para o lado
            </span>
          </div>
        </motion.div>
      )}

      <motion.div
        className="flex cursor-grab active:cursor-grabbing select-none"
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={1}
        dragTransition={{ bounceStiffness: 400, bounceDamping: 25 }}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        animate={{ x: `-${activeIndex * 100}%` }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      >
        {screenshots.map((img) => (
          <div
            key={img.src}
            className="min-w-0 shrink-0 grow-0 basis-full px-1 select-none"
            draggable="false"
          >
            <Surface className="overflow-hidden p-0 select-none">
              <Image
                src={img.src}
                alt={img.alt}
                width={1200}
                height={800}
                className="pointer-events-none h-auto w-full object-cover select-none"
                priority
                draggable="false"
              />
            </Surface>
          </div>
        ))}
      </motion.div>

      <div className="mt-5 flex items-center justify-center gap-2.5 relative z-10 pointer-events-none">
        {screenshots.map((_, index) => {
          const isActive = index === activeIndex;
          return (
            <motion.button
              key={index}
              type="button"
              onClick={() => { setHasInteracted(true); goTo(index); }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              animate={{
                width: isActive ? 28 : 12,
                height: 12,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className={`rounded-full shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)] ${
                isActive
                  ? 'bg-[var(--color-brand-blue)]'
                  : 'bg-[var(--color-border)] hover:bg-[var(--color-text-tertiary)]'
              }`}
              aria-label={`Ir para slide ${index + 1}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function PreviewSection() {
  return (
    <Section id="visualizacao">
      <div className="grid gap-10 lg:grid-cols-[1fr_1fr] lg:items-center">
        <SectionTitle eyebrow="Visualização" title="O produto em uso.">
          Orçamento, categorias e últimos registros aparecem juntos para virar leitura, não relatório.
        </SectionTitle>

        <div className="mx-auto w-full max-w-[340px]">
          <PreviewCarousel />
        </div>
      </div>
    </Section>
  );
}

function CycleSection() {
  const item = cycleHighlight;

  return (
    <Section id="ciclo">
      <SectionTitle align="center" eyebrow="Ciclo" title="A métrica principal do Moneda.">
        O app organiza o mês financeiro pelo fechamento da fatura, porque é ali que o gasto realmente aparece.
      </SectionTitle>

      <Surface className="relative mx-auto mt-8 max-w-4xl border-[color-mix(in_srgb,var(--color-warning)_38%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface-alt)_34%,var(--color-surface))] p-5 sm:p-6">
        <Fire
          size={44}
          weight="fill"
          className="pointer-events-none absolute -top-7 -right-1 rotate-12 text-[var(--color-warning)] sm:right-3"
          aria-hidden
        />
        <div className="flex items-start justify-between gap-4">
          <IconBadge icon={item.icon} />
          <span className="rounded-full bg-[var(--color-surface-alt)] px-3 py-1 text-xs font-bold text-[var(--color-brand-blue-dark)]">
            {item.tag}
          </span>
        </div>
        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_0.85fr] lg:items-end">
          <div>
            <h3 className="text-xl font-bold leading-snug text-[var(--color-text-primary)] sm:text-2xl">
              {item.title}
            </h3>
            <p className="mt-4 font-heading text-[clamp(1.75rem,4vw,2.75rem)] font-bold leading-tight text-[var(--color-text-primary)]">
              {item.mantra}
            </p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-[var(--color-text-secondary)]">
              {item.text}
            </p>
          </div>

          <div className="rounded-xl bg-[var(--color-surface)] p-4">
            <div className="flex items-center justify-between gap-3 text-sm font-bold text-[var(--color-text-secondary)]">
              <span>{item.cycleStart}</span>
              <span>{item.cycleEnd}</span>
            </div>
            <div className="mt-4 flex items-center gap-3" aria-hidden>
              <span className="h-3 w-3 rounded-full bg-[var(--color-warning)]" />
              <span className="h-px flex-1 bg-[color-mix(in_srgb,var(--color-warning)_45%,var(--color-border))]" />
              <span className="h-3 w-3 rounded-full bg-[var(--color-brand-blue)]" />
            </div>
          </div>
        </div>
      </Surface>
    </Section>
  );
}

function TrustAndFaqSection() {
  const [open, setOpen] = useState(0);

  return (
    <Section id="privacidade">
      <div className="grid gap-4 lg:grid-cols-2 lg:items-stretch">
        <Surface className="flex min-h-[420px] flex-col p-5 sm:p-6">
          <div>
            <p className="mb-1 font-heading text-[clamp(2rem,4vw,3.5rem)] font-bold leading-tight text-[var(--color-brand-green)]">Privacidade</p>
            <h2 className="font-heading text-[clamp(1.125rem,1.8vw,1.5rem)] font-semibold leading-relaxed text-[var(--color-text-secondary)]">
              Dados sob controle.
            </h2>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-[var(--color-text-secondary)]">
              Transparência sem juridiquês. Você controla preferências, privacidade e exclusão de conta.
            </p>
          </div>

          <div className="mt-8 grid gap-3">
            {trustItems.map((item) => (
              <div key={item.text} className="flex gap-3 rounded-xl bg-[var(--color-surface-alt)] p-4">
                <item.icon size={21} weight="bold" className="mt-0.5 shrink-0 text-[var(--color-brand-blue-dark)]" aria-hidden />
                <span className="text-sm leading-relaxed text-[var(--color-text-secondary)]">{item.text}</span>
              </div>
            ))}
          </div>
        </Surface>

        <Surface id="faq" className="relative flex min-h-[420px] flex-col">
          <img
            src="/2-icons-sizes.svg"
            alt=""
            className="pointer-events-none absolute -top-3 -right-3 h-10 w-10 select-none"
          />
          <div className="border-b border-[var(--color-border)] p-5 sm:p-6">
            <p className="mb-1 font-heading text-[clamp(2rem,4vw,3.5rem)] font-bold leading-tight text-[var(--color-brand-green)]">FAQ</p>
            <h2 className="font-heading text-[clamp(1.125rem,1.8vw,1.5rem)] font-semibold leading-relaxed text-[var(--color-text-secondary)]">
              Perguntas frequentes.
            </h2>
          </div>
          <div className="flex-1">
            {faqs.map((faq, index) => (
              <div key={faq.q} className="border-b border-[var(--color-border)] last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpen(open === index ? -1 : index)}
                  className="flex min-h-16 w-full items-center gap-3 px-5 py-4 text-left transition-colors hover:bg-[var(--color-surface-alt)] sm:px-6"
                  aria-expanded={open === index}
                >
                  <span className="flex-1 text-sm font-bold text-[var(--color-text-primary)]">{faq.q}</span>
                  <CaretDown
                    size={17}
                    weight="bold"
                    className={`shrink-0 text-[var(--color-text-tertiary)] transition-transform ${
                      open === index ? 'rotate-180' : ''
                    }`}
                    aria-hidden
                  />
                </button>
                {open === index && (
                  <p className="px-5 pb-5 text-sm leading-relaxed text-[var(--color-text-secondary)] sm:px-6">
                    {faq.a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </Surface>
      </div>
    </Section>
  );
}

function FinalCta() {
  return (
    <section className="px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="font-heading text-[clamp(2rem,4vw,3.5rem)] font-bold leading-tight text-[var(--color-text-primary)]">
          Comece pelo web app.
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-base leading-relaxed text-[var(--color-text-secondary)]">
          Registre o mês, veja onde pesou e pergunte para a Mo sem abrir planilha.
        </p>
        <div className="mt-8">
          <CtaButton large />
        </div>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer id="landing-footer" className="border-t border-[var(--color-brand-blue-dark)] bg-[var(--color-brand-blue)] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 text-sm text-[#10151C] sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3">
          <MoFooter size={80} className="h-20 w-20 shrink-0 rounded-full sm:h-28 sm:w-28" />
          <div className="min-w-0">
            <p className="font-heading text-base font-bold">
              Moneda
              <span className="ml-1.5 text-xs font-normal">
                - feito com carinho e dedicação.
              </span>
            </p>
          </div>
        </div>
        <div className="grid gap-3 sm:text-right">
          <a
            href="https://api.whatsapp.com/send/?phone=5511991333769&text&type=phone_number&app_absent=0"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-left font-semibold underline-offset-2 transition-colors hover:opacity-70 hover:underline sm:justify-end"
          >
            <WhatsappLogo size={16} weight="bold" aria-hidden />
            <span>(+55) 1199133-3769</span>
          </a>
          <div className="flex items-center gap-2 sm:justify-end">
            <Buildings size={16} weight="bold" aria-hidden />
            <span>CNPJ 47.932.528/0001-62</span>
          </div>
          <address className="flex items-start gap-2 not-italic leading-relaxed sm:justify-end">
            <MapPin size={16} weight="bold" className="mt-0.5 shrink-0" aria-hidden />
            <span>
              Av. Francisco Nóbrega Barbosa, 301, Apto 81 A<br />
              Parques Alves de Lima
            </span>
          </address>
        </div>
      </div>
    </footer>
  );
}

export default function HomeLanding({ whatsappUrl }: HomeLandingProps) {
  void whatsappUrl;

  return (
    <main className="min-h-dvh overflow-x-clip bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <Header />
      <HeroSection />
      <FloatingSummary />
      <PreviewSection />
      <CycleSection />
      <ProductSection />
      <ExplainSection />
      <FlowSection />
      <TrustAndFaqSection />
      <FinalCta />
      <LandingFooter />
    </main>
  );
}
