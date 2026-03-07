import { useState } from 'react';
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/react';
import { useCredits } from '../../hooks/useCredits';
import { useToast } from '../../hooks/useToast';

interface BuyCreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const PACKAGES = [
  {
    id: '50' as const,
    credits: 50,
    price: '9,99',
    pricePerCredit: '0,20',
    badge: null,
  },
  {
    id: '150' as const,
    credits: 150,
    price: '24,99',
    pricePerCredit: '0,17',
    badge: 'Populiariausias',
  },
  {
    id: '500' as const,
    credits: 500,
    price: '79,99',
    pricePerCredit: '0,16',
    badge: 'Geriausia kaina',
  },
];

export function BuyCreditsModal({ isOpen, onClose }: BuyCreditsModalProps) {
  const { balance, purchaseCredits, subscribeSocial, socialSubscriptionActive } = useCredits();
  const { showToast } = useToast();
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handlePurchase = async (packageId: '50' | '150' | '500') => {
    try {
      setLoadingId(packageId);
      await purchaseCredits(packageId);
      showToast('Pirkimas pradetas! Nukreipiame i mokejimo puslapi...', 'success');
    } catch (error) {
      console.error('Purchase error:', error);
      showToast('Nepavyko pradeti pirkimo. Bandykite dar karta.', 'error');
      setLoadingId(null);
    }
  };

  const handleSubscribe = async () => {
    try {
      setLoadingId('social');
      await subscribeSocial();
      showToast('Prenumerata pradeta! Nukreipiame...', 'success');
    } catch (error) {
      console.error('Subscribe error:', error);
      showToast('Nepavyko pradeti prenumeratos. Bandykite dar karta.', 'error');
      setLoadingId(null);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <DialogPanel className="w-full max-w-lg bg-white rounded-2xl shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div>
              <DialogTitle className="text-xl font-semibold text-gray-900">
                Pirkti kreditus
              </DialogTitle>
              <p className="text-sm text-gray-500 mt-1">
                Turimi kreditai: <span className="font-medium text-[#FF6B35]">{balance}</span>
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors rounded-lg focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF6B35] focus:outline-none"
              aria-label="Uzdaryti"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-4">
            {/* Credit packages */}
            <div className="space-y-3">
              {PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`relative flex items-center justify-between p-4 rounded-xl border-2 transition-colors ${
                    pkg.badge
                      ? 'border-[#FF6B35] bg-[#FFF9F5]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Badge */}
                  {pkg.badge && (
                    <span className="absolute -top-2.5 left-4 px-2 py-0.5 bg-[#FF6B35] text-white text-xs font-medium rounded-full">
                      {pkg.badge}
                    </span>
                  )}

                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-gray-900">{pkg.credits}</span>
                      <span className="text-sm text-gray-500">kreditu</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {pkg.pricePerCredit} EUR / kreditas
                    </p>
                  </div>

                  <button
                    onClick={() => handlePurchase(pkg.id)}
                    disabled={loadingId !== null}
                    className="px-5 py-2.5 bg-[#FF6B35] text-white font-medium rounded-lg hover:bg-[#E55A2B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#FF6B35] focus:outline-none"
                  >
                    {loadingId === pkg.id ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                        </svg>
                        Kraunama...
                      </span>
                    ) : (
                      `${pkg.price} EUR`
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Section header */}
            <div className="pt-1">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Papildomos funkcijos</p>
            </div>

            {/* Social subscription */}
            <div className={`p-4 rounded-xl border-2 ${
              socialSubscriptionActive
                ? 'border-[#10B981] bg-[#F0FDF4]'
                : 'border-gray-200 hover:border-[#10B981]'
            } transition-colors`}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-gray-900">10 EUR</span>
                    <span className="text-sm text-gray-500">/ men.</span>
                  </div>
                  <p className="text-sm font-medium text-gray-700 mt-1">
                    Socialinių tinklų publikavimas
                  </p>
                  <ul className="mt-2 space-y-1">
                    <li className="flex items-center gap-1.5 text-xs text-gray-500">
                      <svg className="w-3.5 h-3.5 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Automatinis publikavimas
                    </li>
                    <li className="flex items-center gap-1.5 text-xs text-gray-500">
                      <svg className="w-3.5 h-3.5 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Facebook + Instagram
                    </li>
                    <li className="flex items-center gap-1.5 text-xs text-gray-500">
                      <svg className="w-3.5 h-3.5 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      Įrašų planavimas
                    </li>
                  </ul>
                </div>

                {socialSubscriptionActive ? (
                  <span className="px-4 py-2 bg-[#10B981] text-white text-sm font-medium rounded-lg">
                    Aktyvi
                  </span>
                ) : (
                  <button
                    onClick={handleSubscribe}
                    disabled={loadingId !== null}
                    className="px-5 py-2.5 bg-[#10B981] text-white font-medium rounded-lg hover:bg-[#059669] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#10B981] focus:outline-none"
                  >
                    {loadingId === 'social' ? (
                      <span className="flex items-center gap-2">
                        <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                          <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                        </svg>
                        Kraunama...
                      </span>
                    ) : (
                      'Aktyvuoti'
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* Credit costs info */}
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 mb-2">Kreditu kainorasciai:</p>
              <div className="grid grid-cols-2 gap-1.5 text-xs text-gray-500">
                <span>Modelio nuotrauka</span>
                <span className="text-right font-medium text-gray-700">4 kreditai</span>
                <span>Try-on nuotrauka</span>
                <span className="text-right font-medium text-gray-700">3 kreditai</span>
                <span>Iraso nuotrauka</span>
                <span className="text-right font-medium text-gray-700">3 kreditai</span>
                <span>Iraso tekstas</span>
                <span className="text-right font-medium text-gray-700">1 kreditas</span>
                <span>Tekstas is nuotraukos</span>
                <span className="text-right font-medium text-gray-700">1 kreditas</span>
              </div>
            </div>
          </div>
        </DialogPanel>
      </div>
    </Dialog>
  );
}
