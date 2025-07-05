import Link from 'next/link';

export default function AuthError() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-100 via-white to-red-200 px-4">
      <div className="flex w-full max-w-md flex-col items-center rounded-xl bg-white p-8 shadow-xl">
        <h1 className="mb-4 text-3xl font-extrabold text-red-700">Authentication Error</h1>
        <p className="mb-6 text-center text-gray-700">
          Something went wrong with your authentication. Please try again.
        </p>
        <Link
          href="/auth/signin"
          className="rounded bg-blue-600 px-6 py-2 font-semibold text-white shadow transition hover:bg-blue-700"
        >
          Back to Sign In
        </Link>
      </div>
    </main>
  );
}
