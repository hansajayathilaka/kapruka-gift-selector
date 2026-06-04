"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Minimal typings for the Web Speech API (not in the default DOM lib).
interface SpeechRecognitionResultLike {
  0: { transcript: string };
  isFinal: boolean;
}
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: { length: number; [i: number]: SpeechRecognitionResultLike };
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: unknown) => void) | null;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getRecognitionCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

interface UseSpeechOptions {
  /** Called with the final transcript when the user stops speaking. */
  onResult: (text: string) => void;
  lang?: string;
}

export function useSpeech({ onResult, lang = "en-US" }: UseSpeechOptions) {
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [sttSupported, setSttSupported] = useState(false);
  const [ttsSupported, setTtsSupported] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const finalRef = useRef("");
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    setSttSupported(getRecognitionCtor() !== null);
    setTtsSupported(typeof window !== "undefined" && "speechSynthesis" in window);
  }, []);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback(() => {
    const Ctor = getRecognitionCtor();
    if (!Ctor) return;
    // Cancel any prior session.
    recognitionRef.current?.abort();

    const rec = new Ctor();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = true;
    finalRef.current = "";

    rec.onresult = (e) => {
      let interimText = "";
      for (let i = e.resultIndex; i < e.results.length; i += 1) {
        const res = e.results[i];
        if (res.isFinal) finalRef.current += res[0].transcript;
        else interimText += res[0].transcript;
      }
      setInterim(interimText);
    };
    rec.onerror = () => {
      setListening(false);
      setInterim("");
    };
    rec.onend = () => {
      setListening(false);
      setInterim("");
      const text = finalRef.current.trim();
      if (text) onResultRef.current(text);
    };

    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  }, [lang]);

  const toggle = useCallback(() => {
    if (listening) stop();
    else start();
  }, [listening, start, stop]);

  const speak = useCallback((text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.02;
    utter.pitch = 1.05;
    synth.speak(utter);
  }, []);

  const cancelSpeak = useCallback(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  useEffect(() => () => recognitionRef.current?.abort(), []);

  return { listening, interim, sttSupported, ttsSupported, start, stop, toggle, speak, cancelSpeak };
}
