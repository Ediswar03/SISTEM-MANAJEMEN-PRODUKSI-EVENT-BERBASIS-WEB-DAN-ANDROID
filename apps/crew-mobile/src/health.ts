import { CREW_API_URL } from './config.js';

export function crewHealthUrl(): string {
  return `${CREW_API_URL.replace(/\/$/, '')}/health`;
}
