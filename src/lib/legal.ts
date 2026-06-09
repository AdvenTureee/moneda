export const TERMS_VERSION = '1.1';

export const TERMS_UPDATED_LABEL = '28 de maio de 2026';

export const TERMS_CONTACT_EMAIL = 'suporte@moneda.info';

export const TERMS_SUMMARY = [
  'Seus dados são usados para operar sua conta, organizar suas finanças, proteger o acesso e entregar funcionalidades do Moneda.',
  'Você mantém os direitos previstos na Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).',
];

export type TermsBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'subheading'; text: string }
  | { type: 'list'; items: string[] }
  | { type: 'note'; text: string }
  | { type: 'highlight'; text: string }
  | { type: 'table'; headers: string[]; rows: string[][] };

export interface TermsSection {
  title: string;
  blocks: TermsBlock[];
}

export const TERMS_SECTIONS: TermsSection[] = [
  {
    title: '1. Termos de uso',
    blocks: [
      { type: 'paragraph', text: 'Ao criar uma conta e usar o Moneda, você concorda em utilizar o app de forma lícita, responsável e compatível com a finalidade de organização financeira pessoal.' },
      { type: 'paragraph', text: 'O Moneda oferece ferramentas para registrar gastos, rendas, categorias, orçamentos, comprovantes e insights. As informações exibidas são apoio organizacional e não substituem orientação financeira, contábil, jurídica ou tributária profissional.' },
      { type: 'paragraph', text: 'Você é responsável pela veracidade dos dados inseridos, pela segurança do acesso à sua conta e por manter seus meios de autenticação protegidos.' },
    ],
  },
  {
    title: '2. Dados coletados',
    blocks: [
      { type: 'subheading', text: 'a) Dados cadastrais e de identificação' },
      { type: 'list', items: ['Nome completo', 'E-mail de contato', 'Telefone, quando informado', 'Foto de perfil', 'Identificadores de autenticação, como credenciais de login e tokens de sessão'] },
      { type: 'note', text: 'A foto de perfil é tratada como dado pessoal para identificação visual da conta e não como dado biométrico, salvo se futuramente passar a ser usada para autenticação biométrica, como reconhecimento facial.' },
      { type: 'subheading', text: 'b) Dados financeiros inseridos por você' },
      { type: 'list', items: ['Despesas e receitas', 'Categorias e subcategorias', 'Orçamentos', 'Datas de transações', 'Formas de pagamento', 'Comprovantes enviados', 'Preferências de notificação'] },
      { type: 'subheading', text: 'c) Dados técnicos e operacionais' },
      { type: 'paragraph', text: 'Também podemos registrar dados técnicos e operacionais necessários para segurança da plataforma, auditoria de acessos, prevenção de fraudes e abusos, estabilidade do app e melhoria da experiência do usuário.' },
    ],
  },
  {
    title: '3. Finalidades de uso',
    blocks: [
      {
        type: 'table',
        headers: ['Finalidade', 'Descrição'],
        rows: [
          ['Conta', 'Criar, gerenciar e proteger sua conta.'],
          ['Autenticação', 'Autenticar acessos e validar identidade.'],
          ['Painel financeiro', 'Exibir seu painel financeiro personalizado.'],
          ['Cálculos', 'Calcular indicadores financeiros, saldo, fluxo de caixa e métricas.'],
          ['Histórico', 'Organizar histórico de transações.'],
          ['Personalização', 'Personalizar a experiência do usuário.'],
          ['Comunicações', 'Enviar comunicações operacionais essenciais.'],
          ['Arquivos', 'Processar uploads de comprovantes e arquivos.'],
          ['Insights', 'Gerar resumos e insights financeiros.'],
          ['Estabilidade', 'Diagnosticar falhas e melhorar a estabilidade do app.'],
          ['Segurança', 'Prevenir abusos, fraudes e usos indevidos.'],
          ['Conformidade', 'Cumprir obrigações legais ou regulatórias aplicáveis.'],
        ],
      },
    ],
  },
  {
    title: '4. Base legal LGPD',
    blocks: [
      { type: 'paragraph', text: 'O tratamento de dados pode ocorrer com base em uma ou mais das hipóteses previstas na LGPD:' },
      {
        type: 'table',
        headers: ['Base legal', 'Base normativa', 'Exemplo de uso'],
        rows: [
          ['Execução de contrato', 'Art. 7º, V', 'Operar sua conta e entregar funcionalidades do Moneda.'],
          ['Consentimento', 'Art. 7º, I', 'Finalidades específicas que dependam de sua autorização.'],
          ['Legítimo interesse', 'Art. 7º, IX', 'Melhorar a plataforma, prevenir fraudes e otimizar a experiência.'],
          ['Obrigação legal ou regulatória', 'Art. 7º, II', 'Quando a legislação exigir tratamento de dados.'],
          ['Exercício regular de direitos', 'Art. 7º, VI', 'Processos judiciais, administrativos ou arbitrais.'],
        ],
      },
      { type: 'paragraph', text: 'Quando o tratamento depender de consentimento, você poderá solicitar a revogação a qualquer momento. A revogação pode limitar funcionalidades que dependam desses dados.' },
    ],
  },
  {
    title: '5. Compartilhamento, fornecedores e armazenamento',
    blocks: [
      { type: 'paragraph', text: 'Seus dados podem ser processados por fornecedores de infraestrutura de nuvem, autenticação, banco de dados, armazenamento, comunicação, inteligência artificial, segurança, observabilidade e monitoramento, sempre de forma estritamente necessária à operação do Moneda.' },
      { type: 'paragraph', text: 'Atualmente, os dados são armazenados em infraestrutura da Amazon Web Services (AWS) localizada no Brasil.' },
      { type: 'paragraph', text: 'Não vendemos seus dados pessoais. Se no futuro houver necessidade de transferência internacional de dados, o tratamento observará a LGPD e os mecanismos autorizados pela ANPD para assegurar nível adequado de proteção.' },
      { type: 'list', items: ['Cláusulas contratuais padrão', 'Normas corporativas globais', 'Certificações e salvaguardas aplicáveis'] },
      { type: 'paragraph', text: 'Compartilhamentos adicionais poderão ocorrer para cumprir lei, atender ordem de autoridade competente, proteger direitos do Moneda ou responder a incidentes de segurança.' },
    ],
  },
  {
    title: '6. Segurança',
    blocks: [
      { type: 'paragraph', text: 'Adotamos medidas técnicas e organizacionais razoáveis para proteger dados pessoais contra acesso não autorizado, perda, alteração, divulgação indevida e uso inadequado.' },
      { type: 'paragraph', text: 'Nenhuma plataforma é completamente imune a riscos. Caso identifiquemos incidente relevante envolvendo seus dados, adotaremos as medidas cabíveis conforme a legislação aplicável.' },
    ],
  },
  {
    title: '7. Retenção de dados',
    blocks: [
      { type: 'paragraph', text: 'Manteremos seus dados enquanto sua conta estiver ativa, enquanto forem necessários para as finalidades descritas nesta política, para cumprimento de obrigações legais ou para preservação de direitos.' },
      {
        type: 'table',
        headers: ['Tipo de dado', 'Período típico'],
        rows: [
          ['Dados de conta', 'Enquanto a conta existir.'],
          ['Dados financeiros', 'Conforme prazo legal aplicável, inclusive para fins fiscais, quando pertinente.'],
          ['Logs de segurança e auditoria', 'Pelo período necessário para investigação, conformidade e proteção da plataforma.'],
        ],
      },
      { type: 'paragraph', text: 'Você poderá solicitar exclusão ou anonimização de dados, observadas limitações técnicas, legais e operacionais.' },
    ],
  },
  {
    title: '8. Direitos do titular',
    blocks: [
      { type: 'paragraph', text: 'Nos termos da LGPD, você pode solicitar:' },
      {
        type: 'table',
        headers: ['Direito', 'Descrição'],
        rows: [
          ['Confirmação', 'Confirmar a existência de tratamento de dados.'],
          ['Acesso', 'Obter cópia dos seus dados pessoais.'],
          ['Correção', 'Corrigir dados incompletos, inexatos ou desatualizados.'],
          ['Anonimização, bloqueio ou eliminação', 'Aplicável a dados desnecessários, excessivos ou tratados em desconformidade.'],
          ['Portabilidade', 'Solicitar portabilidade quando aplicável.'],
          ['Informações sobre compartilhamento', 'Saber com quais terceiros seus dados são compartilhados.'],
          ['Revisão de decisões automatizadas', 'Pedir revisão humana quando aplicável.'],
          ['Revogação do consentimento', 'Retirar consentimento a qualquer momento, quando esta for a base legal.'],
        ],
      },
    ],
  },
  {
    title: '9. Decisões automatizadas e insights',
    blocks: [
      { type: 'paragraph', text: 'O Moneda pode utilizar algoritmos para gerar insights financeiros, resumos de gastos e receitas, indicadores orçamentários e sugestões de organização financeira.' },
      { type: 'paragraph', text: 'Você poderá solicitar revisão humana de decisões automatizadas, obter informações sobre a lógica geral envolvida e contestar resultados que considere injustos ou imprecisos.' },
    ],
  },
  {
    title: '10. Cookies, analytics e tecnologias similares',
    blocks: [
      { type: 'paragraph', text: 'Atualmente, o Moneda utiliza apenas recursos técnicos estritamente necessários ao funcionamento, segurança, autenticação e prevenção de fraudes.' },
      { type: 'paragraph', text: 'No momento, não utilizamos Google Analytics. Caso futuramente passemos a usar cookies não essenciais, SDKs, pixels ou ferramentas de analytics, esta política será atualizada para informar de forma clara os dados tratados, as finalidades e as opções disponíveis ao usuário.' },
      { type: 'paragraph', text: 'Quando necessário, solicitaremos consentimento antes da ativação de tecnologias não essenciais.' },
    ],
  },
  {
    title: '11. Usuários menores de idade',
    blocks: [
      { type: 'highlight', text: 'Idade mínima para uso do Moneda: 16 anos.' },
      { type: 'paragraph', text: 'O Moneda é destinado a usuários com 16 anos ou mais. Quando houver tratamento de dados pessoais de adolescentes, esse tratamento observará o melhor interesse do titular e as disposições aplicáveis da LGPD.' },
      { type: 'paragraph', text: 'Não direcionamos intencionalmente o Moneda a crianças menores de 12 anos.' },
    ],
  },
  {
    title: '12. Alterações desta política e destes termos',
    blocks: [
      { type: 'paragraph', text: 'Podemos atualizar esta política de privacidade e estes termos de uso periodicamente.' },
      { type: 'paragraph', text: 'Mudanças relevantes poderão ser comunicadas por meio do app, por e-mail cadastrado ou por atualização da data de revisão deste documento.' },
      { type: 'paragraph', text: 'A continuidade de uso do Moneda após a entrada em vigor das alterações poderá caracterizar aceite dos novos termos, observada a legislação aplicável.' },
    ],
  },
  {
    title: '13. Contato e privacidade',
    blocks: [
      { type: 'paragraph', text: 'Para exercer direitos relacionados a dados pessoais, tirar dúvidas sobre privacidade ou reportar incidentes de segurança, entre em contato por:' },
      { type: 'paragraph', text: `E-mail: ${TERMS_CONTACT_EMAIL}` },
      { type: 'paragraph', text: 'As solicitações serão tratadas no prazo aplicável previsto na legislação.' },
    ],
  },
  {
    title: '14. Legislação e foro',
    blocks: [
      { type: 'paragraph', text: 'Este documento é regido pelas leis da República Federativa do Brasil.' },
      { type: 'paragraph', text: 'Fica eleito o foro da comarca de São Paulo/SP para dirimir eventuais controvérsias relacionadas a este documento, salvo disposição legal em contrário.' },
    ],
  },
];
