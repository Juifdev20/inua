import ProtectedRoute from '../components/ProtectedRoute';

const FinanceRoute = ({ children }) => {
  return (
    <ProtectedRoute allowedRoles={['FINANCE']}>
      {children}
    </ProtectedRoute>
  );
};

export default FinanceRoute;

