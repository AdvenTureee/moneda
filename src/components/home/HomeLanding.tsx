'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CaretLeft,
  CaretRight,
  WhatsappLogo,
} from '@phosphor-icons/react';
import Mo from '@/components/Mo';
import { BubbleBackground } from '@/components/animate-ui/components/backgrounds/bubble';
import { MotionCarousel } from '@/components/animate-ui/components/community/motion-carousel';

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
  { emoji: 'food', title: 'Almoço no centro', meta: 'Alimentação, PIX, hoje', amount: 'R$ 42,00', color: '#5BBF8E' },
  { emoji: 'car', title: 'Uber para reunião', meta: 'Transporte, crédito, ontem', amount: 'R$ 28,90', color: '#A8C5E0' },
  { emoji: 'cart', title: 'Mercado da semana', meta: 'Mercado, débito, sexta', amount: 'R$ 186,40', color: '#F0A855' },
];

const openMoji = {
  chat: '1F4AC',
  phone: '1F4F2',
  receipt: '1F9FE',
  chart: '1F4CA',
  card: '1F4B3',
  lock: '1F510',
  food: '1F374',
  cart: '1F6D2',
  car: '1F697',
} as const;

type OpenMojiName = keyof typeof openMoji;

const bubbleColors = {
  first: '168,197,224',
  second: '91,191,142',
  third: '122,174,207',
  fourth: '240,168,85',
  fifth: '255,255,255',
  sixth: '63,168,118',
};

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

function OpenMojiIcon({
  name,
  size = 28,
  label,
  className = '',
}: {
  name: OpenMojiName;
  size?: number;
  label?: string;
  className?: string;
}) {
  return (
    <img
      src={`/openmoji/${openMoji[name]}.svg`}
      width={size}
      height={size}
      alt={label ?? ''}
      aria-hidden={label ? undefined : true}
      loading="lazy"
      decoding="async"
      className={`inline-block shrink-0 ${className}`.trim()}
    />
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
    { emoji: 'receipt', title: 'Registrar é leve', text: 'Você manda uma frase. O Moneda organiza valor, data e categoria.' },
    { emoji: 'chart', title: 'Os gráficos explicam', text: 'Waffle, histograma e feed mostram onde o dinheiro concentra.' },
    { emoji: 'chat', title: 'Sem culpa', text: 'A Mo fala como uma assistente: direta, simples e sem julgamento.' },
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
                <OpenMojiIcon name={item.emoji as OpenMojiName} size={24} />
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
    { emoji: 'phone', title: 'Você manda um gasto', text: 'Exemplo: “gastei 42 no almoço”.' },
    { emoji: 'receipt', title: 'O Moneda organiza', text: 'Categoria, data, forma de pagamento e feed ficam prontos.' },
    { emoji: 'chat', title: 'A Mo explica', text: 'Você recebe uma leitura simples do que mudou no mês.' },
  ];

  return (
    <Band id="como-funciona" tone="blue">
      <div className="mx-auto max-w-3xl text-center">
        <TextLabel>Como funciona</TextLabel>
        <h2 className="mt-3 text-2xl font-heading font-bold text-[var(--color-text-primary)] sm:text-3xl">
          Três passos. Nenhuma planilha.
        </h2>
      </div>
      <MotionCarousel
        className="mx-auto mt-8 max-w-5xl"
        slides={steps.map((step, index) => (
          <article
            key={step.title}
            className="flex min-h-[245px] flex-col justify-between rounded-[16px] border border-[color-mix(in_srgb,var(--color-border)_72%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] p-5 shadow-[var(--shadow-card-soft)] backdrop-blur-sm"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="grid h-14 w-14 place-items-center rounded-[14px] bg-[var(--color-surface-alt)]">
                  <OpenMojiIcon name={step.emoji as OpenMojiName} size={34} />
                </span>
                <span className="text-sm font-extrabold tabular-nums text-[var(--color-brand-green-dark)]">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="mt-5 text-xl font-heading font-bold text-[var(--color-text-primary)]">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{step.text}</p>
            </div>
            <div className="mt-6 h-1.5 rounded-full bg-[var(--color-surface-alt)]">
              <div
                className="h-full rounded-full bg-[var(--color-brand-green)]"
                style={{ width: `${((index + 1) / steps.length) * 100}%` }}
              />
            </div>
          </article>
        ))}
        renderControls={({ scrollSnaps, selectedIndex, scrollPrev, scrollNext, scrollTo, canScrollPrev, canScrollNext }) => (
          <div className="mt-5 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={scrollPrev}
              disabled={!canScrollPrev}
              className="grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] transition disabled:opacity-40"
              aria-label="Passo anterior"
            >
              <CaretLeft size={18} weight="bold" />
            </button>
            <div className="flex items-center gap-2">
              {scrollSnaps.map((_, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => scrollTo(index)}
                  className={`h-2.5 rounded-full transition-all ${
                    selectedIndex === index
                      ? 'w-8 bg-[var(--color-brand-green)]'
                      : 'w-2.5 bg-[color-mix(in_srgb,var(--color-text-tertiary)_42%,transparent)]'
                  }`}
                  aria-label={`Ir para o passo ${index + 1}`}
                  aria-current={selectedIndex === index ? 'step' : undefined}
                />
              ))}
            </div>
            <button
              type="button"
              onClick={scrollNext}
              disabled={!canScrollNext}
              className="grid h-11 w-11 place-items-center rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-text-primary)] transition disabled:opacity-40"
              aria-label="Próximo passo"
            >
              <CaretRight size={18} weight="bold" />
            </button>
          </div>
        )}
      />
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
                <OpenMojiIcon name={item.emoji as OpenMojiName} size={25} />
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
          {[
            { emoji: 'phone', label: 'Clique no botão' },
            { emoji: 'chat', label: 'Abra a conversa' },
            { emoji: 'card', label: 'Mande “Quero organizar meu mês”' },
            { emoji: 'receipt', label: 'Registre o primeiro gasto' },
          ].map((step) => (
            <div key={step.label} className="flex items-center gap-3 rounded-[14px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
              <OpenMojiIcon name={step.emoji as OpenMojiName} size={24} />
              <p className="text-sm font-semibold text-[var(--color-text-primary)]">{step.label}</p>
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
  const trustItems = [
    { title: 'Criptografia de dados sensíveis', text: 'A camada de segurança existe porque gasto pessoal é informação íntima.' },
    { title: 'Privacidade por padrão', text: 'O Moneda usa seus dados para organizar gastos e gerar insights, não para complicar sua vida.' },
    { title: 'Controle do usuário', text: 'Você pode revisar configurações de privacidade e apagar seus dados pelo perfil.' },
  ];

  return (
    <Band tone="ink" className="home-band--crypto">
      <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
        <div className="relative overflow-hidden rounded-[18px] border border-[color-mix(in_srgb,var(--color-brand-green)_32%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] p-6 shadow-[var(--shadow-card-soft)] backdrop-blur-sm sm:p-8">
          <div className="absolute right-4 top-4 h-28 w-28 rounded-full bg-[color-mix(in_srgb,var(--color-brand-green)_18%,transparent)] blur-2xl" />
          <div className="relative">
            <div className="mb-7 grid h-24 w-24 place-items-center rounded-[18px] bg-[color-mix(in_srgb,var(--color-brand-green)_14%,var(--color-surface))] shadow-[0_18px_34px_color-mix(in_srgb,var(--color-brand-green)_18%,transparent)]">
              <OpenMojiIcon name="lock" size={62} label="Cadeado com chave" />
            </div>
            <TextLabel>Criptografia</TextLabel>
            <h2 className="mt-3 max-w-2xl text-4xl font-heading font-extrabold leading-[1.04] text-[var(--color-text-primary)] sm:text-5xl">
              Seu dinheiro merece uma conversa protegida.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-[var(--color-text-secondary)] sm:text-lg">
              O Moneda trata dados sensíveis com cuidado desde a primeira mensagem. Clareza financeira não precisa custar privacidade.
            </p>
          </div>
        </div>

        <div className="grid gap-4">
          {trustItems.map((item) => (
            <div
              key={item.title}
              className="rounded-[16px] border border-[color-mix(in_srgb,var(--color-border)_72%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_86%,transparent)] p-5 backdrop-blur-sm"
            >
              <h3 className="font-heading text-base font-bold text-[var(--color-text-primary)]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">{item.text}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[0.72fr_1.28fr] lg:items-start">
        <div>
          <TextLabel>Perguntas frequentes</TextLabel>
          <h2 className="mt-3 max-w-sm text-2xl font-heading font-bold text-[var(--color-text-primary)] sm:text-3xl">
            O básico, sem enrolar.
          </h2>
        </div>
        <div className="divide-y divide-[var(--color-border)] rounded-[16px] border border-[color-mix(in_srgb,var(--color-border)_72%,transparent)] bg-[color-mix(in_srgb,var(--color-surface)_88%,transparent)] backdrop-blur-sm">
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
        <p className="mt-6 text-xs text-[var(--color-text-tertiary)]">
          Emojis por{' '}
          <a
            href="https://openmoji.org/"
            target="_blank"
            rel="noreferrer"
            className="font-semibold text-[var(--color-text-secondary)] underline-offset-2 hover:underline"
          >
            OpenMoji
          </a>
          , CC BY-SA 4.0.
        </p>
      </div>
    </Band>
  );
}

export default function HomeLanding({ whatsappUrl }: HomeLandingProps) {
  return (
    <main className="relative min-h-dvh overflow-x-clip bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <BubbleBackground
        colors={bubbleColors}
        className="fixed inset-0 z-0 opacity-40"
      />
      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
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
        <BubbleBackground
          interactive
          colors={bubbleColors}
          className="absolute inset-0 z-0 opacity-55"
        />
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
                ['phone', 'WhatsApp primeiro'],
                ['chart', 'Insights claros'],
                ['chat', 'Sem julgamento'],
              ].map(([emoji, label]) => {
                return (
                  <div key={label as string} className="inline-flex items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
                    <OpenMojiIcon name={emoji as OpenMojiName} size={20} />
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
