'use client';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div className="flex min-h-screen items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">전역 오류가 발생했습니다</h2>
            <p className="text-muted-foreground mb-4">{error.message}</p>
            <button
              onClick={reset}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md"
            >
              다시 시도
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}


