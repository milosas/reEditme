import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { usePageTitle } from '../hooks/usePageTitle';
import { useAuth } from '../hooks/useAuth';
import { useDashboard } from '../hooks/useDashboard';
import { useSocialAccounts } from '../hooks/useSocialAccounts';
import { useLanguage } from '../contexts/LanguageContext';
import type { Translations } from '../i18n/translations';
import { LoginModal } from '../components/auth/LoginModal';
import { BuyCreditsModal } from '../components/credits/BuyCreditsModal';
import { StaggerContainer, StaggerItem } from '../components/animation/StaggerChildren';
import { supabase } from '../lib/supabase';
import { Skeleton, SkeletonStatCard, SkeletonFormSection } from '../components/ui/Skeleton';
import { profileSchema, validateField, validateAll } from '../lib/validation';

export default function Dashboard() {
  usePageTitle('Valdymo skydelis');
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { stats, recentImages, loading: dashboardLoading, error, refresh } = useDashboard();
  const { accounts: socialAccounts, fetchAccounts, syncAccounts } = useSocialAccounts();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showBuyCredits, setShowBuyCredits] = useState(false);
  const [disconnecting, setDisconnecting] = useState<string | null>(null);

  // Personal info state
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Pre-fill from user metadata
  useEffect(() => {
    if (user?.user_metadata) {
      setName(user.user_metadata.name || '');
      setPhone(user.user_metadata.phone || '');
      setCompany(user.user_metadata.company || '');
    }
  }, [user]);

  // Sync social accounts from LATE API on mount
  useEffect(() => {
    if (user) {
      syncAccounts();
    }
  }, [user, syncAccounts]);

  const handleBlur = (field: 'name' | 'phone' | 'company', value: string) => {
    const error = validateField(profileSchema, field, value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (error) {
        next[field] = error;
      } else {
        delete next[field];
      }
      return next;
    });
  };

  const handleSavePersonalInfo = async () => {
    const errors = validateAll(profileSchema, { name, phone, company });
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    setSaveMessage(null);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { name, phone, company }
      });
      if (error) throw error;
      setSaveMessage('Išsaugota!');
      setTimeout(() => setSaveMessage(null), 2500);
    } catch (err: unknown) {
      setSaveMessage('Klaida: ' + (err instanceof Error ? err.message : 'Nepavyko išsaugoti'));
      setTimeout(() => setSaveMessage(null), 4000);
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnect = async (accountId: string) => {
    setDisconnecting(accountId);
    try {
      await supabase.from('social_accounts').delete().eq('id', accountId);
      await fetchAccounts();
    } catch {
      // Disconnect failed silently
    } finally {
      setDisconnecting(null);
    }
  };

  const loading = authLoading || dashboardLoading;
  const dashboard = t.dashboard;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <div className="mb-8">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-56" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
          <SkeletonStatCard />
        </div>
        <SkeletonFormSection />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-6">
          {dashboard?.title || 'Settings'}
        </h1>
        <div className="bg-white border border-[#E5E5E3] rounded-2xl p-8 md:p-12 text-center">
          <div className="w-16 h-16 bg-[#FFF0EB] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-[#FF6B35]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-[#1A1A1A] mb-2">
            {dashboard?.guestTitle || 'Sign in to view your settings'}
          </h2>
          <p className="text-[#666666] mb-6">
            {dashboard?.guestDescription || 'Track your generations and manage models'}
          </p>
          <button
            onClick={() => setShowLoginModal(true)}
            className="px-6 py-3 bg-[#FF6B35] text-white font-semibold rounded-full hover:bg-[#E55A2B] transition-colors"
          >
            {dashboard?.signIn || 'Sign In'}
          </button>
        </div>
        <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
        <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A] mb-6">
          {dashboard?.title || 'Settings'}
        </h1>
        <div className="bg-white border border-[#E5E5E3] rounded-2xl p-6 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <button
            onClick={refresh}
            className="px-6 py-3 bg-[#FF6B35] text-white rounded-full hover:bg-[#E55A2B] transition-all"
          >
            {t.actions?.regenerate || 'Try Again'}
          </button>
        </div>
      </div>
    );
  }

  const firstName = user.user_metadata?.name?.split(' ')[0] || user.email?.split('@')[0] || '';

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-8">
      {/* Section 1: Welcome + CTA */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#1A1A1A]">
            {dashboard?.welcome || 'Sveiki'}, {firstName}!
          </h1>
          <p className="text-[#666666] mt-1 text-sm md:text-base">{user.email}</p>
        </div>
        <button
          onClick={() => navigate('/generator')}
          className="px-5 py-2.5 bg-[#FF6B35] text-white font-semibold rounded-full hover:bg-[#E55A2B] transition-colors text-sm md:text-base flex items-center gap-2 self-start sm:self-auto"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          {dashboard?.actions?.create || 'Kurti naują'}
        </button>
      </div>

      {/* Section 2: Stats Grid */}
      <StaggerContainer className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8" staggerDelay={0.06}>
        <StaggerItem>
          <GradientStatCard
            gradient="gradient-orange"
            icon={
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            }
            iconColor="text-[#FF6B35]"
            label={dashboard?.stats?.generations || 'Images Created'}
            value={stats?.generationsCount ?? 0}
            onClick={() => navigate('/gallery')}
          />
        </StaggerItem>
        <StaggerItem>
          <GradientStatCard
            gradient="gradient-teal"
            icon={
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            }
            iconColor="text-[#14B8A6]"
            label={dashboard?.stats?.avatars || 'Custom Models'}
            value={stats?.avatarsCount ?? 0}
            onClick={() => navigate('/modeliai')}
          />
        </StaggerItem>
        <StaggerItem>
          <GradientStatCard
            gradient="gradient-purple"
            icon={
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            iconColor="text-[#9333EA]"
            label={dashboard?.stats?.credits || 'Credits'}
            value={stats?.credits ?? 0}
            onClick={() => setShowBuyCredits(true)}
          />
        </StaggerItem>
        <StaggerItem>
          <GradientStatCard
            gradient="gradient-pink"
            icon={
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
            }
            iconColor="text-[#EC4899]"
            label={dashboard?.stats?.plan || 'Plan'}
            value={getPlanLabel(stats?.subscription || 'free', dashboard)}
          />
        </StaggerItem>
      </StaggerContainer>

      {/* Section 3: Recent Creations */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-[#1A1A1A]">
            {dashboard?.recentTitle || 'Naujausi kūriniai'}
          </h2>
          {recentImages.length > 0 && (
            <button
              onClick={() => navigate('/gallery')}
              className="text-sm text-[#FF6B35] hover:text-[#E55A2B] font-medium transition-colors"
            >
              {dashboard?.viewAll || 'Žiūrėti visus'} &rarr;
            </button>
          )}
        </div>
        {recentImages.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {recentImages.slice(0, 4).map((img) => (
              <div
                key={img.id}
                className="relative group aspect-square rounded-xl overflow-hidden bg-[#EFEFED] cursor-pointer"
                onClick={() => navigate('/gallery')}
              >
                <img
                  src={img.image_url}
                  alt=""
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-3">
                  <span className="text-white text-xs font-medium">
                    {new Date(img.created_at).toLocaleDateString('lt-LT')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#E5E5E3] rounded-2xl p-8 text-center">
            <div className="w-12 h-12 bg-[#FFF0EB] rounded-full flex items-center justify-center mx-auto mb-3">
              <svg className="w-6 h-6 text-[#FF6B35]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-[#666666] text-sm mb-3">{dashboard?.noImages || 'Dar nėra nuotraukų'}</p>
            <button
              onClick={() => navigate('/generator')}
              className="text-sm text-[#FF6B35] hover:text-[#E55A2B] font-medium"
            >
              {dashboard?.createFirst || 'Sukurti pirmą nuotrauką'} &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Section 4: Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 mb-6 md:mb-8">
        <button
          onClick={() => navigate('/generator')}
          className="gradient-orange rounded-2xl p-5 md:p-6 text-left hover:shadow-md transition-shadow group"
        >
          <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5 text-[#FF6B35]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </div>
          <h3 className="font-semibold text-[#1A1A1A] mb-1">{dashboard?.actions?.create || 'Kurti naują nuotrauką'}</h3>
          <p className="text-sm text-[#666666]">{dashboard?.actions?.createDesc || 'Sugeneruokite nuotrauką su AI'}</p>
        </button>
        <button
          onClick={() => navigate('/gallery')}
          className="gradient-teal rounded-2xl p-5 md:p-6 text-left hover:shadow-md transition-shadow group"
        >
          <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
            <svg className="w-5 h-5 text-[#14B8A6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="font-semibold text-[#1A1A1A] mb-1">{dashboard?.actions?.gallery || 'Peržiūrėti galeriją'}</h3>
          <p className="text-sm text-[#666666]">{dashboard?.actions?.galleryDesc || 'Naršykite visas sugeneruotas nuotraukas'}</p>
        </button>
      </div>

      {/* Section 5: Personal Info */}
      <div id="settings" className="bg-white border border-[#E5E5E3] rounded-2xl p-5 md:p-6 mb-6 md:mb-8">
        <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">{dashboard?.personalInfo?.title || 'Asmeniniai duomenys'}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-[#333] mb-1">{dashboard?.personalInfo?.name || 'Vardas'}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => handleBlur('name', name)}
              placeholder={dashboard?.personalInfo?.namePlaceholder || 'Jūsų vardas'}
              className={`w-full px-3 py-2 border rounded-lg text-[#1A1A1A] placeholder-[#AAAAAA] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-colors ${fieldErrors.name ? 'border-red-400' : 'border-[#E5E5E3]'}`}
            />
            {fieldErrors.name && <p className="text-xs text-red-500 mt-1">{fieldErrors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#333] mb-1">{dashboard?.personalInfo?.email || 'El. paštas'}</label>
            <input
              type="email"
              value={user.email || ''}
              readOnly
              className="w-full px-3 py-2 border border-[#E5E5E3] rounded-lg text-[#999999] bg-[#F9F9F9] cursor-not-allowed"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#333] mb-1">{dashboard?.personalInfo?.phone || 'Telefonas'}</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => handleBlur('phone', phone)}
              placeholder={dashboard?.personalInfo?.phonePlaceholder || '+370...'}
              className={`w-full px-3 py-2 border rounded-lg text-[#1A1A1A] placeholder-[#AAAAAA] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-colors ${fieldErrors.phone ? 'border-red-400' : 'border-[#E5E5E3]'}`}
            />
            {fieldErrors.phone && <p className="text-xs text-red-500 mt-1">{fieldErrors.phone}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-[#333] mb-1">{dashboard?.personalInfo?.company || 'Įmonė'}</label>
            <input
              type="text"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onBlur={() => handleBlur('company', company)}
              placeholder={dashboard?.personalInfo?.companyPlaceholder || 'Įmonės pavadinimas'}
              className={`w-full px-3 py-2 border rounded-lg text-[#1A1A1A] placeholder-[#AAAAAA] focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] transition-colors ${fieldErrors.company ? 'border-red-400' : 'border-[#E5E5E3]'}`}
            />
            {fieldErrors.company && <p className="text-xs text-red-500 mt-1">{fieldErrors.company}</p>}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-5">
          <button
            onClick={handleSavePersonalInfo}
            disabled={saving}
            className="px-6 py-2.5 bg-[#FF6B35] text-white font-semibold rounded-full hover:bg-[#E55A2B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (dashboard?.personalInfo?.saving || 'Saugoma...') : (dashboard?.personalInfo?.save || 'Išsaugoti')}
          </button>
          {saveMessage && (
            <span className={`text-sm font-medium ${saveMessage.startsWith('Klaida') ? 'text-red-500' : 'text-green-600'}`}>
              {saveMessage}
            </span>
          )}
        </div>
      </div>

      {/* Section 6: Social Accounts */}
      <div className="bg-white border border-[#E5E5E3] rounded-2xl p-5 md:p-6 mb-8">
        <h2 className="text-lg font-semibold text-[#1A1A1A] mb-4">Socialinės paskyros</h2>
        {socialAccounts.length > 0 ? (
          <div className="space-y-3">
            {socialAccounts.map(acc => (
              <div key={acc.id} className="flex items-center justify-between p-3 bg-[#F7F7F5] rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FF6B35] flex items-center justify-center text-white text-xs font-bold uppercase">
                    {acc.platform.slice(0, 2)}
                  </div>
                  <div>
                    <span className="text-sm font-medium text-[#1A1A1A] capitalize">{acc.platform}</span>
                    {acc.platform_username && (
                      <p className="text-xs text-[#999]">@{acc.platform_username}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-[#999] hidden sm:inline">
                    {new Date(acc.connected_at).toLocaleDateString('lt-LT')}
                  </span>
                  <button
                    onClick={() => handleDisconnect(acc.id)}
                    disabled={disconnecting === acc.id}
                    className="px-3 py-1.5 text-xs font-medium text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    {disconnecting === acc.id ? '...' : 'Atjungti'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-[#999]">
            Nėra prijungtų paskyrų. Prijunkite paskyras per{' '}
            <button onClick={() => navigate('/post-creator')} className="text-[#FF6B35] hover:underline font-medium">
              Įrašų kūrėją
            </button>.
          </p>
        )}
      </div>

      {/* Modals */}
      <BuyCreditsModal isOpen={showBuyCredits} onClose={() => setShowBuyCredits(false)} />
    </div>
  );
}

// Gradient stat card component
interface GradientStatCardProps {
  gradient: string;
  icon: React.ReactNode;
  iconColor: string;
  label: string;
  value: number | string;
  onClick?: () => void;
}

function GradientStatCard({ gradient, icon, iconColor, label, value, onClick }: GradientStatCardProps) {
  return (
    <div
      onClick={onClick}
      className={`${gradient} rounded-2xl p-4 md:p-5 transition-all ${
        onClick ? 'cursor-pointer hover:shadow-md active:scale-[0.98]' : ''
      }`}
    >
      <div className={`${iconColor} mb-2 md:mb-3`}>
        {icon}
      </div>
      <p className="text-xl md:text-2xl font-bold text-[#1A1A1A]">{value}</p>
      <p className="text-xs md:text-sm text-[#666666] mt-0.5">{label}</p>
    </div>
  );
}

function getPlanLabel(subscription: string, dashboard: Translations['dashboard']): string {
  const plans: Record<string, string> = {
    free: dashboard?.plans?.free || 'Free',
    pro: dashboard?.plans?.pro || 'Pro',
    enterprise: dashboard?.plans?.enterprise || 'Enterprise'
  };
  return plans[subscription] || 'Free';
}
