import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";
import "react-toastify/dist/ReactToastify.css";
import StudentContext from "./context/StudentContext.jsx";
import axios from "axios";

axios.defaults.withCredentials = true;

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <StudentContext>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StudentContext>
  </StrictMode>
);
