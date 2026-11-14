import { plainTextToDetailsHtml } from "@/lib/task-content";
import {
  appendVoiceNotesToDetailsHtml,
  buildVoiceNoteDetailsSnippet,
  type PendingVoiceNote,
} from "@/lib/task-voice-notes";
import { updateTaskDetails, uploadTaskVoiceNote } from "@/lib/offline/task-repository";

async function buildUploadedSnippets(
  taskId: string,
  voiceNotes: PendingVoiceNote[],
) {
  const snippets: string[] = [];

  for (const note of voiceNotes) {
    const { url } = await uploadTaskVoiceNote(taskId, {
      uri: note.localUri,
      name: `voice-${note.id}.m4a`,
      type: note.mimeType,
    });
    snippets.push(
      buildVoiceNoteDetailsSnippet(url, note.id, note.durationMs),
    );
  }

  return snippets;
}

export async function appendVoiceNotesToTaskDetails(
  taskId: string,
  currentDetailsHtml: string,
  voiceNotes: PendingVoiceNote[],
): Promise<string> {
  if (voiceNotes.length === 0) {
    return currentDetailsHtml;
  }

  const snippets = await buildUploadedSnippets(taskId, voiceNotes);
  const details = appendVoiceNotesToDetailsHtml(
    currentDetailsHtml.trim(),
    snippets,
  );
  await updateTaskDetails(taskId, details);
  return details;
}

export async function persistVoiceNotesForTask(
  taskId: string,
  descriptionPlain: string,
  voiceNotes: PendingVoiceNote[],
) {
  if (voiceNotes.length === 0) {
    return;
  }

  const baseHtml = descriptionPlain.trim()
    ? plainTextToDetailsHtml(descriptionPlain, "")
    : "";

  await appendVoiceNotesToTaskDetails(taskId, baseHtml, voiceNotes);
}
