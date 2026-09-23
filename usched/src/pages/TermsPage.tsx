import PageTitle from '../components/layout/PageTitle'
import TermsViewer from '../components/consent/TermsViewer'
import { useTerms } from '../api/hooks'

/** Read-only copy of the Terms. Acceptance happens on the ISMIS sign-in panel, every time. */
export default function TermsPage() {
  const terms = useTerms()
  return (
    <section className="mx-auto max-w-3xl">
      <PageTitle title="Terms & Privacy">
        You are asked to accept these each time you sign in to ISMIS. Reading them here does not sign you in to anything.
      </PageTitle>
      {terms.isLoading && <p className="text-green-900/70">Loading the terms…</p>}
      {terms.isError && (
        <p role="alert" className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-800">
          Could not load the terms. Is the USChed server running?
        </p>
      )}
      {terms.data && <TermsViewer text={terms.data.text} version={terms.data.version} />}
    </section>
  )
}
