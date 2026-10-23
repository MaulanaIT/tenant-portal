export class HttpError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(status: number, code?: string) {
    super(`HTTP ${status}`);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export async function readErrorCode(
  response: Response,
): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (typeof body === "object" && body !== null && "code" in body) {
      const { code } = body as { code: unknown };
      return typeof code === "string" ? code : undefined;
    }
  } catch {
    return undefined;
  }
  return undefined;
}
