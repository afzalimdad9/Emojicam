import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { getMeetingById, Meeting } from '../../lib/firestoreMeeting';
import Layout from '../../components/Layout';

export default function MeetingDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id || typeof id !== 'string') return;
    getMeetingById(id).then((m) => {
      setMeeting(m);
      setLoading(false);
    });
  }, [id]);

  if (loading)
    return (
      <Layout>
        <div className="flex min-h-screen items-center justify-center">Loading...</div>
      </Layout>
    );
  if (!meeting)
    return (
      <Layout>
        <div className="flex min-h-screen items-center justify-center text-red-600">
          Meeting not found.
        </div>
      </Layout>
    );

  const joinUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <Layout>
      <div className="mx-auto flex w-full max-w-lg flex-col items-center rounded-xl bg-white p-8 shadow-xl">
        <h1 className="mb-2 text-3xl font-extrabold text-blue-700">{meeting.title}</h1>
        <div className="mb-4 text-gray-600">
          {new Date(meeting.startTime.seconds * 1000).toLocaleString()} • {meeting.duration} min
        </div>
        <div className="mb-4 text-gray-700">Participants: {meeting.participants.join(', ')}</div>
        <div className="mb-4 w-full">
          <label className="font-semibold">Meeting Link:</label>
          <input
            type="text"
            value={joinUrl}
            readOnly
            className="mt-1 w-full rounded border bg-gray-100 p-2 text-gray-700"
            onFocus={(e) => e.target.select()}
          />
        </div>
        <div className="mt-4 flex gap-4">
          <button
            onClick={() => navigator.clipboard.writeText(joinUrl)}
            className="rounded bg-blue-600 px-4 py-2 font-semibold text-white transition hover:bg-blue-700"
          >
            Copy Link
          </button>
          <button
            onClick={() => router.push(`/meetings/${id}/call`)}
            className="rounded bg-green-600 px-4 py-2 font-semibold text-white transition hover:bg-green-700"
          >
            Join Call
          </button>
        </div>
      </div>
    </Layout>
  );
}
