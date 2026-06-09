'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, type ComponentType, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowRight,
  CaretDown,
  ChartBar,
  ChartPieSlice,
  CreditCard,
  ListBullets,
  LockKey,
  Moon,
  Receipt,
  ShieldCheck,
  Sun,
  Trash,
  UploadSimple,
  Wallet,
  WhatsappLogo,
} from '@phosphor-icons/react';
import { BubbleBackground } from '@/components/animate-ui/components/backgrounds/bubble';
import { useTheme } from '@/components/ThemeProvider';
import moicoPng from '../../../moico-png.png';

interface HomeLandingProps {
  whatsappUrl: string;
}

type IconComponent = ComponentType<{
  size?: number;
  weight?: 'thin' | 'light' | 'regular' | 'bold' | 'fill' | 'duotone';
  className?: string;
  'aria-hidden'?: boolean;
}>;

const easeOut = [0.22, 1, 0.36, 1] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0 },
};

const staggerGroup = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.08 },
  },
};

const backgroundColors = {
  first: '168,197,224',
  second: '91,191,142',
  third: '255,255,255',
  fourth: '240,168,85',
  fifth: '248,249,251',
  sixth: '122,174,207',
};

const categories = [
  { color: '#5BBF8E', amount: 22 },
  { color: '#A8C5E0', amount: 16 },
  { color: '#F0A855', amount: 13 },
  { color: '#9CA3AF', amount: 9 },
];

const feedItems = [
  {
    icon: Receipt,
    title: 'Almoço no centro',
    meta: 'Alimentação, PIX, hoje',
    amount: 'R$ 42,00',
    color: '#5BBF8E',
  },
  {
    icon: CreditCard,
    title: 'Uber para reunião',
    meta: 'Transporte, crédito, ontem',
    amount: 'R$ 28,90',
    color: '#A8C5E0',
  },
  {
    icon: ListBullets,
    title: 'Mercado da semana',
    meta: 'Mercado, débito, sexta',
    amount: 'R$ 186,40',
    color: '#F0A855',
  },
];

const flowSteps = [
  {
    icon: WhatsappLogo,
    title: 'Você manda uma frase',
    text: '“gastei 42 no almoço” já basta para começar.',
  },
  {
    icon: Receipt,
    title: 'O Moneda registra',
    text: 'Valor, categoria, data e contexto entram no feed.',
  },
  {
    icon: ChartBar,
    title: 'A Mo explica o mês',
    text: 'Você entende padrões sem abrir uma planilha.',
  },
];

const trustItems = [
  { icon: ShieldCheck, text: 'Privacidade tratada como parte do produto, não como rodapé.' },
  { icon: LockKey, text: 'Dados sensíveis protegidos desde o primeiro registro.' },
  { icon: Trash, text: 'Você pode revisar preferências e apagar seus dados pelo perfil.' },
];

const availableFeatures = [
  {
    icon: Receipt,
    title: 'Adicionar gastos',
    text: 'Registre despesas com valor, categoria e data.',
    tone: 'blue' as const,
  },
  {
    icon: Wallet,
    title: 'Adicionar ganhos',
    text: 'Acompanhe entradas para entender o mês inteiro.',
    tone: 'green' as const,
  },
  {
    icon: UploadSimple,
    title: 'Upload de comprovantes',
    text: 'Guarde recibos e imagens junto do lançamento.',
    tone: 'warm' as const,
  },
  {
    icon: ChartPieSlice,
    title: 'Visual fácil de gastos',
    text: 'Veja onde o dinheiro concentra sem abrir planilha.',
    tone: 'blue' as const,
  },
  {
    icon: ListBullets,
    title: 'Feed e categorias organizadas',
    text: 'Revise tudo em uma linha do tempo clara.',
    tone: 'ink' as const,
  },
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
    q: 'O que a demonstração da home mostra?',
    a: 'Ela mostra o tipo de conversa e leitura que o Moneda entrega dentro do produto.',
  },
  {
    q: 'Posso apagar meus dados?',
    a: 'Sim. O perfil do app inclui opções de privacidade e exclusão de conta.',
  },
];

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
    <motion.section
      id={id}
      variants={fadeUp}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-120px' }}
      transition={{ duration: 0.4, ease: easeOut }}
      className={`home-band relative ${className}`}
    >
      <div className="relative z-[1] mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-24 lg:px-8">
        {children}
      </div>
    </motion.section>
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
    <div className={align === 'center' ? 'mx-auto max-w-4xl text-center' : 'max-w-3xl'}>
      {eyebrow && (
        <p className="mb-4 inline-flex rounded-full bg-[var(--color-surface)] px-3 py-1.5 text-sm font-extrabold text-[var(--color-brand-blue-dark)]">
          {eyebrow}
        </p>
      )}
      <h2 className="text-balance font-heading text-[clamp(2.5rem,5vw,4.75rem)] font-extrabold leading-[0.98] text-[var(--color-text-primary)]">
        {title}
      </h2>
      {children && (
        <p className={`mt-5 text-lg leading-relaxed text-[var(--color-text-secondary)] ${align === 'center' ? 'mx-auto max-w-2xl' : 'max-w-2xl'}`}>
          {children}
        </p>
      )}
    </div>
  );
}

function IconBadge({
  icon: Icon,
  tone = 'blue',
  size = 'md',
}: {
  icon: IconComponent;
  tone?: 'blue' | 'green' | 'warm' | 'ink';
  size?: 'sm' | 'md' | 'lg';
}) {
  const toneClass = {
    blue: 'bg-[color-mix(in_srgb,var(--color-brand-blue)_22%,var(--color-surface))] text-[var(--color-brand-blue-dark)]',
    green: 'bg-[color-mix(in_srgb,var(--color-brand-green)_16%,var(--color-surface))] text-[var(--color-brand-green-dark)]',
    warm: 'bg-[color-mix(in_srgb,var(--color-warning)_17%,var(--color-surface))] text-[#A6651B]',
    ink: 'bg-[color-mix(in_srgb,var(--color-text-primary)_7%,var(--color-surface))] text-[var(--color-text-primary)]',
  }[tone];
  const sizeClass = {
    sm: 'h-10 w-10 rounded-[10px]',
    md: 'h-12 w-12 rounded-[12px]',
    lg: 'h-14 w-14 rounded-[14px]',
  }[size];

  return (
    <span className={`grid shrink-0 place-items-center ${sizeClass} ${toneClass}`}>
      <Icon size={size === 'lg' ? 28 : 23} weight="bold" aria-hidden />
    </span>
  );
}

function CtaButton({ large = false }: { large?: boolean }) {
  return (
    <motion.a
      href="/signup"
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.16, ease: easeOut }}
      className={`inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full bg-[var(--color-brand-green)] font-extrabold text-white transition-colors duration-200 hover:bg-[var(--color-brand-green-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-green)] focus-visible:ring-offset-2 ${
        large ? 'min-h-14 min-w-[232px] px-7 text-base' : 'min-h-12 px-5 text-sm'
      }`}
    >
      Começar agora
      <ArrowRight size={19} weight="bold" aria-hidden />
    </motion.a>
  );
}

function MiniWaffle({ compact = false }: { compact?: boolean }) {
  const reduceMotion = useReducedMotion();
  const cells = [
    ...categories.flatMap((category, categoryIndex) =>
      Array.from({ length: category.amount }, (_, index) => ({
        color: category.color,
        id: `${categoryIndex}-${index}`,
      }))
    ),
    ...Array.from({ length: 40 }, (_, index) => ({
      color: 'var(--color-surface-alt)',
      id: `empty-${index}`,
    })),
  ];

  return (
    <div
      className={`grid grid-cols-10 ${compact ? 'gap-0.5' : 'gap-1'}`}
      aria-label="Distribuição de gastos por categoria"
    >
      {cells.map((cell, index) => (
        <motion.span
          key={cell.id}
          initial={reduceMotion ? false : { scale: 0.82, opacity: 0.58 }}
          whileInView={reduceMotion ? undefined : { scale: 1, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: Math.min(index * 0.003, 0.18), duration: 0.18, ease: easeOut }}
          className={compact ? 'aspect-square rounded-[3px]' : 'aspect-square rounded-[4px]'}
          style={{ background: cell.color }}
        />
      ))}
    </div>
  );
}

function MiniHistogram() {
  const reduceMotion = useReducedMotion();
  const bars = [34, 58, 25, 44, 72, 88, 51];

  return (
    <div className="flex h-24 items-end gap-2" aria-label="Histograma semanal de gastos">
      {bars.map((height, index) => (
        <motion.span
          key={`${height}-${index}`}
          initial={reduceMotion ? false : { height: 10, opacity: 0.72 }}
          whileInView={reduceMotion ? undefined : { height, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: index * 0.035, duration: 0.28, ease: easeOut }}
          className="w-full rounded-t-md bg-[var(--color-brand-blue)]"
        />
      ))}
    </div>
  );
}

function ChatStage() {
  return (
    <div className="relative mx-auto grid w-full max-w-[620px] gap-5 lg:min-h-[520px] lg:place-items-center">
      <motion.div
        initial={{ opacity: 0, y: 26, rotate: -2 }}
        animate={{ opacity: 1, y: 0, rotate: -2 }}
        transition={{ duration: 0.48, ease: easeOut, delay: 0.08 }}
        className="relative z-[2] mx-auto w-[min(68vw,280px)] sm:w-[min(44vw,320px)] lg:absolute lg:left-0 lg:top-10 lg:w-[360px] lg:max-w-[42%]"
      >
        <Image
          src={moicoPng}
          alt="Mo, mascote do Moneda"
          priority
          loading="eager"
          sizes="(max-width: 640px) 68vw, (max-width: 1024px) 320px, 360px"
          className="h-auto w-full drop-shadow-[0_18px_22px_rgba(26,29,35,0.16)]"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: easeOut, delay: 0.14 }}
        className="relative z-[1] w-full rounded-[16px] bg-[var(--color-surface)] p-4 shadow-[var(--shadow-md)] sm:mx-auto sm:max-w-[520px] lg:ml-auto lg:mr-0 lg:mt-24 lg:w-[78%]"
      >
        <div className="mb-4 flex items-center justify-between border-b border-[var(--color-border)] pb-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-[var(--color-brand-blue)] text-sm font-black text-[#102033]">
              Mo
            </span>
            <div>
              <p className="text-sm font-extrabold text-[var(--color-text-primary)]">Mo no WhatsApp</p>
              <p className="text-xs text-[var(--color-text-secondary)]">registro em segundos</p>
            </div>
          </div>
          <WhatsappLogo size={22} weight="bold" className="text-[var(--color-brand-green-dark)]" aria-hidden />
        </div>
        <div className="space-y-3">
          <div className="ml-auto max-w-[72%] rounded-[14px] rounded-br-[5px] bg-[var(--color-brand-green)] px-4 py-3 text-sm font-semibold text-white">
            gastei 42 no almoço
          </div>
          <div className="max-w-[82%] rounded-[14px] rounded-bl-[5px] bg-[var(--color-surface-alt)] px-4 py-3 text-sm leading-relaxed text-[var(--color-text-primary)]">
            Registrei R$ 42,00 em alimentação. Hoje você está dentro do previsto.
          </div>
          <div className="max-w-[88%] rounded-[14px] rounded-bl-[5px] bg-[var(--color-surface-alt)] px-4 py-3 text-sm leading-relaxed text-[var(--color-text-secondary)]">
            O padrão da semana ainda pesa mais na sexta. Quer ver no app?
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function FeaturePills() {
  const items = [
    { icon: WhatsappLogo, label: 'WhatsApp primeiro' },
    { icon: ChartPieSlice, label: 'Insights claros' },
    { icon: ShieldCheck, label: 'Privacidade' },
  ];

  return (
    <motion.div
      variants={fadeUp}
      transition={{ duration: 0.42, ease: easeOut }}
      className="mt-9 grid gap-2.5 text-sm sm:grid-cols-3 sm:gap-3"
    >
      {items.map((item) => (
        <div
          key={item.label}
          className="flex min-h-12 items-center gap-2 rounded-[14px] bg-[var(--color-surface)] px-3 py-2 shadow-[0_10px_24px_rgba(26,29,35,0.04)]"
        >
          <item.icon size={18} weight="bold" className="shrink-0" aria-hidden />
          <span className="font-bold leading-tight text-[var(--color-text-primary)]">{item.label}</span>
        </div>
      ))}
    </motion.div>
  );
}

function ThemeToggleButton() {
  const { isDark, toggleTheme } = useTheme();
  const Icon = isDark ? Sun : Moon;

  return (
    <motion.button
      type="button"
      onClick={toggleTheme}
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.16, ease: easeOut }}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--color-surface)] text-[var(--color-text-primary)] shadow-[0_10px_24px_rgba(26,29,35,0.04)] transition-colors hover:bg-[var(--color-surface-alt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)] focus-visible:ring-offset-2"
      aria-label={isDark ? 'Ativar tema claro' : 'Ativar tema escuro'}
      aria-pressed={isDark}
    >
      <Icon size={19} weight="bold" aria-hidden />
    </motion.button>
  );
}

function HeroSection() {
  return (
    <section className="home-band home-band--hero relative">
      <div className="relative z-[1] mx-auto grid min-h-[calc(100dvh-76px)] w-full max-w-6xl items-center gap-10 px-4 pb-16 pt-8 sm:px-6 lg:grid-cols-[0.86fr_1.14fr] lg:px-8">
        <motion.div
          variants={staggerGroup}
          initial="hidden"
          animate="show"
          className="max-w-2xl"
        >
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.34, ease: easeOut }}
            className="text-lg font-extrabold text-[var(--color-brand-blue-dark)]"
          >
            *Moneda WhatsApp em desenvolvimento
          </motion.p>
          <motion.h1
            variants={fadeUp}
            transition={{ duration: 0.44, ease: easeOut }}
            className="mt-5 text-balance font-heading text-[clamp(3.25rem,7vw,6rem)] font-extrabold leading-[0.95] text-[var(--color-text-primary)]"
          >
            Seu dinheiro, finalmente claro.
          </motion.h1>
          <motion.p
            variants={fadeUp}
            transition={{ duration: 0.42, ease: easeOut }}
            className="mt-6 max-w-xl text-xl leading-relaxed text-[var(--color-text-secondary)]"
          >
            Registre gastos por mensagem e veja a Mo explicar o mês sem planilha, culpa ou relatório difícil de ler.
          </motion.p>
          <motion.div
            variants={fadeUp}
            transition={{ duration: 0.42, ease: easeOut }}
            className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
          >
            <CtaButton large />
            <a
              href="#como-funciona"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-sm font-bold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-alt)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-blue)] focus-visible:ring-offset-2"
            >
              Ver como funciona
              <ArrowRight size={18} weight="bold" aria-hidden />
            </a>
          </motion.div>
          <FeaturePills />
        </motion.div>

        <ChatStage />
      </div>
    </section>
  );
}

function AvailableAppSection() {
  return (
    <Section className="home-band--solid">
      <motion.div
        variants={staggerGroup}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: '-100px' }}
        className="overflow-hidden rounded-[16px] border border-[color-mix(in_srgb,var(--color-border)_76%,transparent)] bg-[var(--color-surface)] p-5 shadow-[0_24px_60px_rgba(26,29,35,0.08)] sm:p-6 lg:grid lg:grid-cols-[0.82fr_1.18fr] lg:gap-8 lg:p-8"
      >
        <motion.div
          variants={fadeUp}
          transition={{ duration: 0.36, ease: easeOut }}
          className="flex flex-col justify-between"
        >
          <div>
            <p className="inline-flex rounded-full bg-[color-mix(in_srgb,var(--color-brand-green)_16%,var(--color-surface))] px-3 py-1.5 text-sm font-extrabold text-[var(--color-brand-green-dark)]">
              App disponível agora
            </p>
            <h2 className="mt-5 max-w-xl text-balance font-heading text-[clamp(2.35rem,4vw,4.25rem)] font-extrabold leading-[0.98] text-[var(--color-text-primary)]">
              O app já está pronto para organizar seu dinheiro.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-[var(--color-text-secondary)]">
              Enquanto o Moneda WhatsApp está em desenvolvimento, você já pode usar o app para registrar, revisar e entender sua vida financeira.
            </p>
          </div>

          <motion.a
            href="/signup"
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
            transition={{ duration: 0.16, ease: easeOut }}
            className="mt-8 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-full bg-[var(--color-brand-green)] px-6 text-sm font-extrabold text-white transition-colors hover:bg-[var(--color-brand-green-dark)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-green)] focus-visible:ring-offset-2 sm:w-auto"
          >
            Entrar no app agora
            <ArrowRight size={18} weight="bold" aria-hidden />
          </motion.a>
        </motion.div>

        <motion.div
          variants={staggerGroup}
          className="mt-8 grid gap-3 sm:grid-cols-2 lg:mt-0"
        >
          {availableFeatures.map((feature, index) => (
            <motion.article
              key={feature.title}
              variants={fadeUp}
              transition={{ duration: 0.34, ease: easeOut, delay: index * 0.03 }}
              className={`flex min-h-[132px] gap-3 rounded-[14px] border border-[color-mix(in_srgb,var(--color-border)_70%,transparent)] bg-[var(--color-surface-alt)] p-4 ${
                index === availableFeatures.length - 1 ? 'sm:col-span-2 lg:col-span-1' : ''
              }`}
            >
              <IconBadge icon={feature.icon} tone={feature.tone} size="sm" />
              <div>
                <h3 className="font-heading text-lg font-extrabold leading-tight text-[var(--color-text-primary)]">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[var(--color-text-secondary)]">
                  {feature.text}
                </p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </motion.div>
    </Section>
  );
}

function TurnSection() {
  return (
    <Section className="home-band--solid">
      <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
        <SectionTitle
          title="Pare de cadastrar gasto. Converse com ele."
        >
          O Moneda começa no momento em que o dinheiro sai. A interface vem depois, para revisar o mês com calma.
        </SectionTitle>

        <motion.div
          variants={staggerGroup}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: '-80px' }}
          className="grid gap-4"
        >
          {[
            {
              title: 'Registro sem formulário',
              text: 'Uma frase resolve valor, data e categoria.',
              icon: Receipt,
              tone: 'blue' as const,
            },
            {
              title: 'Dados com leitura humana',
              text: 'A Mo transforma números em explicação curta.',
              icon: ChartPieSlice,
              tone: 'warm' as const,
            },
            {
              title: 'Sem bronca financeira',
              text: 'O tom é de clareza, não de cobrança.',
              icon: ShieldCheck,
              tone: 'green' as const,
            },
          ].map((item) => (
            <motion.article
              key={item.title}
              variants={fadeUp}
              transition={{ duration: 0.34, ease: easeOut }}
              className="flex gap-4 rounded-[16px] bg-[var(--color-surface)] p-5"
            >
              <IconBadge icon={item.icon} tone={item.tone} />
              <div>
                <h3 className="font-heading text-xl font-extrabold text-[var(--color-text-primary)]">{item.title}</h3>
                <p className="mt-1 text-base leading-relaxed text-[var(--color-text-secondary)]">{item.text}</p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </Section>
  );
}

function FlowSection() {
  return (
    <Section id="como-funciona" className="home-band--flow">
      <SectionTitle align="center" title="Três mensagens mentais a menos.">
        O fluxo foi desenhado para a rotina real: pagar, mandar, entender.
      </SectionTitle>

      <div className="mt-12 grid gap-4 lg:grid-cols-3">
        {flowSteps.map((step, index) => (
          <motion.article
            key={step.title}
            variants={fadeUp}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.36, ease: easeOut, delay: index * 0.05 }}
            className="relative min-h-[260px] rounded-[16px] bg-[var(--color-surface)] p-6"
          >
            <div className="mb-8 flex items-center justify-between">
              <IconBadge icon={step.icon} tone={index === 0 ? 'green' : index === 1 ? 'blue' : 'warm'} size="lg" />
              <span className="text-5xl font-heading font-extrabold tabular-nums text-[color-mix(in_srgb,var(--color-brand-blue)_32%,transparent)]">
                {index + 1}
              </span>
            </div>
            <h3 className="max-w-xs font-heading text-2xl font-extrabold leading-tight text-[var(--color-text-primary)]">
              {step.title}
            </h3>
            <p className="mt-4 text-base leading-relaxed text-[var(--color-text-secondary)]">{step.text}</p>
          </motion.article>
        ))}
      </div>
    </Section>
  );
}

function ClaritySection() {
  return (
    <Section className="home-band--clarity">
      <div className="grid gap-10 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
        <SectionTitle title="O app vira a mesa limpa do seu dinheiro.">
          Gráficos, feed e conversa aparecem juntos, para você revisar o mês sem decifrar extrato.
        </SectionTitle>

        <div className="grid gap-4">
          <div className="grid gap-4 rounded-[16px] bg-[var(--color-surface)] p-5 md:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[12px] bg-[var(--color-surface-alt)] p-4">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ChartPieSlice size={20} weight="bold" className="text-[var(--color-brand-blue-dark)]" aria-hidden />
                  <h3 className="font-heading text-base font-extrabold text-[var(--color-text-primary)]">Onde concentra</h3>
                </div>
                <span className="text-sm font-extrabold tabular-nums text-[var(--color-brand-green-dark)]">38%</span>
              </div>
              <MiniWaffle />
            </div>
            <div className="rounded-[12px] bg-[var(--color-surface-alt)] p-4">
              <div className="mb-5 flex items-center gap-2">
                <ChartBar size={20} weight="bold" className="text-[var(--color-brand-blue-dark)]" aria-hidden />
                <h3 className="font-heading text-base font-extrabold text-[var(--color-text-primary)]">Quando pesa</h3>
              </div>
              <MiniHistogram />
            </div>
          </div>

          <div className="rounded-[16px] bg-[var(--color-surface)] p-3">
            {feedItems.map((item) => (
              <motion.div
                key={item.title}
                whileHover={{ scale: 1.006 }}
                transition={{ duration: 0.16, ease: easeOut }}
                className="flex items-center gap-3 rounded-[12px] p-3 transition-colors hover:bg-[var(--color-surface-alt)]"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: `${item.color}22`, color: item.color }}
                >
                  <item.icon size={22} weight="bold" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[var(--color-text-primary)]">{item.title}</p>
                  <p className="truncate text-xs text-[var(--color-text-secondary)]">{item.meta}</p>
                </div>
                <p className="shrink-0 text-sm font-extrabold tabular-nums text-[var(--color-error)]">
                  -{item.amount}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </Section>
  );
}

function TrustSection() {
  const [open, setOpen] = useState(0);

  return (
    <Section className="home-band--final">
      <div className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
        <div className="rounded-[16px] bg-[var(--color-surface)] p-6 sm:p-8">
          <IconBadge icon={LockKey} tone="green" size="lg" />
          <h2 className="mt-6 text-balance font-heading text-[clamp(2.5rem,5vw,4.75rem)] font-extrabold leading-[0.98] text-[var(--color-text-primary)]">
            Seu dinheiro merece uma conversa protegida.
          </h2>
          <div className="mt-7 grid gap-4">
            {trustItems.map((item) => (
              <div key={item.text} className="flex gap-3 text-base leading-relaxed text-[var(--color-text-secondary)]">
                <item.icon size={22} weight="bold" className="mt-0.5 shrink-0 text-[var(--color-brand-green-dark)]" aria-hidden />
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-[16px] bg-[var(--color-surface)]">
          <div className="border-b border-[var(--color-border)] p-5">
            <div className="flex items-center gap-3">
              <Image
                src={moicoPng}
                alt=""
                sizes="44px"
                className="h-11 w-11 rounded-full object-contain"
              />
              <div>
                <h3 className="font-heading text-xl font-extrabold text-[var(--color-text-primary)]">
                  Perguntas que a Mo responde
                </h3>
                <p className="text-sm text-[var(--color-text-secondary)]">Diretas, curtas e sem enrolar.</p>
              </div>
            </div>
          </div>
          {faqs.map((faq, index) => (
            <div
              key={faq.q}
              className={index === 0 ? '' : 'border-t border-[var(--color-border)]'}
            >
              <button
                type="button"
                onClick={() => setOpen(open === index ? -1 : index)}
                className="flex min-h-14 w-full items-center gap-3 px-5 py-4 text-left"
                aria-expanded={open === index}
              >
                <span className="flex-1 font-bold text-[var(--color-text-primary)]">{faq.q}</span>
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
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, ease: easeOut }}
                  className="px-5 pb-5 text-sm leading-relaxed text-[var(--color-text-secondary)]"
                >
                  {faq.a}
                </motion.p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="mx-auto mt-16 max-w-4xl text-center">
        <h2 className="text-balance font-heading text-[clamp(2.5rem,5vw,4.75rem)] font-extrabold leading-[0.98] text-[var(--color-text-primary)]">
          Comece pela mensagem que você já sabe mandar.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-[var(--color-text-secondary)]">
          O primeiro registro leva menos tempo do que abrir uma planilha.
        </p>
        <div className="mt-8">
          <CtaButton large />
        </div>
      </div>
    </Section>
  );
}

export default function HomeLanding({ whatsappUrl }: HomeLandingProps) {
  void whatsappUrl;

  return (
    <main className="relative min-h-dvh overflow-x-clip bg-[var(--color-bg)] text-[var(--color-text-primary)]">
      <BubbleBackground
        colors={backgroundColors}
        className="fixed inset-0 z-0 opacity-[0.18]"
      />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[linear-gradient(180deg,color-mix(in_srgb,var(--color-bg)_94%,transparent)_0%,color-mix(in_srgb,var(--color-bg)_84%,transparent)_46%,var(--color-bg)_100%)]" />

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 font-heading text-xl font-extrabold text-[var(--color-text-primary)]">
          <Image
            src={moicoPng}
            alt=""
            sizes="40px"
            className="h-9 w-9 rounded-full object-contain sm:h-10 sm:w-10"
          />
          Moneda
        </Link>
        <nav className="flex items-center gap-1.5 sm:gap-2">
          <ThemeToggleButton />
          <Link
            href="/login"
            className="rounded-full px-3 py-2 text-sm font-bold text-[var(--color-text-secondary)] transition-colors hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-text-primary)] sm:px-4"
          >
            Entrar
          </Link>
          <Link
            href="/signup"
            className="rounded-full bg-[var(--color-surface)] px-3 py-2 text-sm font-bold text-[var(--color-text-primary)] transition-colors hover:bg-[var(--color-surface-alt)] sm:px-4"
          >
            Criar conta
          </Link>
        </nav>
      </header>

      <div className="relative z-[1]">
        <HeroSection />
        <AvailableAppSection />
        <TurnSection />
        <FlowSection />
        <ClaritySection />
        <TrustSection />
      </div>
    </main>
  );
}
