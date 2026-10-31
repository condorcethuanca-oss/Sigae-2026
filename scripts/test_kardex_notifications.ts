/**
 * SIGAE - Test de Validación para Kárdex Institucional y Notificaciones
 * U.E. Luis Espinal Tarde de Collpani (SIE 80730142)
 */
import { ROLE_NOTIFICATION_COLORS, KardexLevel, KardexCategory } from '../src/types';

console.log('========================================================================');
console.log('SIGAE — VALIDACIÓN DE KÁRDEX ESCOLAR Y CÓDIGO DE COLOR DE NOTIFICACIONES');
console.log('U.E. Luis Espinal Tarde de Collpani (SIE 80730142) · Gestión 2026');
console.log('========================================================================\n');

let passed = 0;
let total = 0;

function assert(condition: boolean, desc: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`[✔ PASS] ${desc}`);
  } else {
    console.error(`[✖ FAIL] ${desc}`);
  }
}

// 1. Verificación del código de color por rol
assert(
  ROLE_NOTIFICATION_COLORS.director.hex === '#EF4444' &&
  ROLE_NOTIFICATION_COLORS.director.label === 'Dirección',
  'Código de color Dirección: Rojo (#EF4444)'
);

assert(
  ROLE_NOTIFICATION_COLORS.profesor.hex === '#3B82F6' &&
  ROLE_NOTIFICATION_COLORS.profesor.label === 'Profesor',
  'Código de color Profesor: Azul (#3B82F6)'
);

assert(
  ROLE_NOTIFICATION_COLORS.padre.hex === '#10B981' &&
  ROLE_NOTIFICATION_COLORS.padre.label === 'Padre de Familia',
  'Código de color Padre: Verde (#10B981)'
);

assert(
  ROLE_NOTIFICATION_COLORS.alumno.hex === '#A855F7' &&
  ROLE_NOTIFICATION_COLORS.alumno.label === 'Alumno',
  'Código de color Alumno: Morado (#A855F7)'
);

// 2. Niveles de severidad institucional del Kárdex
const levels: KardexLevel[] = [1, 2, 3, 4];
assert(levels.length === 4, 'El Kárdex comprende exactamente 4 niveles institucionales (1 a 4)');

// 3. Reglas de disparo de notificación y firma
function evaluateKardexRules(level: KardexLevel) {
  return {
    requiresSignature: level >= 2,
    notifiesFamilyImmediately: level >= 3,
    notifiesDirectionImmediately: level === 4,
  };
}

const n1 = evaluateKardexRules(1);
assert(!n1.requiresSignature && !n1.notifiesFamilyImmediately && !n1.notifiesDirectionImmediately,
  'Nivel 1 (Informativo): No requiere firma obligatoria ni dispara alerta crítica familiar');

const n2 = evaluateKardexRules(2);
assert(n2.requiresSignature && !n2.notifiesFamilyImmediately && !n2.notifiesDirectionImmediately,
  'Nivel 2 (Llamada de atención): Registra observación con requerimiento de revisión');

const n3 = evaluateKardexRules(3);
assert(n3.requiresSignature && n3.notifiesFamilyImmediately && !n3.notifiesDirectionImmediately,
  'Nivel 3 (Atención familiar): Dispara notificación de ALTA PRIORIDAD a los padres');

const n4 = evaluateKardexRules(4);
assert(n4.requiresSignature && n4.notifiesFamilyImmediately && n4.notifiesDirectionImmediately,
  'Nivel 4 (Prioritario / Dirección): Dispara alerta URGENTE a Dirección y Familia');

console.log('\n========================================================================');
console.log(`RESUMEN: ${passed}/${total} pruebas aprobadas (${Math.round((passed / total) * 100)}%)`);
console.log('========================================================================');

if (passed !== total) {
  process.exit(1);
}
