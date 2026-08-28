export const INVITE_TOKEN_PATTERN = /^[0-9a-f]{64}$/i;

export function tokenFromHash(hash) {
  if (typeof hash !== "string") return null;
  const match = /^#token=([0-9a-f]{64})$/i.exec(hash);
  return match ? match[1] : null;
}

export function invitationDeepLink(token) {
  if (typeof token !== "string" || !INVITE_TOKEN_PATTERN.test(token)) {
    return null;
  }
  return `posbon://invite?token=${encodeURIComponent(token)}`;
}

export function initializeInviteLanding(
  pageDocument,
  pageLocation,
  schedule,
) {
  const title = pageDocument.getElementById("invite-title");
  const message = pageDocument.getElementById("invite-message");
  const cta = pageDocument.getElementById("invite-cta");
  const note = pageDocument.getElementById("invite-note");
  const token = tokenFromHash(pageLocation.hash);
  const deepLink = token === null ? null : invitationDeepLink(token);

  if (deepLink === null || title === null || message === null || cta === null) {
    if (cta !== null) {
      cta.removeAttribute("href");
      cta.hidden = true;
    }
    if (note !== null) note.hidden = true;
    return null;
  }

  title.textContent = "Откройте приглашение в POSBON";
  message.textContent =
    "Если приложение не открылось автоматически, нажмите кнопку ниже.";
  cta.href = deepLink;
  cta.hidden = false;
  if (note !== null) note.hidden = false;

  schedule(() => pageLocation.assign(deepLink), 100);
  return deepLink;
}

if (typeof document !== "undefined" && typeof location !== "undefined") {
  initializeInviteLanding(
    document,
    location,
    globalThis.setTimeout.bind(globalThis),
  );
}
