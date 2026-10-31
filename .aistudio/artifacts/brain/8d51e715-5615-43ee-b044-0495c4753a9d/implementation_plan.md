# Reconstrucción Funcional Integral de los Paneles Docente y Familiar — SIGAE

Plan maestro de arquitectura, experiencia de usuario y persistencia real en Firebase para la **U.E. Luis Espinal Tarde de Collpani** (Código SIE **80730142**). Garantiza la eliminación total de datos simulados o decorativos, la separación estricta de los 4 roles institucionales (`director`, `profesor`, `padre`, `alumno`) y la implementación completa de las 12 secciones del panel docente y las 11 secciones del panel familiar.

---

## Decisiones Críticas y Confirmaciones del Usuario

> [!IMPORTANT]
> A continuación se resumen las decisiones acordadas durante la fase de aclaración interactiva:

- **Exclusión total del rol `superadmin`**: El sistema operará con exactamente 4 roles oficiales: `director`, `profesor`, `padre` y `alumno`. Cualquier cuenta previa con privilegios administrativos o UID de dirección será gobernada exclusivamente bajo el rol `director`.
- **Registro del Horario Oficial Confirmado de 6.º A en Firestore**: Se persistirá en la colección `/schedules` la cuadrícula curricular oficial de 6.º A de Secundaria (Biología, Música, Matemática, Informática, Artes Plásticas, Lenguaje, Ciencias Sociales, Psicología, Química, Educación Física, Religión, Filosofía/Física) con sus turnos de mañana (08:00–12:15) y tarde (14:00–18:15) y recreo (10:45–11:00).
- **Prioridad Funcional Inmediata**: Reconstrucción paralela y prioritaria de los paneles de **Profesor** y de la **Familia (Padre/Tutor)**, asegurando que cada botón y flujo ejecute transacciones y lecturas reales en Cloud Firestore y Firebase Auth.

---

## 1. Visión General y Concepto Central

SIGAE centraliza la vida académica de la U.E. Luis Espinal Tarde conectando de manera bidireccional y segura a la Dirección, el plantel Docente y las Familias de Collpani:

- **Profesor**: Administra sus clases del día, consulta su horario semanal verificado, accede a las nóminas de sus paralelos autorizados, toma y guarda asistencia en tiempo real con confirmación en Firestore, gestiona borradores de calificaciones bajo las dimensiones de la Ley 070 (Saber 35, Hacer 35, Ser y Decidir 20, Autoevaluación 10), atiende mensajería de padres tutores y revisa comunicados.
- **Padre / Madre / Tutor**: Accede a un portal exclusivo con selector de estudiante para ver la realidad académica de cada hijo vinculado (horario específico por curso, asistencia diaria con estados presente/retraso/licencia/ausente, notas publicadas, comunicados y mensajería con profesores asignados) y tramita vinculaciones familiares (mediante Código Individual Seguro o solicitud formal a Dirección).
- **Dirección**: Mantiene la supervisión general, asignaciones de carga horaria, visado de notas y aprobación de solicitudes docentes y familiares sin que su sesión se mezcle ni desvíe.
- **Alumno**: Consulta exclusivamente su información curricular autorizada.

---

## 2. Experiencia de Usuario y Diseño Visual

### Identidad Visual y Estilo

- **Atmósfera y Tema**: Interfaz oscura institucional de alto contraste inspirada en suites pedagógicas modernas, fondo base `slate-950` (`#020617`), superficies estructurales en `slate-900` (`#0f172a`), bordes sutiles en `slate-800` (`#1e293b`), y acentos violeta/índigo institucional y azul marino boliviano.
- **Tipografía y Legibilidad**: Tipografía sans-serif jerarquizada (`Plus Jakarta Sans` / `Inter`), números tabulares monoespaciados (`font-mono tabular-nums`) en listas de notas, horarios y contadores.
- **Disciplina Anti-Slop (Zero-Pill)**: Se prohíbe el uso de píldoras estáticas o badges decorativos alrededor de metadatos. Las etiquetas informativas (curso, fecha, RUDE, horas) se renderizan como texto limpio unboxed con separadores tipográficos (`·`, `/`). Los estados de asistencia emplean selectores interactivos funcionales con etiquetas explícitas.
- **Navegación Adaptable**: Menú lateral (Sidebar) retráctil en móviles con backdrop táctil y fijo en computadoras de escritorio (pantallas $\ge 1024\text{px}$).

---

### Menú Lateral del Profesor (12 Vistas Oficiales)

```
┌────────────────────────────────────────────────────────┐
│ PORTAL DOCENTE — SIGAE                                 │
│ Prof. [Nombre Docente] · U.E. Luis Espinal Tarde       │
├────────────────────────────────────────────────────────┤
│  1. Inicio / Resumen                                   │
│  2. Mis clases de hoy                                  │
│  3. Mis cursos y materias                              │
│  4. Listas de estudiantes                              │
│  5. Mi horario                                         │
│  6. Asistencia                                         │
│  7. Calificaciones                                     │
│  8. Comunicados                                        │
│  9. Mensajería interna                                 │
│ 10. Notificaciones                                     │
│ 11. Mi perfil                                          │
│ 12. Cerrar sesión                                      │
└────────────────────────────────────────────────────────┘
```

1. **Inicio / Resumen**: Resumen real de actividades docentes: próximas clases del día, materias asignadas, alertas de asistencias no registradas y accesos directos. Si no tiene asignaciones, muestra el aviso oficial: *"Tu cuenta está autorizada, pero la Dirección todavía no te ha asignado cursos o materias"*.
2. **Mis clases de hoy**: Tarjetas por período del día actual con botón "Abrir clase" que despliega el espacio del aula (lista de estudiantes, registro rápido de asistencia y estado de sesión).
3. **Mis cursos y materias**: Detalle de paralelos asignados por Dirección con cantidad real de alumnos matriculados y acciones de gestión pedagógica.
4. **Listas de estudiantes**: Nóminas autorizadas por curso, con buscador en vivo por nombre/RUDE y vista de ficha pedagógica sin exponer datos sensibles innecesarios.
5. **Mi horario**: Cuadrícula semanal interactiva (Lunes a Sábado) con diferenciación clara de turnos mañana/tarde, recreos y botones para alternar días o ver semana completa.
6. **Asistencia**: Flujo en 3 pasos: selección de curso/fecha/período $\to$ carga de nómina con selector de estados (Presente, Ausente, Retraso, Licencia Justificada, Pendiente) $\to$ guardado con confirmación transaccional en `/attendance_sessions`.
7. **Calificaciones**: Gestión trimestral con creación de actividades evaluativas, registro de puntuaciones sobre 100 puntos reglamentarios, guardado en borrador y publicación visada.
8. **Comunicados**: Recepción de avisos institucionales de Dirección y redacción de notas para sus cursos autorizados.
9. **Mensajería interna**: Canales de chat directo exclusivamente con los padres de familia de estudiantes pertenecientes a sus materias y con la Dirección.
10. **Notificaciones**: Bandeja de alertas institucionales (aprobaciones, circulares, avisos de asistencia).
11. **Mi perfil**: Consulta de datos institucionales (expediente, especialidad, carga horaria) y edición de datos personales permitidos (celular).
12. **Cerrar sesión**: Desconexión limpia en Firebase Auth y reseteo de estados locales.

---

### Menú Lateral de la Familia (11 Vistas Oficiales)

```
┌────────────────────────────────────────────────────────┐
│ PORTAL DE LA FAMILIA — SIGAE                           │
│ Padre/Tutor: [Nombre Adulto] · Seguimiento Académico   │
├────────────────────────────────────────────────────────┤
│  1. Inicio / Resumen                                   │
│  2. Mis hijos                                          │
│  3. Horario escolar                                    │
│  4. Asistencia                                         │
│  5. Calificaciones / Boleta de notas                   │
│  6. Comunicados                                        │
│  7. Mensajería interna                                 │
│  8. Vincular otro hijo                                 │
│  9. Notificaciones                                     │
│ 10. Mi perfil                                          │
│ 11. Cerrar sesión                                      │
└────────────────────────────────────────────────────────┘
```

1. **Inicio / Resumen**: Resumen consolidado del hijo seleccionado (o aviso de vinculación pendiente si no tiene hijos aprobados), métricas reales de asistencia del mes, horario de hoy y avisos.
2. **Mis hijos**: Tarjetas de estudiantes vinculados con selector para alternar qué hijo está activo en toda la sesión del portal.
3. **Horario escolar**: Visualización completa del horario oficial del curso del hijo (ej. 6.º A de Secundaria), turnos mañana y tarde, recreos y docentes a cargo.
4. **Asistencia**: Historial diario de asistencia de su hijo con desglose por materia/fecha y botón para enviar justificación de falta o solicitud de licencia.
5. **Calificaciones / Boleta de notas**: Consulta de notas publicadas por dimensión para el 1.er Trimestre. Si el trimestre está en curso y aún no hay notas oficiales publicadas, muestra estado claro sin generar boletas falsas.
6. **Comunicados**: Circulares dirigidas al curso del estudiante y anuncios generales de Dirección.
7. **Mensajería interna**: Comunicación directa con los profesores asignados a las materias del hijo seleccionado.
8. **Vincular otro hijo**: Asistente en 3 pasos: confirmación de datos del adulto $\to$ datos del estudiante (RUDE, CI, curso) con verificación contra padrón oficial $\to$ autorización por Código Individual Seguro o envío de solicitud a Dirección.
9. **Notificaciones**: Registro de avisos escolares, faltas, notas publicadas y respuestas de Dirección.
10. **Mi perfil**: Información del tutor y gestión de vinculaciones registradas.
11. **Cerrar sesión**: Cierre de sesión seguro en Firebase Auth.

---

## 3. Decisiones Arquitectónicas y de Producto

### A. Depuración del Modelo de Roles
- Se retira formalmente la denominación y código referente a `superadmin`.
- Las cuentas administradoras (`condorcethuanca@gmail.com` y UIDs directivos) operan con `role: "director"`.
- Los perfiles en Firestore `/users/{uid}` tendrán exclusivamente `role: "director" | "profesor" | "padre" | "alumno"`.

### B. Persistencia y Cero Datos Simulados
- **Horarios**: Se pueblan en `/schedules` los bloques oficiales de 6.º A de Secundaria y los demás cursos de secundaria para que tanto el profesor como los padres lean la misma fuente de verdad.
- **Asistencias**: Se escriben en `/attendance_sessions/{sessionId}` y se validan contra `/teachers` y matrículas oficiales.
- **Vinculaciones Familiares**: Se gestionan en `/parentStudentLinks` (activas) y `/parentStudentLinkRequests` (pendientes).

---

## 4. Arquitectura Técnica y Modelo de Datos

### Diagrama del Sistema

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                          SIGAE CLIENTE (REACT + TS)                             │
├─────────────────────────┬───────────────────────────┬───────────────────────────┤
│  Panel Director         │  Panel Profesor           │  Panel Familia            │
│  (10 Módulos de Gestión)│  (12 Vistas Pedagógicas)  │  (11 Vistas de Tutor)     │
└────────────┬────────────┴─────────────┬─────────────┴─────────────┬─────────────┘
             │                          │                           │
             ▼                          ▼                           ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                  CAPA DE SERVICIOS INSTITUCIONALES (FRONTEND)                   │
├───────────────────┬───────────────────┬───────────────────┬─────────────────────┤
│ authService.ts    │ scheduleService   │ studentService.ts │ attendanceService.ts│
│ (Login/Roles)     │ (Horarios 6.° A)  │ (Padrón/Vínculos) │ (Control Diario)    │
└────────────┬──────┴─────────────┬─────┴─────────────┬─────┴─────────────┬───────┘
             │                    │                   │                   │
             ▼                    ▼                   ▼                   ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│               CLOUD FIRESTORE & FIREBASE AUTHENTICATION (BACKEND)               │
├─────────────────────────────────────────────────────────────────────────────────┤
│ • /users/{uid}                    • /attendance_sessions/{sessionId}            │
│ • /teachers/{teacherId}           • /parentStudentLinks/{linkId}                │
│ • /students/{studentId}           • /parentStudentLinkRequests/{reqId}          │
│ • /schedules/{scheduleId}         • /familyLinkInvitations/{code}               │
│ • /grades/{courseId}              • /messages/{messageId}                       │
│ • /announcements/{announcementId} • /audit_logs/{logId}                         │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Plan de Ejecución por Fases (Checkpoints)

1. **Fase 1: Alineación de Roles y Limpieza de Tipos**:
   - Ajustar `src/types.ts` y `src/firebase/authService.ts` para eliminar la referencia activa a `superadmin`, consolidando el rol en `director`.
   - Revalidar la resolución de credenciales y navegación en `App.tsx`.
2. **Fase 2: Horario Oficial de 6.º A en Firestore**:
   - Registrar la cuadrícula horaria de 6.º A en `src/firebase/scheduleService.ts` y sembrarla en `/schedules`.
3. **Fase 3: Panel Docente Modular Completo (12 Vistas)**:
   - Implementar el layout de navegación lateral con las 12 secciones oficiales.
   - Conectar "Mis clases de hoy", "Mis cursos", "Listas de estudiantes", "Mi horario", "Asistencia", "Calificaciones", "Comunicados", "Mensajería", "Notificaciones" y "Mi perfil" con Firebase real.
4. **Fase 4: Panel Familiar Modular Completo (11 Vistas)**:
   - Implementar el layout familiar con selector dinámico de hijo activo.
   - Conectar las 11 vistas: "Inicio", "Mis hijos", "Horario escolar (6.º A)", "Asistencia", "Calificaciones", "Comunicados", "Mensajería", "Vincular otro hijo", "Notificaciones", "Mi perfil" y "Cerrar sesión".
5. **Fase 5: Seguridad, Reglas y Pruebas Unitarias/E2E**:
   - Actualizar y desplegar `firestore.rules` si se requieren permisos adicionales para mensajería o comunicados.
   - Ejecutar la suite de auditoría técnica (`npm run test:logic` y `npm run test:backend`).
   - Verificar compilación (`npm run build`) y linting (`npm run lint`).
