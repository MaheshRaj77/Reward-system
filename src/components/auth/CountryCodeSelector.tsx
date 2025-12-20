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
    const dropdownRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const selectedCountry = countryCodes.find(c => c.code === value) || countryCodes[0];

    const filteredCountries = searchCountries(search);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(target) &&
                buttonRef.current &&
                !buttonRef.current.contains(target)
            ) {
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
        <>
            <div className="relative">
                <button
                    ref={buttonRef}
                    type="button"
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-1.5 px-3 py-3 rounded-full border-2 outline-none transition-all hover:border-[#C9A227] min-w-[90px] justify-center"
                    style={{
                        backgroundColor: colors.parchment,
                        borderColor: isOpen ? colors.goldAccent : colors.parchmentDark,
                        color: colors.inkBrown,
                    }}
                >
                    <span className="text-lg">{selectedCountry.flag}</span>
                    <span className="font-bold text-sm">{selectedCountry.code}</span>
                    <svg
                        className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>
            </div>

            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="absolute top-full left-0 mt-2 w-72 rounded-2xl border-2 shadow-2xl overflow-hidden"
                    style={{
                        backgroundColor: colors.parchment,
                        borderColor: colors.goldAccent,
                        zIndex: 9999,
                    }}
                >
                    {/* Search Input */}
                    <div className="p-3 border-b-2" style={{ borderColor: colors.parchmentDark }}>
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: colors.inkBrown }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                ref={searchInputRef}
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search by name, code, or ISO..."
                                className="w-full pl-9 pr-3 py-2.5 rounded-xl border-2 outline-none text-sm transition-all focus:border-[#C9A227]"
                                style={{
                                    backgroundColor: 'white',
                                    borderColor: colors.parchmentDark,
                                    color: colors.inkBrown,
                                }}
                            />
                        </div>
                    </div>

                    {/* Country List */}
                    <div className="max-h-64 overflow-y-auto">
                        {filteredCountries.length > 0 ? (
                            filteredCountries.map((country, index) => (
                                <button
                                    key={`${country.code}-${country.iso2}`}
                                    type="button"
                                    className="w-full flex items-center gap-3 px-4 py-3 transition-all text-left group"
                                    style={{
                                        color: colors.inkBrown,
                                        borderBottom: index < filteredCountries.length - 1 ? `1px solid ${colors.parchmentDark}40` : 'none'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.backgroundColor = colors.parchmentDark;
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                    onClick={() => {
                                        onChange(country.code);
                                        setIsOpen(false);
                                        setSearch('');
                                    }}
                                >
                                    <span className="text-2xl">{country.flag}</span>
                                    <div className="flex-1 min-w-0">
                                        <span className="text-sm font-semibold block truncate">{country.country}</span>
                                        {country.iso2 && (
                                            <span className="text-xs opacity-50">{country.iso2}</span>
                                        )}
                                    </div>
                                    <span className="text-sm font-bold px-2 py-1 rounded-md" style={{ backgroundColor: `${colors.goldAccent}20`, color: colors.inkBrown }}>
                                        {country.code}
                                    </span>
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-6 text-sm text-center" style={{ color: colors.inkBrown }}>
                                <span className="opacity-60">No countries found for &quot;</span>
                                <span className="font-semibold">{search}</span>
                                <span className="opacity-60">&quot;</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </>
    );
}
