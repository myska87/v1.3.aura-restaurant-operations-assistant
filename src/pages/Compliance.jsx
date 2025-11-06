import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Compliance() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate(createPageUrl('ComplianceDashboard'), { replace: true });
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-gray-600">
        Redirecting to Compliance Dashboard...
      </div>
    </div>
  );
}