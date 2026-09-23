interface Props {
  agreedTerms: boolean
  agreedCredentialUse: boolean
  onChange: (v: { agreedTerms: boolean; agreedCredentialUse: boolean }) => void
}

export default function ConsentCheckboxes({ agreedTerms, agreedCredentialUse, onChange }: Props) {
  const box = 'mt-1 h-4 w-4 shrink-0 accent-green-700'
  return (
    <fieldset className="space-y-3">
      <legend className="sr-only">Consent</legend>
      <label className="flex gap-3 text-sm text-green-900">
        <input
          type="checkbox"
          className={box}
          checked={agreedTerms}
          onChange={(e) => onChange({ agreedTerms: e.target.checked, agreedCredentialUse })}
        />
        <span>I have read and agree to the Terms and Privacy Notice.</span>
      </label>
      <label className="flex gap-3 text-sm text-green-900">
        <input
          type="checkbox"
          className={box}
          checked={agreedCredentialUse}
          onChange={(e) => onChange({ agreedTerms, agreedCredentialUse: e.target.checked })}
        />
        <span>
          I authorize USChed to sign in to ISMIS with my credentials and read the offered courses I search for. My
          password is used <strong>once</strong> and not stored; USChed keeps my ISMIS sign-in session in memory until I
          sign out or it times out.
        </span>
      </label>
    </fieldset>
  )
}
