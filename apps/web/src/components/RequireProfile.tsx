import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useProfile } from "../lib/ProfileContext";
import { hasValidProfile } from "../lib/profile";
import { ProfileSetupDialog } from "./ProfileSetupDialog";

/** 유효한 닉네임이 담긴 프로필이 없으면 페이지 위에 프로필 만들기 팝업을 띄운다. 취소하면 홈으로. */
export function RequireProfile({ children }: { children: ReactNode }) {
  const { profile } = useProfile();
  const navigate = useNavigate();
  return (
    <>
      {children}
      <ProfileSetupDialog
        open={!hasValidProfile(profile)}
        onClose={() => navigate("/", { replace: true })}
        onSaved={() => {}}
      />
    </>
  );
}
