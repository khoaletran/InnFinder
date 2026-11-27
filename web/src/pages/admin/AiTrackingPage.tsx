import React, { useState } from 'react';
import { Card, Chip } from '@heroui/react';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertTriangle,
  Cpu,
  Database,
  Gauge,
  Loader2,
  RefreshCw,
  Sparkles,
  Zap,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { aiTrackingService } from '@/services/aiTracking.service';
import { formatDateTime, formatVND } from '@/utils/formatters';

const FEATURE_LABELS: Record<string, string> = {
  CHATBOT: 'Chatbot Tìm phòng',
  AI_SEARCH: 'Tìm kiếm AI',
  AI_INDEX_ROOM: 'Index Vector Phòng',
  ADMIN_INSIGHT: 'Phân tích Admin AI',
  RECOMMENDATION: 'Yêu cầu gợi ý phòng',
  RECOMMEND_IMPRESSION: 'Hiển thị phòng gợi ý',
  RECOMMEND_CLICK: 'Click phòng gợi ý',
  AI_EMBEDDING: 'Embedding Query',
};

export const AiTrackingPage: React.FC = () => {
  const [days, setDays] = useState<number>(7);
  const [featureFilter, setFeatureFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [page, setPage] = useState<number>(0);

  const summaryQuery = useQuery({
    queryKey: ['admin', 'ai-tracking', 'summary', days],
    queryFn: () => aiTrackingService.getSummary(days),
    refetchInterval: 30_000,
  });

  const logsQuery = useQuery({
    queryKey: ['admin', 'ai-tracking', 'logs', days, featureFilter, statusFilter, page],
    queryFn: () =>
      aiTrackingService.getLogs({
        days,
        feature: featureFilter || undefined,
        status: statusFilter || undefined,
        page,
        size: 12,
      }),
    refetchInterval: 30_000,
  });

  const summary = summaryQuery.data;
  const logs = logsQuery.data?.content ?? [];
  const totalPages = Math.max(1, logsQuery.data?.totalPages ?? 1);

  return (
    <div className="space-y-6">
      {/* Toolbar chọn khoảng thời gian & làm mới */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-teal-600" />
            Giám Sát AI & Hệ Thống Gợi Ý
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Theo dõi mức tiêu thụ token Gemini, độ trễ, tỷ lệ xử lý nội bộ, sức khỏe Vector và CTR gợi ý phòng.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {[7, 14, 30].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDays(d);
                setPage(0);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                days === d
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {d} ngày
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              void summaryQuery.refetch();
              void logsQuery.refetch();
            }}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${summaryQuery.isFetching ? 'animate-spin text-teal-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Cảnh báo Quota ngày */}
      {summary?.quotaStatus?.warning && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 flex items-start gap-3 text-amber-900">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-bold">Cảnh báo ngân sách token nội bộ trong ngày!</p>
            <p>
              Hôm nay đã tiêu thụ{' '}
              <strong>{summary.quotaStatus.dailyTokensUsed.toLocaleString('vi-VN')}</strong> /{' '}
              {summary.quotaStatus.dailyTokenLimit.toLocaleString('vi-VN')} tokens (
              {summary.quotaStatus.quotaUsagePercent}%). Hãy theo dõi để tránh vượt hạn mức Gemini API.
            </p>
          </div>
        </div>
      )}

      {summaryQuery.isLoading && !summary ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-7 h-7 animate-spin text-teal-600 mb-2" />
          <span className="text-xs">Đang tổng hợp dữ liệu AI Tracking...</span>
        </div>
      ) : (
        <>
          {/* 4 Thẻ KPI chính */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="p-5 rounded-2xl bg-white border border-teal-200/80 shadow-xs relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1.5 h-full bg-teal-600 rounded-l-2xl" />
              <Card.Header className="p-0 flex flex-row items-center justify-between">
                <Card.Title className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Tổng Token Gemini
                </Card.Title>
                <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 flex items-center justify-center">
                  <Cpu className="w-4 h-4" />
                </div>
              </Card.Header>
              <Card.Content className="p-0 mt-2">
                <p className="text-2xl font-black text-slate-900">
                  {(summary?.totalTokens ?? 0).toLocaleString('vi-VN')}
                </p>
                <p className="text-[11px] text-teal-700 font-semibold mt-1.5">
                  {summary?.pricingConfigured ? <>Ước tính ~{formatVND(summary.estimatedCostVnd)} (${summary.estimatedCostUsd})</> : 'Chưa cấu hình đơn giá cho model đang dùng'}
                </p>
              </Card.Content>
            </Card>

            <Card className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <Card.Header className="p-0 flex flex-row items-center justify-between">
                <Card.Title className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Tỷ lệ xử lý nội bộ
                </Card.Title>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-teal-600" />
                </div>
              </Card.Header>
              <Card.Content className="p-0 mt-2">
                <p className="text-2xl font-black text-slate-900">
                  {summary?.costSavingsPercent ?? 0}%
                </p>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {summary?.localBypassCalls ?? 0} local / {summary?.providerCalls ?? 0} gọi Gemini
                </p>
              </Card.Content>
            </Card>

            <Card className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <Card.Header className="p-0 flex flex-row items-center justify-between">
                <Card.Title className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Độ Trễ & Độ Tin Cậy
                </Card.Title>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Gauge className="w-4 h-4 text-slate-700" />
                </div>
              </Card.Header>
              <Card.Content className="p-0 mt-2">
                <p className="text-2xl font-black text-slate-900">
                  {summary?.avgLatencyMs ?? 0} <span className="text-sm font-semibold text-slate-400">ms</span>
                </p>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  Thành công {summary?.successRatePercent ?? 100}% · Fallback {summary?.fallbackCount ?? 0} · Lỗi {summary?.errorCount ?? 0}
                </p>
              </Card.Content>
            </Card>

            <Card className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <Card.Header className="p-0 flex flex-row items-center justify-between">
                <Card.Title className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Độ Phủ Vector & Gợi Ý
                </Card.Title>
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                  <Database className="w-4 h-4 text-teal-600" />
                </div>
              </Card.Header>
              <Card.Content className="p-0 mt-2">
                <p className="text-2xl font-black text-slate-900">
                  {summary?.vectorHealth?.coveragePercent ?? 0}%
                </p>
                <p className="text-[11px] text-slate-500 mt-1.5">
                  {summary?.vectorHealth?.indexedRooms ?? 0}/{summary?.vectorHealth?.totalApprovedRooms ?? 0} phòng · CTR gợi ý {summary?.recommendationStats?.ctrPercent ?? 0}%
                </p>
              </Card.Content>
            </Card>
          </div>

          {/* Biểu đồ lưu lượng theo ngày + Phân bổ tính năng & Ý định */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
              <Card.Header className="p-0 pb-4">
                <Card.Title className="text-sm font-bold text-slate-900">
                  Lưu lượng Gọi Gemini vs Local Bypass theo ngày
                </Card.Title>
              </Card.Header>
              <Card.Content className="p-0 h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={summary?.dailyUsage ?? []}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="providerCalls" name="Gọi Gemini" fill="#0d9488" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="localBypassCalls" name="Local Bypass" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="errorCount" name="Lỗi" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </Card.Content>
            </Card>

            <Card className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-4">
              <Card.Header className="p-0">
                <Card.Title className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-teal-600" />
                  Phân bổ Tính năng & Ý định
                </Card.Title>
              </Card.Header>
              <Card.Content className="p-0 space-y-4">
                <div className="space-y-2">
                  {(summary?.featureBreakdown ?? []).map((f) => (
                    <div key={f.feature} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0">
                      <div>
                        <span className="font-semibold text-slate-800 block">
                          {FEATURE_LABELS[f.feature] ?? f.feature}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {f.avgLatencyMs}ms avg · {f.totalTokens.toLocaleString('vi-VN')} tokens
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 font-bold text-slate-700">
                        {f.requests}
                      </span>
                    </div>
                  ))}
                </div>

                {(summary?.intentBreakdown?.length ?? 0) > 0 && (
                  <div className="pt-2 border-t border-slate-100">
                    <p className="text-[11px] font-bold uppercase text-slate-400 mb-2">
                      Ý định khách hàng (Chatbot)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {summary?.intentBreakdown.map((it) => (
                        <Chip key={it.intent} size="sm" variant="soft" color="accent">
                          <Chip.Label>
                            {it.intent}: {it.count}
                          </Chip.Label>
                        </Chip>
                      ))}
                    </div>
                  </div>
                )}
              </Card.Content>
            </Card>
          </div>

          {/* Bảng nhật ký AI Tracking */}
          <Card className="p-0 rounded-2xl bg-white border border-slate-200/80 shadow-xs overflow-hidden">
            <Card.Header className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100">
              <Card.Title className="text-sm font-bold text-slate-900">
                Nhật ký chi tiết AI & Recommendation
              </Card.Title>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={featureFilter}
                  onChange={(e) => {
                    setFeatureFilter(e.target.value);
                    setPage(0);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50"
                >
                  <option value="">Tất cả tính năng</option>
                  {Object.entries(FEATURE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(0);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs bg-slate-50"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="SUCCESS">Thành công</option>
                  <option value="ERROR">Lỗi</option>
                </select>
              </div>
            </Card.Header>
            <Card.Content className="p-0 overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200/80 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-3 px-4">Thời gian</th>
                    <th className="py-3 px-4">Tính năng</th>
                    <th className="py-3 px-4">Model</th>
                    <th className="py-3 px-4">Tokens (In/Out)</th>
                    <th className="py-3 px-4">Độ trễ</th>
                    <th className="py-3 px-4">Trạng thái</th>
                    <th className="py-3 px-4">Ghi chú kỹ thuật</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-10 text-center text-slate-400">
                        Chưa có dữ liệu nhật ký AI trong khoảng thời gian này.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 whitespace-nowrap text-slate-500">
                          {formatDateTime(log.createdAt)}
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-slate-800">
                          {FEATURE_LABELS[log.feature] ?? log.feature}
                          {log.intent && (
                            <span className="ml-1.5 text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">
                              {log.intent}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-[11px] text-slate-600">
                          {log.model}
                          {log.isFallback && (
                            <span className="ml-1 text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                              Fallback
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-slate-700">
                          {log.totalTokens > 0 ? (
                            <span>
                              <strong>{log.totalTokens.toLocaleString('vi-VN')}</strong>{' '}
                              <span className="text-slate-400">
                                ({log.promptTokens}/{log.completionTokens})
                              </span>
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">{log.latencyMs} ms</td>
                        <td className="py-2.5 px-4">
                          <Chip
                            size="sm"
                            variant="soft"
                            color={log.status === 'SUCCESS' ? 'success' : 'danger'}
                          >
                            <Chip.Label>{log.errorCode || log.status}</Chip.Label>
                          </Chip>
                        </td>
                        <td className="py-2.5 px-4 text-[11px] text-slate-500 max-w-xs truncate">
                          {log.metadataSummary || '—'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <span>
                  Trang {page + 1} / {totalPages}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={page <= 0}
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer"
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    disabled={page + 1 >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="px-3 py-1 rounded-lg border border-slate-200 disabled:opacity-40 cursor-pointer"
                  >
                    Sau
                  </button>
                </div>
              </div>
            </Card.Content>
          </Card>
        </>
      )}
    </div>
  );
};
