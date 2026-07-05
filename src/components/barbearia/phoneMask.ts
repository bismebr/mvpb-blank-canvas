// Máscara e validação para WhatsApp brasileiro (DDD + 9 + 8 dígitos)
// Formato exibido (sem o prefixo +55): (XX) 9XXXX-XXXX

export const INVALID_PHONE_MESSAGE = "Adicione um número de telefone válido.";

function stripCountryCode(digits: string): string {
  // Aceita colar com +55 / 55 na frente
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    return digits.slice(2);
  }
  return digits;
}

export function maskBrPhone(input: string): string {
  let digits = input.replace(/\D/g, "");
  digits = stripCountryCode(digits).slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export function isPhoneValid(masked: string): boolean {
  const digits = stripCountryCode(masked.replace(/\D/g, ""));
  // 11 dígitos: 2 do DDD + 9 + 8 dígitos
  return digits.length === 11 && digits.charAt(2) === "9";
}

export function phoneDigits(masked: string): string {
  return stripCountryCode(masked.replace(/\D/g, ""));
}
