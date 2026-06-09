'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  Bank,
  ChartBar,
  ChatCircleText,
  CheckCircle,
  FileText,
  LockKey,
  NotePencil,
  ShieldCheck,
  Sparkle,
  TrendUp,
  WarningCircle,
  WhatsappLogo,
} from '@phosphor-icons/react';
import Mo from '@/components/Mo';
import Icon from '@/components/Icon';

interface HomeLandingProps {
  whatsappUrl: string;
}

type BandTone = 'plain' | 'blue' | 'green' | 'warm' | 'ink';

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

const categories = [
  { color: '#5BBF8E', cells: 22 },
  { color: '#A8C5E0', cells: 16 },
  { color: '#F0A855', cells: 13 },
  { color: '#9CA3AF', cells: 9 },
];

const feedItems = [
  { icon: 'Hamburger', title: 'Almoço no centro', meta: 'Alimentação, PIX, hoje', amount: 'R$ 42,00', color: '#5BBF8E' },
  { icon: 'Car', title: 'Uber para reunião', meta: 'Transporte, crédito, ontem', amount: 'R$ 28,90', color: '#A8C5E0' },
  { icon: 'ShoppingBag', title: 'Mercado da semana', meta: 'Mercado, débito, sexta', amount: 'R$ 186,40', color: '#F0A855' },
];

const faqs = [
  {
    q: 'Preciso instalar outro app?',
    a: 'Não. Você começa pelo WhatsApp e usa o app web quando quiser ver gráficos, feed e configurações.',
  },
  {
    q: 'A Mo julga meus gastos?',
    a: 'Não. A Mo mostra padrões e explica o mês com clareza, sem bronca e sem culpa.',
  },
  {
    q: 'O chat da home chama a API?',
    a: 'Não. Aqui ele é só uma demonstração visual. A conversa real fica dentro do produto.',
  },
  {
    q: 'Posso apagar meus dados?',
    a: 'Sim. O perfil do app inclui opções de privacidade e exclusão de conta.',
  },
];

function Band({
  id,
  tone = 'plain',
  children,
  className = '',
}: {
  id?: string;
  tone?: BandTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <motion.section
      id={id}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-80px' }}
      transition={{ duration: 0.34, ease: [0.22, 1, 0.36, 1] }}
      className={`home-band home-band--${tone} relative overflow-hidden ${className}`}
    >
      <div className="relative z-[1] mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        {children}
      </div>
    </motion.section>
  );
}

function CtaButton({ whatsappUrl, large = false }: { whatsappUrl: string; large?: boolean }) {
  const external = /^https?:\/\//.test(whatsappUrl);
  return (
    <a
      href={whatsappUrl}
      target={external ? '_blank' : undefined}
      rel={external ? 'noreferrer' : undefined}
      className={`inline-flex items-center justify-center gap-2 rounded-full bg-[var(--color-brand-blue)] font-bold text-[#102033] transition-[background-color,transform] duration-150 hover:bg-[var(--color-brand-blue-dark)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)] focus-visible:ring-offset-2 ${
        large ? 'min-h-14 px-6 text-base' : 'min-h-12 px-5 text-sm'
      }`}
    >
      <WhatsappLogo size={20} weight="bold" />
      Começar pelo WhatsApp
    </a>
  );
}

function TextLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-bold text-[var(--color-brand-green-dark)]">
      {children}
    </p>
  );
}

function MiniWaffle() {
  const cells = [
    ...Array.from({ length: 22 }, (_, i) => ({ color: categories[0].color, id: `a-${i}` })),
    ...Array.from({ length: 16 }, (_, i) => ({ color: categories[1].color, id: `b-${i}` })),
    ...Array.from({ length: 13 }, (_, i) => ({ color: categories[2].color, id: `c-${i}` })),
    ...Array.from({ length: 9 }, (_, i) => ({ color: categories[3].color, id: `d-${i}` })),
    ...Array.from({ length: 40 }, (_, i) => ({ color: 'var(--color-surface-alt)', id: `e-${i}` })),
  ];

  return (
    <div className="grid grid-cols-10 gap-1" aria-label="Distribuição de gastos por categoria">
      {cells.map((cell, index) => (
        <motion.span
          key={cell.id}
          initial={{ scale: 0.72, opacity: 0.55 }}
          whileInView={{ scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: Math.min(index * 0.004, 0.24), duration: 0.16 }}
          className="aspect-square rounded-[4px]"
          style={{ background: cell.color }}
        />
      ))}
    </div>
  );
}

function MiniHistogram() {
  const bars = [34, 58, 25, 44, 72, 88, 51];
  return (
    <div className="flex h-24 items-end gap-2" aria-label="Histograma semanal de gastos">
      {bars.map((height, index) => (
        <motion.span
          key={`${height}-${index}`}
          initial={{ height: 8 }}
          whileInView={{ height }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.035, duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
          className="w-full rounded-t-md bg-[var(--color-brand-blue)]"
        />
      ))}
    </div>
  );
}

function PhoneMock({ compact = false }: { compact?: boolean }) {
  return (
    <div className="mx-auto w-full max-w-[380px] rounded-[22px] border border-[color-mix(in_srgb,var(--color-border)_76%,transparent)] bg-[var(--color-surface)] p-3">
      <div className="rounded-[16px] bg-[var(--color-surface-alt)] p-3">
        <div className="mb-3 flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div>
            <p className="text-sm font-extrabold text-[var(--color-text-primary)]">Mo</p>
            <p className="text-xs text-[var(--color-success)]">sua CFO pessoal</p>
          </div>
          <span className="rounded-full bg-[var(--color-surface)] px-3 py-1 text-xs font-bold text-[var(--color-text-secondary)]">
            WhatsApp
          </span>
        </div>
        <div className="space-y-3">
          <div className="ml-auto max-w-[78%] rounded-[14px] rounded-br-[5px] bg-[var(--color-brand-green)] px-3 py-2 text-sm font-semibold text-white">
            gastei 42 no almoço
          </div>
          <div className="max-w-[86%] rounded-[14px] rounded-bl-[5px] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-primary)]">
            Pronto. Registrei R$ 42,00 em alimentação.
          </div>
          {!compact && (
            <div className="max-w-[86%] rounded-[14px] rounded-bl-[5px] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text-secondary)]">
              Isso te deixa em 38% do limite da semana.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function HeroVisual() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
      className="grid gap-4"
    >
      <PhoneMock />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="mb-3 text-sm font-bold text-[var(--color-text-primary)]">Categorias</p>
          <MiniWaffle />
        </div>
        <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
          <p className="mb-3 text-sm font-bold text-[var(--color-text-primary)]">Sextas pesam mais</p>
          <MiniHistogram />
        </div>
      </div>
    </motion.div>
  );
}

function ProblemAndSolution() {
  const items = [
    { icon: NotePencil, title: 'Registrar é leve', text: 'Você manda uma frase. O Moneda organiza valor, data e categoria.' },
    { icon: ChartBar, title: 'Os gráficos explicam', text: 'Waffle, histograma e feed mostram onde o dinheiro concentra.' },
    { icon: WarningCircle, title: 'Sem culpa', text: 'A Mo fala como uma assistente: direta, simples e sem julgamento.' },
  ];

  return (
    <Band tone="plain">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
        <div>
          <TextLabel>O problema</TextLabel>
          <h2 className="mt-3 max-w-xl text-2xl font-heading font-bold text-[var(--color-text-primary)] sm:text-3xl">
            Apps de finanças costumam pedir mais energia do que a rotina permite.
          </h2>
        </div>
        <div className="grid gap-3">
          {items.map((item) => (
            <div key={item.title} className="flex gap-4 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-surface-alt)] text-[var(--color-brand-blue-dark)]">
                <item.icon size={21} weight="bold" />
              </span>
              <div>
                <h3 className="font-heading text-base font-bold text-[var(--color-text-primary)]">{item.title}</h3>
                <p className="mt-1 text-sm leading-relaxed text-[var(--color-text-secondary)]">{item.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Band>
  );
}

function HowItWorksSection() {
  const steps = [
    ['Você manda um gasto', 'Exemplo: “gastei 42 no almoço”.'],
    ['O Moneda organiza', 'Categoria, data, forma de pagamento e feed ficam prontos.'],
    ['A Mo explica', 'Você recebe uma leitura simples do que mudou no mês.'],
  ];

  return (
    <Band id="como-funciona" tone="blue">
      <div className="mx-auto max-w-3xl text-center">
        <TextLabel>Como funciona</TextLabel>
        <h2 className="mt-3 text-2xl font-heading font-bold text-[var(--color-text-primary)] sm:text-3xl">
          Três passos. Nenhuma planilha.
        </h2>
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {steps.map(([title, text], index) => (
          <div key={title} className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <span className="text-sm font-extrabold tabular-nums text-[var(--color-brand-green-dark)]">
              {String(index + 1).padStart(2, '0')}
            </span>
            <h3 className="mt-4 text-lg font-heading font-bold text-[var(--color-text-primary)]">{title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{text}</p>
          </div>
        ))}
      </div>
    </Band>
  );
}

function AnalyticsSection() {
  return (
    <Band tone="green">
      <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:items-center">
        <div>
          <TextLabel>Clareza visual</TextLabel>
          <h2 className="mt-3 text-2xl font-heading font-bold text-[var(--color-text-primary)] sm:text-3xl">
            Veja o mês sem decifrar extrato.
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-[var(--color-text-secondary)]">
            O Moneda junta conversa, gráficos e linha do tempo para você entender o que aconteceu em poucos segundos.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h3 className="font-heading text-base font-bold text-[var(--color-text-primary)]">Onde concentra</h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Alimentação e entrega já são 38% do mês.</p>
            <div className="mx-auto mt-5 max-w-[230px]"><MiniWaffle /></div>
          </div>
          <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
            <h3 className="font-heading text-base font-bold text-[var(--color-text-primary)]">Quando pesa</h3>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Os maiores saltos aparecem às sextas.</p>
            <div className="mt-8"><MiniHistogram /></div>
          </div>
        </div>
      </div>
    </Band>
  );
}

function FeedSection() {
  return (
    <Band tone="warm">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <TextLabel>Feed de gastos</TextLabel>
          <h2 className="mt-3 text-2xl font-heading font-bold text-[var(--color-text-primary)] sm:text-3xl">
            Uma linha do tempo limpa para revisar o mês.
          </h2>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-[var(--color-text-secondary)]">
            Categoria à esquerda, valor à direita, contexto no meio. O suficiente para conferir sem se perder.
          </p>
        </div>
        <div className="rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)] p-3">
          {feedItems.map((item) => (
            <div key={item.title} className="flex items-center gap-3 rounded-[12px] p-3 transition-colors hover:bg-[var(--color-surface-alt)]">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: `${item.color}20`, color: item.color }}>
                <Icon name={item.icon} size={20} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">{item.title}</p>
                <p className="truncate text-xs text-[var(--color-text-secondary)]">{item.meta}</p>
              </div>
              <p className="shrink-0 text-sm font-extrabold tabular-nums text-[var(--color-error)]">-{item.amount}</p>
            </div>
          ))}
        </div>
      </div>
    </Band>
  );
}

function ChatDemoSection() {
  return (
    <Band tone="ink">
      <div className="mx-auto max-w-2xl text-center">
        <TextLabel>Demo do chat</TextLabel>
        <h2 className="mt-3 text-2xl font-heading font-bold text-[var(--color-text-primary)] sm:text-3xl">
          A Mo aparece quando a conversa precisa de rosto.
        </h2>
        <p className="mt-2 text-sm text-[var(--color-text-secondary)]">
          Nesta home, deixamos a mascote concentrada no chat para a página respirar melhor.
        </p>
      </div>
      <div className="mx-auto mt-8 max-w-2xl rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <div className="mb-4 flex items-center gap-3 border-b border-[var(--color-border)] pb-4">
          <Mo portrait size={42} variant="happy" />
          <div>
            <p className="font-heading font-bold text-[var(--color-text-primary)]">Mo, sua CFO pessoal</p>
            <p className="text-xs text-[var(--color-text-secondary)]">demonstração visual</p>
          </div>
        </div>
        <div className="space-y-3">
          <div className="ml-auto max-w-[78%] rounded-[14px] rounded-br-[5px] bg-[var(--color-brand-blue)] px-4 py-3 text-sm font-semibold text-[#102033]">
            Por que meu dinheiro acabou tão rápido?
          </div>
          <div className="max-w-[86%] rounded-[14px] rounded-bl-[5px] bg-[var(--color-surface-alt)] px-4 py-3 text-sm leading-relaxed text-[var(--color-text-primary)]">
            Seu maior salto veio em delivery e transporte no fim de semana. Parece um padrão de sexta, não um problema do mês inteiro.
          </div>
        </div>
      </div>
    </Band>
  );
}

function StartSection({ whatsappUrl }: { whatsappUrl: string }) {
  return (
    <Band tone="plain">
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <div>
          <TextLabel>Comece em 60 segundos</TextLabel>
          <h2 className="mt-3 text-2xl font-heading font-bold text-[var(--color-text-primary)] sm:text-3xl">
            Abra o WhatsApp, mande uma frase e veja o primeiro registro.
          </h2>
        </div>
        <div className="grid gap-3">
          {['Clique no botão', 'Abra a conversa', 'Mande “Quero organizar meu mês”', 'Registre o primeiro gasto'].map((step) => (
            <div key={step} className="flex items-center gap-3 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <CheckCircle size={22} weight="fill" className="shrink-0 text-[var(--color-brand-green)]" />
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{step}</p>
            </div>
          ))}
          <div className="pt-2"><CtaButton whatsappUrl={whatsappUrl} /></div>
        </div>
      </div>
    </Band>
  );
}

function TrustAndFaq() {
  const [open, setOpen] = useState(0);
  return (
    <Band tone="blue">
      <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <TextLabel>Confiança</TextLabel>
          <h2 className="mt-3 text-2xl font-heading font-bold text-[var(--color-text-primary)] sm:text-3xl">
            Dinheiro pede cuidado, não suspense.
          </h2>
          <div className="mt-6 space-y-4">
            {[
              ['Criptografia', 'Dados sensíveis tratados com camada de segurança.'],
              ['Uso interno', 'Informações usadas para organizar gastos e gerar insights.'],
              ['Exclusão de conta', 'Você pode apagar seus dados pelo perfil.'],
            ].map(([title, text]) => (
              <div key={title} className="flex gap-3">
                <ShieldCheck size={22} weight="fill" className="mt-0.5 shrink-0 text-[var(--color-brand-green)]" />
                <p className="text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  <span className="font-bold text-[var(--color-text-primary)]">{title}:</span> {text}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="divide-y divide-[var(--color-border)] rounded-[16px] border border-[var(--color-border)] bg-[var(--color-surface)]">
          {faqs.map((faq, index) => (
            <div key={faq.q}>
              <button
                type="button"
                onClick={() => setOpen(open === index ? -1 : index)}
                className="flex min-h-14 w-full items-center gap-3 px-4 py-4 text-left"
                aria-expanded={open === index}
              >
                <span className="flex-1 font-bold text-[var(--color-text-primary)]">{faq.q}</span>
                <ArrowRight size={17} className={`shrink-0 text-[var(--color-text-tertiary)] transition-transform ${open === index ? 'rotate-90' : ''}`} />
              </button>
              {open === index && (
                <p className="px-4 pb-4 text-sm leading-relaxed text-[var(--color-text-secondary)]">{faq.a}</p>
              )}
            </div>
          ))}
        </div>
      </div>
    </Band>
  );
}

function FinalCta({ whatsappUrl }: { whatsappUrl: string }) {
  return (
    <Band tone="green">
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-2xl font-heading font-bold text-[var(--color-text-primary)] sm:text-3xl">
          Pronto para entender para onde seu dinheiro está indo?
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-base text-[var(--color-text-secondary)]">
          Comece pelo canal que você já usa todos os dias.
        </p>
        <div className="mt-7"><CtaButton whatsappUrl={whatsappUrl} large /></div>
      </div>
    </Band>
  );
}

export default function HomeLanding({ whatsappUrl }: HomeLandingProps) {
  return (
    <main className="min-h-dvh bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-heading text-xl font-extrabold text-[var(--color-text-primary)]">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[var(--color-brand-green)] text-sm font-black text-white">M</span>
          Moneda
        </Link>
        <nav className="flex items-center gap-2">
          <Link href="/login" className="rounded-full px-4 py-2 text-sm font-bold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-primary)]">
            Entrar
          </Link>
          <Link href="/signup" className="rounded-full bg-[var(--color-brand-green)] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[var(--color-brand-green-dark)]">
            Criar conta
          </Link>
        </nav>
      </header>

      <section className="home-band home-band--hero relative overflow-hidden">
        <div className="relative z-[1] mx-auto grid min-h-[calc(100dvh-76px)] w-full max-w-6xl items-center gap-10 px-4 pb-14 pt-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
          <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.36 }}>
            <TextLabel>Controle financeiro no WhatsApp</TextLabel>
            <h1 className="mt-5 max-w-2xl text-4xl font-heading font-extrabold leading-[1.04] text-[var(--color-text-primary)] sm:text-5xl lg:text-6xl">
              Seu dinheiro, finalmente claro.
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--color-text-secondary)]">
              Registre gastos por mensagem e veja o mês explicado com calma. Sem planilha, sem julgamento.
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:items-center">
              <CtaButton whatsappUrl={whatsappUrl} large />
              <a href="#como-funciona" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-alt)]">
                Ver como funciona
                <ArrowRight size={18} weight="bold" />
              </a>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              {[
                [ChatCircleText, 'WhatsApp primeiro'],
                [TrendUp, 'Insights claros'],
                [Bank, 'Sem julgamento'],
              ].map(([ItemIcon, label]) => {
                const TypedIcon = ItemIcon as typeof ChatCircleText;
                return (
                  <div key={label as string} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                    <TypedIcon size={18} weight="bold" className="text-[var(--color-brand-green)]" />
                    <span className="font-bold text-[var(--color-text-primary)]">{label as string}</span>
                  </div>
                );
              })}
            </div>
          </motion.div>
          <HeroVisual />
        </div>
      </section>

      <ProblemAndSolution />
      <HowItWorksSection />
      <AnalyticsSection />
      <FeedSection />
      <ChatDemoSection />
      <StartSection whatsappUrl={whatsappUrl} />
      <TrustAndFaq />
      <FinalCta whatsappUrl={whatsappUrl} />
    </main>
  );
}
