import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { RootState, AppDispatch } from '../store';
import { login, register, logout } from '../store/authSlice';
import toast from 'react-hot-toast';

export const useAuth = () => {
  const dispatch = useDispatch<AppDispatch>();
  const navigate  = useNavigate();
  const { isAuthenticated, user, loading, error } = useSelector((s: RootState) => s.auth);

  const handleLogin = async (email: string, password: string) => {
    const result = await dispatch(login({ email, password }));
    if (login.fulfilled.match(result)) {
      toast.success('Welcome back!');
      navigate('/dashboard');
    } else {
      toast.error(result.payload as string);
    }
  };

  const handleRegister = async (username: string, email: string, password: string) => {
    const result = await dispatch(register({ username, email, password }));
    if (register.fulfilled.match(result)) {
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } else {
      toast.error(result.payload as string);
    }
  };

  const handleLogout = () => {
    dispatch(logout());
    toast.success('Signed out successfully');
    navigate('/');
  };

  return { isAuthenticated, user, loading, error, handleLogin, handleRegister, handleLogout };
};