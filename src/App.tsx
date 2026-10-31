import React, { useState, useEffect } from 'react';
import {
  SigaeUser,
  AUTHORIZED_DIRECTOR_UID,
  AUTHORIZED_SUPERADMIN_UID,
  AUTHORIZED_DIRECTOR_EMAILS,
  AUTHORIZED_DIRECTOR_UIDS,
  isAuthorizedDirectorOrAdmin,
} from './types';
import { authService } from './firebase/authService';
import { testFirebaseConnection } from './firebase/config';
import { AuthScreen } from './components/AuthScreen';
import { DirectorPanel } from './components/DirectorPanel';
import { TeacherPortalView } from './components/panels/TeacherPortalView';
import { FamilyPortalView } from './components/panels/FamilyPortalView';
import { DashboardLayout } from './components/DashboardLayout';
import { AlumnoDashboard } from './components/panels/AlumnoDashboard';
import { AreaAcademicaView } from './components/panels/AreaAcademicaView';
import { MensajeriaVisual } from './components/panels/MensajeriaVisual';
import { PerfilView } from './components/panels/PerfilView';
import { AccessDeniedNotice } from './components/AccessDeniedNotice';

export default function App() {
  // Navigation view: 'login' | 'register' | 'dashboard'
  const [currentView, setCurrentView] = useState<'login' | 'register' | 'dashboard'>('login');

  // Authenticated user state
  const [sigaeUser, setSigaeUser] = useState<SigaeUser | null>(null);

  // Active tab for student portal
  const [studentPortalTab, setStudentPortalTab] = useState<'inicio' | 'academico' | 'mensajeria' | 'perfil'>('inicio');

  // Firebase connection status
  const [, setIsFirebaseConnected] = useState(true);

  // Listen to Firebase Authentication state changes
  useEffect(() => {
    testFirebaseConnection().then(res => setIsFirebaseConnected(res));

    const unsubscribe = authService.onAuthChange(user => {
      if (user) {
        // Docente pendiente de aprobación o inactivo: no debe ingresar al panel docente
        if (user.role === 'profesor' && (!user.active || user.approvalStatus === 'pendiente')) {
          setSigaeUser(null);
          setCurrentView('login');
          return;
        }
        setSigaeUser(user);
        setCurrentView('dashboard');
      } else {
        setSigaeUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  // When user successfully authenticates
  const handleAuthSuccess = (user: SigaeUser) => {
    setSigaeUser(user);
    setCurrentView('dashboard');
  };

  // Logout handler
  const handleLogout = async () => {
    await authService.logout();
    setSigaeUser(null);
    setCurrentView('login');
  };

  // Check if current user is Director
  const isDirector = (user: SigaeUser): boolean => {
    return isAuthorizedDirectorOrAdmin(user);
  };

  return (
    <>
      {/* 1. AUTH SCREEN (INICIO DE SESIÓN INSTITUCIONAL & REGISTRO) */}
      {(currentView === 'login' || currentView === 'register') && (
        <AuthScreen
          initialMode={currentView}
          onLoginSuccess={handleAuthSuccess}
          onGoToHome={() => setCurrentView('login')}
        />
      )}

      {/* 2. AUTHENTICATED ROLES & DEDICATED INSTITUTIONAL PANELS */}
      {currentView === 'dashboard' && sigaeUser && (
        // A. DIRECTOR INSTITUCIONAL
        (sigaeUser.uid === AUTHORIZED_DIRECTOR_UID || sigaeUser.role === 'director' || isDirector(sigaeUser)) ? (
          <DirectorPanel
            currentUser={sigaeUser}
            onLogout={handleLogout}
          />
        ) :
        // B. PROFESOR AUTORIZADO (PORTAL DOCENTE COMPLETO - 12 VISTAS)
        sigaeUser.role === 'profesor' ? (
          <TeacherPortalView
            currentUser={sigaeUser}
            onLogout={handleLogout}
          />
        ) :
        // C. PADRE / MADRE / TUTOR (PORTAL DE LA FAMILIA COMPLETO - 11 VISTAS)
        sigaeUser.role === 'padre' ? (
          <FamilyPortalView
            currentUser={sigaeUser}
            onLogout={handleLogout}
          />
        ) :
        // D. ALUMNO AUTORIZADO
        sigaeUser.role === 'alumno' ? (
          <DashboardLayout
            currentUser={sigaeUser}
            activeTab={studentPortalTab}
            onTabChange={setStudentPortalTab}
            onLogout={handleLogout}
          >
            {studentPortalTab === 'inicio' && (
              <AlumnoDashboard currentUser={sigaeUser} onNavigateToTab={setStudentPortalTab} />
            )}
            {studentPortalTab === 'academico' && (
              <AreaAcademicaView currentUser={sigaeUser} />
            )}
            {studentPortalTab === 'mensajeria' && (
              <MensajeriaVisual currentUser={sigaeUser} />
            )}
            {studentPortalTab === 'perfil' && (
              <PerfilView currentUser={sigaeUser} />
            )}
          </DashboardLayout>
        ) : (
          // E. ACCESO DENEGADO SI NO POSEE ROL VÁLIDO
          <AccessDeniedNotice
            userRole={sigaeUser.role}
            attemptedPanel="Panel Institucional SIGAE (U.E. Luis Espinal Tarde de Collpani)"
            onGoToAuthorizedPanel={handleLogout}
          />
        )
      )}
    </>
  );
}
