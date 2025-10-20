export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">페이지를 찾을 수 없습니다</h2>
        <p className="text-muted-foreground mb-4">요청하신 페이지가 존재하지 않습니다.</p>
        <a
          href="/"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md inline-block"
        >
          홈으로 돌아가기
        </a>
      </div>
    </div>
  );
}


