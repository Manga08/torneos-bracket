import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { RegisterForm } from '../../components/RegisterForm';
import { signUpWithEmailAndPassword } from '../../api/authApi';
import { useAuth } from '../../hooks/useAuth';

export function RegisterPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Si ya está logueado, no tiene sentido registrar de nuevo
  useEffect(() => {
    if (!loading && user) {
      navigate('/');
    }
  }, [user, loading, navigate]);

  const handleChangeField = (field: 'fullName' | 'email' | 'password' | 'confirmPassword', value: string) => {
    if (field === 'fullName') setFullName(value);
    if (field === 'email') setEmail(value);
    if (field === 'password') setPassword(value);
    if (field === 'confirmPassword') setConfirmPassword(value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!email || !password || !fullName) {
      setError('Por favor completa todos los campos requeridos.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    try {
      setSubmitting(true);
      await signUpWithEmailAndPassword(email, password, fullName);

      setSuccessMessage('Cuenta creada. Revisa tu correo para confirmar tu email.');
      // Opcional: redirigir después de unos segundos al login
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    } catch (err: any) {
      console.error('[RegisterPage] signUp error', err);
      setError(err.message ?? 'Error al crear la cuenta.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {successMessage ? (
        <div className="flex items-center justify-center min-h-[80vh]">
          <div className="glass-card w-full max-w-md p-8 animate-fade-in text-center">
            <div className="mb-4 flex justify-center">
              <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">¡Cuenta creada!</h2>
            <p className="text-text-muted mb-6">{successMessage}</p>
            <Link to="/login" className="btn-primary w-full block">
              Ir al Login
            </Link>
          </div>
        </div>
      ) : (
        <RegisterForm
          fullName={fullName}
          email={email}
          password={password}
          confirmPassword={confirmPassword}
          loading={submitting}
          error={error}
          onChangeField={handleChangeField}
          onSubmit={handleSubmit}
        />
      )}
    </>
  );
}
