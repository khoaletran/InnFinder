export function LandlordQueryError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
    <p>{error instanceof Error ? error.message : 'Không tải được dữ liệu. Vui lòng thử lại.'}</p>
    <button type="button" onClick={onRetry} className="mt-2 font-semibold underline">Thử lại</button>
  </div>;
}
