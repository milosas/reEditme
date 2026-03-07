import { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { SCENES, POSE_PRESETS } from '../../constants/fluxOptions';

interface PostProcessToolbarProps {
  isProcessing: boolean;
  onApply: (type: 'background' | 'pose' | 'edit', prompt: string) => void;
}

export function PostProcessToolbar({ isProcessing, onApply }: PostProcessToolbarProps) {
  const { t } = useLanguage();
  const [selectedBg, setSelectedBg] = useState<string | null>(null);
  const [selectedPose, setSelectedPose] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState('');

  const pp = (t as Record<string, unknown>).postProcess as Record<string, string> | undefined;

  const handleSelectBg = (promptHint: string) => {
    setSelectedBg(prev => prev === promptHint ? null : promptHint);
    setSelectedPose(null);
  };

  const handleSelectPose = (promptHint: string) => {
    setSelectedPose(prev => prev === promptHint ? null : promptHint);
    setSelectedBg(null);
  };

  const handleApplyBg = () => {
    if (selectedBg) {
      onApply('background', selectedBg);
    }
  };

  const handleApplyPose = () => {
    if (selectedPose) {
      onApply('pose', selectedPose);
    }
  };

  const handleEditSubmit = () => {
    if (editPrompt.trim()) {
      onApply('edit', editPrompt.trim());
    }
  };

  return (
    <div className="mt-6 bg-white border border-[#E5E5E3] rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-5 pb-3 border-b border-[#E5E5E3] bg-[#FAFAF8]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#FF6B35] flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#1A1A1A]">
              {pp?.title || 'Redaguoti nuotrauką'}
            </h3>
            <p className="text-sm text-[#999999] mt-0.5">
              {pp?.subtitle || 'Pasirinkite vieną iš sugeneruotų nuotraukų aukščiau ir pritaikykite papildomus pakeitimus.'}
            </p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-6">
        {/* Processing indicator */}
        {isProcessing && (
          <div className="flex items-center gap-2 text-sm text-[#FF6B35] bg-[#FFF0EB] px-3 py-2 rounded-xl">
            <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            {pp?.processing || 'Apdorojama...'}
          </div>
        )}

        {/* Background */}
        <div>
          <h4 className="text-sm font-semibold text-[#1A1A1A] mb-1">
            {pp?.background || 'Pakeisti foną'}
          </h4>
          <p className="text-xs text-[#999999] mb-2.5">
            {pp?.backgroundDesc || 'AI pakeis nuotraukos foną į pasirinktą sceną, išlaikant žmogų.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {SCENES.map((scene) => {
              const sceneName = t.scenes?.[scene.id as keyof typeof t.scenes]?.name || scene.name;
              const isSelected = selectedBg === scene.promptHint;
              return (
                <button
                  key={scene.id}
                  onClick={() => handleSelectBg(scene.promptHint)}
                  disabled={isProcessing}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    isProcessing
                      ? 'bg-[#F7F7F5] text-[#999999] cursor-not-allowed'
                      : isSelected
                        ? 'border-2 border-[#FF6B35] bg-[#FFF0EB] text-[#FF6B35] font-medium'
                        : 'bg-[#F7F7F5] text-[#666666] border border-[#E5E5E3] hover:border-[#FF6B35] hover:text-[#FF6B35]'
                  }`}
                >
                  {sceneName}
                </button>
              );
            })}
          </div>
          {selectedBg && !isProcessing && (
            <div className="mt-3">
              <button
                onClick={handleApplyBg}
                className="px-4 py-2 rounded-xl bg-[#FF6B35] text-white text-sm font-medium hover:bg-[#E55A2B] transition-colors"
              >
                {pp?.apply || 'Taikyti'}
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-[#E5E5E3]" />

        {/* Pose */}
        <div>
          <h4 className="text-sm font-semibold text-[#1A1A1A] mb-1">
            {pp?.pose || 'Pakeisti pozą'}
          </h4>
          <p className="text-xs text-[#999999] mb-2.5">
            {pp?.poseDesc || 'AI pakeis modelio pozą nuotraukoje.'}
          </p>
          <div className="flex flex-wrap gap-2">
            {POSE_PRESETS.map((pose) => {
              const poseTranslations = (t as Record<string, unknown>).posePresets as Record<string, { name: string }> | undefined;
              const poseName = poseTranslations?.[pose.id]?.name || pose.name;
              const isSelected = selectedPose === pose.promptHint;
              return (
                <button
                  key={pose.id}
                  onClick={() => handleSelectPose(pose.promptHint)}
                  disabled={isProcessing}
                  className={`px-3 py-1.5 rounded-full text-sm transition-all ${
                    isProcessing
                      ? 'bg-[#F7F7F5] text-[#999999] cursor-not-allowed'
                      : isSelected
                        ? 'border-2 border-[#FF6B35] bg-[#FFF0EB] text-[#FF6B35] font-medium'
                        : 'bg-[#F7F7F5] text-[#666666] border border-[#E5E5E3] hover:border-[#FF6B35] hover:text-[#FF6B35]'
                  }`}
                >
                  {poseName}
                </button>
              );
            })}
          </div>
          {selectedPose && !isProcessing && (
            <div className="mt-3">
              <button
                onClick={handleApplyPose}
                className="px-4 py-2 rounded-xl bg-[#FF6B35] text-white text-sm font-medium hover:bg-[#E55A2B] transition-colors"
              >
                {pp?.apply || 'Taikyti'}
              </button>
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-[#E5E5E3]" />

        {/* Additional instructions (Kontext edit) */}
        <div>
          <h4 className="text-sm font-semibold text-[#1A1A1A] mb-1">
            {pp?.additionalInstructions || 'Laisvas redagavimas'}
          </h4>
          <p className="text-xs text-[#999999] mb-2.5">
            {pp?.additionalInstructionsDesc || 'Aprašykite ką norite pakeisti — AI redaguos nuotrauką pagal jūsų tekstą.'}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={editPrompt}
              onChange={(e) => setEditPrompt(e.target.value)}
              placeholder={pp?.editPlaceholder || 'Pvz.: rankos sukryžiuotos, sėdi ant kėdės, žiūri į šoną...'}
              disabled={isProcessing}
              className="flex-1 px-3 py-2 rounded-xl border border-[#E5E5E3] bg-[#F7F7F5] text-sm text-[#1A1A1A] placeholder-[#999999] focus:outline-none focus:border-[#FF6B35] focus:ring-1 focus:ring-[#FF6B35] transition-colors disabled:opacity-50"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isProcessing) {
                  handleEditSubmit();
                }
              }}
            />
            <button
              onClick={handleEditSubmit}
              disabled={isProcessing || !editPrompt.trim()}
              className="px-4 py-2 rounded-xl bg-[#FF6B35] text-white text-sm font-medium hover:bg-[#E55A2B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {pp?.apply || 'Taikyti'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
