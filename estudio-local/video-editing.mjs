// Rendering options stay independent of generation: changing them never calls an AI provider.
export function backgroundFilter(job, {duration, offset = 0}) {
  if (job.style !== 'motion' || job.cameraMotion !== 'gentle') return '[0:v]null';
  const frames = Math.max(1, Math.ceil(duration * 30));
  const elapsed = Math.max(0, Math.round(offset * 30));
  // A single centered push of 2.5% per scene, continuous across subtitle changes.
  // Supersampling reduces integer crop jitter. There is no sideways oscillation.
  return `[0:v]scale=2160:3840,zoompan=z='1+0.025*min(1,(on+${elapsed})/${frames})':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s=1080x1920:fps=30`;
}

export function sceneWindow(time, duration, count, timeline = null) {
  const index = timeline
    ? Math.max(0, timeline.findIndex(s => time >= s.start - .001 && time < s.end))
    : Math.min(Math.max(0, count - 1), Math.floor(time / duration * Math.max(1, count)));
  return {index, start: timeline?.[index]?.start ?? index * duration / Math.max(1, count),
    end: timeline?.[index]?.end ?? (index + 1) * duration / Math.max(1, count)};
}

export function captionCues(audio) {
  const a = audio.alignment;
  const aligned = a?.characters?.length && a.characters.length === a.character_start_times_seconds?.length
    && a.characters.length === a.character_end_times_seconds?.length
    && a.character_start_times_seconds.every(Number.isFinite) && a.character_end_times_seconds.every(Number.isFinite);
  const chars = aligned ? a.characters : Array.from(audio.text || '');
  if (!chars.length) return [{text: '', start: 0, end: audio.duration}];
  const tokens = []; let word = '', start = 0;
  for (let i = 0; i <= chars.length; i++) {
    if (i === chars.length || /\s/u.test(chars[i]) || Array.from(word).length >= 28) {
      if (word) {tokens.push({text: word, start, end: i}); word = '';}
    }
    if (i < chars.length && !/\s/u.test(chars[i])) {if (!word) start = i; word += chars[i];}
  }
  const time = i => Math.max(0, Math.min(audio.duration, aligned
    ? (a.character_start_times_seconds[i] ?? audio.duration) : i / chars.length * audio.duration));
  const groups = []; let group = [];
  for (const token of tokens) {
    const text = [...group, token].map(t => t.text).join(' ');
    // At most two lines of 31 characters, without truncating the spoken text.
    const lines = text.split(/\s+/u).reduce((ls, w) => {
      if ((ls.at(-1) + ' ' + w).trim().length > 31) ls.push(w);
      else ls[ls.length - 1] = (ls.at(-1) + ' ' + w).trim();
      return ls;
    }, ['']);
    if (group.length && (lines.length > 2 || group.length >= 8 || time(token.start) - time(group[0].start) >= 3.2)) {
      groups.push(group); group = [];
    }
    group.push(token);
    if (/[.!?…]$/u.test(token.text)) {groups.push(group); group = [];}
  }
  if (group.length) groups.push(group);
  if (!groups.length) return [{text: '', start: 0, end: audio.duration}];
  return groups.map((g, i) => ({text: g.map(t => t.text).join(' '), start: i ? time(g[0].start) : 0,
    end: i + 1 < groups.length ? time(groups[i + 1][0].start) : audio.duration})).filter(c => c.end > c.start);
}
