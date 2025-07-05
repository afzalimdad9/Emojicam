import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { Formik, Form, Field, ErrorMessage } from 'formik';
import { z } from 'zod';
import { createMeeting } from '../../lib/firestoreMeeting';
import { Timestamp } from 'firebase/firestore';
import { useState } from 'react';
import toast from 'react-hot-toast';

const meetingSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  startTime: z.string().min(1, 'Start time is required'),
  duration: z.number().min(1, 'Duration must be at least 1 minute'),
});

type MeetingFormValues = z.infer<typeof meetingSchema>;

export default function NewMeetingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [error, setError] = useState('');

  if (status === 'loading')
    return (
      <Layout>
        <div className="flex min-h-screen items-center justify-center">Loading...</div>
      </Layout>
    );
  if (!session?.user?.email) {
    if (typeof window !== 'undefined') router.replace('/auth/signin');
    return null;
  }

  const initialValues: MeetingFormValues = {
    title: '',
    startTime: '',
    duration: 30,
  };

  return (
    <Layout>
      <div className="mx-auto flex w-full max-w-lg flex-col items-center rounded-xl bg-white p-8 shadow-xl">
        <h1 className="mb-6 text-3xl font-extrabold text-blue-700">Create a New Meeting</h1>
        <Formik
          initialValues={initialValues}
          validate={(values) => {
            try {
              meetingSchema.parse({ ...values, duration: Number(values.duration) });
            } catch (e: any) {
              return e.formErrors?.fieldErrors || {};
            }
            return {};
          }}
          onSubmit={async (values, { setSubmitting }) => {
            setError('');
            if (!session?.user?.email) {
              toast.error('User session not found. Please sign in again.');
              setSubmitting(false);
              return;
            }
            try {
              const meeting = await createMeeting({
                hostId: session.user.email,
                title: values.title,
                startTime: Timestamp.fromDate(new Date(values.startTime)),
                duration: Number(values.duration),
                isActive: true,
                participants: [session.user.email],
              });
              toast.success('Meeting created!');
              setTimeout(() => router.replace(`/meetings/${meeting.id}`), 1000);
            } catch (err) {
              setError('Failed to create meeting.');
              toast.error('Failed to create meeting.');
            }
            setSubmitting(false);
          }}
        >
          {({ isSubmitting }) => (
            <Form className="flex w-full flex-col gap-4">
              <label className="font-semibold">Title</label>
              <Field
                name="title"
                className="rounded border p-3 text-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
              <ErrorMessage name="title" component="div" className="text-sm text-red-600" />

              <label className="font-semibold">Start Time</label>
              <Field
                name="startTime"
                type="datetime-local"
                className="rounded border p-3 text-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
              <ErrorMessage name="startTime" component="div" className="text-sm text-red-600" />

              <label className="font-semibold">Duration (minutes)</label>
              <Field
                name="duration"
                type="number"
                min={1}
                className="rounded border p-3 text-lg focus:ring-2 focus:ring-blue-400 focus:outline-none"
              />
              <ErrorMessage name="duration" component="div" className="text-sm text-red-600" />

              {error && <div className="text-sm text-red-600">{error}</div>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-4 rounded bg-blue-600 py-3 text-lg font-semibold text-white shadow transition hover:bg-blue-700"
              >
                {isSubmitting ? 'Creating...' : 'Create Meeting'}
              </button>
            </Form>
          )}
        </Formik>
      </div>
    </Layout>
  );
}
