import { useRef, useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { useToast } from '../../hooks/useToast';
import { AVATARS, QUALITY_MODES } from '../../constants/fluxOptions';
import type { Avatar, QualityModeOption, Config } from '../../types';
import { useAvatarModels } from '../../hooks/useAvatarModels';
import { useAuth } from '../../hooks/useAuth';
import { ModelCard } from '../avatars/ModelCard';
import { AvatarCreatorModal } from '../avatars/AvatarCreatorModal';

interface ConfigPanelProps {
  config: Config;
  onConfigChange: (config: Config) => void;
}

export function ConfigPanel({ config, onConfigChange }: ConfigPanelProps) {
  const { t } = useLanguage();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { models, createModel, addPhotoToModel, addGeneratedPhotoToModel, deletePhoto } = useAvatarModels();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelFileInputRef = useRef<HTMLInputElement>(null);
  const [showCreatorModal, setShowCreatorModal] = useState(false);
  const [creatorTargetModelId, setCreatorTargetModelId] = useState<string | undefined>();
  const [myAvatarsOpen, setMyAvatarsOpen] = useState(false);
  const [presetsOpen, setPresetsOpen] = useState(!user);
  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);
  const [addPhotoTargetModelId, setAddPhotoTargetModelId] = useState<string | null>(null);
  const [showCreateModel, setShowCreateModel] = useState(false);
  const [newModelName, setNewModelName] = useState('');
  const [creatingModel, setCreatingModel] = useState(false);

  const handleAvatarChange = (avatar: Avatar) => {
    if (config.avatar?.id === avatar.id) {
      onConfigChange({ ...config, avatar: null });
    } else {
      onConfigChange({ ...config, avatar });
    }
  };

  const handleQualityModeChange = (mode: QualityModeOption) => {
    onConfigChange({ ...config, qualityMode: mode.id });
  };

  const handleAddPhotoToModel = (modelId: string) => {
    setAddPhotoTargetModelId(modelId);
    modelFileInputRef.current?.click();
  };

  const handleModelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !addPhotoTargetModelId) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      showToast('Tik JPEG ir PNG failai leidžiami', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Failo dydis turi būti mažesnis nei 10MB', 'error');
      return;
    }

    try {
      await addPhotoToModel(addPhotoTargetModelId, file);
    } catch (error) {
      console.error('Failed to add photo:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast(`Nepavyko pridėti nuotraukos: ${errorMessage}`, 'error');
    }

    e.target.value = '';
    setAddPhotoTargetModelId(null);
  };

  const handleCreateModel = async () => {
    if (!newModelName.trim()) return;
    setCreatingModel(true);
    try {
      const model = await createModel(newModelName.trim());
      if (model) {
        setExpandedModelId(model.id);
      }
      setNewModelName('');
      setShowCreateModel(false);
    } catch (error) {
      console.error('Failed to create model:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast(`Nepavyko sukurti modelio: ${errorMessage}`, 'error');
    } finally {
      setCreatingModel(false);
    }
  };

  const handleCreateModelWithFile = async () => {
    fileInputRef.current?.click();
  };

  const handleNewModelFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      showToast('Tik JPEG ir PNG failai leidžiami', 'error');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showToast('Failo dydis turi būti mažesnis nei 10MB', 'error');
      return;
    }

    const name = newModelName.trim() || 'Model';
    setCreatingModel(true);
    try {
      const model = await createModel(name, file);
      if (model) {
        setExpandedModelId(model.id);
      }
      setNewModelName('');
      setShowCreateModel(false);
    } catch (error) {
      console.error('Failed to create model:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      showToast(`Nepavyko sukurti modelio: ${errorMessage}`, 'error');
    } finally {
      setCreatingModel(false);
    }

    e.target.value = '';
  };

  const getAvatarName = (avatar: Avatar) => {
    if (avatar.isCustom) return avatar.name || t.customAvatars?.customAvatar || 'Custom Model';
    const translated = t.avatars[avatar.id as keyof typeof t.avatars];
    return translated?.name || avatar.name;
  };

  const getAvatarDescription = (avatar: Avatar) => {
    if (avatar.isCustom) return avatar.description;
    const translated = t.avatars[avatar.id as keyof typeof t.avatars];
    return translated?.description || avatar.description;
  };

  const getQualityModeName = (qm: QualityModeOption) => {
    const translated = (t as Record<string, unknown>).qualityModes as Record<string, { name: string }> | undefined;
    return translated?.[qm.id]?.name || qm.name;
  };

  return (
    <div className="space-y-5">
      {/* My Models — collapsible */}
      {user && (
        <div className="border border-[#E5E5E3] rounded-xl overflow-hidden">
          <button
            onClick={() => setMyAvatarsOpen(!myAvatarsOpen)}
            className="w-full flex items-center justify-between px-4 py-3 bg-[#F7F7F5] hover:bg-[#EFEFED] transition-colors"
          >
            <span className="text-sm font-medium text-[#1A1A1A]">
              {t.avatarModels?.myModels || t.customAvatars?.myAvatars || 'Mano modeliai'}
              {config.avatar?.isCustom && (
                <span className="ml-2 text-xs text-[#FF6B35] font-normal">— {getAvatarName(config.avatar)}</span>
              )}
            </span>
            <svg className={`w-4 h-4 text-[#999999] transition-transform ${myAvatarsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {myAvatarsOpen && (
            <div className="p-3 space-y-2">
              {/* Model cards */}
              {models.map((model) => (
                <ModelCard
                  key={model.id}
                  model={model}
                  isExpanded={expandedModelId === model.id}
                  selectedPhotoId={config.avatar?.isCustom ? config.avatar.id : null}
                  onToggleExpand={() => setExpandedModelId(expandedModelId === model.id ? null : model.id)}
                  onSelectPhoto={handleAvatarChange}
                  onAddPhoto={handleAddPhotoToModel}
                />
              ))}

              {/* Create model + AI avatar buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowCreateModel(!showCreateModel)}
                  className="flex-1 p-2 rounded-xl border border-dashed border-[#D4D4D2] hover:border-[#FF6B35] hover:bg-[#FFF0EB] transition-all flex items-center justify-center gap-2 text-xs text-[#999999] hover:text-[#FF6B35]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  {'Įkelti modelį'}
                </button>
                <button
                  onClick={() => { setCreatorTargetModelId(undefined); setShowCreatorModal(true); }}
                  className="flex-1 p-2 rounded-xl border border-dashed border-[#D4D4D2] hover:border-[#FF6B35] hover:bg-[#FFF0EB] transition-all flex items-center justify-center gap-2 text-xs text-[#999999] hover:text-[#FF6B35]"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  AI {'Sukurti modelį'}
                </button>
              </div>

              {/* Inline create model form */}
              {showCreateModel && (
                <div className="flex gap-2 items-center">
                  <input
                    value={newModelName}
                    onChange={(e) => setNewModelName(e.target.value)}
                    placeholder={t.avatarModels?.modelName || 'Modelio pavadinimas'}
                    className="flex-1 px-3 py-2 text-sm border border-[#E5E5E3] rounded-lg focus:outline-none focus:border-[#FF6B35]"
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCreateModel(); }}
                    autoFocus
                  />
                  <button
                    onClick={handleCreateModel}
                    disabled={creatingModel || !newModelName.trim()}
                    className="px-3 py-2 text-sm bg-[#FF6B35] text-white rounded-lg hover:bg-[#E55A2B] disabled:opacity-50 transition-colors"
                  >
                    {creatingModel ? '...' : 'OK'}
                  </button>
                  <button
                    onClick={handleCreateModelWithFile}
                    disabled={creatingModel}
                    className="px-3 py-2 text-sm border border-[#E5E5E3] rounded-lg hover:bg-[#F7F7F5] transition-colors"
                    title={t.avatarModels?.addPhoto || 'With photo'}
                  >
                    <svg className="w-4 h-4 text-[#999999]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              )}

              {models.length === 0 && !showCreateModel && (
                <p className="text-xs text-[#999999]">{t.customAvatars?.uploadHint || 'Sukurkite modelį ir pridėkite nuotraukas'}</p>
              )}
            </div>
          )}
          <input
            ref={modelFileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleModelFileChange}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleNewModelFileChange}
            className="hidden"
          />
        </div>
      )}

      {/* Preset Avatars — collapsible */}
      <div className="border border-[#E5E5E3] rounded-xl overflow-hidden">
        <button
          onClick={() => setPresetsOpen(!presetsOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-[#F7F7F5] hover:bg-[#EFEFED] transition-colors"
        >
          <span className="text-sm font-medium text-[#1A1A1A]">
            {t.customAvatars?.presets || 'Modelių šablonai'}
            {config.avatar && !config.avatar.isCustom && (
              <span className="ml-2 text-xs text-[#FF6B35] font-normal">— {getAvatarName(config.avatar)}</span>
            )}
          </span>
          <svg className={`w-4 h-4 text-[#999999] transition-transform ${presetsOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {presetsOpen && (
          <div className="p-3">
            <div className="grid grid-cols-3 gap-2">
              {AVATARS.map((avatar) => {
                const isSelected = config.avatar?.id === avatar.id;
                return (
                  <button
                    key={avatar.id}
                    onClick={() => handleAvatarChange(avatar)}
                    className={`relative p-2 rounded-xl transition-all ${
                      isSelected
                        ? 'bg-[#FFF0EB] ring-2 ring-[#FF6B35]'
                        : 'bg-[#F7F7F5] hover:bg-[#EFEFED] border border-[#E5E5E3] hover:border-[#D4D4D2]'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute top-1 right-1 z-10 bg-[#FF6B35] rounded-full p-0.5">
                        <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                    )}
                    <div className="aspect-square bg-[#EFEFED] rounded-lg mb-1 overflow-hidden">
                      <img
                        src={avatar.imageUrl}
                        alt={getAvatarName(avatar)}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          const target = e.currentTarget;
                          target.style.display = 'none';
                          if (target.parentElement) {
                            target.parentElement.innerHTML = `<div class="flex items-center justify-center text-2xl w-full h-full">${avatar.id.includes('woman') ? '\u{1F469}' : '\u{1F468}'}</div>`;
                          }
                        }}
                      />
                    </div>
                    <p className="text-xs font-medium text-[#666666] truncate">{getAvatarName(avatar)}</p>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
      {config.avatar && (
        <p className="text-xs text-[#999999]">{getAvatarDescription(config.avatar)}</p>
      )}

      {/* Divider */}
      <hr className="border-[#E5E5E3]" />

      {/* Quality Mode Selection — pill buttons */}
      <div className="space-y-2">
        <label className="block text-sm font-medium text-[#1A1A1A]">
          {(t as Record<string, unknown>).qualityModeLabel as string || 'Kokybės režimas'}
        </label>
        <div className="flex flex-wrap gap-2">
          {QUALITY_MODES.map((mode) => {
            const isSelected = config.qualityMode === mode.id;
            return (
              <button
                key={mode.id}
                onClick={() => handleQualityModeChange(mode)}
                className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                  isSelected
                    ? 'bg-[#FF6B35] text-white'
                    : 'bg-[#F7F7F5] text-[#666666] border border-[#E5E5E3] hover:border-[#FF6B35] hover:text-[#FF6B35]'
                }`}
              >
                {getQualityModeName(mode)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Avatar Creator Modal */}
      <AvatarCreatorModal
        isOpen={showCreatorModal}
        onClose={() => setShowCreatorModal(false)}
        targetModelId={creatorTargetModelId}
        models={models}
        createModel={createModel}
        addGeneratedPhotoToModel={addGeneratedPhotoToModel}
        deletePhoto={deletePhoto}
      />
    </div>
  );
}
