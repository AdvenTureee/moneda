import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseCSVContent } from '../src/lib/import/csvParser';

const nubankOriginal = `date,title,amount
2026-10-09,Pagamento recebido,"- 7.313,72"
2026-10-09,iFood - NuPay,"67,26"
2026-10-09,Pix no Crédito - INGRESSO.COM,"240,68"
2026-10-08,Shopee *Heemlibanhocas,"86,38"
2026-10-05,Raia Drogasil - NuPay - Parcela 1/2,"127,00"
2026-10-03,IOF de compra internacional,"1,90"
2026-10-02,Estorno Shopee,"- 67,26"
2026-10-02,Google Youtubepremium,"26,90"
`;

describe('parseCSVContent — Nubank (date,title,amount)', () => {
  const { transactions } = parseCSVContent(nubankOriginal);

  it('identifica as colunas sem exigir os nomes Data/Histórico/Valor', () => {
    assert.equal(transactions.length, 8);
  });

  it('interpreta datas ISO e valores com vírgula decimal', () => {
    const ifood = transactions.find((t) => t.description.startsWith('iFood'));
    assert.ok(ifood);
    assert.equal(ifood.date, '2026-10-09');
    assert.equal(ifood.amountCents, 6726);
    assert.equal(ifood.type, 'expense');
  });

  it('não classifica "Pix no Crédito" como receita', () => {
    const pixCredito = transactions.find((t) =>
      t.description.includes('Pix no Crédito'),
    );
    assert.ok(pixCredito);
    assert.equal(pixCredito.type, 'expense');
    assert.equal(pixCredito.amountCents, 24068);
  });

  it('classifica estorno como receita mesmo com sinal negativo', () => {
    const estorno = transactions.find((t) => t.description.startsWith('Estorno'));
    assert.ok(estorno);
    assert.equal(estorno.type, 'income');
    assert.equal(estorno.amountCents, 6726);
  });

  it('lê "Pagamento recebido" como receita', () => {
    const pagamento = transactions.find((t) =>
      t.description.includes('Pagamento recebido'),
    );
    assert.ok(pagamento);
    assert.equal(pagamento.type, 'income');
    assert.equal(pagamento.amountCents, 731372);
  });

  it('remove o sufixo de parcela sem quebrar o valor', () => {
    const parcela = transactions.find((t) => t.description.includes('Parcela 1/2'));
    assert.ok(parcela);
    assert.equal(parcela.amountCents, 12700);
    assert.equal(parcela.type, 'expense');
  });
});

describe('parseCSVContent — português (Data,Histórico,Valor)', () => {
  const csv = `Data,Histórico,Valor
09/10/2026,"Compra Supermercado","1.234,56"
10/10/2026,"Salário recebido","3.500,00"
11/10/2026,"IOF",-1.90
`;

  it('continua reconhecendo os cabeçalhos em português', () => {
    const { transactions } = parseCSVContent(csv);
    assert.equal(transactions.length, 3);
    assert.equal(transactions[0].amountCents, 123456);
    assert.equal(transactions[0].type, 'expense');
    assert.equal(transactions[1].type, 'income');
    assert.equal(transactions[1].amountCents, 350000);
    assert.equal(transactions[2].type, 'expense');
    assert.equal(transactions[2].amountCents, 190);
  });

  it('aceita formato en de valor (1,234.56)', () => {
    const enCsv = `Data,Histórico,Valor
2026-10-09,Mercado,"1,234.56"
`;
    const { transactions } = parseCSVContent(enCsv);
    assert.equal(transactions[0].amountCents, 123456);
  });

  it('desambigua datas DD/MM vs MM/DD', () => {
    const dmyCsv = `Data,Histórico,Valor
25/10/2026,Compra,"10,00"
10/25/2026,Compra,"20,00"
`;
    const { transactions } = parseCSVContent(dmyCsv);
    assert.equal(transactions[0].date, '2026-10-25');
    assert.equal(transactions[1].date, '2026-10-25');
  });
});

describe('parseCSVContent — sem cabeçalho', () => {
  it('inferi as colunas pelo conteúdo', () => {
    const csv = `2026-10-09,iFood - NuPay,"67,26"
2026-10-08,Shopee,"86,38"
2026-10-07,"Transferência recebida","500,00"
`;
    const { transactions } = parseCSVContent(csv);
    assert.equal(transactions.length, 3);
    assert.equal(transactions[0].description, 'iFood - NuPay');
    assert.equal(transactions[0].amountCents, 6726);
    assert.equal(transactions[2].type, 'income');
    assert.equal(transactions[2].amountCents, 50000);
  });

  it('funciona com ponto e vírgula e valores sem aspas', () => {
    const csv = `2026-10-09;Farmácia;45,90
2026-10-08;Pix recebido;120,00
`;
    const { transactions } = parseCSVContent(csv);
    assert.equal(transactions.length, 2);
    assert.equal(transactions[0].amountCents, 4590);
    assert.equal(transactions[0].type, 'expense');
    assert.equal(transactions[1].type, 'income');
  });
});

describe('parseCSVContent — colunas extra débito/crédito', () => {
  it('usa colunas separadas de débito e crédito quando existem', () => {
    const csv = `Data,Histórico,Débito,Crédito
01/10/2026,Compra,"150,00",
02/10/2026,Recebimento,,"900,00"
`;
    const { transactions } = parseCSVContent(csv);
    assert.equal(transactions.length, 2);
    assert.equal(transactions[0].type, 'expense');
    assert.equal(transactions[0].amountCents, 15000);
    assert.equal(transactions[1].type, 'income');
    assert.equal(transactions[1].amountCents, 90000);
  });
});

describe('parseCSVContent — arquivo vazio', () => {
  it('retorna lista vazia', () => {
    const { transactions } = parseCSVContent('');
    assert.equal(transactions.length, 0);
  });
});
