import React from 'react';
import { Volume2 } from 'lucide-react';
import { Recording } from '../../../types';

interface RecordingGuideProps {
    guide: Recording['generatedGuide'];
    seekTo: (ms: number) => void;
}

export function RecordingGuide({ guide, seekTo }: RecordingGuideProps) {
    if (!guide) {
        return <div className="text-center py-10 text-gray-400">Processing guide...</div>;
    }

    return (
        <div className="max-w-3xl mx-auto space-y-12">
            {guide.steps.map((step) => (
                <div key={step.stepIndex} id={`step-${step.stepIndex}`} className="group relative pl-8 border-l-2 border-gray-100 hover:border-indigo-200 transition-colors pb-8 last:pb-0 last:border-0">
                    <div
                        onClick={() => seekTo(step.timestamp.startMs)}
                        className="absolute -left-[17px] top-0 w-8 h-8 rounded-full bg-white border-2 border-indigo-100 text-indigo-600 font-bold flex items-center justify-center cursor-pointer shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all hover:scale-110"
                    >
                        {step.stepIndex}
                    </div>

                    <div className="space-y-4">
                        <div className="cursor-pointer" onClick={() => seekTo(step.timestamp.startMs)}>
                            <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-700 transition-colors">
                                {step.instruction}
                            </h3>
                            <p className="text-gray-600 mt-2 leading-relaxed">
                                {step.audio.narrationText}
                            </p>
                        </div>

                        {step.screenshotUrl && (
                            <div
                                className="mt-4 rounded-xl border border-gray-100 overflow-hidden shadow-sm cursor-pointer group-hover:shadow-md transition-shadow relative"
                                onClick={() => seekTo(step.timestamp.startMs)}
                            >
                                <img src={step.screenshotUrl} alt={`Step ${step.stepIndex}`} className="w-full h-auto bg-gray-50" />
                                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center">
                                    <span className="bg-black/70 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">Jump to {Math.floor(step.timestamp.startMs / 1000)}s</span>
                                </div>
                            </div>
                        )}

                        {step.audio.audioUrl && (
                            <div className="flex items-center gap-3 mt-3 bg-gray-50 p-2 rounded-lg w-fit">
                                <button onClick={() => {
                                    const a = new Audio(step.audio.audioUrl);
                                    a.play();
                                }} className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-colors">
                                    <Volume2 className="w-4 h-4" />
                                </button>
                                <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">AI Narration</span>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}
