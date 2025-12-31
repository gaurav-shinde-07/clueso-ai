import React from 'react';
import { Recording } from '../../../types';

interface RecordingTranscriptProps {
    rec: Recording;
    seekTo: (ms: number) => void;
}

export function RecordingTranscript({ rec, seekTo }: RecordingTranscriptProps) {
    return (
        <div className="max-w-3xl mx-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-6">Full Audio Transcript</h3>
            <div className="prose prose-slate prose-lg">
                {rec.generatedGuide?.steps.map(s => (
                    <span key={s.stepIndex} className="mr-1 hover:bg-yellow-100 cursor-pointer rounded px-0.5 transition-colors" onClick={() => seekTo(s.timestamp.startMs)}>
                        {s.audio.rawTranscript || s.audio.narrationText}
                    </span>
                ))}
                {(!rec.generatedGuide?.steps || rec.generatedGuide.steps.length === 0) && (
                    <p className="text-gray-500 italic">{rec.originalTranscript || "Transcript not available."}</p>
                )}
            </div>
        </div>
    );
}
