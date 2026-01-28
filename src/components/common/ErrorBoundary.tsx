import React from "react";

type ErrorBoundaryProps = {
    children: React.ReactNode;
    fallback?: (args: { error: Error; reset: () => void }) => React.ReactNode;
};

type ErrorBoundaryState = {
    error: Error | null;
};

export default class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    state: ErrorBoundaryState = { error: null };

    static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        // Keep console error for debugging in dev.
        // eslint-disable-next-line no-console
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    reset = () => {
        this.setState({ error: null });
    };

    render() {
        const { error } = this.state;
        if (error) {
            if (this.props.fallback) {
                return this.props.fallback({ error, reset: this.reset });
            }

            return (
                <div className="p-6 my-4 rounded border border-red-200 dark:border-red-700 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-200">
                    <div className="font-semibold mb-2">Something went wrong.</div>
                    <div className="text-sm whitespace-pre-wrap">{error.message}</div>
                    <button
                        type="button"
                        onClick={this.reset}
                        className="mt-3 underline text-sm"
                    >
                        Try again
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}
