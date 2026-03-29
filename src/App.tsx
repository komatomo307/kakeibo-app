import { BrowserRouter } from "react-router-dom";
import { AppRouter } from "./app/router";

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppRouter />
    </BrowserRouter>
  );
}

export default App;
