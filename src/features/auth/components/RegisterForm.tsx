import React from 'react';
import { Link } from 'react-router-dom';

export interface RegisterFormProps {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  loading: boolean;
  error: string | null;
  onChangeField: (
    field: 'fullName' | 'email' | 'password' | 'confirmPassword',
    value: string,
  ) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const RegisterForm = ({
  fullName,
  email,
  password,
  confirmPassword,
  loading,
  error,
  onChangeField,
  onSubmit,
}: RegisterFormProps) => {
  return (
    <div className="flex items-center justify-center min-h-[80vh]">
      <div className="glass-card w-full max-w-md p-8 animate-fade-in">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-linear-to-br from-primary to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 mx-auto mb-4">
            <span className="text-white font-bold text-2xl">T</span>
          </div>
          <h2 className="text-2xl font-bold text-white">Crear cuenta</h2>
          <p className="text-text-muted text-sm mt-2">Únete para gestionar tus torneos</p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 text-red-200 p-3 mb-6 text-sm rounded-lg flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
            {error}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">
              Nombre completo
            </label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => onChangeField('fullName', e.target.value)}
              className="input-modern"
              placeholder="Tu nombre"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => onChangeField('email', e.target.value)}
              className="input-modern"
              placeholder="tu@email.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => onChangeField('password', e.target.value)}
              className="input-modern"
              placeholder="••••••••"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-1.5">
              Confirmar contraseña
            </label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => onChangeField('confirmPassword', e.target.value)}
              className="input-modern"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex justify-center mt-2"
          >
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>

          <p className="mt-4 text-sm text-center text-text-muted">
            ¿Ya tienes cuenta?{' '}
            <Link
              to="/login"
              className="text-primary hover:text-primary/80 hover:underline transition-colors"
            >
              Inicia sesión
            </Link>
          </p>
        </form>
      </div>
    </div>
  );
};
