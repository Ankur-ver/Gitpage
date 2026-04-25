import toast from 'react-hot-toast';

export const showToast = {
  success: (msg: string) => toast.success(msg),
  error:   (msg: string) => toast.error(msg),
  loading: (msg: string) => toast.loading(msg),
  info: (msg: string) =>
    toast(msg, {
      icon: 'ℹ️',
      style: {
        background: '#13131a',
        color: '#e8e8f0',
        border: '1px solid #2a2a3a',
      },
    }),
  promise: <T,>(
    promise: Promise<T>,
    msgs: { loading: string; success: string; error: string }
  ) => toast.promise(promise, msgs),
};

export default showToast;