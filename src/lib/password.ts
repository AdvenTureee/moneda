export const PASSWORD_REQUIREMENTS_LABEL =
  'A senha precisa ter pelo menos 8 caracteres, uma letra maiúscula, um número e um caractere especial.';

export function isStrongPassword(password: string): boolean {
  return (
    password.length >= 8 &&
    /[A-ZÀ-Ý]/.test(password) &&
    /\d/.test(password) &&
    /[^A-Za-zÀ-ÿ0-9]/.test(password)
  );
}
