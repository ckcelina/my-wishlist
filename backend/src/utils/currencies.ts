// ISO 4217 Currency data with country mappings
export interface Currency {
  code: string;
  name: string;
  minorUnits: number;
  countries?: string[];
}

export const CURRENCIES: Currency[] = [
  { code: 'AED', name: 'United Arab Emirates Dirham', minorUnits: 2, countries: ['AE'] },
  { code: 'AFN', name: 'Afghan Afghani', minorUnits: 2, countries: ['AF'] },
  { code: 'ALL', name: 'Albanian Lek', minorUnits: 2, countries: ['AL'] },
  { code: 'AMD', name: 'Armenian Dram', minorUnits: 2, countries: ['AM'] },
  { code: 'ANG', name: 'Netherlands Antilles Guilder', minorUnits: 2, countries: ['AN'] },
  { code: 'AOA', name: 'Angolan Kwanza', minorUnits: 2, countries: ['AO'] },
  { code: 'ARS', name: 'Argentine Peso', minorUnits: 2, countries: ['AR'] },
  { code: 'AUD', name: 'Australian Dollar', minorUnits: 2, countries: ['AU', 'CC', 'CX', 'HM', 'KI', 'NR', 'NU', 'NZ', 'SB', 'TV'] },
  { code: 'AWG', name: 'Aruban Florin', minorUnits: 2, countries: ['AW'] },
  { code: 'AZN', name: 'Azerbaijani Manat', minorUnits: 2, countries: ['AZ'] },
  { code: 'BAM', name: 'Bosnia and Herzegovina Convertible Mark', minorUnits: 2, countries: ['BA'] },
  { code: 'BBD', name: 'Barbadian Dollar', minorUnits: 2, countries: ['BB'] },
  { code: 'BDT', name: 'Bangladeshi Taka', minorUnits: 2, countries: ['BD'] },
  { code: 'BGN', name: 'Bulgarian Lev', minorUnits: 2, countries: ['BG'] },
  { code: 'BHD', name: 'Bahraini Dinar', minorUnits: 3, countries: ['BH'] },
  { code: 'BIF', name: 'Burundian Franc', minorUnits: 0, countries: ['BI'] },
  { code: 'BMD', name: 'Bermudian Dollar', minorUnits: 2, countries: ['BM'] },
  { code: 'BND', name: 'Brunei Dollar', minorUnits: 2, countries: ['BN'] },
  { code: 'BOB', name: 'Bolivian Boliviano', minorUnits: 2, countries: ['BO'] },
  { code: 'BRL', name: 'Brazilian Real', minorUnits: 2, countries: ['BR'] },
  { code: 'BSD', name: 'Bahamian Dollar', minorUnits: 2, countries: ['BS'] },
  { code: 'BTN', name: 'Bhutanese Ngultrum', minorUnits: 2, countries: ['BT'] },
  { code: 'BWP', name: 'Botswanan Pula', minorUnits: 2, countries: ['BW'] },
  { code: 'BYN', name: 'Belarusian Ruble', minorUnits: 2, countries: ['BY'] },
  { code: 'BZD', name: 'Belize Dollar', minorUnits: 2, countries: ['BZ'] },
  { code: 'CAD', name: 'Canadian Dollar', minorUnits: 2, countries: ['CA'] },
  { code: 'CDF', name: 'Congolese Franc', minorUnits: 2, countries: ['CD'] },
  { code: 'CHE', name: 'Swiss Euro', minorUnits: 2, countries: ['CH'] },
  { code: 'CHF', name: 'Swiss Franc', minorUnits: 2, countries: ['CH', 'LI'] },
  { code: 'CHW', name: 'Swiss Franc (Convertible)', minorUnits: 2, countries: ['CH'] },
  { code: 'CLF', name: 'Chilean Unit of Account', minorUnits: 4, countries: ['CL'] },
  { code: 'CLP', name: 'Chilean Peso', minorUnits: 0, countries: ['CL'] },
  { code: 'CNY', name: 'Chinese Yuan', minorUnits: 2, countries: ['CN'] },
  { code: 'COP', name: 'Colombian Peso', minorUnits: 2, countries: ['CO'] },
  { code: 'CRC', name: 'Costa Rican Colón', minorUnits: 2, countries: ['CR'] },
  { code: 'CUC', name: 'Cuban Convertible Peso', minorUnits: 2, countries: ['CU'] },
  { code: 'CUP', name: 'Cuban Peso', minorUnits: 2, countries: ['CU'] },
  { code: 'CVE', name: 'Cape Verdean Escudo', minorUnits: 2, countries: ['CV'] },
  { code: 'CZK', name: 'Czech Koruna', minorUnits: 2, countries: ['CZ'] },
  { code: 'DJF', name: 'Djiboutian Franc', minorUnits: 0, countries: ['DJ'] },
  { code: 'DKK', name: 'Danish Krone', minorUnits: 2, countries: ['DK', 'FO', 'GL'] },
  { code: 'DOP', name: 'Dominican Peso', minorUnits: 2, countries: ['DO'] },
  { code: 'DZD', name: 'Algerian Dinar', minorUnits: 2, countries: ['DZ'] },
  { code: 'EGP', name: 'Egyptian Pound', minorUnits: 2, countries: ['EG'] },
  { code: 'ERN', name: 'Eritrean Nakfa', minorUnits: 2, countries: ['ER'] },
  { code: 'ETB', name: 'Ethiopian Birr', minorUnits: 2, countries: ['ET'] },
  { code: 'EUR', name: 'European Euro', minorUnits: 2, countries: ['AD', 'AT', 'BE', 'CY', 'DE', 'EE', 'ES', 'FI', 'FR', 'GR', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PT', 'SK', 'SI'] },
  { code: 'FJD', name: 'Fijian Dollar', minorUnits: 2, countries: ['FJ'] },
  { code: 'FKP', name: 'Falkland Islands Pound', minorUnits: 2, countries: ['FK'] },
  { code: 'GBP', name: 'British Pound Sterling', minorUnits: 2, countries: ['GB', 'GG', 'GI', 'GS', 'IM', 'IO', 'JE', 'KY', 'FK', 'GI'] },
  { code: 'GEL', name: 'Georgian Lari', minorUnits: 2, countries: ['GE'] },
  { code: 'GHS', name: 'Ghanaian Cedi', minorUnits: 2, countries: ['GH'] },
  { code: 'GIP', name: 'Gibraltar Pound', minorUnits: 2, countries: ['GI'] },
  { code: 'GMD', name: 'Gambian Dalasi', minorUnits: 2, countries: ['GM'] },
  { code: 'GNF', name: 'Guinean Franc', minorUnits: 0, countries: ['GN'] },
  { code: 'GTQ', name: 'Guatemalan Quetzal', minorUnits: 2, countries: ['GT'] },
  { code: 'GYD', name: 'Guyanese Dollar', minorUnits: 2, countries: ['GY'] },
  { code: 'HKD', name: 'Hong Kong Dollar', minorUnits: 2, countries: ['HK'] },
  { code: 'HNL', name: 'Honduran Lempira', minorUnits: 2, countries: ['HN'] },
  { code: 'HRK', name: 'Croatian Kuna', minorUnits: 2, countries: ['HR'] },
  { code: 'HTG', name: 'Haitian Gourde', minorUnits: 2, countries: ['HT'] },
  { code: 'HUF', name: 'Hungarian Forint', minorUnits: 2, countries: ['HU'] },
  { code: 'IDR', name: 'Indonesian Rupiah', minorUnits: 2, countries: ['ID'] },
  { code: 'ILS', name: 'Israeli New Shekel', minorUnits: 2, countries: ['IL'] },
  { code: 'INR', name: 'Indian Rupee', minorUnits: 2, countries: ['IN'] },
  { code: 'IQD', name: 'Iraqi Dinar', minorUnits: 3, countries: ['IQ'] },
  { code: 'IRR', name: 'Iranian Rial', minorUnits: 2, countries: ['IR'] },
  { code: 'ISK', name: 'Icelandic Króna', minorUnits: 0, countries: ['IS'] },
  { code: 'JMD', name: 'Jamaican Dollar', minorUnits: 2, countries: ['JM'] },
  { code: 'JOD', name: 'Jordanian Dinar', minorUnits: 3, countries: ['JO'] },
  { code: 'JPY', name: 'Japanese Yen', minorUnits: 0, countries: ['JP'] },
  { code: 'KES', name: 'Kenyan Shilling', minorUnits: 2, countries: ['KE'] },
  { code: 'KGS', name: 'Kyrgyzstani Som', minorUnits: 2, countries: ['KG'] },
  { code: 'KHR', name: 'Cambodian Riel', minorUnits: 2, countries: ['KH'] },
  { code: 'KMF', name: 'Comorian Franc', minorUnits: 0, countries: ['KM'] },
  { code: 'KPW', name: 'North Korean Won', minorUnits: 2, countries: ['KP'] },
  { code: 'KRW', name: 'South Korean Won', minorUnits: 0, countries: ['KR'] },
  { code: 'KWD', name: 'Kuwaiti Dinar', minorUnits: 3, countries: ['KW'] },
  { code: 'KYD', name: 'Cayman Islands Dollar', minorUnits: 2, countries: ['KY'] },
  { code: 'KZT', name: 'Kazakhstani Tenge', minorUnits: 2, countries: ['KZ'] },
  { code: 'LAK', name: 'Laotian Kip', minorUnits: 2, countries: ['LA'] },
  { code: 'LBP', name: 'Lebanese Pound', minorUnits: 2, countries: ['LB'] },
  { code: 'LKR', name: 'Sri Lankan Rupee', minorUnits: 2, countries: ['LK'] },
  { code: 'LRD', name: 'Liberian Dollar', minorUnits: 2, countries: ['LR'] },
  { code: 'LSL', name: 'Lesotho Loti', minorUnits: 2, countries: ['LS'] },
  { code: 'LYD', name: 'Libyan Dinar', minorUnits: 3, countries: ['LY'] },
  { code: 'MAD', name: 'Moroccan Dirham', minorUnits: 2, countries: ['MA'] },
  { code: 'MDL', name: 'Moldovan Leu', minorUnits: 2, countries: ['MD'] },
  { code: 'MGA', name: 'Malagasy Ariary', minorUnits: 2, countries: ['MG'] },
  { code: 'MKD', name: 'Macedonian Denar', minorUnits: 2, countries: ['MK'] },
  { code: 'MMK', name: 'Myanmar Kyat', minorUnits: 2, countries: ['MM'] },
  { code: 'MNT', name: 'Mongolian Tugrik', minorUnits: 2, countries: ['MN'] },
  { code: 'MOP', name: 'Macanese Pataca', minorUnits: 2, countries: ['MO'] },
  { code: 'MRU', name: 'Mauritanian Ouguiya', minorUnits: 2, countries: ['MR'] },
  { code: 'MUR', name: 'Mauritian Rupee', minorUnits: 2, countries: ['MU'] },
  { code: 'MVR', name: 'Maldivian Rufiyaa', minorUnits: 2, countries: ['MV'] },
  { code: 'MWK', name: 'Malawian Kwacha', minorUnits: 2, countries: ['MW'] },
  { code: 'MXN', name: 'Mexican Peso', minorUnits: 2, countries: ['MX'] },
  { code: 'MYR', name: 'Malaysian Ringgit', minorUnits: 2, countries: ['MY'] },
  { code: 'MZN', name: 'Mozambican Metical', minorUnits: 2, countries: ['MZ'] },
  { code: 'NAD', name: 'Namibian Dollar', minorUnits: 2, countries: ['NA'] },
  { code: 'NGN', name: 'Nigerian Naira', minorUnits: 2, countries: ['NG'] },
  { code: 'NIO', name: 'Nicaraguan Córdoba', minorUnits: 2, countries: ['NI'] },
  { code: 'NOK', name: 'Norwegian Krone', minorUnits: 2, countries: ['NO', 'SJ'] },
  { code: 'NPR', name: 'Nepalese Rupee', minorUnits: 2, countries: ['NP'] },
  { code: 'NZD', name: 'New Zealand Dollar', minorUnits: 2, countries: ['NZ', 'CK', 'NU', 'PN'] },
  { code: 'OMR', name: 'Omani Rial', minorUnits: 3, countries: ['OM'] },
  { code: 'PAB', name: 'Panamanian Balboa', minorUnits: 2, countries: ['PA'] },
  { code: 'PEN', name: 'Peruvian Nuevo Sol', minorUnits: 2, countries: ['PE'] },
  { code: 'PGK', name: 'Papua New Guinean Kina', minorUnits: 2, countries: ['PG'] },
  { code: 'PHP', name: 'Philippine Peso', minorUnits: 2, countries: ['PH'] },
  { code: 'PKR', name: 'Pakistani Rupee', minorUnits: 2, countries: ['PK'] },
  { code: 'PLN', name: 'Polish Zloty', minorUnits: 2, countries: ['PL'] },
  { code: 'PYG', name: 'Paraguayan Guaraní', minorUnits: 0, countries: ['PY'] },
  { code: 'QAR', name: 'Qatari Rial', minorUnits: 2, countries: ['QA'] },
  { code: 'RON', name: 'Romanian Leu', minorUnits: 2, countries: ['RO'] },
  { code: 'RSD', name: 'Serbian Dinar', minorUnits: 2, countries: ['RS'] },
  { code: 'RUB', name: 'Russian Ruble', minorUnits: 2, countries: ['RU'] },
  { code: 'RWF', name: 'Rwandan Franc', minorUnits: 0, countries: ['RW'] },
  { code: 'SAR', name: 'Saudi Arabian Riyal', minorUnits: 2, countries: ['SA'] },
  { code: 'SBD', name: 'Solomon Islands Dollar', minorUnits: 2, countries: ['SB'] },
  { code: 'SCR', name: 'Seychellois Rupee', minorUnits: 2, countries: ['SC'] },
  { code: 'SDG', name: 'Sudanese Pound', minorUnits: 2, countries: ['SD'] },
  { code: 'SEK', name: 'Swedish Krona', minorUnits: 2, countries: ['SE'] },
  { code: 'SGD', name: 'Singapore Dollar', minorUnits: 2, countries: ['SG'] },
  { code: 'SHP', name: 'Saint Helena Pound', minorUnits: 2, countries: ['SH'] },
  { code: 'SLE', name: 'Sierra Leonean Leone', minorUnits: 2, countries: ['SL'] },
  { code: 'SLL', name: 'Sierra Leonean Leone', minorUnits: 2, countries: ['SL'] },
  { code: 'SOS', name: 'Somali Shilling', minorUnits: 2, countries: ['SO'] },
  { code: 'SRD', name: 'Surinamese Dollar', minorUnits: 2, countries: ['SR'] },
  { code: 'SSP', name: 'South Sudanese Pound', minorUnits: 2, countries: ['SS'] },
  { code: 'STN', name: 'São Tomé and Príncipe Dobra', minorUnits: 2, countries: ['ST'] },
  { code: 'SYP', name: 'Syrian Pound', minorUnits: 2, countries: ['SY'] },
  { code: 'SZL', name: 'Swazi Lilangeni', minorUnits: 2, countries: ['SZ'] },
  { code: 'THB', name: 'Thai Baht', minorUnits: 2, countries: ['TH'] },
  { code: 'TJS', name: 'Tajikistani Somoni', minorUnits: 2, countries: ['TJ'] },
  { code: 'TMT', name: 'Turkmenistani Manat', minorUnits: 2, countries: ['TM'] },
  { code: 'TND', name: 'Tunisian Dinar', minorUnits: 3, countries: ['TN'] },
  { code: 'TOP', name: 'Tongan Paanga', minorUnits: 2, countries: ['TO'] },
  { code: 'TRY', name: 'Turkish Lira', minorUnits: 2, countries: ['TR'] },
  { code: 'TTD', name: 'Trinidad and Tobago Dollar', minorUnits: 2, countries: ['TT'] },
  { code: 'TWD', name: 'New Taiwan Dollar', minorUnits: 2, countries: ['TW'] },
  { code: 'TZS', name: 'Tanzanian Shilling', minorUnits: 2, countries: ['TZ'] },
  { code: 'UAH', name: 'Ukrainian Hryvnia', minorUnits: 2, countries: ['UA'] },
  { code: 'UGX', name: 'Ugandan Shilling', minorUnits: 0, countries: ['UG'] },
  { code: 'USD', name: 'US Dollar', minorUnits: 2, countries: ['US', 'AS', 'EC', 'GU', 'MH', 'MP', 'PR', 'UM', 'VI'] },
  { code: 'UYU', name: 'Uruguayan Peso', minorUnits: 2, countries: ['UY'] },
  { code: 'UZS', name: 'Uzbekistani Som', minorUnits: 2, countries: ['UZ'] },
  { code: 'VES', name: 'Venezuelan Bolívar', minorUnits: 2, countries: ['VE'] },
  { code: 'VND', name: 'Vietnamese Đồng', minorUnits: 0, countries: ['VN'] },
  { code: 'VUV', name: 'Vanuatu Vatu', minorUnits: 0, countries: ['VU'] },
  { code: 'WST', name: 'Samoan Tala', minorUnits: 2, countries: ['WS'] },
  { code: 'XAF', name: 'CFA Franc BEAC', minorUnits: 0, countries: ['AO', 'CM', 'CF', 'CG', 'GA', 'GQ', 'TD'] },
  { code: 'XCD', name: 'East Caribbean Dollar', minorUnits: 2, countries: ['AG', 'DM', 'GD', 'KN', 'LC', 'MS', 'VC'] },
  { code: 'XOF', name: 'CFA Franc WAEMU', minorUnits: 0, countries: ['BJ', 'BF', 'CI', 'GM', 'GN', 'GW', 'ML', 'NE', 'SN', 'TG'] },
  { code: 'XPF', name: 'CFP Franc', minorUnits: 0, countries: ['PF', 'NC', 'WF'] },
  { code: 'YER', name: 'Yemeni Rial', minorUnits: 2, countries: ['YE'] },
  { code: 'ZAR', name: 'South African Rand', minorUnits: 2, countries: ['ZA'] },
  { code: 'ZMW', name: 'Zambian Kwacha', minorUnits: 2, countries: ['ZM'] },
  { code: 'ZWL', name: 'Zimbabwean Dollar', minorUnits: 2, countries: ['ZW'] },
];

const COUNTRY_CURRENCY_MAP: Record<string, string> = {
  'AE': 'AED', 'AF': 'AFN', 'AL': 'ALL', 'AM': 'AMD', 'AO': 'AOA', 'AR': 'ARS', 'AT': 'EUR', 'AU': 'AUD', 'AW': 'AWG', 'AZ': 'AZN',
  'BA': 'BAM', 'BB': 'BBD', 'BD': 'BDT', 'BE': 'EUR', 'BG': 'BGN', 'BH': 'BHD', 'BI': 'BIF', 'BJ': 'XOF', 'BM': 'BMD', 'BN': 'BND',
  'BO': 'BOB', 'BR': 'BRL', 'BS': 'BSD', 'BT': 'BTN', 'BW': 'BWP', 'BY': 'BYN', 'BZ': 'BZD',
  'CA': 'CAD', 'CD': 'CDF', 'CH': 'CHF', 'CI': 'XOF', 'CL': 'CLP', 'CM': 'XAF', 'CN': 'CNY', 'CO': 'COP', 'CR': 'CRC', 'CU': 'CUP', 'CV': 'CVE', 'CY': 'EUR', 'CZ': 'CZK',
  'DE': 'EUR', 'DJ': 'DJF', 'DK': 'DKK', 'DO': 'DOP', 'DZ': 'DZD',
  'EC': 'USD', 'EG': 'EGP', 'EE': 'EUR', 'ER': 'ERN', 'ES': 'EUR', 'ET': 'ETB',
  'FI': 'EUR', 'FJ': 'FJD', 'FK': 'FKP', 'FR': 'EUR',
  'GA': 'XAF', 'GB': 'GBP', 'GE': 'GEL', 'GH': 'GHS', 'GI': 'GIP', 'GM': 'GMD', 'GN': 'GNF', 'GR': 'EUR', 'GT': 'GTQ', 'GY': 'GYD',
  'HK': 'HKD', 'HN': 'HNL', 'HR': 'HRK', 'HT': 'HTG', 'HU': 'HUF',
  'ID': 'IDR', 'IE': 'EUR', 'IL': 'ILS', 'IN': 'INR', 'IQ': 'IQD', 'IR': 'IRR', 'IS': 'ISK', 'IT': 'EUR',
  'JM': 'JMD', 'JO': 'JOD', 'JP': 'JPY',
  'KE': 'KES', 'KG': 'KGS', 'KH': 'KHR', 'KM': 'KMF', 'KP': 'KPW', 'KR': 'KRW', 'KW': 'KWD', 'KY': 'KYD', 'KZ': 'KZT',
  'LA': 'LAK', 'LB': 'LBP', 'LI': 'CHF', 'LK': 'LKR', 'LR': 'LRD', 'LS': 'LSL', 'LT': 'EUR', 'LU': 'EUR', 'LV': 'EUR', 'LY': 'LYD',
  'MA': 'MAD', 'MD': 'MDL', 'MG': 'MGA', 'MK': 'MKD', 'MM': 'MMK', 'MN': 'MNT', 'MO': 'MOP', 'MR': 'MRU', 'MU': 'MUR', 'MV': 'MVR', 'MW': 'MWK', 'MX': 'MXN', 'MY': 'MYR', 'MZ': 'MZN',
  'NA': 'NAD', 'NE': 'XOF', 'NG': 'NGN', 'NI': 'NIO', 'NL': 'EUR', 'NO': 'NOK', 'NP': 'NPR', 'NZ': 'NZD',
  'OM': 'OMR',
  'PA': 'PAB', 'PE': 'PEN', 'PG': 'PGK', 'PH': 'PHP', 'PK': 'PKR', 'PL': 'PLN', 'PT': 'EUR', 'PY': 'PYG',
  'QA': 'QAR',
  'RO': 'RON', 'RS': 'RSD', 'RU': 'RUB', 'RW': 'RWF',
  'SA': 'SAR', 'SB': 'SBD', 'SC': 'SCR', 'SD': 'SDG', 'SE': 'SEK', 'SG': 'SGD', 'SH': 'SHP', 'SI': 'EUR', 'SK': 'EUR', 'SL': 'SLL', 'SO': 'SOS', 'SR': 'SRD', 'SS': 'SSP', 'ST': 'STN', 'SY': 'SYP', 'SZ': 'SZL',
  'TG': 'XOF', 'TH': 'THB', 'TJ': 'TJS', 'TM': 'TMT', 'TN': 'TND', 'TO': 'TOP', 'TR': 'TRY', 'TT': 'TTD', 'TW': 'TWD', 'TZ': 'TZS',
  'UA': 'UAH', 'UG': 'UGX', 'US': 'USD', 'UY': 'UYU', 'UZ': 'UZS',
  'VE': 'VES', 'VN': 'VND', 'VU': 'VUV',
  'WS': 'WST',
  'YE': 'YER',
  'ZA': 'ZAR', 'ZM': 'ZMW', 'ZW': 'ZWL',
};

export function getCurrencies(search?: string) {
  let filtered = CURRENCIES;
  if (search) {
    const query = search.toUpperCase();
    filtered = CURRENCIES.filter(
      (c) => c.code.includes(query) || c.name.toUpperCase().includes(query)
    );
  }
  return filtered.map((c) => ({
    currencyCode: c.code,
    currencyName: c.name,
  }));
}

export function getCurrencyByCode(code: string) {
  return CURRENCIES.find((c) => c.code === code);
}

export function getDefaultCurrencyForCountry(countryCode: string): string | null {
  return COUNTRY_CURRENCY_MAP[countryCode] || null;
}

export function formatMoney(
  amount: number,
  currencyCode: string,
  locale: string = 'en-US'
): string {
  try {
    const currency = getCurrencyByCode(currencyCode);
    const minorUnits = currency?.minorUnits ?? 2;

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: minorUnits,
      maximumFractionDigits: minorUnits,
    }).format(amount);
  } catch (error) {
    // Fallback: return formatted number with code
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}
