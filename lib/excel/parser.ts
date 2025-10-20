/**
 * 엑셀/CSV 파일 파싱 모듈
 */

import * as XLSX from 'xlsx';
import type { SheetInfo, ParseResult } from './types';

/**
 * 파일에서 시트 정보 추출
 */
export function getSheetInfo(file: File | Buffer): SheetInfo[] {
  try {
    const workbook = XLSX.read(file, { 
      type: file instanceof File ? 'binary' : 'buffer',
      cellDates: true,
      cellNF: false,
      cellText: false
    });
    
    return workbook.SheetNames.map((name, index) => {
      const sheet = workbook.Sheets[name];
      const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
      
      return {
        name,
        index,
        rowCount: range.e.r + 1,
        colCount: range.e.c + 1,
      };
    });
  } catch (error) {
    console.error('Failed to get sheet info:', error);
    return [];
  }
}

/**
 * 파일 파싱 (헤더 자동 감지)
 */
export async function parseFile(
  file: File | Buffer,
  options: {
    sheetIndex?: number;
    skipEmptyRows?: boolean;
    trimValues?: boolean;
    maxRows?: number;
  } = {}
): Promise<ParseResult> {
  try {
    const { sheetIndex = 0, skipEmptyRows = true, trimValues = true, maxRows = 10000 } = options;
    
    const workbook = XLSX.read(file, { 
      type: file instanceof File ? 'binary' : 'buffer',
      cellDates: true,
      cellNF: false,
      cellText: false
    });
    
    const sheetNames = workbook.SheetNames;
    if (sheetIndex >= sheetNames.length) {
      return {
        success: false,
        error: `시트 인덱스 ${sheetIndex}가 범위를 벗어났습니다. (총 ${sheetNames.length}개 시트)`,
      };
    }
    
    const sheetName = sheetNames[sheetIndex];
    const sheet = workbook.Sheets[sheetName];
    
    // JSON으로 변환 (헤더 자동 감지)
    const jsonData = XLSX.utils.sheet_to_json(sheet, {
      header: 1, // 배열 형태로 변환
      defval: '', // 빈 셀 기본값
      blankrows: !skipEmptyRows,
    }) as any[][];
    
    if (jsonData.length === 0) {
      return {
        success: false,
        error: '시트에 데이터가 없습니다.',
      };
    }
    
    // 헤더 자동 감지 (첫 번째 행을 헤더로 사용)
    const headerRow = jsonData[0] || [];
    const dataRows = jsonData.slice(1);
    
    // 헤더 정리 (빈 값 처리)
    const headers = headerRow.map((header, index) => {
      if (trimValues && typeof header === 'string') {
        header = header.trim();
      }
      return header || `컬럼${index + 1}`;
    });
    
    // 데이터 행 처리
    const rows = dataRows
      .slice(0, maxRows)
      .map((row, rowIndex) => {
        const rowData: Record<string, any> = {};
        
        headers.forEach((header, colIndex) => {
          let value = row[colIndex];
          
          if (trimValues && typeof value === 'string') {
            value = value.trim();
          }
          
          rowData[header] = value || '';
        });
        
        return rowData;
      })
      .filter(row => {
        if (!skipEmptyRows) return true;
        
        // 빈 행 필터링 (모든 값이 비어있는 행 제외)
        return Object.values(row).some(value => value !== '');
      });
    
    return {
      success: true,
      data: {
        headers,
        rows,
        sheetInfo: {
          name: sheetName,
          index: sheetIndex,
          rowCount: jsonData.length,
          colCount: headers.length,
        },
      },
    };
  } catch (error) {
    console.error('Failed to parse file:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : '파일 파싱에 실패했습니다.',
    };
  }
}

/**
 * CSV 파일 파싱
 */
export async function parseCSV(
  file: File,
  options: {
    delimiter?: string;
    skipEmptyRows?: boolean;
    trimValues?: boolean;
    maxRows?: number;
  } = {}
): Promise<ParseResult> {
  try {
    const { delimiter = ',', skipEmptyRows = true, trimValues = true, maxRows = 10000 } = options;
    
    const text = await file.text();
    const lines = text.split('\n');
    
    if (lines.length === 0) {
      return {
        success: false,
        error: 'CSV 파일이 비어있습니다.',
      };
    }
    
    // 첫 번째 행을 헤더로 사용
    const headerLine = lines[0];
    const headers = headerLine.split(delimiter).map((h, index) => {
      let header = h.trim().replace(/"/g, '');
      return header || `컬럼${index + 1}`;
    });
    
    // 데이터 행 처리
    const dataLines = lines.slice(1);
    const rows = dataLines
      .slice(0, maxRows)
      .map((line, rowIndex) => {
        const values = line.split(delimiter);
        const rowData: Record<string, any> = {};
        
        headers.forEach((header, colIndex) => {
          let value = values[colIndex] || '';
          if (trimValues && typeof value === 'string') {
            value = value.trim().replace(/"/g, '');
          }
          rowData[header] = value;
        });
        
        return rowData;
      })
      .filter(row => {
        if (!skipEmptyRows) return true;
        return Object.values(row).some(value => value !== '');
      });
    
    return {
      success: true,
      data: {
        headers,
        rows,
        sheetInfo: {
          name: 'Sheet1',
          index: 0,
          rowCount: lines.length,
          colCount: headers.length,
        },
      },
    };
  } catch (error) {
    console.error('Failed to parse CSV:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'CSV 파싱에 실패했습니다.',
    };
  }
}