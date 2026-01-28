import React, { useEffect, useMemo, useState } from "react";
import { FileText } from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Highlight, themes, type RenderProps } from "prism-react-renderer";

import { BaseItem } from "./BaseItem";
import { useProjectContext } from "../../contexts/ProjectContext";

export type MarkdownContent = string | string[];

export interface MarkdownItem extends BaseItem {
    content?: MarkdownContent;
    file_path?: string;
    gfm?: boolean;
    cache_bust?: boolean;
}

const markdownCache = new Map<string, string>();

const normalizeMarkdown = (value: MarkdownContent | undefined): string | undefined => {
    if (value == null) return undefined;
    return Array.isArray(value) ? value.join("\n") : value;
};

const requestResourceSrc = (filePath: string, projectDir: string, cacheBust: boolean) => {
    try {
        const isWindows = navigator.userAgent.includes("Windows");

        // If it's already a valid HTTP/HTTPS URL, use it as-is
        if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
            return filePath;
        }

        const withCacheBust = (url: string) => {
            if (!cacheBust) return url;
            const separator = url.includes("?") ? "&" : "?";
            return `${url}${separator}t=${Date.now()}`;
        };

        // If it's a file:// URL, we need to clean it up first
        if (filePath.startsWith("file://")) {
            let decodedPath = decodeURIComponent(filePath);
            let extractedPath = decodedPath.replace(/^file:\/\//, "");

            if (isWindows) {
                if (extractedPath.startsWith("/") && /^\/[A-Za-z]:/.test(extractedPath)) {
                    extractedPath = extractedPath.substring(1);
                }
                extractedPath = extractedPath.replace(/\//g, "\\");
            }

            return withCacheBust(convertFileSrc(extractedPath));
        }

        if (isWindows && filePath.match(/^[A-Za-z]:\\/)) {
            return withCacheBust(convertFileSrc(filePath));
        }

        // For relative paths, prepend projectDir
        const isAbsolute = isWindows
            ? /^[A-Za-z]:/.test(filePath) || filePath.startsWith("\\\\")
            : filePath.startsWith("/");

        let fullPath = filePath;

        if (!isAbsolute && !filePath.includes("://")) {
            const separator = isWindows ? "\\" : "/";
            const needsSeparator = !projectDir.endsWith(separator);

            let normalizedFilePath = filePath;
            if (isWindows) {
                normalizedFilePath = filePath.replace(/\//g, "\\");
            }

            fullPath = projectDir + (needsSeparator ? separator : "") + normalizedFilePath;
        }

        return withCacheBust(convertFileSrc(fullPath));
    } catch (error) {
        console.error("Error converting file path:", error);
        return filePath;
    }
};

const CodeBlock = ({ inline, className, children }: any) => {
    const raw = String(children ?? "");

    const match = /language-(\w+)/.exec(className ?? "");
    const hasNewline = raw.includes("\n");
    const isBlock = !inline && (Boolean(match) || hasNewline);

    if (!isBlock) {
        return (
            <code className="px-1 py-0.5 rounded bg-gray-100 dark:bg-slate-900 font-mono text-sm whitespace-pre-wrap">
                {raw}
            </code>
        );
    }

    const language = (match?.[1] ?? "text") as any;
    const code = raw.replace(/\n$/, "");

    return (
        <div className="not-prose">
            <Highlight theme={themes.vsDark} code={code} language={language}>
                {({ className: highlightedClassName, style, tokens, getLineProps, getTokenProps }: RenderProps) => (
                    <pre
                        className={`${highlightedClassName} overflow-x-auto rounded-md bg-slate-900 text-slate-100 p-3 text-sm leading-snug`}
                        style={style}
                    >
                        {tokens.map((line, i) => (
                            <div key={i} {...getLineProps({ line })}>
                                {line.map((token, key) => (
                                    <span key={key} {...getTokenProps({ token })} />
                                ))}
                            </div>
                        ))}
                    </pre>
                )}
            </Highlight>
        </div>
    );
};

export const MarkdownComponent: React.FC<MarkdownItem> = (item) => {
    const { projectPath } = useProjectContext();
    const [loadedMarkdown, setLoadedMarkdown] = useState<string | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | undefined>(undefined);

    const inlineMarkdown = useMemo(() => normalizeMarkdown(item.content), [item.content]);
    const gfm = item.gfm ?? true;
    const cacheBust = item.cache_bust ?? false;

    useEffect(() => {
        if (inlineMarkdown) {
            setLoadedMarkdown(undefined);
            setLoading(false);
            setError(undefined);
            return;
        }

        const filePath = item.file_path;
        if (!filePath) {
            setLoadedMarkdown(undefined);
            setLoading(false);
            setError(undefined);
            return;
        }

        if (!projectPath && !filePath.startsWith("http://") && !filePath.startsWith("https://")) {
            setLoadedMarkdown(undefined);
            setLoading(false);
            setError("Missing project path; cannot resolve markdown file.");
            return;
        }

        const cacheKey = `${projectPath ?? ""}::${filePath}`;
        const cached = markdownCache.get(cacheKey);
        if (cached && !cacheBust) {
            setLoadedMarkdown(cached);
            setLoading(false);
            setError(undefined);
            return;
        }

        let cancelled = false;
        const load = async () => {
            setLoading(true);
            setError(undefined);

            try {
                const url = projectPath ? requestResourceSrc(filePath, projectPath, cacheBust) : filePath;
                const res = await fetch(url);
                if (!res.ok) throw new Error(`Failed to load markdown from ${filePath}`);
                const text = await res.text();

                if (cancelled) return;

                setLoadedMarkdown(text);
                if (!cacheBust) markdownCache.set(cacheKey, text);
            } catch (err) {
                if (cancelled) return;
                setError(err instanceof Error ? err.message : "Unknown error loading markdown");
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        load();
        return () => {
            cancelled = true;
        };
    }, [inlineMarkdown, item.file_path, projectPath, cacheBust]);

    const markdown = inlineMarkdown ?? loadedMarkdown;

    if (!markdown && loading) {
        return <div className="p-4 text-gray-500 italic">Loading markdown…</div>;
    }

    if (!markdown && error) {
        return (
            <div className="my-4 p-4 text-center text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-700 rounded">
                ❌ Error: {error}
            </div>
        );
    }

    if (!markdown) {
        return (
            <div className="p-4 bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200 rounded border border-yellow-200 dark:border-yellow-700">
                ⚠️ No markdown content or file path provided.
            </div>
        );
    }

    return (
        <div className="w-full flex justify-center">
            <div className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-900 dark:text-gray-100">
                <article
                    className={
                        "prose dark:prose-invert max-w-none leading-normal " +
                        "prose-headings:my-2 prose-p:my-2 prose-ul:my-2 prose-ol:my-2 prose-li:my-1 " +
                        "prose-h1:text-xl prose-h2:text-lg prose-h3:text-base " +
                        "prose-code:before:content-none prose-code:after:content-none"
                    }
                >
                    <ReactMarkdown
                        remarkPlugins={gfm ? [remarkGfm] : []}
                        components={{
                            // react-markdown wraps fenced code in a <pre><code/></pre>.
                            // We render our own <pre> inside CodeBlock, so remove the outer wrapper.
                            pre: ({ children }: any) => <>{children}</>,
                            code: CodeBlock,
                            a: ({ href, children, ...props }) => (
                                <a
                                    href={href}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline"
                                    {...props}
                                >
                                    {children}
                                </a>
                            ),
                        }}
                    >
                        {markdown}
                    </ReactMarkdown>
                </article>
            </div>
        </div>
    );
};

export const MarkdownIcon: React.FC = () => (
    <FileText className="inline-block w-4 h-4 mr-1 text-gray-400 dark:text-gray-500" />
);
