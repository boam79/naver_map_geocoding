/**
 * 엑셀 파싱 관련 타입 정의
 */

export interface SheetInfo {
  name: string;
  index: number;
  rowCount: number;
  colCount: number;
}

export interface ParseResult {
  success: boolean;
  data?: {
    headers: string[];
    rows: Record<string, any>[];
    sheetInfo: SheetInfo;
  };
  error?: string;
}

export interface ParseOptions {
  sheetIndex?: number;
  skipEmptyRows?: boolean;
  trimValues?: boolean;
  maxRows?: number;
}