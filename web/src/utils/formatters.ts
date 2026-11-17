export const formatVND = (amount: number | string | undefined | null): string => {
  if (amount === undefined || amount === null || isNaN(Number(amount))) return '0 ₫';
  return Number(amount).toLocaleString('vi-VN') + ' ₫';
};

export const formatDate = (dateString?: string | null): string => {
  if (!dateString) return '--/--/----';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const formatDateTime = (dateString?: string | null): string => {
  if (!dateString) return '--:-- --/--/----';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateString;
  }
};
