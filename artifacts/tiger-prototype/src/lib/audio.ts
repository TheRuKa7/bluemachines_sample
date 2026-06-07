/** Request microphone permission before starting a VAPI call. */
export async function ensureMicrophoneAccess(): Promise<void> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error("Microphone is not supported in this browser. Use Chrome or Edge on desktop.");
  }

  let stream: MediaStream | null = null;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (err) {
    if (err instanceof DOMException) {
      if (err.name === "NotAllowedError") {
        throw new Error("Microphone access denied. Allow the mic in your browser site settings and try again.");
      }
      if (err.name === "NotFoundError") {
        throw new Error("No microphone found. Connect a mic or check Windows sound settings.");
      }
    }
    throw new Error("Could not access microphone. Check browser permissions and try again.");
  } finally {
    stream?.getTracks().forEach((t) => t.stop());
  }
}

/** Unmute and play VAPI-created remote audio elements (fixes silent output on some browsers). */
export async function resumeVapiAudioOutput(): Promise<void> {
  const players = document.querySelectorAll<HTMLAudioElement>("audio[data-participant-id]");
  await Promise.all(
    Array.from(players).map(async (player) => {
      player.muted = false;
      player.volume = 1;
      try {
        await player.play();
      } catch {
        /* autoplay policy — user gesture already occurred on Start call */
      }
    }),
  );
}
