import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  merchantKey,
  parseInstallmentMarker,
  planSeriesGroups,
  stripInstallmentMarker,
  type SeriesInput,
} from '../src/lib/import/seriesDetection';
import { parseCSVContent } from '../src/lib/import/csvParser';

function expense(
  description: string,
  date: string,
  amountCents: number,
  installment?: { current: number; total: number } | null,
): SeriesInput & { id: string } {
  return { id: `${description}-${date}`, description, date, amountCents, type: 'expense', installment: installment ?? null };
}

describe('parseInstallmentMarker', () => {
  it('lê "Parcela 1/2" do Nubank', () => {
    assert.deepEqual(parseInstallmentMarker('Raia Drogasil - NuPay - Parcela 1/2'), { current: 1, total: 2 });
  });

  it('lê "PARC 02/05" com zero à esquerda', () => {
    assert.deepEqual(parseInstallmentMarker('LOJA X PARC 02/05'), { current: 2, total: 5 });
  });

  it('lê "PARC. 3 DE 10"', () => {
    assert.deepEqual(parseInstallmentMarker('MAGAZINE PARC. 3 DE 10'), { current: 3, total: 10 });
  });

  it('não confunde data com parcela sem o prefixo', () => {
    assert.equal(parseInstallmentMarker('COMPRA 12/10'), null);
    assert.equal(parseInstallmentMarker('Netflix'), null);
  });

  it('rejeita parcela inconsistente', () => {
    assert.equal(parseInstallmentMarker('PARC 6/5'), null);
    assert.equal(parseInstallmentMarker('PARC 1/1'), null);
    assert.equal(parseInstallmentMarker('PARC 0/5'), null);
  });
});

describe('stripInstallmentMarker / merchantKey', () => {
  it('remove o marcador e os separadores que sobram', () => {
    assert.equal(stripInstallmentMarker('Raia Drogasil - NuPay - Parcela 1/2'), 'Raia Drogasil - NuPay');
    assert.equal(stripInstallmentMarker('LOJA X PARC 02/05'), 'LOJA X');
  });

  it('gera a mesma chave para parcelas diferentes do mesmo estabelecimento', () => {
    assert.equal(
      merchantKey('Raia Drogasil - NuPay - Parcela 1/2'),
      merchantKey('Raia Drogasil - NuPay - Parcela 2/2'),
    );
  });
});

describe('planSeriesGroups', () => {
  it('une parcelas da mesma compra vindas de extratos diferentes em uma série', () => {
    const groups = planSeriesGroups([
      expense('LOJA X PARC 02/05', '2026-10-05', 10000, { current: 2, total: 5 }),
      expense('LOJA X PARC 03/05', '2026-11-05', 10000, { current: 3, total: 5 }),
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].kind, 'installment');
    assert.equal(groups[0].members.length, 2);
  });

  it('separa compras parceladas diferentes mesmo com o mesmo estabelecimento', () => {
    const groups = planSeriesGroups([
      expense('LOJA X PARC 01/05', '2026-10-05', 10000, { current: 1, total: 5 }),
      expense('LOJA X PARC 01/10', '2026-10-05', 5000, { current: 1, total: 10 }),
    ]);
    assert.equal(groups.length, 2);
    assert.ok(groups.every((g) => g.kind === 'installment'));
  });

  it('detecta recorrência: mesmo título e valor em meses diferentes', () => {
    const groups = planSeriesGroups([
      expense('Netflix', '2026-08-10', 5590),
      expense('Netflix', '2026-09-10', 5590),
      expense('Netflix', '2026-10-10', 5590),
    ]);
    assert.equal(groups.length, 1);
    assert.equal(groups[0].kind, 'recurring');
    assert.equal(groups[0].members.length, 3);
  });

  it('não trata como recorrência um gasto único, mesmo com valor igual', () => {
    const groups = planSeriesGroups([
      expense('Padaria', '2026-10-02', 1200),
      expense('Padaria', '2026-10-09', 1200),
    ]);
    assert.equal(groups.length, 2);
    assert.ok(groups.every((g) => g.kind === 'single'));
  });

  it('valor diferente entre meses não é recorrência', () => {
    const groups = planSeriesGroups([
      expense('Spotify', '2026-08-10', 2190),
      expense('Spotify', '2026-09-10', 2490),
    ]);
    assert.ok(groups.every((g) => g.kind === 'single'));
  });

  it('mantém receitas sempre avulsas', () => {
    const income: SeriesInput & { id: string } = {
      id: 'r1', description: 'Salário', date: '2026-08-05', amountCents: 500000, type: 'income', installment: null,
    };
    const income2: SeriesInput & { id: string } = { ...income, id: 'r2', date: '2026-09-05' };
    const groups = planSeriesGroups([income, income2]);
    assert.equal(groups.length, 2);
    assert.ok(groups.every((g) => g.kind === 'single'));
  });
});

describe('parseCSVContent — parcelas', () => {
  it('preenche o campo installment a partir do título do Nubank', () => {
    const csv = `date,title,amount
2026-10-05,Raia Drogasil - NuPay - Parcela 1/2,"127,00"
2026-10-03,Google Youtubepremium,"26,90"
`;
    const { transactions } = parseCSVContent(csv);
    const parcela = transactions.find((t) => t.description.includes('Parcela'));
    assert.deepEqual(parcela?.installment, { current: 1, total: 2 });
    const normal = transactions.find((t) => t.description.includes('Youtube'));
    assert.equal(normal?.installment, null);
  });
});
