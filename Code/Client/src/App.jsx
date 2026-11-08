import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastProvider';
import AppRouter from './routes/AppRouter';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppRouter />
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
