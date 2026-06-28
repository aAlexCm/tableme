// Full ITU/E.164 country calling code table (ISO 3166-1 alpha-2 + name + code).
// Several entries intentionally share the same calling code (NANP "1",
// Russia/Kazakhstan "7", etc.) — that's expected, only the code is stored.
const COUNTRIES_RAW = [
  ['AD', 'Andorre', '376'], ['AE', 'Émirats arabes unis', '971'], ['AF', 'Afghanistan', '93'],
  ['AG', 'Antigua-et-Barbuda', '1'], ['AI', 'Anguilla', '1'], ['AL', 'Albanie', '355'],
  ['AM', 'Arménie', '374'], ['AO', 'Angola', '244'], ['AR', 'Argentine', '54'],
  ['AS', 'Samoa américaines', '1'], ['AT', 'Autriche', '43'], ['AU', 'Australie', '61'],
  ['AW', 'Aruba', '297'], ['AX', 'Åland', '358'], ['AZ', 'Azerbaïdjan', '994'],
  ['BA', 'Bosnie-Herzégovine', '387'], ['BB', 'Barbade', '1'], ['BD', 'Bangladesh', '880'],
  ['BE', 'Belgique', '32'], ['BF', 'Burkina Faso', '226'], ['BG', 'Bulgarie', '359'],
  ['BH', 'Bahreïn', '973'], ['BI', 'Burundi', '257'], ['BJ', 'Bénin', '229'],
  ['BL', 'Saint-Barthélemy', '590'], ['BM', 'Bermudes', '1'], ['BN', 'Brunei', '673'],
  ['BO', 'Bolivie', '591'], ['BQ', 'Pays-Bas caribéens', '599'], ['BR', 'Brésil', '55'],
  ['BS', 'Bahamas', '1'], ['BT', 'Bhoutan', '975'], ['BW', 'Botswana', '267'],
  ['BY', 'Biélorussie', '375'], ['BZ', 'Belize', '501'], ['CA', 'Canada', '1'],
  ['CC', 'Îles Cocos', '61'], ['CD', 'RD Congo', '243'], ['CF', 'République centrafricaine', '236'],
  ['CG', 'Congo', '242'], ['CH', 'Suisse', '41'], ['CI', "Côte d'Ivoire", '225'],
  ['CK', 'Îles Cook', '682'], ['CL', 'Chili', '56'], ['CM', 'Cameroun', '237'],
  ['CN', 'Chine', '86'], ['CO', 'Colombie', '57'], ['CR', 'Costa Rica', '506'],
  ['CU', 'Cuba', '53'], ['CV', 'Cap-Vert', '238'], ['CW', 'Curaçao', '599'],
  ['CX', 'Île Christmas', '61'], ['CY', 'Chypre', '357'], ['CZ', 'Tchéquie', '420'],
  ['DE', 'Allemagne', '49'], ['DJ', 'Djibouti', '253'], ['DK', 'Danemark', '45'],
  ['DM', 'Dominique', '1'], ['DO', 'République dominicaine', '1'], ['DZ', 'Algérie', '213'],
  ['EC', 'Équateur', '593'], ['EE', 'Estonie', '372'], ['EG', 'Égypte', '20'],
  ['EH', 'Sahara occidental', '212'], ['ER', 'Érythrée', '291'], ['ES', 'Espagne', '34'],
  ['ET', 'Éthiopie', '251'], ['FI', 'Finlande', '358'], ['FJ', 'Fidji', '679'],
  ['FK', 'Îles Malouines', '500'], ['FM', 'Micronésie', '691'], ['FO', 'Îles Féroé', '298'],
  ['FR', 'France', '33'], ['GA', 'Gabon', '241'], ['GB', 'Royaume-Uni', '44'],
  ['GD', 'Grenade', '1'], ['GE', 'Géorgie', '995'], ['GF', 'Guyane française', '594'],
  ['GG', 'Guernesey', '44'], ['GH', 'Ghana', '233'], ['GI', 'Gibraltar', '350'],
  ['GL', 'Groenland', '299'], ['GM', 'Gambie', '220'], ['GN', 'Guinée', '224'],
  ['GP', 'Guadeloupe', '590'], ['GQ', 'Guinée équatoriale', '240'], ['GR', 'Grèce', '30'],
  ['GT', 'Guatemala', '502'], ['GU', 'Guam', '1'], ['GW', 'Guinée-Bissau', '245'],
  ['GY', 'Guyana', '592'], ['HK', 'Hong Kong', '852'], ['HN', 'Honduras', '504'],
  ['HR', 'Croatie', '385'], ['HT', 'Haïti', '509'], ['HU', 'Hongrie', '36'],
  ['ID', 'Indonésie', '62'], ['IE', 'Irlande', '353'], ['IL', 'Israël', '972'],
  ['IM', "Île de Man", '44'], ['IN', 'Inde', '91'], ['IO', "Territoire britannique de l'océan Indien", '246'],
  ['IQ', 'Irak', '964'], ['IR', 'Iran', '98'], ['IS', 'Islande', '354'],
  ['IT', 'Italie', '39'], ['JE', 'Jersey', '44'], ['JM', 'Jamaïque', '1'],
  ['JO', 'Jordanie', '962'], ['JP', 'Japon', '81'], ['KE', 'Kenya', '254'],
  ['KG', 'Kirghizistan', '996'], ['KH', 'Cambodge', '855'], ['KI', 'Kiribati', '686'],
  ['KM', 'Comores', '269'], ['KN', 'Saint-Christophe-et-Niévès', '1'], ['KP', 'Corée du Nord', '850'],
  ['KR', 'Corée du Sud', '82'], ['KW', 'Koweït', '965'], ['KY', 'Îles Caïmans', '1'],
  ['KZ', 'Kazakhstan', '7'], ['LA', 'Laos', '856'], ['LB', 'Liban', '961'],
  ['LC', 'Sainte-Lucie', '1'], ['LI', 'Liechtenstein', '423'], ['LK', 'Sri Lanka', '94'],
  ['LR', 'Liberia', '231'], ['LS', 'Lesotho', '266'], ['LT', 'Lituanie', '370'],
  ['LU', 'Luxembourg', '352'], ['LV', 'Lettonie', '371'], ['LY', 'Libye', '218'],
  ['MA', 'Maroc', '212'], ['MC', 'Monaco', '377'], ['MD', 'Moldavie', '373'],
  ['ME', 'Monténégro', '382'], ['MF', 'Saint-Martin', '590'], ['MG', 'Madagascar', '261'],
  ['MH', 'Îles Marshall', '692'], ['MK', 'Macédoine du Nord', '389'], ['ML', 'Mali', '223'],
  ['MM', 'Birmanie', '95'], ['MN', 'Mongolie', '976'], ['MO', 'Macao', '853'],
  ['MP', 'Îles Mariannes du Nord', '1'], ['MQ', 'Martinique', '596'], ['MR', 'Mauritanie', '222'],
  ['MS', 'Montserrat', '1'], ['MT', 'Malte', '356'], ['MU', 'Maurice', '230'],
  ['MV', 'Maldives', '960'], ['MW', 'Malawi', '265'], ['MX', 'Mexique', '52'],
  ['MY', 'Malaisie', '60'], ['MZ', 'Mozambique', '258'], ['NA', 'Namibie', '264'],
  ['NC', 'Nouvelle-Calédonie', '687'], ['NE', 'Niger', '227'], ['NF', 'Île Norfolk', '672'],
  ['NG', 'Nigeria', '234'], ['NI', 'Nicaragua', '505'], ['NL', 'Pays-Bas', '31'],
  ['NO', 'Norvège', '47'], ['NP', 'Népal', '977'], ['NR', 'Nauru', '674'],
  ['NU', 'Niue', '683'], ['NZ', 'Nouvelle-Zélande', '64'], ['OM', 'Oman', '968'],
  ['PA', 'Panama', '507'], ['PE', 'Pérou', '51'], ['PF', 'Polynésie française', '689'],
  ['PG', 'Papouasie-Nouvelle-Guinée', '675'], ['PH', 'Philippines', '63'], ['PK', 'Pakistan', '92'],
  ['PL', 'Pologne', '48'], ['PM', 'Saint-Pierre-et-Miquelon', '508'], ['PR', 'Porto Rico', '1'],
  ['PS', 'Palestine', '970'], ['PT', 'Portugal', '351'], ['PW', 'Palaos', '680'],
  ['PY', 'Paraguay', '595'], ['QA', 'Qatar', '974'], ['RE', 'Réunion', '262'],
  ['RO', 'Roumanie', '40'], ['RS', 'Serbie', '381'], ['RU', 'Russie', '7'],
  ['RW', 'Rwanda', '250'], ['SA', 'Arabie saoudite', '966'], ['SB', 'Îles Salomon', '677'],
  ['SC', 'Seychelles', '248'], ['SD', 'Soudan', '249'], ['SE', 'Suède', '46'],
  ['SG', 'Singapour', '65'], ['SH', 'Sainte-Hélène', '290'], ['SI', 'Slovénie', '386'],
  ['SK', 'Slovaquie', '421'], ['SL', 'Sierra Leone', '232'], ['SM', 'Saint-Marin', '378'],
  ['SN', 'Sénégal', '221'], ['SO', 'Somalie', '252'], ['SR', 'Suriname', '597'],
  ['SS', 'Soudan du Sud', '211'], ['ST', 'Sao Tomé-et-Principe', '239'], ['SV', 'Salvador', '503'],
  ['SX', 'Saint-Martin (NL)', '1'], ['SY', 'Syrie', '963'], ['SZ', 'Eswatini', '268'],
  ['TC', 'Îles Turques-et-Caïques', '1'], ['TD', 'Tchad', '235'], ['TG', 'Togo', '228'],
  ['TH', 'Thaïlande', '66'], ['TJ', 'Tadjikistan', '992'], ['TK', 'Tokelau', '690'],
  ['TL', 'Timor oriental', '670'], ['TM', 'Turkménistan', '993'], ['TN', 'Tunisie', '216'],
  ['TO', 'Tonga', '676'], ['TR', 'Turquie', '90'], ['TT', 'Trinité-et-Tobago', '1'],
  ['TV', 'Tuvalu', '688'], ['TW', 'Taïwan', '886'], ['TZ', 'Tanzanie', '255'],
  ['UA', 'Ukraine', '380'], ['UG', 'Ouganda', '256'], ['US', 'États-Unis', '1'],
  ['UY', 'Uruguay', '598'], ['UZ', 'Ouzbékistan', '998'], ['VA', 'Vatican', '379'],
  ['VC', 'Saint-Vincent-et-les-Grenadines', '1'], ['VE', 'Venezuela', '58'], ['VG', 'Îles Vierges britanniques', '1'],
  ['VI', 'Îles Vierges américaines', '1'], ['VN', 'Vietnam', '84'], ['VU', 'Vanuatu', '678'],
  ['WF', 'Wallis-et-Futuna', '681'], ['WS', 'Samoa', '685'], ['YE', 'Yémen', '967'],
  ['YT', 'Mayotte', '262'], ['ZA', 'Afrique du Sud', '27'], ['ZM', 'Zambie', '260'],
  ['ZW', 'Zimbabwe', '263'],
];

function flagFromIso2(iso2) {
  return String.fromCodePoint(...[...iso2.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export const COUNTRIES = COUNTRIES_RAW
  .map(([iso2, name, code]) => ({ iso2, name, code, flag: flagFromIso2(iso2) }))
  .sort((a, b) => a.name.localeCompare(b.name));

export const DEFAULT_COUNTRY_CODE_BY_LANG = { fr: '33', ro: '40', en: '44' };

export function buildCountryCodeOptionsHtml(selectedCode) {
  let selected = false;
  return COUNTRIES
    .map(({ code, flag, name }) => {
      const isSelected = !selected && code === selectedCode;
      if (isSelected) selected = true;
      return `<option value="${code}" title="${name}" ${isSelected ? 'selected' : ''}>${flag} +${code}</option>`;
    })
    .join('');
}

// Combines a country code with a locally-formatted number into a single
// stored string (e.g. "33" + "06 12 34 56 78" -> "+33612345678"), dropping
// the leading trunk zero that's implicit once a country code is present.
export function combinePhone(code, number) {
  const digits = (number || '').replace(/\D/g, '');
  if (!digits) return '';
  const national = digits.replace(/^0+/, '') || digits;
  return `+${code}${national}`;
}

// Splits a stored "+<code><number>" string back into its parts for editing.
// Falls back to putting the raw value in the number field when it doesn't
// start with a known country code, so unrecognised/legacy values aren't lost.
export function splitPhone(stored) {
  const value = (stored || '').trim();
  if (!value.startsWith('+')) return { code: '', number: value };
  const digits = value.slice(1);
  const match = COUNTRIES
    .filter(({ code }) => digits.startsWith(code))
    .sort((a, b) => b.code.length - a.code.length)[0];
  if (!match) return { code: '', number: digits };
  return { code: match.code, number: digits.slice(match.code.length) };
}
