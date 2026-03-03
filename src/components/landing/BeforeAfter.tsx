import { motion } from 'framer-motion';

const EXAMPLES = [
  {
    before: {
      img: '/images/before-after/before2.jpg',
      label: 'Rožinis paltas',
    },
    after: {
      img: '/images/before-after/after2.jpg',
      label: 'Dryžuotas megztinis',
    },
  },
  {
    before: {
      img: '/images/before-after/before3.jpg',
      label: 'Juodas paltas',
    },
    after: {
      img: '/images/before-after/after3.jpg',
      label: 'Odinė striukė',
    },
  },
  {
    before: {
      img: '/images/before-after/before1.jpg',
      label: 'Crop top',
    },
    after: {
      img: '/images/before-after/after1.jpg',
      label: 'Juodi marškinėliai',
    },
  },
];

export function BeforeAfter() {
  return (
    <section className="py-16 md:py-24 px-4 bg-[#F7F7F5]">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <p className="text-sm font-semibold text-[#FF6B35] uppercase tracking-wide mb-2">
            AI virtualus matavimasis
          </p>
          <h2 className="text-3xl md:text-4xl font-bold text-[#1A1A1A] mb-3">
            Pamatykite skirtumą
          </h2>
          <p className="text-[#666666] max-w-xl mx-auto">
            Įkelkite nuotrauką ir pakeiskite drabužius per kelias sekundes su AI
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {EXAMPLES.map((example, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.12 }}
              className="bg-white rounded-2xl border border-[#E5E5E3] p-5 shadow-sm"
            >
              <div className="grid grid-cols-2 gap-3 mb-4">
                {/* Before */}
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-[#999] uppercase tracking-wide mb-2">
                    Prieš
                  </span>
                  <div className="rounded-xl aspect-square overflow-hidden bg-[#E5E5E3]">
                    <img
                      src={example.before.img}
                      alt={example.before.label}
                      className="w-full h-full object-cover grayscale-[30%] brightness-95"
                      loading="lazy"
                    />
                  </div>
                </div>
                {/* After */}
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-[#FF6B35] uppercase tracking-wide mb-2">
                    Po
                  </span>
                  <div className="rounded-xl aspect-square overflow-hidden relative bg-[#FFF0EB]">
                    <img
                      src={example.after.img}
                      alt={example.after.label}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-[#FF6B35] rounded-full flex items-center justify-center shadow-sm">
                      <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#999]">{example.before.label}</span>
                <svg className="w-4 h-4 text-[#FF6B35] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span className="text-[#1A1A1A] font-medium">{example.after.label}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
