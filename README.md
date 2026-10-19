# Mafia

브라우저에서 친구들과 하는 마피아 게임입니다. 사람이 모자라면 방장이 AI 플레이어를 넣을 수 있고 AI 사회자가 밤과 낮의 결과를 테마에 맞는 이야기로 들려줍니다.

인공지능실습 강의 프로젝트이자 경진대회 출품작입니다.

## 상태

개발 중입니다. 지금은 규칙 엔진과 웹 화면 뼈대(홈, 프로필, 방 만들기, 방 목록)가 있습니다.

- 모드: 베이직(마피아·시민), 클래식(마피아·경찰·의사·시민)
- 준비 중: 스토리 모드, 맵, 특수 규칙

## 구조

- `packages/engine`: 게임 규칙 엔진 (TypeScript)
- `apps/web`: 웹 화면 (React + Vite)

## 실행

Node.js와 pnpm이 필요합니다.

```
pnpm install
pnpm test
pnpm --filter @mafia/web dev
```

AI 기능을 쓰려면 `.env.example`을 `.env`로 복사한 뒤 OpenAI API 키를 넣습니다. `.env`는 커밋하지 않습니다.

## 저작권

Copyright (c) 2026 Jeong Hong Cho. All rights reserved.

이 저장소는 열람용으로 공개되어 있습니다. 저작권자의 허락 없이 코드를 복제·수정·배포하거나 다른 프로젝트에 사용할 수 없습니다.
