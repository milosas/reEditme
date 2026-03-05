import { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { GeneratedImage } from '../../types/generation';
import { downloadImage } from '../../utils/download';

interface ResultsGalleryProps {
  images: GeneratedImage[];
  selectedIndex?: number;
  onSelectImage?: (index: number) => void;
}

export function ResultsGallery({ images, selectedIndex, onSelectImage }: ResultsGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const openLightbox = (index: number) => {
    setCurrentIndex(index);
    setLightboxOpen(true);
  };

  const handleDownload = (image: GeneratedImage, index: number) => {
    downloadImage(image.url, `rezultatas-${index + 1}.jpg`);
  };

  const handleClick = (index: number) => {
    if (onSelectImage) {
      onSelectImage(index);
    } else {
      openLightbox(index);
    }
  };

  // Map images to lightbox slides format
  const slides = images.map(img => ({ src: img.url }));

  return (
    <>
      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
        {images.map((image, index) => (
          <div key={index} className="relative group">
            {/* Image */}
            <img
              src={image.url}
              alt={`Rezultatas ${index + 1}`}
              className={`w-full h-auto rounded-lg cursor-pointer transition-all hover:scale-[1.02] ${
                selectedIndex === index ? 'ring-3 ring-[#FF6B35] ring-offset-2' : ''
              }`}
              loading="lazy"
              onClick={() => handleClick(index)}
            />

            {/* Label Overlay */}
            <div className="absolute bottom-2 left-2 bg-black/60 text-white px-3 py-1 rounded text-sm">
              Rezultatas {index + 1}
            </div>

            {/* Download Button Overlay */}
            <button
              onClick={() => handleDownload(image, index)}
              className="absolute top-2 right-2 bg-white/90 hover:bg-white text-gray-800 p-2 rounded transition-colors"
              aria-label={`Atsisiųsti rezultatą ${index + 1}`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </button>

            {/* Selected indicator */}
            {selectedIndex === index && (
              <div className="absolute top-2 left-2 bg-[#FF6B35] rounded-full p-1">
                <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Lightbox */}
      <Lightbox
        open={lightboxOpen}
        close={() => setLightboxOpen(false)}
        index={currentIndex}
        slides={slides}
      />

    </>
  );
}
