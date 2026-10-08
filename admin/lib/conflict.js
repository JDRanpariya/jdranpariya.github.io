// A draft's base can be null: a newly created local file must not silently
// adopt the SHA of a different file that appeared at the same path remotely.
export function draftConflicts(draft, remote) {
  return Boolean(
    draft && draft.content !== remote.content && (draft.sha ?? null) !== (remote.sha ?? null)
  );
}

export function publishedCurrent(active, current, sha) {
  if (current?.path !== active.path) return current;
  return {
    ...current,
    sha,
    draftSha: sha,
    remoteContent: active.content,
    dirty: current.content !== active.content,
    conflict: false,
  };
}

export function conflictedCurrent(active, current, remote) {
  if (current?.path !== active.path) return current;
  return {
    ...current,
    sha: remote.sha,
    draftSha: current.draftSha === undefined ? active.sha : current.draftSha,
    remoteContent: remote.content,
    dirty: current.content !== remote.content,
    conflict: current.content !== remote.content,
  };
}
