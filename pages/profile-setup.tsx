import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { getUserProfile, setUserProfile } from '../lib/firestoreUser';
import toast from 'react-hot-toast';

export default function ProfileSetup() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [name, setName] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [timeZone, setTimeZone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session?.user?.email) {
      router.replace('/auth/signin');
      return;
    }
    getUserProfile(session.user.email).then((profile) => {
      if (profile) {
        setName(profile.name || '');
        setPhotoURL(profile.photoURL || '');
        setTimeZone(profile.timeZone || '');
      }
      setLoading(false);
    });
  }, [session, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user?.email) return;
    setSaving(true);
    try {
      await setUserProfile(session.user.email, { name, photoURL, timeZone });
      toast.success('Profile saved!');
      setTimeout(() => router.replace('/dashboard'), 1000);
    } catch (err) {
      toast.error('Failed to save profile.');
    }
    setSaving(false);
  };

  if (loading)
    return <div className="flex min-h-screen items-center justify-center">Loading...</div>;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-100 via-white to-green-100 px-4">
      <div className="flex w-full max-w-md flex-col items-center rounded-xl bg-white p-8 shadow-xl">
        <h1 className="mb-6 text-3xl font-extrabold text-blue-700">Set Up Your Profile</h1>
        <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded border p-3 text-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
            required
          />
          <input
            type="url"
            placeholder="Photo URL (optional)"
            value={photoURL}
            onChange={(e) => setPhotoURL(e.target.value)}
            className="rounded border p-3 text-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />
          <input
            type="text"
            placeholder="Time Zone (e.g. America/New_York)"
            value={timeZone}
            onChange={(e) => setTimeZone(e.target.value)}
            className="rounded border p-3 text-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />
          <button
            type="submit"
            className="rounded bg-blue-600 py-3 text-lg font-semibold text-white shadow transition hover:bg-blue-700"
            disabled={saving}
          >
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </div>
    </main>
  );
}
