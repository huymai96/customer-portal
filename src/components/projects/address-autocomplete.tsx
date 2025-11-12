import { Loader } from '@googlemaps/js-api-loader';
import { useEffect, useMemo, useRef } from 'react';

interface AddressAutocompleteProps {
  id?: string;
  value: string;
  placeholder?: string;
  onChange: (value: string) => void;
  onAddressSelected?: (
    formatted: string,
    parsed: {
      line1: string;
      city?: string;
      state?: string;
      postalCode?: string;
      country?: string;
    }
  ) => void;
  onAddressResolved?: (address: {
    line1: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  }) => void;
  disabled?: boolean;
}

const loaderCache = new Map<string, Loader>();
const countriesEnv = process.env.NEXT_PUBLIC_GOOGLE_AUTOCOMPLETE_COUNTRIES;
const defaultCountries = countriesEnv
  ?.split(',')
  .map((entry) => entry.trim().toUpperCase())
  .filter(Boolean);

function getLoader(apiKey: string) {
  const cached = loaderCache.get(apiKey);
  if (cached) {
    return cached;
  }
  const loader = new Loader({
    apiKey,
    libraries: ['places'],
  });
  loaderCache.set(apiKey, loader);
  return loader;
}

function parseAddressComponents(place: google.maps.places.PlaceResult) {
  const components = place.address_components ?? [];
  const lookup = new Map<string, string>();
  for (const component of components) {
    if (!component.types) continue;
    for (const type of component.types) {
      lookup.set(type, component.long_name ?? component.short_name ?? '');
    }
  }

  const streetNumber = lookup.get('street_number') ?? '';
  const route = lookup.get('route') ?? '';
  const line1 = [streetNumber, route].filter(Boolean).join(' ').trim() || place.formatted_address || '';

  return {
    line1,
    city:
      lookup.get('locality') ??
      lookup.get('sublocality') ??
      lookup.get('sublocality_level_1') ??
      lookup.get('administrative_area_level_2') ??
      '',
    state: lookup.get('administrative_area_level_1') ?? '',
    postalCode: lookup.get('postal_code') ?? '',
    country: lookup.get('country') ?? '',
  };
}

export function AddressAutocomplete({
  id,
  value,
  placeholder,
  onChange,
  onAddressSelected,
  onAddressResolved,
  disabled,
}: AddressAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const loader = useMemo(() => {
    if (!apiKey) return null;
    try {
      return getLoader(apiKey);
    } catch (error) {
      console.error('Failed to init Google Maps loader', error);
      return null;
    }
  }, [apiKey]);

  useEffect(() => {
    if (!loader || !inputRef.current || disabled) {
      return;
    }

    let autocomplete: google.maps.places.Autocomplete | null = null;
    let active = true;

    loader
      .load()
      .then(() => {
        if (!active || !inputRef.current) return;
        const maps = window.google?.maps;
        if (!maps?.places) {
          return;
        }
        autocomplete = new maps.places.Autocomplete(inputRef.current, {
          componentRestrictions:
            defaultCountries && defaultCountries.length > 0
              ? { country: defaultCountries }
              : undefined,
          fields: ['address_components', 'formatted_address'],
          types: ['address'],
        });

        autocomplete.addListener('place_changed', () => {
          if (!autocomplete) return;
          const place = autocomplete.getPlace();
          if (!place) return;
          const parsed = parseAddressComponents(place);
          const formatted = place.formatted_address ?? parsed.line1 ?? '';
          onAddressSelected?.(formatted, parsed);
          onAddressResolved?.(parsed);
        });
      })
      .catch((error) => {
        console.error('Failed to load Google Maps Places', error);
      });

    return () => {
      active = false;
      if (autocomplete && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocomplete);
      }
    };
  }, [loader, disabled, onChange, onAddressResolved, onAddressSelected]);

  return (
    <input
      ref={inputRef}
      id={id}
      type="text"
      value={value}
      disabled={disabled}
      placeholder={placeholder}
      autoComplete="off"
      onChange={(event) => onChange(event.target.value)}
      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-200 disabled:cursor-not-allowed disabled:bg-slate-100"
    />
  );
}
