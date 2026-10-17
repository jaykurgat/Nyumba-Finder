export default function Loading() {
  return (
    <main
      className="nf-loading-screen"
      role="status"
      aria-live="polite"
      aria-label="Loading NyumbaFinder"
    >
      <div className="nf-loading-content">
        <img
          src="/nyumbafinder-logo.svg?v=4"
          alt="NyumbaFinder — Find Your Next Home"
          className="nf-loading-logo"
          width={300}
          height={62}
          fetchPriority="high"
        />
        <div className="nf-loading-track" aria-hidden="true">
          <span className="nf-loading-progress" />
        </div>
        <p className="nf-loading-message">Finding your next home</p>
      </div>
      <style>{`
        .nf-loading-screen {
          position: fixed;
          inset: 0;
          z-index: 200;
          display: grid;
          place-items: center;
          min-height: 100dvh;
          padding: 24px;
          background: #fbfaf5;
        }
        .nf-loading-content {
          display: flex;
          width: min(100%, 340px);
          flex-direction: column;
          align-items: center;
          gap: 22px;
        }
        .nf-loading-logo {
          display: block;
          width: min(300px, 78vw);
          height: auto;
          object-fit: contain;
          animation: nf-logo-arrive 1.8s ease-in-out infinite;
        }
        .nf-loading-track {
          position: relative;
          width: 112px;
          height: 3px;
          overflow: hidden;
          background: #e4e8df;
        }
        .nf-loading-progress {
          position: absolute;
          inset: 0 auto 0 0;
          width: 42%;
          background: #397b43;
          transform: translateX(-110%);
          animation: nf-loading-slide 1.25s ease-in-out infinite;
        }
        .nf-loading-message {
          margin: -8px 0 0;
          color: #536455;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: .025em;
        }
        @keyframes nf-logo-arrive {
          0%, 100% { opacity: 1; transform: translateY(0); }
          50% { opacity: .82; transform: translateY(-3px); }
        }
        @keyframes nf-loading-slide {
          0% { transform: translateX(-110%); }
          100% { transform: translateX(270%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .nf-loading-logo, .nf-loading-progress {
            animation: none;
          }
          .nf-loading-progress {
            width: 100%;
            transform: none;
            opacity: .7;
          }
        }
      `}</style>
    </main>
  );
}
