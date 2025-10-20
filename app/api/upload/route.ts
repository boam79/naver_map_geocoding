/**
 * 파일 업로드 API
 * POST /api/upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { parseFile, getSheetInfo } from '@/lib/excel/parser';
import { detectAddressColumn } from '@/lib/addr/detect';
import { UPLOAD_DIR } from '@/lib/utils/file-storage';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json(
        { success: false, error: '파일이 제공되지 않았습니다.' },
        { status: 400 }
      );
    }

    // 파일 검증
    const maxSize = 50 * 1024 * 1024; // 50MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { success: false, error: '파일 크기가 50MB를 초과합니다.' },
        { status: 400 }
      );
    }

    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'text/csv', // .csv
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { success: false, error: '지원하지 않는 파일 형식입니다. (XLSX, XLS, CSV만 지원)' },
        { status: 400 }
      );
    }

    // 파일 저장
    const buffer = Buffer.from(await file.arrayBuffer());
    const fileName = `${Date.now()}_${file.name}`;
    const filePath = join(UPLOAD_DIR, fileName);
    
    await writeFile(filePath, buffer);

    // 시트 정보 추출
    const sheets = getSheetInfo(buffer);
    if (sheets.length === 0) {
      return NextResponse.json(
        { success: false, error: '파일에서 시트를 읽을 수 없습니다.' },
        { status: 400 }
      );
    }

    // 첫 번째 시트 파싱
    const parseResult = await parseFile(buffer, {
      sheetIndex: 0,
      skipEmptyRows: true,
      trimValues: true,
      maxRows: 10000,
    });

    if (!parseResult.success) {
      return NextResponse.json(
        { success: false, error: parseResult.error },
        { status: 400 }
      );
    }

    // 주소 컬럼 자동 감지
    let detectedAddressColumn = null;
    if (parseResult.data) {
      const detected = detectAddressColumn(
        parseResult.data.headers,
        parseResult.data.rows
      );
      
      if (detected && detected.confidence > 50) {
        detectedAddressColumn = detected.column;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        fileName,
        originalName: file.name,
        sheets,
        parseResult,
        detectedAddressColumn,
      },
    });
  } catch (error) {
    console.error('Upload error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '파일 업로드 중 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}