import { useState, useEffect } from 'react';
import { useSocialAccounts, SocialAccount } from '../../hooks/useSocialAccounts';

interface PublishButtonsProps {
  text: string;
  imageUrl?: string | null;
}

// Platform config: display name, colors, icon
const PLATFORMS = [
  {
    id: 'facebook',
    name: 'Facebook',
    color: '#1877F2',
    hoverColor: '#1565D8',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
  },
  {
    id: 'instagram',
    name: 'Instagram',
    gradient: 'bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737]',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
      </svg>
    ),
  },
  {
    id: 'tiktok',
    name: 'TikTok',
    color: '#000000',
    hoverColor: '#1a1a1a',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />
      </svg>
    ),
  },
  {
    id: 'linkedin',
    name: 'LinkedIn',
    color: '#0A66C2',
    hoverColor: '#094EA0',
    icon: (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
];

function getAccountsForPlatform(accounts: SocialAccount[], platformId: string): SocialAccount[] {
  return accounts.filter(a => a.platform.toLowerCase() === platformId);
}

export function PublishButtons({ text, imageUrl }: PublishButtonsProps) {
  const {
    accounts,
    isPublishing,
    publishingPlatforms,
    publishResult,
    error,
    syncAccounts,
    connectAccount,
    publishPost,
    setPublishResult,
    clearError,
  } = useSocialAccounts();

  const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
  const [connectingPlatform, setConnectingPlatform] = useState<string | null>(null);
  const [hasSynced, setHasSynced] = useState(false);

  // Sync accounts from LATE on first render
  useEffect(() => {
    if (!hasSynced) {
      syncAccounts();
      setHasSynced(true);
    }
  }, [hasSynced, syncAccounts]);

  // Toggle account selection
  const toggleAccount = (accountId: string) => {
    setSelectedAccounts(prev => {
      const next = new Set(prev);
      if (next.has(accountId)) {
        next.delete(accountId);
      } else {
        next.add(accountId);
      }
      return next;
    });
  };

  // Handle connect
  const handleConnect = async (platformId: string) => {
    setConnectingPlatform(platformId);
    clearError();
    try {
      const popup = await connectAccount(platformId);
      if (popup) {
        // Poll for popup closure every 500ms
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            syncAccounts();
            setConnectingPlatform(null);
          }
        }, 500);
        // Safety timeout: stop polling after 5 minutes
        setTimeout(() => {
          clearInterval(checkClosed);
          setConnectingPlatform(null);
        }, 300000);
      } else {
        // Popup was blocked by browser
        setConnectingPlatform(null);
      }
    } catch {
      setConnectingPlatform(null);
    }
  };

  // Handle publish
  const handlePublish = async () => {
    if (!text || selectedAccounts.size === 0) return;
    setPublishResult(null);

    const platforms = Array.from(selectedAccounts).map(accountId => {
      const account = accounts.find(a => a.late_account_id === accountId);
      return {
        platform: account?.platform || '',
        accountId,
      };
    }).filter(p => p.platform);

    await publishPost(text, imageUrl, platforms);
  };

  const hasConnectedAccounts = accounts.length > 0;
  const hasSelectedAccounts = selectedAccounts.size > 0;

  return (
    <div className="space-y-4">
      {/* Section label */}
      <div className="flex items-center gap-2">
        <svg className="w-5 h-5 text-[#999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
        <span className="text-sm font-medium text-[#1A1A1A]">Skelbti socialiniuose tinkluose</span>
      </div>

      {/* Platform list */}
      <div className="bg-[#F7F7F5] rounded-xl p-4 space-y-3">
        {PLATFORMS.map(platform => {
          const platformAccounts = getAccountsForPlatform(accounts, platform.id);
          const isConnected = platformAccounts.length > 0;
          const isConnecting = connectingPlatform === platform.id;

          return (
            <div key={platform.id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Platform icon */}
                <div
                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-white ${
                    platform.gradient || ''
                  }`}
                  style={platform.color ? { backgroundColor: platform.color } : undefined}
                >
                  {platform.icon}
                </div>

                {/* Platform info */}
                <div>
                  <span className="text-sm font-medium text-[#1A1A1A]">{platform.name}</span>
                  {isConnected && platformAccounts[0].platform_username && (
                    <p className="text-xs text-[#999]">@{platformAccounts[0].platform_username}</p>
                  )}
                </div>
              </div>

              {/* Action: toggle or connect */}
              {isConnected ? (
                <div className="flex items-center gap-2">
                  {platformAccounts.map(acc => (
                    <button
                      key={acc.late_account_id}
                      onClick={() => toggleAccount(acc.late_account_id)}
                      disabled={isPublishing}
                      className={`relative w-10 h-6 rounded-full transition-colors ${
                        selectedAccounts.has(acc.late_account_id)
                          ? 'bg-[#FF6B35]'
                          : 'bg-[#D1D5DB]'
                      } ${isPublishing ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <span
                        className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform ${
                          selectedAccounts.has(acc.late_account_id) ? 'translate-x-4' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <button
                  onClick={() => handleConnect(platform.id)}
                  disabled={isConnecting}
                  className="px-3 py-1.5 text-xs font-medium text-[#FF6B35] border border-[#FF6B35]/30 rounded-lg hover:bg-[#FFF0EB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
                >
                  {isConnecting ? (
                    <>
                      <div className="w-3 h-3 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
                      Jungiama...
                    </>
                  ) : (
                    <>
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      Prijungti
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Connection error display */}
      {error && (
        <div className="flex items-center justify-between p-3 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm text-red-600">{error}</span>
          </div>
          <button onClick={clearError} className="text-red-400 hover:text-red-600">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Publish button */}
      {hasConnectedAccounts && (
        <button
          onClick={handlePublish}
          disabled={!hasSelectedAccounts || isPublishing || !text}
          className="w-full py-3 bg-[#FF6B35] text-white font-semibold rounded-xl hover:bg-[#E55A2B] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {isPublishing ? (
            <>
              <div className="w-5 h-5 rounded-full border-2 border-white border-t-transparent animate-spin" />
              Skelbiama...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Skelbti ({selectedAccounts.size} {selectedAccounts.size === 1 ? 'paskyra' : 'paskyros'})
            </>
          )}
        </button>
      )}

      {/* Publish result */}
      {publishResult && (
        <div className={`rounded-xl p-4 ${publishResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
          {publishResult.success ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="text-sm font-medium text-green-700">Paskelbta sėkmingai!</span>
              </div>
              <button
                onClick={() => {
                  setPublishResult(null);
                  setSelectedAccounts(new Set());
                }}
                className="w-full py-2.5 text-sm font-medium text-[#FF6B35] border border-[#FF6B35]/30 rounded-xl hover:bg-[#FFF0EB] transition-colors"
              >
                Kurti naują įrašą
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-sm text-red-600">{publishResult.error || 'Skelbimo klaida'}</span>
            </div>
          )}
        </div>
      )}

      {/* Loading indicator for per-platform publishing */}
      {isPublishing && publishingPlatforms.size > 0 && (
        <div className="space-y-2">
          {Array.from(publishingPlatforms).map(accountId => {
            const account = accounts.find(a => a.late_account_id === accountId);
            if (!account) return null;
            return (
              <div key={accountId} className="flex items-center gap-2 text-sm text-[#999]">
                <div className="w-3 h-3 rounded-full border-2 border-[#FF6B35] border-t-transparent animate-spin" />
                <span>Skelbiama {account.platform}...</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
