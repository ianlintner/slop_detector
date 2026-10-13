/** Error class only: provider/library messages may echo request content. */
export function errorClass(error: unknown): string {
  return error instanceof Error ? error.name : 'UnknownError';
}
