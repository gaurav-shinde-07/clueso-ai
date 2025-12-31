import { useEffect, useRef, RefObject } from 'react';
import { Recording } from '../../../types';

interface UseRecordingSyncProps {
    rec: Recording | null;
    videoRef: RefObject<HTMLVideoElement>;
    audioMode: 'ai' | 'original';
    isPlaying: boolean;
    volume: number;
    setIsPlaying: (isPlaying: boolean) => void;
}

export function useRecordingSync({
    rec,
    videoRef,
    audioMode,
    isPlaying,
    volume,
    setIsPlaying
}: UseRecordingSyncProps) {
    const currentAiAudioRef = useRef<HTMLAudioElement | null>(null);
    const lastPlayedStepRef = useRef<number>(-1);
    const isWaitingForAudioRef = useRef(false);

    // Sync volume changes
    useEffect(() => {
        if (videoRef.current) videoRef.current.volume = volume;
        if (currentAiAudioRef.current) currentAiAudioRef.current.volume = volume;
    }, [volume, videoRef]);

    // Cleanup on unmount/id change
    useEffect(() => {
        return () => {
            if (currentAiAudioRef.current) {
                currentAiAudioRef.current.pause();
                currentAiAudioRef.current = null;
            }
        };
    }, [rec?.id]);

    useEffect(() => {
        const v = videoRef.current;
        if (!v || !rec?.generatedGuide) return;

        const playAiAudioForStep = (index: number) => {
            const step = rec.generatedGuide!.steps[index];
            if (!step?.audio?.audioUrl) return;

            if (currentAiAudioRef.current) currentAiAudioRef.current.pause();

            const audio = new Audio(step.audio.audioUrl);
            audio.volume = volume;
            currentAiAudioRef.current = audio;

            audio.onended = () => {
                if (isWaitingForAudioRef.current && v.paused) {
                    isWaitingForAudioRef.current = false;
                    v.play();
                }
            };

            audio.play().catch(e => console.warn("AI Audio Autoplay blocked", e));
        };

        const handleTimeUpdate = () => {
            const t = v.currentTime * 1000;
            const steps = rec.generatedGuide!.steps;
            const currentStepIndex = steps.findIndex(s => t >= s.timestamp.startMs && t < s.timestamp.endMs);
            const currentStep = steps[currentStepIndex];

            if (audioMode === 'ai' && isPlaying) {
                if (currentStepIndex !== -1 && currentStepIndex !== lastPlayedStepRef.current) {
                    lastPlayedStepRef.current = currentStepIndex;
                    playAiAudioForStep(currentStepIndex);
                }

                if (currentStep && currentAiAudioRef.current && !currentAiAudioRef.current.paused) {
                    const timeRemainingInStep = currentStep.timestamp.endMs - t;
                    if (timeRemainingInStep < 200 && !currentAiAudioRef.current.ended) {
                        isWaitingForAudioRef.current = true;
                        v.pause();
                    }
                }
            }
        };

        const handlePause = () => {
            if (isWaitingForAudioRef.current) return;
            setIsPlaying(false);
            if (audioMode === 'ai' && currentAiAudioRef.current) currentAiAudioRef.current.pause();
        };

        const handlePlay = () => {
            setIsPlaying(true);
            if (audioMode === 'ai' && currentAiAudioRef.current && currentAiAudioRef.current.paused) {
                currentAiAudioRef.current.volume = volume;
                currentAiAudioRef.current.play().catch(e => console.warn("Resume audio blocked", e));
            }
        };

        const handleSeek = () => {
            if (currentAiAudioRef.current) currentAiAudioRef.current.pause();
            lastPlayedStepRef.current = -1;
            isWaitingForAudioRef.current = false;
        };

        v.addEventListener('timeupdate', handleTimeUpdate);
        v.addEventListener('pause', handlePause);
        v.addEventListener('play', handlePlay);
        v.addEventListener('seeking', handleSeek);

        return () => {
            v.removeEventListener('timeupdate', handleTimeUpdate);
            v.removeEventListener('pause', handlePause);
            v.removeEventListener('play', handlePlay);
            v.removeEventListener('seeking', handleSeek);
        };
    }, [rec, audioMode, isPlaying, volume, setIsPlaying, videoRef]);

    return {
        currentAiAudioRef
    };
}
