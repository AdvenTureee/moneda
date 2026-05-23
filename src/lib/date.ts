/**
 * Date helpers — locale-aware (pt-BR) e sem drift de UTC.
 *
 * Convenção: representamos a "data calendárica" como `YYYY-MM-DD` no
 * fuso horário local. Isso bate com o valor de <input type="date"> e
 * com o que o DatePicker custom expõe.
 */

/** Converte um Date para `YYYY-MM-DD` no fuso local. */
export function toLocalDateInput(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Data de hoje em `YYYY-MM-DD` no fuso local. */
export function todayLocalDate(): string {
  return toLocalDateInput(new Date());
}

/**
 * Converte `YYYY-MM-DD` para ISO string preservando horário de `reference`
 * (útil ao editar um registro: só a data muda, o horário original é mantido).
 */
export function localDateToIso(value: string, reference?: Date): string {
  const [y, m, d] = value.split('-').map(Number);
  const ref = reference ?? new Date();
  const out = new Date(
    y,
    (m ?? 1) - 1,
    d ?? 1,
    ref.getHours(),
    ref.getMinutes(),
    ref.getSeconds(),
  );
  return out.toISOString();
}

/** Parse de `YYYY-MM-DD` para Date local (00:00 hora local). */
export function parseLocalDate(value: string): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Formata `YYYY-MM-DD` como `dd/mm/aaaa` pt-BR. */
export function formatLocalDateBr(value: string): string {
  if (!value) return '';
  return parseLocalDate(value).toLocaleDateString('pt-BR');
}
