import { Outlet } from 'react-router-dom';
import Navbar from '../components/Navbar';

function MainLayout() {
  return (
    <div className="app-layout">
      <Navbar />

      <main className="app-layout__content">
        <Outlet />
      </main>
    </div>
  );
}

export default MainLayout;