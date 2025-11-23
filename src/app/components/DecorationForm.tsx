/**
 * Decoration Form Component
 * 
 * Allows customers to add decoration options to their products:
 * - Screen Printing
 * - Embroidery
 * - Direct-To-Garment (DTG)
 * 
 * Features:
 * - Dynamic pricing based on quantity and options
 * - Location selection
 * - Artwork upload
 * - Live price preview
 */

'use client';

import React, { useState, useEffect } from 'react';
import {
  calculateDecorationPricing,
  type DecorationMethod,
  type DecorationLocation,
  type GarmentColor,
} from '@/lib/decoration/pricing';
import { type CartItemDecoration } from '@/contexts/CartContext';

interface DecorationFormProps {
  quantity: number;
  garmentColor?: GarmentColor;
  onSave: (decoration: CartItemDecoration) => void;
  onCancel: () => void;
  initialDecoration?: CartItemDecoration;
}

export default function DecorationForm({
  quantity,
  garmentColor = 'light',
  onSave,
  onCancel,
  initialDecoration,
}: DecorationFormProps) {
  const [method, setMethod] = useState<DecorationMethod>(
    initialDecoration?.method || 'screen_print'
  );
  const [location, setLocation] = useState<DecorationLocation>(
    (initialDecoration?.location as DecorationLocation) || 'front_chest'
  );
  const [description, setDescription] = useState(initialDecoration?.description || '');
  const [artworkUrl, setArtworkUrl] = useState(initialDecoration?.artworkUrl || '');
  
  // Screen Print specific
  const [colors, setColors] = useState(initialDecoration?.colors || 1);
  
  // Embroidery specific
  const [stitches, setStitches] = useState(initialDecoration?.stitches || 5000);
  
  // DTG specific
  const [printSizeCategory, setPrintSizeCategory] = useState<'xsmall' | 'small' | 'medium' | 'large' | 'xlarge'>('medium');
  
  // Pricing
  const [pricing, setPricing] = useState({ unitCost: 0, setupFee: 0 });

  // Recalculate pricing when inputs change
  useEffect(() => {
    const pricingInput = {
      method,
      quantity,
      locations: [location],
      garmentColor,
    };

    if (method === 'screen_print') {
      Object.assign(pricingInput, { colors, maxColors: 12 });
    } else if (method === 'embroidery') {
      Object.assign(pricingInput, { stitches });
    } else if (method === 'dtg') {
      Object.assign(pricingInput, { printSizeCategory });
    }

    const result = calculateDecorationPricing(pricingInput);
    // Use setTimeout to avoid setState in render
    const timer = setTimeout(() => {
      setPricing({ unitCost: result.unitCost, setupFee: result.setupFee });
    }, 0);
    return () => clearTimeout(timer);
  }, [method, quantity, location, colors, stitches, printSizeCategory, garmentColor]);

  const handleSave = () => {
    if (!description.trim()) {
      alert('Please enter a description');
      return;
    }

    const decoration: CartItemDecoration = {
      method,
      location,
      description,
      artworkUrl: artworkUrl || undefined,
      setupFee: pricing.setupFee,
      unitCost: pricing.unitCost,
    };

    if (method === 'screen_print') {
      decoration.colors = colors;
    } else if (method === 'embroidery') {
      decoration.stitches = stitches;
    }

    onSave(decoration);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold text-slate-900">Add Decoration</h3>

      {/* Decoration Method */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Decoration Method
        </label>
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as DecorationMethod)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="screen_print">Screen Printing</option>
          <option value="embroidery">Embroidery</option>
          <option value="dtg">Direct-To-Garment (DTG)</option>
        </select>
      </div>

      {/* Location */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Decoration Location
        </label>
        <select
          value={location}
          onChange={(e) => setLocation(e.target.value as DecorationLocation)}
          className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="front_chest">Front Chest</option>
          <option value="full_front">Full Front</option>
          <option value="back">Back</option>
          <option value="full_back">Full Back</option>
          <option value="left_sleeve">Left Sleeve (+$0.35)</option>
          <option value="right_sleeve">Right Sleeve (+$0.35)</option>
          <option value="left_leg">Left Leg (+$0.35)</option>
          <option value="right_leg">Right Leg (+$0.35)</option>
          <option value="pocket">Pocket (+$0.35)</option>
          <option value="heavy_bulky_bags">Heavy/Bulky/Bags (+$0.75)</option>
        </select>
      </div>

      {/* Screen Print Options */}
      {method === 'screen_print' && (
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Number of Colors
          </label>
          <input
            type="number"
            min="1"
            max="12"
            value={colors}
            onChange={(e) => setColors(parseInt(e.target.value) || 1)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-slate-500">Maximum 12 colors</p>
        </div>
      )}

      {/* Embroidery Options */}
      {method === 'embroidery' && (
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Stitch Count
          </label>
          <input
            type="number"
            min="1000"
            max="20000"
            step="100"
            value={stitches}
            onChange={(e) => setStitches(parseInt(e.target.value) || 5000)}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="mt-1 text-xs text-slate-500">Typical range: 5,000 - 15,000 stitches</p>
        </div>
      )}

      {/* DTG Options */}
      {method === 'dtg' && (
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Print Size
          </label>
          <select
            value={printSizeCategory}
            onChange={(e) => setPrintSizeCategory(e.target.value as 'xsmall' | 'small' | 'medium' | 'large' | 'xlarge')}
            className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="xsmall">Extra Small (1-25 sq in)</option>
            <option value="small">Small (26-50 sq in)</option>
            <option value="medium">Medium (51-80 sq in)</option>
            <option value="large">Large (81-144 sq in)</option>
            <option value="xlarge">Extra Large (145+ sq in)</option>
          </select>
        </div>
      )}

      {/* Description */}
      <div className="mb-4">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Description *
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g., Company logo on left chest, 2-color design"
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Artwork URL */}
      <div className="mb-6">
        <label className="mb-2 block text-sm font-medium text-slate-700">
          Artwork URL (Optional)
        </label>
        <input
          type="url"
          value={artworkUrl}
          onChange={(e) => setArtworkUrl(e.target.value)}
          placeholder="https://..."
          className="w-full rounded-lg border border-slate-300 px-4 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Price Preview */}
      <div className="mb-6 rounded-lg bg-blue-50 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600">Decoration Cost per Item</p>
            <p className="text-2xl font-bold text-blue-600">${pricing.unitCost.toFixed(2)}</p>
          </div>
          {pricing.setupFee > 0 && (
            <div className="text-right">
              <p className="text-sm text-slate-600">Setup Fee</p>
              <p className="text-lg font-semibold text-slate-700">${pricing.setupFee.toFixed(2)}</p>
            </div>
          )}
        </div>
        <div className="mt-3 border-t border-blue-200 pt-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-slate-600">Total Decoration Cost ({quantity} items)</span>
            <span className="font-semibold text-slate-900">
              ${((pricing.unitCost * quantity) + pricing.setupFee).toFixed(2)}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={handleSave}
          className="flex-1 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        >
          Save Decoration
        </button>
        <button
          onClick={onCancel}
          className="flex-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

