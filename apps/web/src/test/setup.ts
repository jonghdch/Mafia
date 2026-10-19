import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";

// Node 25 의 실험적 전역 localStorage 가 jsdom 의 것을 덮어 쓰므로 메모리 구현으로 고정한다.
class MemoryStorage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, String(v));
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
  clear() {
    this.map.clear();
  }
}
Object.defineProperty(window, "localStorage", { value: new MemoryStorage(), configurable: true });

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});
