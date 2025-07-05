import Link from 'next/link';
import { useState } from 'react';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-100 via-white to-green-100 px-4">
      <div className="flex w-full max-w-md flex-col items-center rounded-xl bg-white p-8 shadow-xl">
        <h1 className="mb-6 text-3xl font-extrabold text-green-700">Sign Up</h1>
        <form className="flex w-full flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded border p-3 text-lg focus:ring-2 focus:ring-green-400 focus:outline-none"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded border p-3 text-lg focus:ring-2 focus:ring-green-400 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded bg-green-600 py-3 text-lg font-semibold text-white shadow transition hover:bg-green-700"
          >
            Sign Up
          </button>
        </form>
        <p className="mt-6 text-sm text-gray-600">
          Already have an account?{' '}
          <Link href="/auth/signin" className="text-blue-600 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}
