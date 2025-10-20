/**
 * 테스트용 샘플 엑셀 파일 생성
 */

const XLSX = require('xlsx');
const path = require('path');

// 샘플 주소 데이터 (실제 한국 주소)
const sampleAddresses = [
  { name: '홍길동', 주소: '서울특별시 강남구 테헤란로 152', phone: '010-1234-5678' },
  { name: '김철수', 주소: '서울특별시 서초구 반포대로 58', phone: '010-2345-6789' },
  { name: '이영희', 주소: '서울특별시 송파구 올림픽로 300', phone: '010-3456-7890' },
  { name: '박민수', 주소: '경기도 성남시 분당구 판교역로 235', phone: '010-4567-8901' },
  { name: '최지연', 주소: '경기도 수원시 영통구 광교중앙로 140', phone: '010-5678-9012' },
  { name: '정태웅', 주소: '서울특별시 마포구 월드컵북로 396', phone: '010-6789-0123' },
  { name: '강민지', 주소: '서울특별시 영등포구 여의대로 108', phone: '010-7890-1234' },
  { name: '윤서준', 주소: '서울특별시 중구 세종대로 110', phone: '010-8901-2345' },
  { name: '임하은', 주소: '경기도 고양시 일산동구 중앙로 1036', phone: '010-9012-3456' },
  { name: '조승우', 주소: '인천광역시 연수구 컨벤시아대로 165', phone: '010-0123-4567' },
  { name: '한지민', 주소: '서울특별시 강동구 천호대로 1017', phone: '010-1111-2222' },
  { name: '송중기', 주소: '서울특별시 관악구 관악로 1', phone: '010-2222-3333' },
  { name: '전지현', 주소: '서울특별시 용산구 이태원로 294', phone: '010-3333-4444' },
  { name: '박보검', 주소: '서울특별시 성동구 왕십리로 222', phone: '010-4444-5555' },
  { name: '수지', 주소: '경기도 용인시 수지구 포은대로 536', phone: '010-5555-6666' },
  // 중복 주소 (테스트용)
  { name: '김영수', 주소: '서울특별시 강남구 테헤란로 152', phone: '010-6666-7777' },
  { name: '이민호', 주소: '서울특별시 강남구 테헤란로 152', phone: '010-7777-8888' },
  { name: '박서준', 주소: '경기도 성남시 분당구 판교역로 235', phone: '010-8888-9999' },
  { name: '아이유', 주소: '서울특별시 마포구 월드컵북로 396', phone: '010-9999-0000' },
  { name: '방탄소년단', 주소: '서울특별시 용산구 이태원로 294', phone: '010-0000-1111' },
];

// 워크북 생성
const wb = XLSX.utils.book_new();

// 시트 1: 기본 데이터
const ws1 = XLSX.utils.json_to_sheet(sampleAddresses);
XLSX.utils.book_append_sheet(wb, ws1, '신환명단');

// 시트 2: 헤더 없는 데이터 (테스트용)
const dataOnly = sampleAddresses.map((a) => [a.name, a.주소, a.phone]);
const ws2 = XLSX.utils.aoa_to_sheet(dataOnly);
XLSX.utils.book_append_sheet(wb, ws2, '헤더없음');

// 시트 3: 많은 데이터 (성능 테스트용)
const largeData = [];
for (let i = 0; i < 100; i++) {
  const randomAddr = sampleAddresses[Math.floor(Math.random() * sampleAddresses.length)];
  largeData.push({
    번호: i + 1,
    이름: `환자${i + 1}`,
    주소: randomAddr.주소,
    전화번호: `010-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`,
  });
}
const ws3 = XLSX.utils.json_to_sheet(largeData);
XLSX.utils.book_append_sheet(wb, ws3, '대량데이터');

// 파일 저장
const outputPath = path.join(__dirname, '..', 'public', 'uploads', 'sample_addresses.xlsx');
XLSX.writeFile(wb, outputPath);

console.log('✅ 샘플 엑셀 파일 생성 완료:', outputPath);
console.log(`   - 시트 1: 신환명단 (${sampleAddresses.length}건)`);
console.log(`   - 시트 2: 헤더없음 (${dataOnly.length}건)`);
console.log(`   - 시트 3: 대량데이터 (${largeData.length}건)`);

