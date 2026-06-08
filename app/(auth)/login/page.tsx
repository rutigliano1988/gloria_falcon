import Image from "next/image";
import { signIn } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="w-full max-w-sm">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 space-y-6">
        {/* Logo y nombre */}
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="relative h-20 w-20">
            <Image
              src="/logo.jpg"
              alt="Logo Colegio Gloria Falcón"
              fill
              className="object-contain rounded-full"
            />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">
              Colegio Gloria Falcón
            </h1>
            <p className="text-sm text-gray-500">Sistema de Gestión Escolar</p>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {decodeURIComponent(error)}
          </div>
        )}

        {/* Formulario */}
        <form action={signIn} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Correo electrónico
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="usuario@colegio.com"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="••••••••"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium py-2.5 rounded-lg text-sm transition-colors"
          >
            Ingresar
          </button>
        </form>

        <p className="text-center text-xs text-gray-400">
          Acceso restringido al personal autorizado
        </p>
      </div>
    </div>
  );
}
