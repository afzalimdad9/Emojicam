import { getProviders, signIn, ClientSafeProvider } from 'next-auth/react';
import { GetServerSideProps } from 'next';
import Link from 'next/link';

interface SignInProps {
  providers: Record<string, ClientSafeProvider>;
  error: string | null;
}

export default function SignIn({ providers, error }: SignInProps) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-100 via-white to-green-100 px-4">
      <div className="flex w-full max-w-md flex-col items-center rounded-xl bg-white p-8 shadow-xl">
        <h1 className="mb-6 text-3xl font-extrabold text-blue-700">Sign in to Emojicam</h1>
        {error && (
          <div className="mb-4 w-full rounded bg-red-100 px-4 py-2 text-center text-red-700">
            {error === 'EmailSignin'
              ? 'Email sign-in failed. Please check your email or try again.'
              : 'Authentication error. Please try again.'}
          </div>
        )}
        <div className="flex w-full flex-col gap-4">
          {Object.values(providers).map((provider) => (
            <button
              key={provider.name}
              onClick={() => signIn(provider.id)}
              className="w-full rounded bg-blue-600 py-3 text-lg font-semibold text-white shadow transition hover:bg-blue-700"
            >
              Sign in with {provider.name}
            </button>
          ))}
        </div>
        <p className="mt-6 text-sm text-gray-600">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-green-600 hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </main>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const providers = await getProviders();
  const error = context.query.error || null;
  return {
    props: { providers, error },
  };
};
