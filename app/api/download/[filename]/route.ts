/**
 * 파일 다운로드 API
 * GET /api/download/[filename]
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';
import { OUTPUT_DIR } from '@/lib/utils/file-storage';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    // 파일명 검증 (경로 traversal 방지)
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json(
        { success: false, error: 'Invalid filename' },
        { status: 400 }
      );
    }
    
    // 파일 경로
    const filePath = join(OUTPUT_DIR, filename);
    
    console.log(`📥 Download request: ${filename}`);
    console.log(`📁 File path: ${filePath}`);
    
    // 파일 존재 여부 확인
    try {
      await stat(filePath);
      console.log(`✅ File exists: ${filename}`);
    } catch (error) {
      console.error(`❌ File not found: ${filename}`);
      console.error(`   Path checked: ${filePath}`);
      return NextResponse.json(
        { 
          success: false, 
          error: 'File not found',
          filename,
          path: filePath
        },
        { status: 404 }
      );
    }
    
    // 파일 읽기
    const fileBuffer = await readFile(filePath);
    
    // Content-Type 결정
    const ext = filename.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      csv: 'text/csv',
      json: 'application/json',
      md: 'text/markdown',
      pdf: 'application/pdf',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
    };
    
    const contentType = contentTypes[ext || ''] || 'application/octet-stream';
    
    // 응답
    return new NextResponse(fileBuffer as any, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error('Download error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '파일 다운로드에 실패했습니다.',
      },
      { status: 500 }
    );
  }
}

