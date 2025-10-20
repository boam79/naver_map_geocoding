/**
 * 파일 저장 관련 유틸리티
 */

import { join } from 'path';

// 환경 변수에서 경로 가져오기
export const UPLOAD_DIR = process.env.UPLOAD_DIR || join(process.cwd(), 'public', 'uploads');
export const OUTPUT_DIR = process.env.OUTPUT_DIR || join(process.cwd(), 'public', 'outputs');