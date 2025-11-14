'use client';

/**
 * Decoration Form Component
 * 
 * Captures decoration specifications for an order line:
 * - Method (screen, embroidery, DTF, etc.)
 * - Location on garment
 * - Number of colors
 * - Artwork files/URLs
 * - Special instructions
 */

import { useState } from 'react';
import type { DecorationMethod, DecorationArtworkType } from '@/lib/types';

const DECORATION_METHODS: Array<{ value: DecorationMethod; label: string; description: string }> = [
  { value: 'screen', label: 'Screen Print', description: 'Traditional screen printing for bold designs' },
  { value: 'emb', label: 'Embroidery', description: 'Stitched designs for a premium look' },
  { value: 'dtf', label: 'DTF Transfer', description: 'Direct-to-film for detailed full-color prints' },
  { value: 'heat', label: 'Heat Transfer', description: 'Vinyl or plastisol transfers' },
  { value: 'dtg', label: 'DTG Print', description: 'Direct-to-garment for photo-quality prints' },
  { value: 'sublimation', label: 'Sublimation', description: 'Dye sublimation for polyester garments' },
  { value: 'patch', label: 'Patch / Applique', description: 'Sewn-on patches or appliques' },
];

const DECORATION_LOCATIONS = [
  'Front Center',
  'Front Left Chest',
  'Front Right Chest',
  'Full Front',
  'Back Center',
  'Full Back',
  'Left Sleeve',
  'Right Sleeve',
  'Hood',
  'Pocket',
  'Custom',
];

export interface DecorationFormData {
  method: DecorationMethod;
  location: string;
  colors: number;
  notes: string;
  proofRequired: boolean;
  artworks: Array<{
    type: DecorationArtworkType;
    url: string;
    metadata?: Record<string, unknown>;
  }>;
}

interface DecorationFormProps {
  onSubmit: (data: DecorationFormData) => void;
  onCancel: () => void;
  initialData?: Partial<DecorationFormData>;
}

export function DecorationForm({ onSubmit, onCancel, initialData }: DecorationFormProps) {
  const [method, setMethod] = useState<DecorationMethod>(initialData?.method || 'screen');
  const [location, setLocation] = useState(initialData?.location || 'Front Center');
  const [customLocation, setCustomLocation] = useState('');
  const [colors, setColors] = useState(initialData?.colors || 1);
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [proofRequired, setProofRequired] = useState(initialData?.proofRequired ?? true);
  const [artworkUrl, setArtworkUrl] = useState('');
  const [artworks, setArtworks] = useState<DecorationFormData['artworks']>(initialData?.artworks || []);

  const handleAddArtwork = () => {
    if (!artworkUrl.trim()) return;

    // Basic URL validation
    try {
      new URL(artworkUrl);
    } catch {
      alert('Please enter a valid URL');
      return;
    }

    setArtworks([...artworks, { type: 'design', url: artworkUrl.trim() }]);
    setArtworkUrl('');
  };

  const handleRemoveArtwork = (index: number) => {
    setArtworks(artworks.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalLocation = location === 'Custom' ? customLocation.trim() : location;
    if (!finalLocation) {
      alert('Please specify a decoration location');
      return;
    }

    if (artworks.length === 0) {
      alert('Please add at least one artwork file');
      return;
    }

    onSubmit({
      method,
      location: finalLocation,
      colors,
      notes: notes.trim(),
      proofRequired,
      artworks,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Decoration Method */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Decoration Method *
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DECORATION_METHODS.map((option) => (
            <label
              key={option.value}
              className={`relative flex cursor-pointer rounded-lg border p-4 focus:outline-none ${
                method === option.value
                  ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-600'
                  : 'border-gray-300 bg-white hover:bg-gray-50'
              }`}
            >
              <input
                type="radio"
                name="method"
                value={option.value}
                checked={method === option.value}
                onChange={(e) => setMethod(e.target.value as DecorationMethod)}
                className="sr-only"
              />
              <div className="flex flex-col">
                <span className="block text-sm font-medium text-gray-900">{option.label}</span>
                <span className="mt-1 flex items-center text-xs text-gray-500">
                  {option.description}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Location */}
      <div>
        <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
          Location on Garment *
        </label>
        <select
          id="location"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          {DECORATION_LOCATIONS.map((loc) => (
            <option key={loc} value={loc}>
              {loc}
            </option>
          ))}
        </select>
        {location === 'Custom' && (
          <input
            type="text"
            value={customLocation}
            onChange={(e) => setCustomLocation(e.target.value)}
            placeholder="Specify custom location"
            className="mt-2 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        )}
      </div>

      {/* Number of Colors */}
      <div>
        <label htmlFor="colors" className="block text-sm font-medium text-gray-700 mb-2">
          Number of Colors
        </label>
        <input
          type="number"
          id="colors"
          min="1"
          max="12"
          value={colors}
          onChange={(e) => setColors(Number.parseInt(e.target.value, 10))}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
        <p className="mt-1 text-xs text-gray-500">
          For screen printing and embroidery, specify the number of ink/thread colors
        </p>
      </div>

      {/* Artwork Files */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Artwork Files *
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={artworkUrl}
            onChange={(e) => setArtworkUrl(e.target.value)}
            placeholder="https://example.com/artwork.png"
            className="block flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleAddArtwork}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Add
          </button>
        </div>
        {artworks.length > 0 && (
          <ul className="mt-3 space-y-2">
            {artworks.map((artwork, index) => (
              <li key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <span className="text-sm text-gray-700 truncate flex-1">{artwork.url}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveArtwork(index)}
                  className="ml-2 text-red-600 hover:text-red-800 text-sm"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-1 text-xs text-gray-500">
          Add URLs to your artwork files (PNG, PDF, AI, etc.)
        </p>
      </div>

      {/* Special Instructions */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
          Special Instructions
        </label>
        <textarea
          id="notes"
          rows={4}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any special requirements, color matching notes, placement details, etc."
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        />
      </div>

      {/* Proof Required */}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="proofRequired"
          checked={proofRequired}
          onChange={(e) => setProofRequired(e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <label htmlFor="proofRequired" className="ml-2 block text-sm text-gray-700">
          Require proof approval before production
        </label>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Add Decoration
        </button>
      </div>
    </form>
  );
}

