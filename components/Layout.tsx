import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { useState } from 'react';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-white to-green-50">
      <header className="sticky top-0 z-10 flex w-full items-center justify-between bg-white px-4 py-3 shadow">
        <Link href="/" className="text-2xl font-extrabold tracking-tight text-blue-700">
          Emojicam
        </Link>
        <nav className="hidden items-center gap-6 md:flex">
          <Link href="/dashboard" className="font-medium hover:text-blue-600">
            Dashboard
          </Link>
          <Link href="/meetings" className="font-medium hover:text-blue-600">
            Meetings
          </Link>
          <Link href="/profile" className="font-medium hover:text-blue-600">
            Profile
          </Link>
          <button
            onClick={() => signOut()}
            className="ml-2 rounded bg-red-600 px-4 py-1 text-white transition hover:bg-red-700"
          >
            Sign Out
          </button>
        </nav>
        <div className="flex items-center md:hidden">
          <button onClick={() => setMenuOpen(!menuOpen)} className="focus:outline-none">
            <span className="material-icons text-3xl">menu</span>
          </button>
        </div>
      </header>
      {/* Mobile menu */}
      {menuOpen && (
        <nav className="flex flex-col gap-2 bg-white px-4 py-2 shadow md:hidden">
          <Link
            href="/dashboard"
            className="font-medium hover:text-blue-600"
            onClick={() => setMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            href="/meetings"
            className="font-medium hover:text-blue-600"
            onClick={() => setMenuOpen(false)}
          >
            Meetings
          </Link>
          <Link
            href="/profile"
            className="font-medium hover:text-blue-600"
            onClick={() => setMenuOpen(false)}
          >
            Profile
          </Link>
          <button
            onClick={() => {
              setMenuOpen(false);
              signOut();
            }}
            className="rounded bg-red-600 px-4 py-1 text-white transition hover:bg-red-700"
          >
            Sign Out
          </button>
        </nav>
      )}
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
