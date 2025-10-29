export function ComplianceStyles() {
  return (
    <style>{`
      @keyframes pulse-glow {
        0%, 100% {
          box-shadow: 0 0 20px rgba(1, 77, 64, 0.3);
        }
        50% {
          box-shadow: 0 0 40px rgba(1, 77, 64, 0.6);
        }
      }

      .compliance-card {
        border-left: 4px solid #014D40;
        transition: all 0.3s ease;
      }

      .compliance-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
      }

      .status-badge-active {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        color: white;
        animation: pulse-glow 2s infinite;
      }

      .status-badge-warning {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        color: white;
      }

      .status-badge-critical {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        color: white;
        animation: pulse-glow 1s infinite;
      }
    `}</style>
  );
}

export default ComplianceStyles;