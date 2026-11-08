import { createRequire } from 'node:module';
const local = createRequire(import.meta.url);
export function dependency(name) { return local(name); }
export const { z } = dependency('zod');
export const sharp = dependency('sharp');
