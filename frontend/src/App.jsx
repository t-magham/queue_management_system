import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./components/Home.jsx";
import JoinLanding from "./components/JoinLanding.jsx"
import Login from "./components/Login.jsx";
import Signup from "./components/Signup.jsx";
import Dashboard from "./components/Dashboard.jsx";
import JoinPage from "./components/JoinPage.jsx";
import AdminQueuePage from "./components/AdminQueuePage.jsx"
import GuestQueuePage from "./components/GuestQueuePage.jsx"
const App = () =>  {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home/>}></Route>
        <Route path="/login" element={<Login/>}></Route>
        <Route path="/signup" element={<Signup/>}></Route>
        <Route path="/dashboard" element={<Dashboard/>}></Route>
        <Route path="/join" element={<JoinLanding />} />
        <Route path="/join/:code" element={<JoinPage />} />
        <Route path="/queue/:id" element={<AdminQueuePage />} />
        <Route path="/guest/:queue_id" element={<GuestQueuePage />} />
      </Routes>
    </BrowserRouter>
  );
}
export default App
