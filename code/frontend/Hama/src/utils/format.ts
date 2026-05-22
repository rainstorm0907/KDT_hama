export function formatWon(price: number): string {
  return `${price.toLocaleString('ko-KR')}원`;
}

export function formatUpdatedAt(value: string): string {
  if (!value) {
    return '';
  }

  const parsedDate = new Date(value);

  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toLocaleTimeString('ko-KR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return value;
}

export function formatUpdatedAtTimestamp(value: number): string {
  if (value <= 0) {
    return '';
  }

  return new Date(value).toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}
