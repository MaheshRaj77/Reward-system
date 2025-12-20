'use client';

import { useState, useRef, useEffect } from 'react';
import {
    sortedCountryCodes as countryCodes,
    searchCountries
} from '@/modules/auth/country-codes';

export interface CountryCodeSelectorProps {
    value: string;
    onChange: (code: string) => void;
    colors?: {
        parchment: string;
        parchmentDark: string;
        goldAccent: string;
        inkBrown: string;
    };
    /* Optional flag to use default Disney colors if none provided */
    useDefaultColors?: boolean;
}

const defaultDisneyColors = {
    parchment: '#F5E6D3',
    parchmentDark: '#E8D5BE',
    goldAccent: '#C9A227',
    inkBrown: '#4A3728',
};

export function CountryCodeSelector({
    value,
    onChange,
    colors = defaultDisneyColors,
}: CountryCodeSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedCountry = countryCodes.find(c => c.code === value) || countryCodes[0];

    const filteredCountries = searchCountries(search);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (containerRef.current && !containerRef.current.contains(target)) {
                setIsOpen(false);
                setSearch('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    useEffect(() => {
        if (isOpen && searchInputRef.current) {
            searchInputRef.current.focus();
        }
    }, [isOpen]);

    return (
        <div ref={containerRef} className="relative inline-block">
            {/* Trigger Button */}
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 outline-none transition-all hover:border-indigo-400 min-w-[100px] justify-center bg-white shadow-sm"
                style={{
                    borderColor: isOpen ? '#6366f1' : '#e5e7eb',
                }}
            >
                <span className="text-xl">{selectedCountry.flag}</span>
                <span className="font-semibold text-gray-700">{selectedCountry.code}</span>
                <svg
                    className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Dropdown */}
            {isOpen && (
                <div
                    className="absolute top-full left-0 mt-2 w-80 bg-white rounded-2xl border border-gray-200 shadow-2xl overflow-hidden z-50"
                    style={{ maxHeight: '400px' }}
                >
                    {/* Search Input */}
                    <div className="p-3 border-b border-gray-100 bg-gray-50">
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search country..."
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 outline-none text-sm transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 bg-white"
                            />
                        </div>
                    </div>

                    {/* Country List */}
                    <div className="max-h-72 overflow-y-auto">
                        {filteredCountries.length > 0 ? (
                            filteredCountries.map((country) => (
                                <button
                                    key={`${country.code}-${country.iso2}`}
                                    type="button"
                                    className="w-full flex items-center gap-3 px-4 py-3 transition-all text-left hover:bg-indigo-50 border-b border-gray-50 last:border-b-0"
                                    onClick={() => {
                                        onChange(country.code);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                >
                                    <span className="text-2xl">{country.flag}</span>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-medium text-gray-900 block truncate">{country.country}</span>
                                        {country.iso2 && (
                                            <span className="text-xs text-gray-400">{country.iso2}</span>
                                        )}
                                    </div>
                                    <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg">
                                        {country.code}
                                    </span>
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-8 text-center">
                                <p className="text-gray-400 text-sm">No countries found for "{search}"</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
