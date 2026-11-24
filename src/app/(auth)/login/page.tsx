import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <div className="flex w-full flex-1 flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16">
      <div className="mx-auto w-full max-w-md">
        <h2 className="text-2xl font-semibold text-gray-900">Bem-vindo de volta</h2>
        <p className="mt-2 text-sm text-gray-500">
          Acesse o Nexo Assist com seu e-mail corporativo.
        </p>
        <div className="mt-8">
          <LoginForm />
        </div>
      </div>
    </div>
  );
}