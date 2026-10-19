import { render } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { AppRoutes } from "../App";
import { ProfileProvider } from "../lib/ProfileContext";
import { PROFILE_KEY, type Profile } from "../lib/profile";

export function Loc() {
  const l = useLocation();
  return <output data-testid="loc">{l.pathname + l.search}</output>;
}

export function seedProfile(over: Partial<Profile> = {}) {
  const p: Profile = { id: "test-id", nickname: "민지", photo: null, characters: [], ...over };
  window.localStorage.setItem(PROFILE_KEY, JSON.stringify(p));
  return p;
}

export function renderApp(path: string) {
  return render(
    <ProfileProvider>
      <MemoryRouter initialEntries={[path]} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AppRoutes />
        <Loc />
      </MemoryRouter>
    </ProfileProvider>,
  );
}
