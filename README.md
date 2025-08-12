# 🇹🇭 태국 여행 플래너

모바일 우선 반응형 웹 애플리케이션으로, 태국 여행을 위한 종합 관리 도구입니다.

## ✨ 주요 기능

### 🗓️ 여행 일정 관리
- 날짜별 상세 일정 관리
- 시간, 장소, 설명 등 세부 정보 입력
- 일정 완료 체크 기능
- 날짜별 탭 네비게이션

### ✅ 준비물 체크리스트
- 카테고리별 준비물 분류 (의류, 전자제품, 약품/화장품, 여행용품, 서류, 기타)
- 실시간 진행률 표시
- 카테고리별 필터링
- 체크박스로 간편한 완료 표시

### 💱 환율 계산기
- 바트(THB) ↔ 원화(KRW) 실시간 변환
- 빠른 계산을 위한 프리셋 금액 버튼
- 양방향 환율 계산 지원
- 현재 환율 정보 표시

### 💰 일일 지출 관리
- 날짜별 지출 내역 관리
- 카테고리별 지출 분류 (교통, 식사, 숙박, 쇼핑, 관광, 기타)
- 바트/원화 동시 표시
- 일별/전체 지출 통계
- 카테고리별 지출 분석

## 🛠️ 기술 스택

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Database**: PostgreSQL with Prisma ORM
- **Forms**: React Hook Form with Zod validation

## 🚀 시작하기

### 1. 프로젝트 클론 및 의존성 설치

```bash
git clone <repository-url>
cd thai-travel-planner
npm install
```

### 2. 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가:

```env
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/thai_travel_planner?schema=public"

# Exchange Rate (하드코딩된 값, 나중에 API로 변경 가능)
DEFAULT_EXCHANGE_RATE=38.5

# Next.js
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"
```

### 3. 데이터베이스 설정

```bash
# Prisma 마이그레이션 실행
npx prisma migrate dev

# Prisma Client 생성
npx prisma generate
```

### 4. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000)을 열어 확인하세요.

## 📱 반응형 디자인

이 애플리케이션은 모바일 우선(Mobile First) 접근 방식으로 설계되었습니다:

- **모바일**: 기본 디자인 타겟
- **태블릿**: 중간 크기 화면 최적화
- **데스크톱**: 대형 화면 지원

## 🗃️ 데이터베이스 스키마

### Trip (여행)
- 여행 기본 정보 (제목, 설명, 시작일, 종료일)

### Schedule (일정)
- 날짜별 상세 일정
- 시간, 장소, 완료 상태

### Checklist (체크리스트)
- 준비물 목록
- 카테고리별 분류, 완료 상태

### Expense (지출)
- 일별 지출 내역
- 바트/원화 금액, 환율, 카테고리

## 🎯 향후 개발 계획

- [ ] 실시간 환율 API 연동
- [ ] 사용자 인증 시스템
- [ ] 여행 사진 갤러리
- [ ] 지출 내역 차트/그래프
- [ ] 여행 일정 공유 기능
- [ ] PWA 지원 (오프라인 사용)
- [ ] 다국어 지원

## 📄 라이선스

MIT License

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---
