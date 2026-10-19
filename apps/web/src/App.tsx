import { Route, Routes, useParams } from "react-router-dom";
import { RequireProfile } from "./components/RequireProfile";
import { Home } from "./pages/Home";
import { Placeholder } from "./pages/Placeholder";
import { Profile } from "./pages/Profile";
import { RoomCreate } from "./pages/RoomCreate";
import { RoomList } from "./pages/RoomList";

function RoomPlaceholder() {
  const { code } = useParams();
  return <Placeholder title={`방 ${code ?? ""}`} />;
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/create" element={<RequireProfile><RoomCreate /></RequireProfile>} />
      <Route path="/rooms" element={<RequireProfile><RoomList /></RequireProfile>} />
      <Route path="/r/:code" element={<RoomPlaceholder />} />
      <Route path="/replays" element={<Placeholder title="지난 사건 일지" />} />
      <Route path="/replays/:id" element={<Placeholder title="사건 일지 보기" />} />
      <Route path="/terms" element={<Placeholder title="이용약관" />} />
      <Route path="/privacy" element={<Placeholder title="개인정보처리방침" />} />
      <Route path="*" element={<Placeholder title="페이지를 찾을 수 없어요" missing />} />
    </Routes>
  );
}

export const App = AppRoutes;
