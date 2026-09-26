'use client'

import { toast } from 'sonner'

export default function ToastDemoPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">Toast Demo</h1>
      <p className="mb-8 text-sm text-neutral-7">
        Preview all toast variants and interactions.
      </p>

      {/* Types */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Types</h2>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-neutral-9 px-4 py-2 text-sm text-neutral-1 hover:bg-neutral-8"
            onClick={() =>
              toast('Hello, world!', {
                description: 'This is a basic toast.',
              })
            }
          >
            Default
          </button>
          <button
            className="rounded-lg bg-green-600 px-4 py-2 text-sm text-white hover:bg-green-700"
            onClick={() =>
              toast.success('Success!', {
                description: 'Operation completed successfully.',
              })
            }
          >
            Success
          </button>
          <button
            className="rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
            onClick={() =>
              toast.error('Error!', {
                description: 'Something went wrong.',
              })
            }
          >
            Error
          </button>
          <button
            className="rounded-lg bg-amber-500 px-4 py-2 text-sm text-white hover:bg-amber-600"
            onClick={() =>
              toast.warning('Warning!', {
                description: 'Please check your input.',
              })
            }
          >
            Warning
          </button>
          <button
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700"
            onClick={() =>
              toast.info('Info', {
                description: 'Here is some information.',
              })
            }
          >
            Info
          </button>
          <button
            className="rounded-lg bg-neutral-7 px-4 py-2 text-sm text-white hover:bg-neutral-8"
            onClick={() => {
              const id = toast.loading('Loading...', {
                description: 'Please wait a moment.',
              })
              setTimeout(() => {
                toast.dismiss(id)
                toast.success('Done!', { description: 'Loading finished.' })
              }, 2000)
            }}
          >
            Loading
          </button>
        </div>
      </section>

      {/* Action + Cancel */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Action &amp; Cancel</h2>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-neutral-9 px-4 py-2 text-sm text-neutral-1 hover:bg-neutral-8"
            onClick={() =>
              toast('Delete file?', {
                description: 'This action cannot be undone.',
                action: {
                  label: 'Delete',
                  onClick: () => toast.success('File deleted.'),
                },
                cancel: {
                  label: 'Cancel',
                  onClick: () => toast.info('Cancelled.'),
                },
              })
            }
          >
            With Action &amp; Cancel
          </button>
          <button
            className="rounded-lg bg-neutral-9 px-4 py-2 text-sm text-neutral-1 hover:bg-neutral-8"
            onClick={() =>
              toast('Update available', {
                description: 'A new version is ready.',
                action: {
                  label: 'Update',
                  onClick: () => toast.success('Updated!'),
                },
              })
            }
          >
            Action Only
          </button>
          <button
            className="rounded-lg bg-neutral-9 px-4 py-2 text-sm text-neutral-1 hover:bg-neutral-8"
            onClick={() =>
              toast('Dismiss me', {
                description: 'Use the cancel button.',
                cancel: {
                  label: 'Dismiss',
                  onClick: () => {},
                },
              })
            }
          >
            Cancel Only
          </button>
        </div>
      </section>

      {/* Durations */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Durations</h2>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-neutral-3 px-4 py-2 text-sm text-neutral-9 hover:bg-neutral-4"
            onClick={() =>
              toast('Quick!', { duration: 1000, description: '1 second.' })
            }
          >
            1s
          </button>
          <button
            className="rounded-lg bg-neutral-3 px-4 py-2 text-sm text-neutral-9 hover:bg-neutral-4"
            onClick={() =>
              toast('Lingering…', {
                duration: 10000,
                description: '10 seconds.',
              })
            }
          >
            10s
          </button>
          <button
            className="rounded-lg bg-neutral-3 px-4 py-2 text-sm text-neutral-9 hover:bg-neutral-4"
            onClick={() =>
              toast('Sticky', {
                duration: Number.POSITIVE_INFINITY,
                description: 'Won’t go away on its own.',
              })
            }
          >
            Infinite
          </button>
        </div>
      </section>

      {/* Rich content */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Rich Content</h2>
        <div className="flex flex-wrap gap-2">
          <button
            className="rounded-lg bg-neutral-3 px-4 py-2 text-sm text-neutral-9 hover:bg-neutral-4"
            onClick={() =>
              toast('Long text toast', {
                description:
                  'This toast has a very long description to test text wrapping and truncation behavior in the toast component layout.',
              })
            }
          >
            Long Description
          </button>
          <button
            className="rounded-lg bg-neutral-3 px-4 py-2 text-sm text-neutral-9 hover:bg-neutral-4"
            onClick={() =>
              toast.warning('Free plan limit', {
                description:
                  'You have used 90% of your free plan quota this month.',
                action: {
                  label: 'Upgrade',
                  onClick: () => toast.success('Redirecting to plans…'),
                },
                cancel: {
                  label: 'Later',
                  onClick: () => {},
                },
              })
            }
          >
            Upgrade Prompt
          </button>
          <button
            className="rounded-lg bg-neutral-3 px-4 py-2 text-sm text-neutral-9 hover:bg-neutral-4"
            onClick={() =>
              toast.error('Upload failed', {
                description:
                  'The file "vacation-photo.png" could not be uploaded. Please check your connection and try again.',
                action: {
                  label: 'Retry',
                  onClick: () => toast.success('Retrying…'),
                },
              })
            }
          >
            Retry Prompt
          </button>
        </div>
      </section>

      {/* Stress test */}
      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold">Stacking</h2>
        <button
          className="rounded-lg bg-neutral-3 px-4 py-2 text-sm text-neutral-9 hover:bg-neutral-4"
          onClick={() => {
            const types = [
              'default',
              'success',
              'error',
              'warning',
              'info',
            ] as const
            types.forEach((type, i) => {
              setTimeout(() => {
                if (type === 'default') {
                  toast(`Toast #${i + 1}`, {
                    description: `This is a ${type} toast.`,
                  })
                } else {
                  toast[type](`Toast #${i + 1}`, {
                    description: `This is a ${type} toast.`,
                  })
                }
              }, i * 150)
            })
          }}
        >
          Fire 5 Toasts
        </button>
      </section>
    </div>
  )
}
