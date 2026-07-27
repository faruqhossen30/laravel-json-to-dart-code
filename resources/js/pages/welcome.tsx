import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import { parseJsonToAst, generateCodeFromAst, DartClass } from '@/lib/json-to-dart';
import Editor from '@monaco-editor/react';

export default function Welcome() {
    const [jsonInput, setJsonInput] = useState<string>('{\n  "id": 1,\n  "name": "Dart"\n}');
    const [ast, setAst] = useState<DartClass[]>([]);
    const [dartOutput, setDartOutput] = useState<string>('');
    const [rootClassName, setRootClassName] = useState<string>('Root');
    const [nullable, setNullable] = useState<boolean>(false);
    const [copyWith, setCopyWith] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [copiedItem, setCopiedItem] = useState<'fileName' | 'code' | null>(null);

    // Field overrides: Map of "ClassName.fieldName" -> { isNullable: boolean }
    const [fieldOverrides, setFieldOverrides] = useState<Record<string, { isNullable: boolean }>>({});

    const theme = 'vs-dark';
    const fileName = (rootClassName || 'Root').replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase() + '.dart';

    // Parse JSON into AST when JSON or rootClassName changes
    useEffect(() => {
        if (!jsonInput.trim()) {
            setAst([]);
            setError('');
            return;
        }

        try {
            const parsedAst = parseJsonToAst(jsonInput, rootClassName || 'Root');
            setAst(parsedAst);
            setError('');
        } catch (e: any) {
            setError(e.message);
            setAst([]);
        }
    }, [jsonInput, rootClassName]);

    // Generate Dart code when AST, overrides, or options change
    useEffect(() => {
        if (ast.length === 0) {
            setDartOutput('');
            return;
        }

        // Apply overrides to AST before generating
        const astWithOverrides = ast.map(cls => ({
            ...cls,
            properties: cls.properties.map(prop => {
                const overrideKey = `${cls.className}.${prop.name}`;
                if (fieldOverrides[overrideKey] !== undefined) {
                    return { ...prop, isNullable: fieldOverrides[overrideKey].isNullable };
                }
                return prop;
            })
        }));

        const code = generateCodeFromAst(astWithOverrides, {
            rootClassName: rootClassName || 'Root',
            nullable,
            copyWith,
        });

        setDartOutput(code);
    }, [ast, fieldOverrides, nullable, copyWith, rootClassName]);

    const handleFieldNullableChange = (className: string, propName: string, isNullable: boolean) => {
        const key = `${className}.${propName}`;
        setFieldOverrides(prev => ({
            ...prev,
            [key]: { isNullable }
        }));
    };

    const handleCopy = (text: string, type: 'fileName' | 'code') => {
        navigator.clipboard.writeText(text);
        setCopiedItem(type);
        setTimeout(() => setCopiedItem(null), 2000);
    };

    return (
        <>
            <Head title="JSON to Dart Converter" />
            <div className="flex h-screen flex-col bg-[#FDFDFC] dark:bg-[#0a0a0a] text-[#1b1b18] dark:text-[#EDEDEC] font-sans">
                {/* Header */}
                <header className="flex flex-col md:flex-row items-center justify-between border-b border-[#e3e3e0] dark:border-[#3E3E3A] bg-white dark:bg-[#161615] px-6 py-4 shadow-sm z-10 shrink-0">
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
                            <span className="font-medium text-[#706f6c] dark:text-[#A1A09A]">Global Nullable</span>
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
                    {/* Left Column: JSON Input */}
                    <div className="flex flex-1 flex-col border-b lg:border-b-0 lg:border-r border-[#e3e3e0] dark:border-[#3E3E3A] relative bg-[#1e1e1e] lg:w-1/3">
                        <div className="flex items-center justify-between bg-[#f9f9f8] dark:bg-[#111110] px-4 py-2 shadow-sm z-10 border-b border-[#e3e3e0] dark:border-[#3E3E3A]">
                            <span className="text-xs font-semibold uppercase tracking-wider text-[#706f6c] dark:text-[#A1A09A]">
                                JSON Input
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={async () => {
                                        try {
                                            const text = await navigator.clipboard.readText();
                                            setJsonInput(text);
                                        } catch (err) {
                                            console.error('Failed to read clipboard contents: ', err);
                                        }
                                    }}
                                    className="inline-flex items-center gap-1 rounded-sm border border-[#e3e3e0] dark:border-[#3E3E3A] bg-white dark:bg-[#161615] px-3 py-1 text-xs font-medium leading-normal text-[#1b1b18] dark:text-[#EDEDEC] hover:border-[#1b1b18] hover:text-[#f53003] dark:hover:border-white dark:hover:text-[#FF4433] transition-colors"
                                    title="Paste JSON"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
                                    Paste
                                </button>
                                <button
                                    onClick={() => setJsonInput('')}
                                    className="inline-flex items-center gap-1 rounded-sm border border-[#e3e3e0] dark:border-[#3E3E3A] bg-white dark:bg-[#161615] px-3 py-1 text-xs font-medium leading-normal text-[#1b1b18] dark:text-[#EDEDEC] hover:border-[#1b1b18] hover:text-[#f53003] dark:hover:border-white dark:hover:text-[#FF4433] transition-colors"
                                    title="Clear JSON"
                                >
                                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path></svg>
                                    Clear
                                </button>
                            </div>
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

                    {/* Middle Column: Field Configuration */}
                    <div className="flex flex-1 flex-col border-b lg:border-b-0 lg:border-r border-[#e3e3e0] dark:border-[#3E3E3A] relative bg-white dark:bg-[#161615] lg:w-1/3 overflow-y-auto">
                        <div className="bg-[#f9f9f8] dark:bg-[#111110] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-[#706f6c] dark:text-[#A1A09A] shadow-sm sticky top-0 z-10 border-b border-[#e3e3e0] dark:border-[#3E3E3A]">
                            Field Configuration
                        </div>
                        <div className="p-4 space-y-6">
                            {ast.length === 0 && !error && (
                                <p className="text-sm text-[#706f6c] dark:text-[#A1A09A]">Waiting for JSON input...</p>
                            )}
                            {ast.map((cls) => (
                                <div key={cls.className} className="border border-[#e3e3e0] dark:border-[#3E3E3A] rounded-md overflow-hidden shadow-sm">
                                    <div className="bg-[#f9f9f8] dark:bg-[#20201f] px-3 py-2 font-mono text-[13px] font-semibold border-b border-[#e3e3e0] dark:border-[#3E3E3A]">
                                        {cls.className}
                                    </div>
                                    <div className="divide-y divide-[#e3e3e0] dark:divide-[#3E3E3A]">
                                        {cls.properties.map(prop => {
                                            const overrideKey = `${cls.className}.${prop.name}`;
                                            const isNullable = fieldOverrides[overrideKey] !== undefined ? fieldOverrides[overrideKey].isNullable : nullable;

                                            return (
                                                <div key={prop.name} className="flex items-center justify-between px-3 py-2 text-sm hover:bg-[#fafaf9] dark:hover:bg-[#1a1a1a] transition-colors">
                                                    <div className="flex items-center gap-2 overflow-hidden mr-2">
                                                        <span className="font-mono text-[#f53003] dark:text-[#FF4433] truncate text-[13px]" title={prop.name}>{prop.name}</span>
                                                        <span className="text-[11px] text-[#706f6c] dark:text-[#A1A09A] px-2 py-0.5 bg-[#e3e3e0] dark:bg-[#3E3E3A] rounded-full truncate shrink-0">
                                                            {prop.isList ? `List<${prop.type}>` : prop.type}
                                                        </span>
                                                    </div>
                                                    <label className="flex items-center gap-1.5 cursor-pointer shrink-0">
                                                        <input
                                                            type="checkbox"
                                                            checked={isNullable}
                                                            onChange={(e) => handleFieldNullableChange(cls.className, prop.name, e.target.checked)}
                                                            className="h-3.5 w-3.5 rounded border-[#e3e3e0] text-[#f53003] focus:ring-[#f53003] dark:border-[#3E3E3A] dark:bg-[#0a0a0a]"
                                                        />
                                                        <span className="text-[12px] text-[#706f6c] dark:text-[#A1A09A]">Nullable</span>
                                                    </label>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Column: Dart Output */}
                    <div className="flex flex-1 flex-col relative bg-[#1e1e1e] lg:w-1/3">
                        <div className="flex items-center justify-between bg-[#f9f9f8] dark:bg-[#111110] px-4 py-2 shadow-sm z-10 border-b border-[#e3e3e0] dark:border-[#3E3E3A]">
                            <div className="flex items-center space-x-4">
                                <span className="text-xs font-semibold uppercase tracking-wider text-[#706f6c] dark:text-[#A1A09A]">
                                    Dart Output
                                </span>
                                {rootClassName && ast.length > 0 && !error && (
                                    <button
                                        onClick={() => handleCopy(fileName, 'fileName')}
                                        className="text-[13px] font-mono text-[#f53003] dark:text-[#FF4433] hover:underline flex items-center gap-1 transition-all"
                                        title="Copy file name"
                                    >
                                        {copiedItem === 'fileName' ? (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        ) : (
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                                        )}
                                        {copiedItem === 'fileName' ? 'Copied!' : fileName}
                                    </button>
                                )}
                            </div>
                            <button
                                onClick={() => handleCopy(dartOutput, 'code')}
                                className="inline-flex items-center gap-1.5 rounded-sm border border-[#e3e3e0] dark:border-[#3E3E3A] bg-white dark:bg-[#161615] px-4 py-1 text-[13px] font-medium leading-normal text-[#1b1b18] dark:text-[#EDEDEC] hover:border-[#1b1b18] hover:text-[#1b1b18] dark:hover:border-white dark:hover:text-white transition-all w-[100px] justify-center"
                            >
                                {copiedItem === 'code' ? (
                                    <>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-500"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                        <span>Copied!</span>
                                    </>
                                ) : (
                                    <span>Copy</span>
                                )}
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
