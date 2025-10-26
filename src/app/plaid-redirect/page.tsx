import React from 'react';

const PlaidRedirectPage = () => {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground">
      <div className="mx-auto w-full max-w-md rounded-lg border border-border p-8 text-center shadow-lg">
        <h1 className="mb-4 text-2xl font-bold text-primary">
          Finalizing Verification
        </h1>
        <p className="mb-6 text-muted-foreground">
          Your browser should display a banner at the top of the screen.
          Please tap the 'OPEN' button in the banner to continue securely in the app.
        </p>
        <div className="flex items-center justify-center space-x-2">
          <svg
            className="h-6 w-6 animate-spin text-primary"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            ></path>
          </svg>
          <span className="text-muted-foreground">Waiting for app to open...</span>
        </div>
      </div>
    </div>
  );
};

export default PlaidRedirectPage;
