// Backend: one generation call <=40s + optional embedding <=8s. Leave time for DB and transport.
export const AI_REQUEST_TIMEOUT_MS = 60_000;
// Read existing seed rooms as well as the current PT + 12 digits format; never generates IDs.
export const ROOM_CHAT_REFERENCE_PATTERN = /^PT(?:\d{10}|\d{12})$/;
