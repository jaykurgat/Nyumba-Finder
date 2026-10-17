export default function Loading() {
  return (
    <main
      className="nf-loading-screen"
      role="status"
      aria-live="polite"
      aria-label="Loading NyumbaFinder"
    >
      <div className="nf-loading-content">
        <svg
          className="nf-loading-mark"
          viewBox="0 0 64 64"
          role="img"
          aria-label="NyumbaFinder house icon"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            className="nf-house-roof"
            d="M6 29 32 7 58 29"
            fill="none"
            stroke="#004c3d"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            className="nf-house-body"
            d="M13 26V57H27V42H37V57H51V26"
            fill="none"
            stroke="#004c3d"
            strokeWidth="6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <g fill="#f2a000">
            <rect className="nf-window nf-window-1" x="27" y="29" width="7" height="7" rx="1" />
            <rect className="nf-window nf-window-2" x="37" y="29" width="7" height="7" rx="1" />
            <rect className="nf-window nf-window-3" x="27" y="38" width="7" height="7" rx="1" />
            <rect className="nf-window nf-window-4" x="37" y="38" width="7" height="7" rx="1" />
          </g>
        </svg>
        <p className="nf-loading-message">Finding your next home</p>
        <span className="nf-loading-sr-only">Please wait while the page loads.</span>
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
          flex-direction: column;
          align-items: center;
          gap: 22px;
        }
        .nf-loading-mark {
          display: block;
          width: 88px;
          height: 88px;
          overflow: visible;
        }
        .nf-house-roof,
        .nf-house-body {
          stroke-dasharray: 120;
          stroke-dashoffset: 120;
          animation: nf-house-draw 1.8s cubic-bezier(.65, 0, .35, 1) infinite;
        }
        .nf-house-body {
          animation-delay: .18s;
        }
        .nf-window {
          opacity: .18;
          transform-box: fill-box;
          transform-origin: center;
          animation: nf-window-light 1.8s ease-in-out infinite;
        }
        .nf-window-1 { animation-delay: .45s; }
        .nf-window-2 { animation-delay: .6s; }
        .nf-window-3 { animation-delay: .75s; }
        .nf-window-4 { animation-delay: .9s; }
        .nf-loading-message {
          margin: 0;
          color: #536455;
          font-family: inherit;
          font-size: 13px;
          font-weight: 500;
          letter-spacing: .025em;
        }
        .nf-loading-sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        @keyframes nf-house-draw {
          0% { stroke-dashoffset: 120; opacity: .55; }
          48%, 76% { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: -120; opacity: .55; }
        }
        @keyframes nf-window-light {
          0%, 25%, 100% { opacity: .18; transform: scale(.82); }
          42%, 75% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .nf-house-roof, .nf-house-body, .nf-window {
            animation: none;
            stroke-dashoffset: 0;
            opacity: 1;
            transform: none;
          }
        }
      `}</style>
    </main>
  );
}
