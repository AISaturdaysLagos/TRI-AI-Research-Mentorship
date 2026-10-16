import { FirebaseError } from "firebase/app";

const byCode: Record<string, string> = {
  "auth/popup-closed-by-user": "Sign-in was cancelled.",
  "auth/cancelled-popup-request": "Sign-in was cancelled.",
  "auth/popup-blocked": "Allow pop-ups for this site, then try again.",
  "auth/network-request-failed": "Check your connection and try again.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/user-disabled": "This account is disabled.",
  "auth/user-not-found": "Email or password is incorrect.",
  "auth/wrong-password": "Email or password is incorrect.",
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/invalid-login-credentials": "Email or password is incorrect.",
  "auth/email-already-in-use": "An account already uses this email address.",
  "auth/weak-password": "Use a longer password.",
  "auth/too-many-requests": "Too many attempts. Try again later.",
  "auth/account-exists-with-different-credential": "Sign in with the method you used before for this email.",
  "auth/requires-recent-login": "Sign in again, then try that again.",
  "auth/operation-not-allowed": "That sign-in method is not available.",
  "permission-denied": "You do not have access to do that.",
  "firestore/permission-denied": "You do not have access to do that.",
  unauthenticated: "Sign in to continue.",
  "firestore/unauthenticated": "Sign in to continue.",
  unavailable: "This is unavailable right now.",
  "firestore/unavailable": "This is unavailable right now.",
  "not-found": "That record was not found.",
  "firestore/not-found": "That record was not found.",
  "already-exists": "That already exists.",
  "firestore/already-exists": "That already exists.",
  "resource-exhausted": "Too many requests. Try again later.",
  "firestore/resource-exhausted": "Too many requests. Try again later.",
  "deadline-exceeded": "That took too long. Try again.",
  "firestore/deadline-exceeded": "That took too long. Try again.",
  "failed-precondition": "That could not be completed right now.",
  "firestore/failed-precondition": "That could not be completed right now.",
};

function errorCode(err: unknown) {
  if (err instanceof FirebaseError) return err.code;
  if (err && typeof err === "object" && "code" in err && typeof (err as { code: unknown }).code === "string") {
    return (err as { code: string }).code;
  }
  return "";
}

function looksTechnical(message: string) {
  const text = message.trim();
  if (!text) return true;
  if (/^Firebase:/i.test(text)) return true;
  if (/\b(auth|firestore|functions|storage|installations)\/[a-z0-9-]+/i.test(text)) return true;
  if (/Missing or insufficient permissions/i.test(text)) return true;
  if (/PERMISSION_DENIED|UNAUTHENTICATED|NOT_FOUND|RESOURCE_EXHAUSTED/i.test(text)) return true;
  if (/^\s*[{[]/.test(text)) return true;
  if (/https?:\/\/[^\s]+googleapis\.com/i.test(text)) return true;
  if (/\b(RPC|gRPC|HTTP)\b/i.test(text) && /\b\d{3}\b/.test(text)) return true;
  return false;
}

/** Prefer an app-authored message; never show raw Firebase or API noise. */
export function userFacingError(err: unknown, fallback: string) {
  const code = errorCode(err);
  if (code && byCode[code]) return byCode[code];
  if (code) return fallback;

  const message = err instanceof Error ? err.message.trim() : "";
  if (!message) return fallback;
  if (looksTechnical(message)) return fallback;
  return message;
}
