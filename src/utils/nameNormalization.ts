/**
 * SIGAE - Sistema Integral de Gestión Académica Escolar
 * U.E. Luis Espinal Tarde de Collpani (SIE 80730142)
 *
 * Módulo oficial de normalización y comparación segura de nombres y códigos institucionales.
 *
 * Reglas mandatorias:
 * 1. Insensible a mayúsculas y minúsculas (case-insensitive).
 * 2. Elimina espacios sobrantes en extremos (trim) y colapsa espacios internos múltiples a uno solo.
 * 3. Normaliza diferencias de representación Unicode y acentos (NFD) para comparación.
 * 4. Preserva el orden estricto de las palabras (no permuta nombres ni apellidos).
 * 5. No reemplaza el nombre oficial del padrón por el ingresado por el solicitante.
 * 6. Maneja CI y RUDE estrictamente como cadenas de texto (preservando ceros iniciales).
 */

export interface NameComparisonResult {
  match: boolean;
  isExact: boolean;
  normalizedInput: string;
  normalizedOfficial: string;
  needsManualReview: boolean;
  reason?: string;
}

/**
 * Normaliza un nombre para comparación:
 * - Convierte a minúsculas
 * - Colapsa espacios repetidos y elimina espacios en los extremos
 * - Remueve marcas diacríticas / acentos mediante descomposición NFD
 * - Preserva el orden estricto de los términos
 */
export function normalizePersonName(name: string | null | undefined): string {
  if (!name) return '';
  return name
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

/**
 * Compara el nombre ingresado por un solicitante contra el nombre oficial registrado en el padrón.
 * Preserva siempre la forma oficial del padrón para visualización.
 */
export function comparePersonNames(inputName: string, officialName: string): NameComparisonResult {
  const cleanInput = (inputName || '').trim().replace(/\s+/g, ' ');
  const cleanOfficial = (officialName || '').trim().replace(/\s+/g, ' ');

  const isExact = cleanInput.toLowerCase() === cleanOfficial.toLowerCase();
  const normalizedInput = normalizePersonName(cleanInput);
  const normalizedOfficial = normalizePersonName(cleanOfficial);

  if (normalizedInput === normalizedOfficial) {
    return {
      match: true,
      isExact,
      normalizedInput,
      normalizedOfficial,
      needsManualReview: false,
    };
  }

  // Si difiere en orden de palabras o caracteres significativos, NUNCA asumir coincidencia automática
  const inputWords = normalizedInput.split(' ').filter(Boolean);
  const officialWords = normalizedOfficial.split(' ').filter(Boolean);

  // Verificamos si es una permutación de palabras (ej. inversión de apellidos y nombres)
  const isPermutation =
    inputWords.length === officialWords.length &&
    inputWords.length > 1 &&
    [...inputWords].sort().join(' ') === [...officialWords].sort().join(' ');

  if (isPermutation) {
    return {
      match: false,
      isExact: false,
      normalizedInput,
      normalizedOfficial,
      needsManualReview: true,
      reason: 'El orden de los nombres y apellidos difiere del padrón oficial institucional.',
    };
  }

  return {
    match: false,
    isExact: false,
    normalizedInput,
    normalizedOfficial,
    needsManualReview: false,
    reason: 'El nombre ingresado no coincide con el expediente institucional oficial.',
  };
}

/**
 * Sanitiza y preserva identificadores institucionales (Carnet de Identidad y RUDE)
 * como cadenas de texto exactas, preservando ceros iniciales (ej. "004829103").
 */
export function sanitizeInstitutionalId(id: string | number | null | undefined): string {
  if (id === null || id === undefined) return '';
  const str = String(id).trim();
  // Remueve caracteres de control o no imprimibles, pero preserva dígitos y sufijos (ej. "4829103 LP")
  return str.replace(/[\r\n\t]+/g, ' ').trim();
}
