import {access} from 'node:fs/promises';
import {z} from './deps.mjs';
import {renderEpisode, requireStorage} from './render.mjs';

const editingSchema = z.object({
  cameraMotion: z.enum(['none', 'gentle']).default('none'),
  subtitlesEnabled: z.boolean().default(true),
  useMusic: z.boolean().default(false),
  musicId: z.string().uuid().nullable().default(null),
  musicVolume: z.number().min(0).max(100).default(35),
});

export async function prepareReexport(store, job, input) {
  if (job.style === '2d') throw new Error('El ajuste de montaje está disponible para videos con imágenes.');
  if (!['ready', 'paused', 'failed'].includes(job.status)) throw new Error('Termina o pausa la producción antes de reexportar.');
  if (job.scripts.length !== job.episodes || Array.from({length: job.episodes}, (_, i) => i + 1).some(n => !job.audio[n]?.file)) {
    throw new Error('Se necesitan todos los guiones y audios guardados para reexportar sin llamar a proveedores.');
  }
  const editing = editingSchema.parse(input);
  let music = null;
  if (editing.useMusic) {
    const row = store.db.prepare('SELECT data FROM media WHERE id=?').get(editing.musicId);
    music = row && JSON.parse(row.data);
    if (music?.kind !== 'music') throw new Error('Selecciona una pista de música guardada.');
    await access(music.file);
  }
  await requireStorage(job.root);
  for (const audio of Object.values(job.audio)) await access(audio.file);
  return {...job, ...editing, music};
}

export async function reexportSaved(store, job, profile, {render = renderEpisode} = {}) {
  job.renderOnly = true; job.status = 'running'; job.stage = 'render'; job.error = null;
  job.events.unshift({at: new Date().toISOString(), message: 'Reexportando el montaje con imágenes y audio guardados. Sin llamadas a proveedores.'});
  store.saveJob(job);
  try {
    for (let n = 1; n <= job.episodes; n++) {
      job.videos[n] = await render(job, profile, n, job.root);
      store.saveJob(job);
    }
    job.status = 'ready'; job.progress = 100;
    job.events.unshift({at: new Date().toISOString(), message: 'Montaje actualizado. Se conservaron guiones, voces e imágenes.'});
  } catch (error) {
    job.status = 'failed'; job.error = error.message;
    job.events.unshift({at: new Date().toISOString(), message: 'No se completó la reexportación: ' + error.message});
  } finally {job.renderOnly = false; store.saveJob(job);}
}
