import { ROLE_TABLES, type GameMode, type RoleCounts } from "@mafia/engine";

export type Visibility = "public" | "private";
export type RoomStatus = "waiting" | "full" | "playing";

export interface Room {
  code: string;
  name: string;
  visibility: Visibility;
  mode: GameMode;
  theme: string;
  players: number;
  capacity: number;
  status: RoomStatus;
  /** 목업 전용. 실제 서버가 생기면 클라이언트에 내려오지 않는다. */
  password?: string;
}

export const STATUS_LABEL: Record<RoomStatus, string> = {
  waiting: "대기 중",
  full: "정원 참",
  playing: "게임 중",
};

/** 지금 만들 수 있는 모드. 스토리는 방 만들기 화면에서 잠긴 자리로만 있다. */
export const MODES = ["basic", "classic"] as const satisfies readonly GameMode[];
export const MODE_LABEL: Record<GameMode, string> = { classic: "클래식", basic: "베이직" };
export const THEMES = ["안개 마을"] as const;
export const CAPACITIES = [5, 6, 7, 8] as const;
export type Capacity = (typeof CAPACITIES)[number];

export const MOCK_ROOMS: Room[] = [
  { code: "ABCD", name: "오늘 밤의 마을", visibility: "public", mode: "classic", theme: "안개 마을", players: 3, capacity: 8, status: "waiting" },
  { code: "KLMN", name: "우리끼리 한 판", visibility: "private", mode: "classic", theme: "안개 마을", players: 5, capacity: 6, status: "waiting", password: "1234" },
  { code: "QRST", name: "안개 낀 항구", visibility: "public", mode: "classic", theme: "안개 마을", players: 7, capacity: 7, status: "full" },
  { code: "WXYZ", name: "동아리 모임", visibility: "private", mode: "classic", theme: "안개 마을", players: 8, capacity: 8, status: "playing", password: "4321" },
  { code: "HJKP", name: "퇴근 후 한 판", visibility: "public", mode: "classic", theme: "안개 마을", players: 4, capacity: 6, status: "playing" },
  { code: "BSCA", name: "처음 해보는 마피아", visibility: "public", mode: "basic", theme: "안개 마을", players: 2, capacity: 6, status: "waiting" },
  { code: "BSCB", name: "조용한 베이직", visibility: "private", mode: "basic", theme: "안개 마을", players: 4, capacity: 8, status: "waiting", password: "1111" },
  { code: "EFGH", name: "새벽의 광장", visibility: "private", mode: "classic", theme: "안개 마을", players: 2, capacity: 5, status: "waiting", password: "0000" },
];

/** 직업 구성표는 엔진의 것을 그대로 쓴다. */
export type Composition = RoleCounts;

export function compositionFor(mode: GameMode, capacity: Capacity): Composition {
  return ROLE_TABLES[mode][capacity]!;
}

export const DEFAULT_ROOM_NAMES = ["오늘 밤의 마을", "안개 낀 광장", "자정의 식탁", "등불 아래서", "마지막 열차"];

export function randomRoomCode(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZ";
  let out = "";
  for (let i = 0; i < 4; i++) out += letters[Math.floor(Math.random() * letters.length)];
  return out;
}

export const CODE_PATTERN = /^[A-Z]{4}$/;
