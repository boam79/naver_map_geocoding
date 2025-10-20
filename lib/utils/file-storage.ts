/**
 * 파일 저장 관련 유틸리티
 */

import { join } from 'path';

// Vercel 환경에서는 /tmp 사용, 로컬에서는 public 폴더 사용
const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';

export const UPLOAD_DIR = isVercel 
  ? '/tmp/uploads' 
  : (process.env.UPLOAD_DIR || join(process.cwd(), 'public', 'uploads'));

export const OUTPUT_DIR = isVercel 
  ? '/tmp/outputs' 
  : (process.env.OUTPUT_DIR || join(process.cwd(), 'public', 'outputs'));