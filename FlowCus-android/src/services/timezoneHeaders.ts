function resolveClientTimezoneId(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined;
  } catch {
    return undefined;
  }
}

export function getClientTimezoneHeaders(
  now = new Date(),
  resolveTimezoneId: () => string | undefined = resolveClientTimezoneId,
): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Timezone-Offset': now.getTimezoneOffset().toString(),
  };

  try {
    const timezoneId = resolveTimezoneId()?.trim();
    if (timezoneId) headers['X-Timezone-Id'] = timezoneId;
  } catch {
    // Leave the IANA header out so the backend can use the legacy offset.
  }

  return headers;
}
