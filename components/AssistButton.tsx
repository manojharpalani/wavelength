export interface AssistState {
  loading: boolean;
  error?: string;
}

export function AssistButton({
  state,
  onClick,
  label = "Help me write this",
  loadingLabel = "Polishing…",
}: {
  state: AssistState | undefined;
  onClick: () => void;
  label?: string;
  loadingLabel?: string;
}) {
  return (
    <button type="button" className="assist-btn" disabled={state?.loading} onClick={onClick}>
      {state?.loading ? (
        <>
          <span className="assist-spinner" /> {loadingLabel}
        </>
      ) : (
        <>✨ {label}</>
      )}
    </button>
  );
}
