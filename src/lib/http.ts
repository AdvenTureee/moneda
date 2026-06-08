import { NextResponse, type NextResponse as NextResponseType } from 'next/server';

export const SENSITIVE_RESPONSE_HEADERS = {
  'Cache-Control': 'no-store, no-cache, max-age=0, must-revalidate, private',
  Pragma: 'no-cache',
  Expires: '0',
} as const;

export function noStoreJson<T>(
  body: T,
  init?: ResponseInit,
): NextResponseType<T> {
  const response = NextResponse.json(body, init);
  applyNoStoreHeaders(response);
  return response;
}

export function applyNoStoreHeaders(response: Response): Response {
  for (const [key, value] of Object.entries(SENSITIVE_RESPONSE_HEADERS)) {
    response.headers.set(key, value);
  }
  return response;
}
