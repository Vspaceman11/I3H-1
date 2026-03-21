"use client";

import { useCallback, useRef } from "react";

const CACHE_KEY = "pigeon-voice-thankyou";

export function usePigeonVoice() {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const play = useCallback(async () => {
    try {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const audio = new Audio(`data:audio/mpeg;base64,${cached}`);
        audioRef.current = audio;
        await audio.play();
        return;
      }

      const apiKey = process.env.NEXT_PUBLIC_ELEVENLABS_API_KEY;
      const voiceId =
        process.env.NEXT_PUBLIC_ELEVENLABS_VOICE_ID ?? "21m00Tcm4TlvDq8ikWAM";

      if (!apiKey) {
        console.warn("ElevenLabs API key not set, skipping voice");
        return;
      }

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "xi-api-key": apiKey,
          },
          body: JSON.stringify({
            text: "Dankeschön, Bürger! Ihre Meldung wurde erfasst.",
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.5,
              similarity_boost: 0.75,
            },
          }),
        }
      );

      if (!response.ok) {
        console.error("ElevenLabs TTS failed:", response.status);
        return;
      }

      const arrayBuffer = await response.arrayBuffer();
      const base64 = btoa(
        String.fromCharCode(...new Uint8Array(arrayBuffer))
      );

      try {
        sessionStorage.setItem(CACHE_KEY, base64);
      } catch {
        /* storage full — fine, just don't cache */
      }

      const blob = new Blob([arrayBuffer], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      await audio.play();

      audio.addEventListener("ended", () => URL.revokeObjectURL(url));
    } catch (error) {
      console.error("Voice playback failed:", error);
    }
  }, []);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
  }, []);

  return { play, stop };
}
