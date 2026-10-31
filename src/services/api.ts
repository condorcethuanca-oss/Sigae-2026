import { Course, CourseGradebook, StudentGrade, AttendanceRecord, User, SentimentAnalysisReport } from '../types';
import { auth } from '../firebase/config';

let currentAuthToken: string | null = null;

// Initialize token from storage if available
if (typeof window !== 'undefined') {
  currentAuthToken = sessionStorage.getItem('sigae_auth_token') || localStorage.getItem('sigae_auth_token');
}

async function getAuthHeaders(explicitToken?: string): Promise<Record<string, string>> {
  const headers: Record<string, string> = {};

  if (explicitToken) {
    headers['Authorization'] = `Bearer ${explicitToken}`;
    return headers;
  }

  // Si hay un usuario conectado mediante Firebase Authentication, obtener su ID token verificado
  if (auth.currentUser) {
    try {
      const fbToken = await auth.currentUser.getIdToken();
      if (fbToken) {
        headers['Authorization'] = `Bearer ${fbToken}`;
        return headers;
      }
    } catch {
      // Si falla obtener token de Firebase, usar token de sesión local
    }
  }

  if (currentAuthToken) {
    headers['Authorization'] = `Bearer ${currentAuthToken}`;
  }

  return headers;
}

export const api = {
  setToken(token: string | null) {
    currentAuthToken = token;
    if (typeof window !== 'undefined') {
      if (token) {
        sessionStorage.setItem('sigae_auth_token', token);
      } else {
        sessionStorage.removeItem('sigae_auth_token');
        localStorage.removeItem('sigae_auth_token');
      }
    }
  },

  getToken(): string | null {
    return currentAuthToken;
  },

  async getConfig() {
    const res = await fetch('/api/config');
    if (!res.ok) throw new Error('Error al obtener configuración institucional');
    return res.json();
  },

  async getAuthStatus() {
    const res = await fetch('/api/auth/status');
    if (!res.ok) throw new Error('Error al obtener estado de autenticación del servidor');
    return res.json();
  },

  async login(payload: { email: string; role: string; schoolCode: string; teacherPin?: string }) {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      const err = new Error(data.error || 'Fallo de autenticación') as any;
      err.requiresPin = data.requiresPin;
      err.status = data.status;
      throw err;
    }
    if (data.token) {
      this.setToken(data.token);
    }
    return data;
  },

  logout() {
    this.setToken(null);
  },

  async getUsers(role?: string, token?: string): Promise<User[]> {
    const authHeaders = await getAuthHeaders(token);
    const url = role ? `/api/users?role=${role}` : '/api/users';
    const res = await fetch(url, { headers: authHeaders });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al cargar usuarios');
    }
    return res.json();
  },

  async registerUser(userData: Partial<User>, token?: string) {
    const authHeaders = await getAuthHeaders(token);
    const res = await fetch('/api/users/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(userData),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al registrar usuario');
    }
    return res.json();
  },

  async getCourses(token?: string): Promise<Course[]> {
    const authHeaders = await getAuthHeaders(token);
    const res = await fetch('/api/courses', { headers: authHeaders });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al cargar cursos');
    }
    return res.json();
  },

  async getGradebook(courseId: string, _user?: { id: string; role: string }, token?: string): Promise<CourseGradebook> {
    const authHeaders = await getAuthHeaders(token);
    const res = await fetch(`/api/grades/${courseId}`, { headers: authHeaders });
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.error || 'Error al obtener registro de calificaciones');
    }
    return res.json();
  },

  async updateStudentGrade(
    courseId: string,
    studentId: string,
    data: { scores: Record<string, number | null>; teacherFeedback?: string; teacherPin?: string },
    token?: string
  ): Promise<{ success: boolean; grade: StudentGrade; message: string }> {
    const authHeaders = await getAuthHeaders(token);
    const res = await fetch(`/api/grades/${courseId}/student/${studentId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Error al guardar calificación');
    return result;
  },

  async togglePublishGrades(
    courseId: string,
    publish: boolean,
    teacherPin: string,
    token?: string
  ): Promise<{ success: boolean; isPublishedToSchool: boolean; message: string }> {
    const authHeaders = await getAuthHeaders(token);
    const res = await fetch(`/api/grades/${courseId}/publish`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ publish, teacherPin }),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Error al actualizar estado de publicación');
    return result;
  },

  async getStudentReportCard(studentId: string, token?: string) {
    const authHeaders = await getAuthHeaders(token);
    const res = await fetch(`/api/students/${studentId}/report-card`, { headers: authHeaders });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al obtener boleta de calificaciones');
    }
    return res.json();
  },

  async getParentChildren(parentId: string, token?: string) {
    const authHeaders = await getAuthHeaders(token);
    const res = await fetch(`/api/parents/${parentId}/children`, { headers: authHeaders });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al obtener lista de hijos');
    }
    return res.json();
  },

  async getAttendance(courseId?: string, date?: string, token?: string): Promise<AttendanceRecord[]> {
    const authHeaders = await getAuthHeaders(token);
    const params = new URLSearchParams();
    if (courseId) params.append('courseId', courseId);
    if (date) params.append('date', date);
    const res = await fetch(`/api/attendance?${params.toString()}`, { headers: authHeaders });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al obtener asistencia');
    }
    return res.json();
  },

  async saveAttendance(payload: { date: string; courseId: string; records: any[] }, token?: string) {
    const authHeaders = await getAuthHeaders(token);
    const res = await fetch('/api/attendance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al registrar asistencia');
    }
    return res.json();
  },

  async analyzeSentiment(rawText?: string, token?: string): Promise<SentimentAnalysisReport> {
    const authHeaders = await getAuthHeaders(token);
    const res = await fetch('/api/sentiment/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders,
      },
      body: JSON.stringify({ rawText }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al procesar lote de comentarios');
    }
    return res.json();
  },

  async getSampleSentiment(token?: string): Promise<{ sample: string }> {
    const authHeaders = await getAuthHeaders(token);
    const res = await fetch('/api/sentiment/sample', { headers: authHeaders });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Error al obtener muestra de opiniones');
    }
    return res.json();
  },
};
