// ============================================
// COUNTRY CODES WITH PHONE NUMBER VALIDATION
// Comprehensive list of countries with calling codes and phone number length constraints
// ============================================

export interface CountryCode {
    code: string;
    country: string;
    flag: string;
    minLength: number;
    maxLength: number;
    iso2?: string; // ISO 3166-1 alpha-2 code
}

export const countryCodes: CountryCode[] = [
    // ============================================
    // ZONE 1: NORTH AMERICA (NANP)
    // ============================================
    { code: '+1', country: 'USA', flag: '🇺🇸', minLength: 10, maxLength: 10, iso2: 'US' },
    { code: '+1', country: 'Canada', flag: '🇨🇦', minLength: 10, maxLength: 10, iso2: 'CA' },
    { code: '+1242', country: 'Bahamas', flag: '🇧🇸', minLength: 7, maxLength: 7, iso2: 'BS' },
    { code: '+1246', country: 'Barbados', flag: '🇧🇧', minLength: 7, maxLength: 7, iso2: 'BB' },
    { code: '+1264', country: 'Anguilla', flag: '🇦🇮', minLength: 7, maxLength: 7, iso2: 'AI' },
    { code: '+1268', country: 'Antigua and Barbuda', flag: '🇦🇬', minLength: 7, maxLength: 7, iso2: 'AG' },
    { code: '+1284', country: 'British Virgin Islands', flag: '🇻🇬', minLength: 7, maxLength: 7, iso2: 'VG' },
    { code: '+1340', country: 'US Virgin Islands', flag: '🇻🇮', minLength: 7, maxLength: 7, iso2: 'VI' },
    { code: '+1345', country: 'Cayman Islands', flag: '🇰🇾', minLength: 7, maxLength: 7, iso2: 'KY' },
    { code: '+1441', country: 'Bermuda', flag: '🇧🇲', minLength: 7, maxLength: 7, iso2: 'BM' },
    { code: '+1473', country: 'Grenada', flag: '🇬🇩', minLength: 7, maxLength: 7, iso2: 'GD' },
    { code: '+1649', country: 'Turks and Caicos', flag: '🇹🇨', minLength: 7, maxLength: 7, iso2: 'TC' },
    { code: '+1658', country: 'Jamaica', flag: '🇯🇲', minLength: 7, maxLength: 7, iso2: 'JM' },
    { code: '+1664', country: 'Montserrat', flag: '🇲🇸', minLength: 7, maxLength: 7, iso2: 'MS' },
    { code: '+1670', country: 'Northern Mariana Islands', flag: '🇲🇵', minLength: 7, maxLength: 7, iso2: 'MP' },
    { code: '+1671', country: 'Guam', flag: '🇬🇺', minLength: 7, maxLength: 7, iso2: 'GU' },
    { code: '+1684', country: 'American Samoa', flag: '🇦🇸', minLength: 7, maxLength: 7, iso2: 'AS' },
    { code: '+1721', country: 'Sint Maarten', flag: '🇸🇽', minLength: 7, maxLength: 7, iso2: 'SX' },
    { code: '+1758', country: 'Saint Lucia', flag: '🇱🇨', minLength: 7, maxLength: 7, iso2: 'LC' },
    { code: '+1767', country: 'Dominica', flag: '🇩🇲', minLength: 7, maxLength: 7, iso2: 'DM' },
    { code: '+1784', country: 'St Vincent & Grenadines', flag: '🇻🇨', minLength: 7, maxLength: 7, iso2: 'VC' },
    { code: '+1787', country: 'Puerto Rico', flag: '🇵🇷', minLength: 10, maxLength: 10, iso2: 'PR' },
    { code: '+1809', country: 'Dominican Republic', flag: '🇩🇴', minLength: 10, maxLength: 10, iso2: 'DO' },
    { code: '+1868', country: 'Trinidad and Tobago', flag: '🇹🇹', minLength: 7, maxLength: 7, iso2: 'TT' },
    { code: '+1869', country: 'Saint Kitts and Nevis', flag: '🇰🇳', minLength: 7, maxLength: 7, iso2: 'KN' },
    { code: '+1876', country: 'Jamaica', flag: '🇯🇲', minLength: 7, maxLength: 7, iso2: 'JM' },

    // ============================================
    // ZONE 2: AFRICA
    // ============================================
    { code: '+20', country: 'Egypt', flag: '🇪🇬', minLength: 10, maxLength: 10, iso2: 'EG' },
    { code: '+211', country: 'South Sudan', flag: '🇸🇸', minLength: 9, maxLength: 9, iso2: 'SS' },
    { code: '+212', country: 'Morocco', flag: '🇲🇦', minLength: 9, maxLength: 9, iso2: 'MA' },
    { code: '+213', country: 'Algeria', flag: '🇩🇿', minLength: 9, maxLength: 9, iso2: 'DZ' },
    { code: '+216', country: 'Tunisia', flag: '🇹🇳', minLength: 8, maxLength: 8, iso2: 'TN' },
    { code: '+218', country: 'Libya', flag: '🇱🇾', minLength: 9, maxLength: 9, iso2: 'LY' },
    { code: '+220', country: 'Gambia', flag: '🇬🇲', minLength: 7, maxLength: 7, iso2: 'GM' },
    { code: '+221', country: 'Senegal', flag: '🇸🇳', minLength: 9, maxLength: 9, iso2: 'SN' },
    { code: '+222', country: 'Mauritania', flag: '🇲🇷', minLength: 8, maxLength: 8, iso2: 'MR' },
    { code: '+223', country: 'Mali', flag: '🇲🇱', minLength: 8, maxLength: 8, iso2: 'ML' },
    { code: '+224', country: 'Guinea', flag: '🇬🇳', minLength: 9, maxLength: 9, iso2: 'GN' },
    { code: '+225', country: 'Ivory Coast', flag: '🇨🇮', minLength: 10, maxLength: 10, iso2: 'CI' },
    { code: '+226', country: 'Burkina Faso', flag: '🇧🇫', minLength: 8, maxLength: 8, iso2: 'BF' },
    { code: '+227', country: 'Niger', flag: '🇳🇪', minLength: 8, maxLength: 8, iso2: 'NE' },
    { code: '+228', country: 'Togo', flag: '🇹🇬', minLength: 8, maxLength: 8, iso2: 'TG' },
    { code: '+229', country: 'Benin', flag: '🇧🇯', minLength: 8, maxLength: 8, iso2: 'BJ' },
    { code: '+230', country: 'Mauritius', flag: '🇲🇺', minLength: 8, maxLength: 8, iso2: 'MU' },
    { code: '+231', country: 'Liberia', flag: '🇱🇷', minLength: 7, maxLength: 8, iso2: 'LR' },
    { code: '+232', country: 'Sierra Leone', flag: '🇸🇱', minLength: 8, maxLength: 8, iso2: 'SL' },
    { code: '+233', country: 'Ghana', flag: '🇬🇭', minLength: 9, maxLength: 9, iso2: 'GH' },
    { code: '+234', country: 'Nigeria', flag: '🇳🇬', minLength: 10, maxLength: 10, iso2: 'NG' },
    { code: '+235', country: 'Chad', flag: '🇹🇩', minLength: 8, maxLength: 8, iso2: 'TD' },
    { code: '+236', country: 'Central African Republic', flag: '🇨🇫', minLength: 8, maxLength: 8, iso2: 'CF' },
    { code: '+237', country: 'Cameroon', flag: '🇨🇲', minLength: 9, maxLength: 9, iso2: 'CM' },
    { code: '+238', country: 'Cape Verde', flag: '🇨🇻', minLength: 7, maxLength: 7, iso2: 'CV' },
    { code: '+239', country: 'São Tomé and Príncipe', flag: '🇸🇹', minLength: 7, maxLength: 7, iso2: 'ST' },
    { code: '+240', country: 'Equatorial Guinea', flag: '🇬🇶', minLength: 9, maxLength: 9, iso2: 'GQ' },
    { code: '+241', country: 'Gabon', flag: '🇬🇦', minLength: 7, maxLength: 8, iso2: 'GA' },
    { code: '+242', country: 'Republic of the Congo', flag: '🇨🇬', minLength: 9, maxLength: 9, iso2: 'CG' },
    { code: '+243', country: 'DR Congo', flag: '🇨🇩', minLength: 9, maxLength: 9, iso2: 'CD' },
    { code: '+244', country: 'Angola', flag: '🇦🇴', minLength: 9, maxLength: 9, iso2: 'AO' },
    { code: '+245', country: 'Guinea-Bissau', flag: '🇬🇼', minLength: 7, maxLength: 7, iso2: 'GW' },
    { code: '+247', country: 'Ascension Island', flag: '🇦🇨', minLength: 4, maxLength: 4, iso2: 'AC' },
    { code: '+248', country: 'Seychelles', flag: '🇸🇨', minLength: 7, maxLength: 7, iso2: 'SC' },
    { code: '+249', country: 'Sudan', flag: '🇸🇩', minLength: 9, maxLength: 9, iso2: 'SD' },
    { code: '+250', country: 'Rwanda', flag: '🇷🇼', minLength: 9, maxLength: 9, iso2: 'RW' },
    { code: '+251', country: 'Ethiopia', flag: '🇪🇹', minLength: 9, maxLength: 9, iso2: 'ET' },
    { code: '+252', country: 'Somalia', flag: '🇸🇴', minLength: 8, maxLength: 8, iso2: 'SO' },
    { code: '+253', country: 'Djibouti', flag: '🇩🇯', minLength: 8, maxLength: 8, iso2: 'DJ' },
    { code: '+254', country: 'Kenya', flag: '🇰🇪', minLength: 9, maxLength: 9, iso2: 'KE' },
    { code: '+255', country: 'Tanzania', flag: '🇹🇿', minLength: 9, maxLength: 9, iso2: 'TZ' },
    { code: '+256', country: 'Uganda', flag: '🇺🇬', minLength: 9, maxLength: 9, iso2: 'UG' },
    { code: '+257', country: 'Burundi', flag: '🇧🇮', minLength: 8, maxLength: 8, iso2: 'BI' },
    { code: '+258', country: 'Mozambique', flag: '🇲🇿', minLength: 9, maxLength: 9, iso2: 'MZ' },
    { code: '+260', country: 'Zambia', flag: '🇿🇲', minLength: 9, maxLength: 9, iso2: 'ZM' },
    { code: '+261', country: 'Madagascar', flag: '🇲🇬', minLength: 9, maxLength: 9, iso2: 'MG' },
    { code: '+262', country: 'Réunion', flag: '🇷🇪', minLength: 9, maxLength: 9, iso2: 'RE' },
    { code: '+263', country: 'Zimbabwe', flag: '🇿🇼', minLength: 9, maxLength: 9, iso2: 'ZW' },
    { code: '+264', country: 'Namibia', flag: '🇳🇦', minLength: 9, maxLength: 9, iso2: 'NA' },
    { code: '+265', country: 'Malawi', flag: '🇲🇼', minLength: 9, maxLength: 9, iso2: 'MW' },
    { code: '+266', country: 'Lesotho', flag: '🇱🇸', minLength: 8, maxLength: 8, iso2: 'LS' },
    { code: '+267', country: 'Botswana', flag: '🇧🇼', minLength: 8, maxLength: 8, iso2: 'BW' },
    { code: '+268', country: 'Eswatini', flag: '🇸🇿', minLength: 8, maxLength: 8, iso2: 'SZ' },
    { code: '+269', country: 'Comoros', flag: '🇰🇲', minLength: 7, maxLength: 7, iso2: 'KM' },
    { code: '+27', country: 'South Africa', flag: '🇿🇦', minLength: 9, maxLength: 9, iso2: 'ZA' },
    { code: '+291', country: 'Eritrea', flag: '🇪🇷', minLength: 7, maxLength: 7, iso2: 'ER' },

    // ============================================
    // ZONES 3 & 4: EUROPE
    // ============================================
    { code: '+30', country: 'Greece', flag: '🇬🇷', minLength: 10, maxLength: 10, iso2: 'GR' },
    { code: '+31', country: 'Netherlands', flag: '🇳🇱', minLength: 9, maxLength: 9, iso2: 'NL' },
    { code: '+32', country: 'Belgium', flag: '🇧🇪', minLength: 9, maxLength: 9, iso2: 'BE' },
    { code: '+33', country: 'France', flag: '🇫🇷', minLength: 9, maxLength: 9, iso2: 'FR' },
    { code: '+34', country: 'Spain', flag: '🇪🇸', minLength: 9, maxLength: 9, iso2: 'ES' },
    { code: '+350', country: 'Gibraltar', flag: '🇬🇮', minLength: 8, maxLength: 8, iso2: 'GI' },
    { code: '+351', country: 'Portugal', flag: '🇵🇹', minLength: 9, maxLength: 9, iso2: 'PT' },
    { code: '+352', country: 'Luxembourg', flag: '🇱🇺', minLength: 9, maxLength: 9, iso2: 'LU' },
    { code: '+353', country: 'Ireland', flag: '🇮🇪', minLength: 9, maxLength: 9, iso2: 'IE' },
    { code: '+354', country: 'Iceland', flag: '🇮🇸', minLength: 7, maxLength: 7, iso2: 'IS' },
    { code: '+355', country: 'Albania', flag: '🇦🇱', minLength: 9, maxLength: 9, iso2: 'AL' },
    { code: '+356', country: 'Malta', flag: '🇲🇹', minLength: 8, maxLength: 8, iso2: 'MT' },
    { code: '+357', country: 'Cyprus', flag: '🇨🇾', minLength: 8, maxLength: 8, iso2: 'CY' },
    { code: '+358', country: 'Finland', flag: '🇫🇮', minLength: 9, maxLength: 10, iso2: 'FI' },
    { code: '+359', country: 'Bulgaria', flag: '🇧🇬', minLength: 9, maxLength: 9, iso2: 'BG' },
    { code: '+36', country: 'Hungary', flag: '🇭🇺', minLength: 9, maxLength: 9, iso2: 'HU' },
    { code: '+370', country: 'Lithuania', flag: '🇱🇹', minLength: 8, maxLength: 8, iso2: 'LT' },
    { code: '+371', country: 'Latvia', flag: '🇱🇻', minLength: 8, maxLength: 8, iso2: 'LV' },
    { code: '+372', country: 'Estonia', flag: '🇪🇪', minLength: 7, maxLength: 8, iso2: 'EE' },
    { code: '+373', country: 'Moldova', flag: '🇲🇩', minLength: 8, maxLength: 8, iso2: 'MD' },
    { code: '+374', country: 'Armenia', flag: '🇦🇲', minLength: 8, maxLength: 8, iso2: 'AM' },
    { code: '+375', country: 'Belarus', flag: '🇧🇾', minLength: 9, maxLength: 9, iso2: 'BY' },
    { code: '+376', country: 'Andorra', flag: '🇦🇩', minLength: 6, maxLength: 9, iso2: 'AD' },
    { code: '+377', country: 'Monaco', flag: '🇲🇨', minLength: 8, maxLength: 8, iso2: 'MC' },
    { code: '+378', country: 'San Marino', flag: '🇸🇲', minLength: 10, maxLength: 10, iso2: 'SM' },
    { code: '+380', country: 'Ukraine', flag: '🇺🇦', minLength: 9, maxLength: 9, iso2: 'UA' },
    { code: '+381', country: 'Serbia', flag: '🇷🇸', minLength: 9, maxLength: 9, iso2: 'RS' },
    { code: '+382', country: 'Montenegro', flag: '🇲🇪', minLength: 8, maxLength: 8, iso2: 'ME' },
    { code: '+383', country: 'Kosovo', flag: '🇽🇰', minLength: 8, maxLength: 8, iso2: 'XK' },
    { code: '+385', country: 'Croatia', flag: '🇭🇷', minLength: 9, maxLength: 9, iso2: 'HR' },
    { code: '+386', country: 'Slovenia', flag: '🇸🇮', minLength: 8, maxLength: 8, iso2: 'SI' },
    { code: '+387', country: 'Bosnia and Herzegovina', flag: '🇧🇦', minLength: 8, maxLength: 8, iso2: 'BA' },
    { code: '+389', country: 'North Macedonia', flag: '🇲🇰', minLength: 8, maxLength: 8, iso2: 'MK' },
    { code: '+39', country: 'Italy', flag: '🇮🇹', minLength: 9, maxLength: 10, iso2: 'IT' },
    { code: '+40', country: 'Romania', flag: '🇷🇴', minLength: 9, maxLength: 9, iso2: 'RO' },
    { code: '+41', country: 'Switzerland', flag: '🇨🇭', minLength: 9, maxLength: 9, iso2: 'CH' },
    { code: '+420', country: 'Czech Republic', flag: '🇨🇿', minLength: 9, maxLength: 9, iso2: 'CZ' },
    { code: '+421', country: 'Slovakia', flag: '🇸🇰', minLength: 9, maxLength: 9, iso2: 'SK' },
    { code: '+423', country: 'Liechtenstein', flag: '🇱🇮', minLength: 7, maxLength: 7, iso2: 'LI' },
    { code: '+43', country: 'Austria', flag: '🇦🇹', minLength: 10, maxLength: 11, iso2: 'AT' },
    { code: '+44', country: 'United Kingdom', flag: '🇬🇧', minLength: 10, maxLength: 10, iso2: 'GB' },
    { code: '+45', country: 'Denmark', flag: '🇩🇰', minLength: 8, maxLength: 8, iso2: 'DK' },
    { code: '+46', country: 'Sweden', flag: '🇸🇪', minLength: 9, maxLength: 10, iso2: 'SE' },
    { code: '+47', country: 'Norway', flag: '🇳🇴', minLength: 8, maxLength: 8, iso2: 'NO' },
    { code: '+48', country: 'Poland', flag: '🇵🇱', minLength: 9, maxLength: 9, iso2: 'PL' },
    { code: '+49', country: 'Germany', flag: '🇩🇪', minLength: 10, maxLength: 11, iso2: 'DE' },

    // ============================================
    // ZONE 5: SOUTH & CENTRAL AMERICA
    // ============================================
    { code: '+500', country: 'Falkland Islands', flag: '🇫🇰', minLength: 5, maxLength: 5, iso2: 'FK' },
    { code: '+501', country: 'Belize', flag: '🇧🇿', minLength: 7, maxLength: 7, iso2: 'BZ' },
    { code: '+502', country: 'Guatemala', flag: '🇬🇹', minLength: 8, maxLength: 8, iso2: 'GT' },
    { code: '+503', country: 'El Salvador', flag: '🇸🇻', minLength: 8, maxLength: 8, iso2: 'SV' },
    { code: '+504', country: 'Honduras', flag: '🇭🇳', minLength: 8, maxLength: 8, iso2: 'HN' },
    { code: '+505', country: 'Nicaragua', flag: '🇳🇮', minLength: 8, maxLength: 8, iso2: 'NI' },
    { code: '+506', country: 'Costa Rica', flag: '🇨🇷', minLength: 8, maxLength: 8, iso2: 'CR' },
    { code: '+507', country: 'Panama', flag: '🇵🇦', minLength: 8, maxLength: 8, iso2: 'PA' },
    { code: '+508', country: 'Saint Pierre and Miquelon', flag: '🇵🇲', minLength: 6, maxLength: 6, iso2: 'PM' },
    { code: '+509', country: 'Haiti', flag: '🇭🇹', minLength: 8, maxLength: 8, iso2: 'HT' },
    { code: '+51', country: 'Peru', flag: '🇵🇪', minLength: 9, maxLength: 9, iso2: 'PE' },
    { code: '+52', country: 'Mexico', flag: '🇲🇽', minLength: 10, maxLength: 10, iso2: 'MX' },
    { code: '+53', country: 'Cuba', flag: '🇨🇺', minLength: 8, maxLength: 8, iso2: 'CU' },
    { code: '+54', country: 'Argentina', flag: '🇦🇷', minLength: 10, maxLength: 10, iso2: 'AR' },
    { code: '+55', country: 'Brazil', flag: '🇧🇷', minLength: 10, maxLength: 11, iso2: 'BR' },
    { code: '+56', country: 'Chile', flag: '🇨🇱', minLength: 9, maxLength: 9, iso2: 'CL' },
    { code: '+57', country: 'Colombia', flag: '🇨🇴', minLength: 10, maxLength: 10, iso2: 'CO' },
    { code: '+58', country: 'Venezuela', flag: '🇻🇪', minLength: 10, maxLength: 10, iso2: 'VE' },
    { code: '+590', country: 'Guadeloupe', flag: '🇬🇵', minLength: 9, maxLength: 9, iso2: 'GP' },
    { code: '+591', country: 'Bolivia', flag: '🇧🇴', minLength: 8, maxLength: 8, iso2: 'BO' },
    { code: '+592', country: 'Guyana', flag: '🇬🇾', minLength: 7, maxLength: 7, iso2: 'GY' },
    { code: '+593', country: 'Ecuador', flag: '🇪🇨', minLength: 9, maxLength: 9, iso2: 'EC' },
    { code: '+594', country: 'French Guiana', flag: '🇬🇫', minLength: 9, maxLength: 9, iso2: 'GF' },
    { code: '+595', country: 'Paraguay', flag: '🇵🇾', minLength: 9, maxLength: 9, iso2: 'PY' },
    { code: '+596', country: 'Martinique', flag: '🇲🇶', minLength: 9, maxLength: 9, iso2: 'MQ' },
    { code: '+597', country: 'Suriname', flag: '🇸🇷', minLength: 7, maxLength: 7, iso2: 'SR' },
    { code: '+598', country: 'Uruguay', flag: '🇺🇾', minLength: 8, maxLength: 8, iso2: 'UY' },
    { code: '+599', country: 'Curaçao', flag: '🇨🇼', minLength: 7, maxLength: 8, iso2: 'CW' },

    // ============================================
    // ZONE 6: SOUTHEAST ASIA & OCEANIA
    // ============================================
    { code: '+60', country: 'Malaysia', flag: '🇲🇾', minLength: 9, maxLength: 10, iso2: 'MY' },
    { code: '+61', country: 'Australia', flag: '🇦🇺', minLength: 9, maxLength: 9, iso2: 'AU' },
    { code: '+62', country: 'Indonesia', flag: '🇮🇩', minLength: 10, maxLength: 12, iso2: 'ID' },
    { code: '+63', country: 'Philippines', flag: '🇵🇭', minLength: 10, maxLength: 10, iso2: 'PH' },
    { code: '+64', country: 'New Zealand', flag: '🇳🇿', minLength: 8, maxLength: 9, iso2: 'NZ' },
    { code: '+65', country: 'Singapore', flag: '🇸🇬', minLength: 8, maxLength: 8, iso2: 'SG' },
    { code: '+66', country: 'Thailand', flag: '🇹🇭', minLength: 9, maxLength: 9, iso2: 'TH' },
    { code: '+670', country: 'Timor-Leste', flag: '🇹🇱', minLength: 8, maxLength: 8, iso2: 'TL' },
    { code: '+672', country: 'Norfolk Island', flag: '🇳🇫', minLength: 6, maxLength: 6, iso2: 'NF' },
    { code: '+673', country: 'Brunei', flag: '🇧🇳', minLength: 7, maxLength: 7, iso2: 'BN' },
    { code: '+674', country: 'Nauru', flag: '🇳🇷', minLength: 7, maxLength: 7, iso2: 'NR' },
    { code: '+675', country: 'Papua New Guinea', flag: '🇵🇬', minLength: 8, maxLength: 8, iso2: 'PG' },
    { code: '+676', country: 'Tonga', flag: '🇹🇴', minLength: 7, maxLength: 7, iso2: 'TO' },
    { code: '+677', country: 'Solomon Islands', flag: '🇸🇧', minLength: 7, maxLength: 7, iso2: 'SB' },
    { code: '+678', country: 'Vanuatu', flag: '🇻🇺', minLength: 7, maxLength: 7, iso2: 'VU' },
    { code: '+679', country: 'Fiji', flag: '🇫🇯', minLength: 7, maxLength: 7, iso2: 'FJ' },
    { code: '+680', country: 'Palau', flag: '🇵🇼', minLength: 7, maxLength: 7, iso2: 'PW' },
    { code: '+681', country: 'Wallis and Futuna', flag: '🇼🇫', minLength: 6, maxLength: 6, iso2: 'WF' },
    { code: '+682', country: 'Cook Islands', flag: '🇨🇰', minLength: 5, maxLength: 5, iso2: 'CK' },
    { code: '+683', country: 'Niue', flag: '🇳🇺', minLength: 4, maxLength: 4, iso2: 'NU' },
    { code: '+685', country: 'Samoa', flag: '🇼🇸', minLength: 7, maxLength: 7, iso2: 'WS' },
    { code: '+686', country: 'Kiribati', flag: '🇰🇮', minLength: 8, maxLength: 8, iso2: 'KI' },
    { code: '+687', country: 'New Caledonia', flag: '🇳🇨', minLength: 6, maxLength: 6, iso2: 'NC' },
    { code: '+688', country: 'Tuvalu', flag: '🇹🇻', minLength: 5, maxLength: 6, iso2: 'TV' },
    { code: '+689', country: 'French Polynesia', flag: '🇵🇫', minLength: 8, maxLength: 8, iso2: 'PF' },
    { code: '+690', country: 'Tokelau', flag: '🇹🇰', minLength: 4, maxLength: 4, iso2: 'TK' },
    { code: '+691', country: 'Micronesia', flag: '🇫🇲', minLength: 7, maxLength: 7, iso2: 'FM' },
    { code: '+692', country: 'Marshall Islands', flag: '🇲🇭', minLength: 7, maxLength: 7, iso2: 'MH' },

    // ============================================
    // ZONE 7: RUSSIA & NEIGHBORING
    // ============================================
    { code: '+7', country: 'Russia', flag: '🇷🇺', minLength: 10, maxLength: 10, iso2: 'RU' },
    { code: '+77', country: 'Kazakhstan', flag: '🇰🇿', minLength: 10, maxLength: 10, iso2: 'KZ' },

    // ============================================
    // ZONE 8: EAST ASIA
    // ============================================
    { code: '+81', country: 'Japan', flag: '🇯🇵', minLength: 10, maxLength: 10, iso2: 'JP' },
    { code: '+82', country: 'South Korea', flag: '🇰🇷', minLength: 9, maxLength: 10, iso2: 'KR' },
    { code: '+84', country: 'Vietnam', flag: '🇻🇳', minLength: 9, maxLength: 10, iso2: 'VN' },
    { code: '+850', country: 'North Korea', flag: '🇰🇵', minLength: 10, maxLength: 10, iso2: 'KP' },
    { code: '+852', country: 'Hong Kong', flag: '🇭🇰', minLength: 8, maxLength: 8, iso2: 'HK' },
    { code: '+853', country: 'Macau', flag: '🇲🇴', minLength: 8, maxLength: 8, iso2: 'MO' },
    { code: '+855', country: 'Cambodia', flag: '🇰🇭', minLength: 9, maxLength: 9, iso2: 'KH' },
    { code: '+856', country: 'Laos', flag: '🇱🇦', minLength: 10, maxLength: 10, iso2: 'LA' },
    { code: '+86', country: 'China', flag: '🇨🇳', minLength: 11, maxLength: 11, iso2: 'CN' },
    { code: '+880', country: 'Bangladesh', flag: '🇧🇩', minLength: 10, maxLength: 10, iso2: 'BD' },
    { code: '+886', country: 'Taiwan', flag: '🇹🇼', minLength: 9, maxLength: 9, iso2: 'TW' },

    // ============================================
    // ZONE 9: WEST, CENTRAL & SOUTH ASIA
    // ============================================
    { code: '+90', country: 'Turkey', flag: '🇹🇷', minLength: 10, maxLength: 10, iso2: 'TR' },
    { code: '+91', country: 'India', flag: '🇮🇳', minLength: 10, maxLength: 10, iso2: 'IN' },
    { code: '+92', country: 'Pakistan', flag: '🇵🇰', minLength: 10, maxLength: 10, iso2: 'PK' },
    { code: '+93', country: 'Afghanistan', flag: '🇦🇫', minLength: 9, maxLength: 9, iso2: 'AF' },
    { code: '+94', country: 'Sri Lanka', flag: '🇱🇰', minLength: 9, maxLength: 9, iso2: 'LK' },
    { code: '+95', country: 'Myanmar', flag: '🇲🇲', minLength: 8, maxLength: 10, iso2: 'MM' },
    { code: '+960', country: 'Maldives', flag: '🇲🇻', minLength: 7, maxLength: 7, iso2: 'MV' },
    { code: '+961', country: 'Lebanon', flag: '🇱🇧', minLength: 8, maxLength: 8, iso2: 'LB' },
    { code: '+962', country: 'Jordan', flag: '🇯🇴', minLength: 9, maxLength: 9, iso2: 'JO' },
    { code: '+963', country: 'Syria', flag: '🇸🇾', minLength: 9, maxLength: 9, iso2: 'SY' },
    { code: '+964', country: 'Iraq', flag: '🇮🇶', minLength: 10, maxLength: 10, iso2: 'IQ' },
    { code: '+965', country: 'Kuwait', flag: '🇰🇼', minLength: 8, maxLength: 8, iso2: 'KW' },
    { code: '+966', country: 'Saudi Arabia', flag: '🇸🇦', minLength: 9, maxLength: 9, iso2: 'SA' },
    { code: '+967', country: 'Yemen', flag: '🇾🇪', minLength: 9, maxLength: 9, iso2: 'YE' },
    { code: '+968', country: 'Oman', flag: '🇴🇲', minLength: 8, maxLength: 8, iso2: 'OM' },
    { code: '+970', country: 'Palestine', flag: '🇵🇸', minLength: 9, maxLength: 9, iso2: 'PS' },
    { code: '+971', country: 'UAE', flag: '🇦🇪', minLength: 9, maxLength: 9, iso2: 'AE' },
    { code: '+972', country: 'Israel', flag: '🇮🇱', minLength: 9, maxLength: 9, iso2: 'IL' },
    { code: '+973', country: 'Bahrain', flag: '🇧🇭', minLength: 8, maxLength: 8, iso2: 'BH' },
    { code: '+974', country: 'Qatar', flag: '🇶🇦', minLength: 8, maxLength: 8, iso2: 'QA' },
    { code: '+975', country: 'Bhutan', flag: '🇧🇹', minLength: 8, maxLength: 8, iso2: 'BT' },
    { code: '+976', country: 'Mongolia', flag: '🇲🇳', minLength: 8, maxLength: 8, iso2: 'MN' },
    { code: '+977', country: 'Nepal', flag: '🇳🇵', minLength: 10, maxLength: 10, iso2: 'NP' },
    { code: '+98', country: 'Iran', flag: '🇮🇷', minLength: 10, maxLength: 10, iso2: 'IR' },
    { code: '+992', country: 'Tajikistan', flag: '🇹🇯', minLength: 9, maxLength: 9, iso2: 'TJ' },
    { code: '+993', country: 'Turkmenistan', flag: '🇹🇲', minLength: 8, maxLength: 8, iso2: 'TM' },
    { code: '+994', country: 'Azerbaijan', flag: '🇦🇿', minLength: 9, maxLength: 9, iso2: 'AZ' },
    { code: '+995', country: 'Georgia', flag: '🇬🇪', minLength: 9, maxLength: 9, iso2: 'GE' },
    { code: '+996', country: 'Kyrgyzstan', flag: '🇰🇬', minLength: 9, maxLength: 9, iso2: 'KG' },
    { code: '+998', country: 'Uzbekistan', flag: '🇺🇿', minLength: 9, maxLength: 9, iso2: 'UZ' },

    // ============================================
    // OTHER TERRITORIES
    // ============================================
    { code: '+297', country: 'Aruba', flag: '🇦🇼', minLength: 7, maxLength: 7, iso2: 'AW' },
    { code: '+298', country: 'Faroe Islands', flag: '🇫🇴', minLength: 6, maxLength: 6, iso2: 'FO' },
    { code: '+299', country: 'Greenland', flag: '🇬🇱', minLength: 6, maxLength: 6, iso2: 'GL' },
];

// Sort countries alphabetically by name for better UX, but keep popular countries at top
const popularCountries = ['India', 'USA', 'United Kingdom', 'UAE', 'Singapore', 'Australia', 'Canada'];

export const sortedCountryCodes = [
    ...countryCodes.filter(c => popularCountries.includes(c.country)),
    ...countryCodes
        .filter(c => !popularCountries.includes(c.country))
        .sort((a, b) => a.country.localeCompare(b.country))
];

// Helper function to get country by code
export const getCountryByCode = (code: string): CountryCode => {
    return countryCodes.find(c => c.code === code) || countryCodes.find(c => c.country === 'India')!;
};

// Helper function to search countries by code, country name, or iso2 code
export const searchCountries = (query: string): CountryCode[] => {
    if (!query || query.trim() === '') {
        return sortedCountryCodes;
    }

    const searchTerm = query.toLowerCase().trim();

    return sortedCountryCodes.filter(country => {
        // Search by country name
        const matchesCountry = country.country.toLowerCase().includes(searchTerm);

        // Search by phone code (with or without + prefix)
        const codeWithoutPlus = country.code.replace('+', '');
        const searchWithoutPlus = searchTerm.replace('+', '');
        const matchesCode = country.code.toLowerCase().includes(searchTerm) ||
            codeWithoutPlus.includes(searchWithoutPlus);

        // Search by ISO2 code
        const matchesIso2 = country.iso2?.toLowerCase().includes(searchTerm) || false;

        return matchesCountry || matchesCode || matchesIso2;
    });
};

// Helper function to validate phone number length for a country
export const validatePhoneLength = (countryCode: string, phoneNumber: string): {
    valid: boolean;
    message: string;
    country: CountryCode;
} => {
    const country = getCountryByCode(countryCode);
    const length = phoneNumber.length;

    if (length < country.minLength) {
        const remaining = country.minLength - length;
        const lengthInfo = country.minLength === country.maxLength
            ? `${country.minLength}`
            : `${country.minLength}-${country.maxLength}`;
        return {
            valid: false,
            message: `Please enter ${remaining} more digit${remaining > 1 ? 's' : ''}`,
            country
        };
    }

    if (length > country.maxLength) {
        const lengthInfo = country.minLength === country.maxLength
            ? `${country.maxLength}`
            : `${country.minLength}-${country.maxLength}`;
        return {
            valid: false,
            message: `Phone number too long (${lengthInfo} digits for ${country.country})`,
            country
        };
    }

    return {
        valid: true,
        message: '',
        country
    };
};

// Get phone length hint text for display
export const getPhoneLengthHint = (countryCode: string): string => {
    const country = getCountryByCode(countryCode);
    if (country.minLength === country.maxLength) {
        return `${country.minLength} digits`;
    }
    return `${country.minLength}-${country.maxLength} digits`;
};
