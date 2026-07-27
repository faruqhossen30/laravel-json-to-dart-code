import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { generateDartClasses } from '@/lib/json-to-dart';
import Editor from '@monaco-editor/react';

export default function Welcome() {
    const [jsonInput, setJsonInput] = useState<string>('{\n  "id": 1,\n  "name": "Dart"\n}');
    const [dartOutput, setDartOutput] = useState<string>('');
    const [rootClassName, setRootClassName] = useState<string>('Root');
    const [nullable, setNullable] = useState<boolean>(false);
    const [copyWith, setCopyWith] = useState<boolean>(false);
    const [error, setError] = useState<string>('');

    const fileName = (rootClassName || 'Root').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase() + '.dart';

    // Detect dark mode automatically if possible, otherwise use a default theme
    // For simplicity, we'll just use 'vs-dark' as it looks great, but we can configure it to match the system theme
    const theme = 'vs-dark'; // You can change to 'light' if preferred

    useEffect(() => {
        if (!jsonInput.trim()) {
            setDartOutput('');
            setError('');
            return;
        }
        
        try {
            const result = generateDartClasses(jsonInput, {
                rootClassName: rootClassName || 'Root',
                nullable,
                copyWith,
            });
            if (result.startsWith('// Error')) {
                setError(result.replace('// Error parsing JSON: ', ''));
                setDartOutput('');
            } else if (result.startsWith('// Input is not')) {
                setError(result.replace('// ', ''));
                setDartOutput('');
            } else {
                setError('');
                setDartOutput(result);
            }
        } catch (e: any) {
            setError(e.message);
            setDartOutput('');
        }
    }, [jsonInput, rootClassName, nullable, copyWith]);

    return (
        <>
            <Head title="JSON to Dart Converter" />
            <div className="flex h-screen flex-col bg-[#FDFDFC] dark:bg-[#0a0a0a] text-[#1b1b18] dark:text-[#EDEDEC] font-sans">
                <header className="flex flex-col md:flex-row items-center justify-between border-b border-[#e3e3e0] dark:border-[#3E3E3A] bg-white dark:bg-[#161615] px-6 py-4 shadow-sm z-10">
                    <h1 className="text-xl font-bold text-[#f53003] dark:text-[#FF4433] mb-4 md:mb-0">
                        JSON to Dart
                    </h1>
                    <div className="flex flex-wrap items-center gap-6 text-sm">
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <span className="font-medium text-[#706f6c] dark:text-[#A1A09A]">Root Class:</span>
                            <input
                                type="text"
                                value={rootClassName}
                                onChange={(e) => setRootClassName(e.target.value)}
                                className="rounded-md border border-[#e3e3e0] dark:border-[#3E3E3A] bg-[#FDFDFC] dark:bg-[#0a0a0a] px-3 py-1.5 focus:border-[#f53003] focus:outline-none focus:ring-1 focus:ring-[#f53003]"
                                placeholder="Root"
                            />
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={nullable}
                                onChange={(e) => setNullable(e.target.checked)}
                                className="h-4 w-4 rounded border-[#e3e3e0] text-[#f53003] focus:ring-[#f53003] dark:border-[#3E3E3A] dark:bg-[#0a0a0a]"
                            />
                            <span className="font-medium text-[#706f6c] dark:text-[#A1A09A]">Nullable Fields</span>
                        </label>
                        <label className="flex items-center space-x-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={copyWith}
                                onChange={(e) => setCopyWith(e.target.checked)}
                                className="h-4 w-4 rounded border-[#e3e3e0] text-[#f53003] focus:ring-[#f53003] dark:border-[#3E3E3A] dark:bg-[#0a0a0a]"
                            />
                            <span className="font-medium text-[#706f6c] dark:text-[#A1A09A]">Generate copyWith</span>
                        </label>
                    </div>
                </header>

                <main className="flex flex-1 flex-col lg:flex-row overflow-hidden relative">
                    <div className="flex flex-1 flex-col border-r border-[#e3e3e0] dark:border-[#3E3E3A] relative bg-[#1e1e1e]">
                        <div className="bg-[#f9f9f8] dark:bg-[#111110] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#706f6c] dark:text-[#A1A09A] shadow-sm z-10">
                            JSON Input
                        </div>
                        <div className="flex-1 w-full h-full relative">
                            <Editor
                                height="100%"
                                defaultLanguage="json"
                                theme={theme}
                                value={jsonInput}
                                onChange={(value) => setJsonInput(value || '')}
                                options={{
                                    minimap: { enabled: false },
                                    fontSize: 14,
                                    wordWrap: 'on',
                                    scrollBeyondLastLine: false,
                                    padding: { top: 16 }
                                }}
                            />
                        </div>
                    </div>
                    
                    <div className="flex flex-1 flex-col relative bg-[#1e1e1e]">
                        <div className="flex items-center justify-between bg-[#f9f9f8] dark:bg-[#111110] px-4 py-2 shadow-sm z-10">
                            <div className="flex items-center space-x-4">
                                <span className="text-xs font-semibold uppercase tracking-wider text-[#706f6c] dark:text-[#A1A09A]">
                                    Dart Output
                                </span>
                                {rootClassName && (
                                    <button
                                        onClick={() => navigator.clipboard.writeText(fileName)}
                                        className="text-[13px] font-mono text-[#f53003] dark:text-[#FF4433] hover:underline flex items-center gap-1"
                                        title="Copy file name"
                                    >
                                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                        {fileName}
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => navigator.clipboard.writeText(dartOutput)}
                                className="inline-block rounded-sm border border-[#e3e3e0] dark:border-[#3E3E3A] bg-white dark:bg-[#161615] px-4 py-1 text-[13px] font-medium leading-normal text-[#1b1b18] dark:text-[#EDEDEC] hover:border-[#1b1b18] hover:text-[#1b1b18] dark:hover:border-white dark:hover:text-white transition-colors"
                            >
                                Copy Code
                            </button>
                        </div>
                        {error ? (
                            <div className="flex-1 p-4 text-[#f53003] dark:text-[#FF4433] font-mono text-[13px] bg-[#fff2f2] dark:bg-[#1D0002] z-10">
                                Error: {error}
                            </div>
                        ) : (
                             <div className="flex-1 w-full h-full relative">
                                <Editor
                                    height="100%"
                                    defaultLanguage="dart"
                                    theme={theme}
                                    value={dartOutput}
                                    options={{
                                        readOnly: true,
                                        minimap: { enabled: false },
                                        fontSize: 14,
                                        wordWrap: 'on',
                                        scrollBeyondLastLine: false,
                                        padding: { top: 16 }
                                    }}
                                />
                             </div>
                        )}
                    </div>
                </main>
            </div>
        </>
    );
}
