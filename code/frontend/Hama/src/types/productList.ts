export const rowCountOptions = [4, 5, 6, 7, 8] as const;

export type RowCountOption = (typeof rowCountOptions)[number];
