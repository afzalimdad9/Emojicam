import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-100 via-white to-green-100 px-4">
      <section className="w-full max-w-2xl py-16 text-center">
        <h1 className="mb-4 text-5xl font-extrabold text-blue-800 drop-shadow-lg">
          Welcome to Emojicam
        </h1>
        <p className="mb-8 text-xl text-gray-700">
          A modern video call and meeting platform for teams, professionals, and educators.
        </p>
        <nav className="mb-8 flex flex-wrap justify-center gap-4">
          <Link
            href="/auth/signin"
            className="rounded bg-blue-600 px-6 py-2 font-semibold text-white shadow transition hover:bg-blue-700"
          >
            Sign In
          </Link>
          <Link
            href="/auth/signup"
            className="rounded bg-green-600 px-6 py-2 font-semibold text-white shadow transition hover:bg-green-700"
          >
            Sign Up
          </Link>
          <Link
            href="/dashboard"
            className="rounded bg-gray-800 px-6 py-2 font-semibold text-white shadow transition hover:bg-gray-900"
          >
            Dashboard
          </Link>
        </nav>
        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
          <div className="flex flex-col items-center rounded-xl bg-white p-6 shadow-lg">
            <span className="mb-2 text-3xl">🎥</span>
            <h2 className="mb-1 text-lg font-bold">Video Meetings</h2>
            <p className="text-sm text-gray-500">Host and join secure video calls with ease.</p>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-white p-6 shadow-lg">
            <span className="mb-2 text-3xl">💬</span>
            <h2 className="mb-1 text-lg font-bold">Real-time Chat</h2>
            <p className="text-sm text-gray-500">Chat and react with emojis during calls.</p>
          </div>
          <div className="flex flex-col items-center rounded-xl bg-white p-6 shadow-lg">
            <span className="mb-2 text-3xl">📅</span>
            <h2 className="mb-1 text-lg font-bold">Scheduling</h2>
            <p className="text-sm text-gray-500">Plan meetings and send calendar invites.</p>
          </div>
        </div>
      </section>
    </main>
  );
}
