# SIGAE — ARQUITECTURA TÉCNICA INSTITUCIONAL
## Sistema Integral de Gestión Académica Escolar
**Unidad Educativa «Luis Espinal Tarde de Collpani» (El Alto, Bolivia · SIE: 80730142)**  
*Gestión Académica Oficial: 2026*

---

## 1. INTRODUCCIÓN Y PRINCIPIOS DE ARQUITECTURA

SIGAE es una plataforma de gestión académica integral diseñada para responder a la realidad institucional de la U.E. Luis Espinal Tarde de Collpani. Opera sobre una arquitectura moderna basada en **React 19**, **TypeScript**, **Firebase Authentication** y **Cloud Firestore**, garantizando:

1. **Cero confianza en el cliente (Zero-Trust RBAC):** Los roles y permisos (`director`, `profesor`, `padre`, `alumno`) están estrictamente encapsulados en el servidor y validados mediante reglas de seguridad de Firestore (`firestore.rules`). Ningún cliente puede autoasignarse roles ni escalar privilegios.
2. **Patrón Singleton y Centralización de SDK:** La inicialización de Firebase está centralizada en `src/firebase/config.ts`. No existen clientes redundantes ni escuchas huérfanas al cerrar sesión.
3. **Integridad de Datos Reales:** Se prohíbe el uso de datos simulados o autogeneración destructiva de horarios en el arranque de la aplicación.
4. **Respeto a la Normativa Educativa Boliviana (Ley 070 Avelino Siñani - Elizardo Pérez):** Dimensiones evaluativas (*Saber*, *Hacer*, *Ser y Decidir*, *Autoevaluación*), gestión de 24 cursos de secundaria (1.° a 6.°, paralelos A, B, C, D) y Kárdex institucional en 4 niveles de severidad.

---

## 2. DIAGRAMAS DE ARQUITECTURA (MERMAID)

### 2.1 Diagrama 1: Visión General del Sistema (System Overview)

Muestra la interacción entre las capas de usuario, el frontend React con TypeScript, los servicios de aplicación y los servicios backend de Firebase.

```mermaid
graph TD
    subgraph Usuarios["Actores Institucionales"]
        DIR["Director Titular"]
        PROF["Profesor / Docente"]
        PAD["Padre / Madre / Tutor"]
        ALU["Estudiante / Alumno"]
    end

    subgraph Frontend["Capa de Presentación (React SPA + Tailwind CSS)"]
        UI_AUTH["AuthScreen / LoginModal"]
        UI_DIR["DirectorPanel"]
        UI_PROF["TeacherPortalView"]
        UI_FAM["FamilyPortalView"]
        UI_ALU["AlumnoDashboard / DashboardLayout"]
        UI_CAL["UnifiedSchoolCalendar (Android Dark Style)"]
        UI_SCHED["OfficialScheduleManager (24 Cursos Secundaria)"]
        UI_KDX["Módulos Kárdex (Teacher / Family / Director)"]
        UI_NOTIF["NotificationBellDropdown (4 Códigos de Color)"]
    end

    subgraph Services["Servicios de Negocio (TypeScript / src/firebase)"]
        AUTH_SVC["authService"]
        DIR_SVC["directorService"]
        SCHED_SVC["scheduleService"]
        STUD_SVC["studentService"]
        ATT_SVC["attendanceService"]
        MSG_SVC["messagingService"]
        CAL_SVC["calendarService"]
        KDX_SVC["kardexService"]
        NOTIF_SVC["notificationService"]
    end

    subgraph Backend["Capa de Persistencia y Seguridad (Firebase)"]
        FB_AUTH["Firebase Authentication (Email/Password & Google)"]
        CF_USERS[("Firestore: /users")]
        CF_TEACHERS[("Firestore: /teachers")]
        CF_STUDENTS[("Firestore: /students")]
        CF_LINKS[("Firestore: /parent_student_links")]
        CF_SCHED[("Firestore: /schedules")]
        CF_ATT[("Firestore: /attendance_sessions")]
        CF_MSG[("Firestore: /messages")]
        CF_EVENTS[("Firestore: /calendar_events")]
        CF_NOTIF[("Firestore: /notifications")]
        CF_KDX[("Firestore: /kardex_records")]
        RULES["Reglas de Seguridad (firestore.rules)"]
    end

    DIR --> UI_DIR
    PROF --> UI_PROF
    PAD --> UI_FAM
    ALU --> UI_ALU

    UI_DIR --> UI_CAL & UI_SCHED & UI_KDX & UI_NOTIF
    UI_PROF --> UI_CAL & UI_KDX & UI_NOTIF
    UI_FAM --> UI_CAL & UI_KDX & UI_NOTIF
    UI_ALU --> UI_CAL & UI_NOTIF

    UI_AUTH --> AUTH_SVC
    UI_DIR --> DIR_SVC & SCHED_SVC & MSG_SVC & KDX_SVC
    UI_PROF --> SCHED_SVC & STUD_SVC & ATT_SVC & KDX_SVC & NOTIF_SVC
    UI_FAM --> STUD_SVC & KDX_SVC & NOTIF_SVC
    UI_ALU --> STUD_SVC & SCHED_SVC & NOTIF_SVC

    AUTH_SVC --> FB_AUTH & CF_USERS
    DIR_SVC --> CF_TEACHERS & CF_USERS
    SCHED_SVC --> CF_SCHED
    STUD_SVC --> CF_STUDENTS & CF_LINKS
    ATT_SVC --> CF_ATT
    MSG_SVC --> CF_MSG & NOTIF_SVC
    CAL_SVC --> CF_EVENTS & CF_MSG
    KDX_SVC --> CF_KDX & NOTIF_SVC
    NOTIF_SVC --> CF_NOTIF

    Backend --- RULES
```

---

### 2.2 Diagrama 2: Flujo de Autenticación y Verificación de Roles (RBAC)

Representa el proceso riguroso de inicio de sesión, validación de estado activo, verificación de nómina y derivación al panel autorizado.

```mermaid
sequenceDiagram
    autonumber
    actor U as Usuario
    participant AS as AuthScreen
    participant FA as Firebase Auth
    participant SVC as authService
    participant FS as Firestore (/users & /teachers)
    participant APP as App Router

    U->>AS: Ingresa Credenciales (Email + Password o Google)
    AS->>FA: signInWithEmailAndPassword / signInWithPopup
    FA-->>AS: Retorna UserCredential (UID, email)

    AS->>SVC: getUserProfile(uid)
    SVC->>FS: Consulta doc(/users/{uid})
    
    alt Usuario no existe en /users
        SVC-->>AS: Retorna null (Requiere registro institucional previo)
        AS->>U: Muestra "Cuenta no autorizada en nómina institucional"
    else Usuario existe
        FS-->>SVC: Documento SigaeUser { role, active, approvalStatus, ... }
        
        alt Rol == 'profesor'
            SVC->>FS: Verifica /teachers vinculado
            alt approvalStatus == 'pendiente' o active == false
                SVC-->>AS: Denegado (Cuenta docente en revisión por Dirección)
                AS->>U: Muestra aviso de espera de aprobación de Dirección
            else Docente activo y autorizado
                SVC-->>APP: Retorna SigaeUser con rol 'profesor'
                APP->>U: Despliega TeacherPortalView (12 Vistas)
            end
        else Rol == 'director'
            SVC->>SVC: Valida UID o Email contra lista estricta institucional
            SVC-->>APP: Retorna SigaeUser con rol 'director'
            APP->>U: Despliega DirectorPanel
        else Rol == 'padre'
            SVC-->>APP: Retorna SigaeUser con rol 'padre'
            APP->>U: Despliega FamilyPortalView
        else Rol == 'alumno'
            SVC-->>APP: Retorna SigaeUser con rol 'alumno'
            APP->>U: Despliega DashboardLayout (Área Académica)
        end
    end
```

---

### 2.3 Diagrama 3: Flujo de Gestión de Horarios y Resolución de Incidencias

Detalla el ciclo de vida de los horarios escolares para los 24 cursos de secundaria, la verificación de bloques y la resolución de conflictos institucionales.

```mermaid
flowchart TD
    START([Inicio: Consulta de Horarios]) --> SELECT_COURSE[Seleccionar Curso: 1.° A a 6.° D - 24 Cursos]
    SELECT_COURSE --> FETCH_DB[(Consultar /schedules en Firestore)]
    
    FETCH_DB --> CHECK_CONFIRMED{¿Horario cargado en DB?}
    
    CHECK_CONFIRMED -- Sí --> RENDER_SCHED[Visualizar Grilla Horaria Oficial]
    CHECK_CONFIRMED -- No --> CHECK_BASE{¿Existe configuración canónica?}
    
    CHECK_BASE -- 6.° A Secundaria --> LOAD_6A[Cargar Horario Confirmado de 6.° A:<br/>• Lunes a Viernes P1-P6<br/>• Martes P3-P4 subdividido en 40 min<br/>• Sábado P1-P6 Técnico/Humanístico]
    CHECK_BASE -- Otros Cursos --> LOAD_EMPTY[Desplegar Vista Pendiente de Importación Oficial]
    
    LOAD_6A --> DETECT_INCIDENCES{Evaluación de Incidencias}
    RENDER_SCHED --> DETECT_INCIDENCES
    LOAD_EMPTY --> DETECT_INCIDENCES

    DETECT_INCIDENCES --> REG_INC[Consultar Registro Oficial de Incidencias:<br/>• INC-4B-01: 4.° B Viernes P5-P6 Pendiente<br/>• INC-6C-01: 6.° C Miércoles P5-P6 Cruce Física/Filosofía]

    REG_INC --> RES_ACTION{¿Acción del Director?}
    RES_ACTION -- Resolver Incidencia --> MODAL_RES[DirectorPanel: Modal de Resolución Administrativa]
    MODAL_RES --> UPDATE_INC[(Guardar en Firestore: resolved=true, resolutionNote)]
    UPDATE_INC --> REFRESH_VIEW[Actualizar Grilla sin conflictos]

    RES_ACTION -- Importar Archivo Excel --> SAFE_IMPORT[Modal de Importación Segura:<br/>Validación previa de hojas, bloques, docentes y paralelos]
    SAFE_IMPORT --> PREVIEW[Presentar Vista Previa Diferencial]
    PREVIEW --> CONFIRM_SAVE[(Guardar en /schedules sin duplicados ni auto-seed)]
```

---

### 2.4 Diagrama 4: Flujo de Mensajería, Comunicaciones y Notificaciones

Describe la resolución y deduplicación de destinatarios, el modal de confirmación obligatoria en dos pasos y el sistema de notificaciones con código de color institucional.

```mermaid
sequenceDiagram
    autonumber
    actor EM as Emisor (Director o Profesor)
    participant MOD as NewCommunicationModal
    participant SVC_MSG as messagingService
    participant SVC_NOTIF as notificationService
    participant FS as Cloud Firestore (/messages & /notifications)
    actor REC as Destinatarios (Padres / Docentes / Alumnos)

    EM->>MOD: Paso 1: Redacta mensaje (Tipo, Prioridad, Asunto, Contenido)
    EM->>MOD: Selecciona grupo de destino (ej: 'course_parents', Curso: 6A)
    
    MOD->>SVC_MSG: resolveRecipients('course_parents', '6A')
    SVC_MSG->>FS: Consulta /parent_student_links y /students
    SVC_MSG->>SVC_MSG: Deduplicación (Padres con múltiples hijos reciben 1 aviso)
    SVC_MSG-->>MOD: Retorna RecipientResolutionResult (count, sampleNames, recipientUids)

    EM->>MOD: Clic en "Continuar a Confirmación"
    MOD->>MOD: Paso 2: Despliega Pantalla de Confirmación Obligatoria
    Note over MOD: Muestra destinatarios reales (ej: 32 padres), asunto y resumen

    EM->>MOD: Clic en "Confirmar y Enviar Inmediatamente"
    MOD->>SVC_MSG: sendMessage(messageData, recipientUids)
    
    SVC_MSG->>FS: doc(/messages/{id}).set(status='enviado', readBy=[])
    
    SVC_MSG->>SVC_NOTIF: createBatchNotifications(recipientUids, notifData)
    Note over SVC_NOTIF: Aplica Código de Color por Rol:<br/>• Rojo (#EF4444): Dirección<br/>• Azul (#3B82F6): Profesor<br/>• Verde (#10B981): Padre<br/>• Morado (#A855F7): Alumno
    
    SVC_NOTIF->>FS: Guardar documentos en /notifications con read=false
    
    FS-->>REC: NotificationBellDropdown detecta nueva notificación (polling 15s)
    REC->>REC: Abre notificación y pulsa "Marcar como leída"
    REC->>SVC_NOTIF: markAsRead(notificationId)
    SVC_NOTIF->>FS: doc(/notifications/{id}).update(read=true, readAt=now)
```

---

### 2.5 Diagrama 5: Flujo Integral de Kárdex Institucional

Especifica la creación de anotaciones en los 4 niveles de severidad institucional, el despacho de alertas prioritarias, la respuesta y descargo familiar y la resolución administrativa de Dirección.

```mermaid
flowchart TD
    subgraph Creacion["1. Registro Docente (TeacherKardexView)"]
        DOC_IN[Profesor selecciona curso y estudiante] --> LVL_SEL[Seleccionar Nivel Institucional:<br/>• Nivel 1: Informativo<br/>• Nivel 2: Llamada de atención<br/>• Nivel 3: Atención familiar<br/>• Nivel 4: Atención prioritaria / Dirección]
        LVL_SEL --> DET_FORM[Completar: Área, Asunto, Hechos, Medida Pedagógica]
        DET_FORM --> SAVE_KDX[(Guardar en Firestore: /kardex_records)]
    end

    subgraph Severidad["2. Protocolo de Notificaciones según Severidad"]
        SAVE_KDX --> EVAL_LVL{Nivel de Severidad}
        EVAL_LVL -- Nivel 1 o 2 --> REG_ONLY[Registrado en expediente del estudiante]
        EVAL_LVL -- Nivel 3 --> NOTIF_FAM[Notificación de ALTA PRIORIDAD a Tutores Vinculados]
        EVAL_LVL -- Nivel 4 --> NOTIF_ALL[Alerta URGENTE a Dirección y Tutores Legales]
        
        NOTIF_FAM --> DB_NOTIF_FAM[(Crear /notifications para padres - Color Azul Profesor)]
        NOTIF_ALL --> DB_NOTIF_FAM
        NOTIF_ALL --> DB_NOTIF_DIR[(Crear /notifications para Dirección - Color Azul Profesor)]
    end

    subgraph Familia["3. Intervención Familiar (FamilyKardexView)"]
        DB_NOTIF_FAM --> PADRE_VIEW[Padre consulta Kárdex en Portal de la Familia]
        PADRE_VIEW --> CHECK_SIG{Requiere firma / descargo}
        CHECK_SIG -- Sí --> MODAL_PADRE[Modal: Acuse y Compromiso del Tutor]
        MODAL_PADRE --> SUBMIT_ACK[Registrar compromiso escrito y firma digital]
        SUBMIT_ACK --> UPDATE_KDX_FAM[(Actualizar /kardex_records:<br/>familyAcknowledged=true, familyResponseNote)]
        UPDATE_KDX_FAM --> NOTIF_DOC_BACK[(Notificar al Docente - Color Verde Padre)]
    end

    subgraph Direccion["4. Resolución Directiva (DirectorKardexView)"]
        DB_NOTIF_DIR --> DIR_VIEW[Director audita casos críticos y Nivel 4]
        DIR_VIEW --> RESOLVE_FORM[Modal: Resolución Administrativa de Dirección]
        RESOLVE_FORM --> UPDATE_KDX_DIR[(Actualizar /kardex_records:<br/>directionResolution, status='cerrado')]
        UPDATE_KDX_DIR --> NOTIF_CLOSE[(Notificar a Docente y Familia - Color Rojo Dirección)]
    end
```

---

### 2.6 Diagrama 6: Modelo de Datos Cloud Firestore (Entity-Relationship)

Detalla la estructura de colecciones, campos y relaciones clave del sistema SIGAE.

```mermaid
erDiagram
    USERS ||--o{ TEACHERS : "vinculado a expediente"
    USERS ||--o{ PARENT_STUDENT_LINKS : "posee vínculos"
    STUDENTS ||--o{ PARENT_STUDENT_LINKS : "es vinculado a"
    COURSES ||--o{ SCHEDULES : "contiene bloques de"
    COURSES ||--o{ ATTENDANCE_SESSIONS : "sesiones diarias de"
    STUDENTS ||--o{ ATTENDANCE_RECORDS : "asistencia individual"
    ATTENDANCE_SESSIONS ||--o{ ATTENDANCE_RECORDS : "incluye registros de"
    STUDENTS ||--o{ KARDEX_RECORDS : "expediente disciplinario"
    USERS ||--o{ KARDEX_RECORDS : "docente emisor"
    USERS ||--o{ NOTIFICATIONS : "destinatario de aviso"
    USERS ||--o{ MESSAGES : "emisor / autor"

    USERS {
        string uid PK
        string email
        string displayName
        string role "director | profesor | padre | alumno"
        string teacherId FK
        string ci
        string phone
        boolean active
        string approvalStatus "pendiente | aprobada | rechazada"
        string createdAt
    }

    TEACHERS {
        string id PK "tch-XXXXXX"
        string authUid FK
        string fullName
        string email
        string ci
        string specialty
        string status "activo | pendiente_activacion | retirado"
        array assignedCourses
        number totalWeeklyHours
    }

    STUDENTS {
        string id PK "est-80730142-XXX"
        string fullName
        string ci
        string rude
        string courseCode "6A, 1B..."
        string gradeLevel
        string parallel
        array linkedParentUids
        string academicYear "2026"
        string enrollmentStatus "efectivo | inscrito | retirado"
    }

    PARENT_STUDENT_LINKS {
        string id PK "link-XXXXXX"
        string parentUid FK
        string studentId FK
        string studentName
        string studentRude
        string relationship
        string status "activa | revocada"
        string verifiedBy
    }

    SCHEDULES {
        string id PK
        string courseCode "6A, 1B..."
        string dayOfWeek "Lunes...Sábado"
        string startTime "08:00"
        string endTime "09:20"
        number periodNumber "1...6"
        string periodLabel
        string subject
        string teacherName
        string teacherId FK
        boolean isFortyMinuteSplit
        boolean isSaturday
    }

    ATTENDANCE_SESSIONS {
        string id PK "att-6A-2026-03-15"
        string courseCode
        string date "YYYY-MM-DD"
        string shift "tarde"
        string academicYear "2026"
        number totalEnrolled
        number presentCount
        number absentCount
        number lateCount
        number leaveCount
        boolean isLocked
    }

    KARDEX_RECORDS {
        string id PK "kdx-XXXXXX"
        string studentId FK
        string studentName
        string courseCode
        string teacherUid FK
        string teacherName
        string subject
        number level "1 | 2 | 3 | 4"
        string category "disciplina | academico | asistencia | convivencia"
        string title
        string description
        string date "YYYY-MM-DD"
        string actionTaken
        boolean requiresFamilySignature
        boolean familyNotificationSent
        boolean familyAcknowledged
        string familyResponseNote
        boolean directionNotified
        string directionResolution
        string status "registrado | notificado | atendido | cerrado"
    }

    NOTIFICATIONS {
        string id PK "notif-XXXXXX"
        string recipientUid FK
        string senderUid FK
        string senderName
        string senderRole "director | profesor | padre | alumno"
        string title
        string message
        string type "comunicado | kardex | horario | asistencia"
        string relatedId FK
        string priority "normal | prioritario | urgente"
        boolean read
        string readAt
        string createdAt
    }

    MESSAGES {
        string id PK "msg-XXXXXX"
        string senderId FK
        string senderName
        string senderRole "director | profesor | padre | alumno"
        string recipientId "all_parents | course_6A..."
        string subject
        string content
        string type "comunicado | evaluacion | citacion..."
        string priority "normal | prioritario | urgente"
        string eventDate "YYYY-MM-DD"
        string status "borrador | programado | enviado"
        array readBy
        string createdAt
    }
```

---

## 3. ESPECIFICACIÓN DE MÓDULOS INSTITUCIONALES

### 3.1 Catálogo Oficial de los 24 Cursos de Secundaria
El subsistema de educación regular secundaria comprende 24 cursos estructurados en:
- **1.° de Secundaria:** 1A, 1B, 1C, 1D
- **2.° de Secundaria:** 2A, 2B, 2C, 2D
- **3.° de Secundaria:** 3A, 3B, 3C, 3D
- **4.° de Secundaria:** 4A, 4B, 4C, 4D
- **5.° de Secundaria:** 5A, 5B, 5C, 5D
- **6.° de Secundaria:** 6A, 6B, 6C, 6D

### 3.2 Horario Canónico de 6.° A de Secundaria
- **Turno:** Tarde (14:00 - 18:30) y Sábado Mañana (08:00 - 12:15).
- **Martes:** Períodos de 40 minutos en P3 (15:30 - 16:10, Lenguaje) y P4 (16:10 - 16:50, Matemática).
- **Sábado:** Períodos P1-P2 (Lengua Extranjera Inglés), P3-P4 (Biología y Geografía), P5-P6 (Educación Física y Deportes).
- **Incidencias Activas Registradas:**
  - `INC-4B-01`: 4.° B Viernes P5-P6 (Pendiente de validación de aula técnica).
  - `INC-6C-01`: 6.° C Miércoles P5-P6 (Cruce entre Física y Filosofía).

### 3.3 Sistema de Notificaciones con Código de Color por Rol
Cada notificación renderizada en `NotificationBellDropdown` destaca el origen oficial del mensaje:
- **Rojo (#EF4444):** Dirección Institucional (`director`).
- **Azul (#3B82F6):** Profesor / Personal Docente (`profesor`).
- **Verde (#10B981):** Padre / Madre / Tutor Legal (`padre`).
- **Morado (#A855F7):** Estudiante (`alumno`).

---
*Documento aprobado y archivado en SIGAE · Unidad Educativa Luis Espinal Tarde de Collpani (SIE: 80730142).*
