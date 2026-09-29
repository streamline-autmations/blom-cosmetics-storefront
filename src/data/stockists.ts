export interface Stockist {
  id: string;
  name: string;
  kind: 'main' | 'distributor';
  town: string;
  addressLines: string[];
  fullAddress: string;
  lat: number;
  lng: number;
  contactName?: string;
  phone?: string;
  email?: string;
  hours?: string[];
}

export const stockists: Stockist[] = [
  {
    id: 'main-randfontein',
    name: 'BLOM Cosmetics - Main Store',
    kind: 'main',
    town: 'Randfontein',
    addressLines: ['34 Horingbek Avenue', 'Helikonpark, Randfontein', 'South Africa'],
    fullAddress: '34 Horingbek Avenue, Helikonpark, Randfontein, South Africa',
    lat: -26.1826,
    lng: 27.7460,
    contactName: 'Avané',
    phone: '+27 79 548 3317',
    email: 'shop@blomcosmetics.com',
    hours: [
      'Monday - Friday: 9:00 AM - 6:00 PM',
      'Saturday: 10:00 AM - 4:00 PM',
      'Sunday: Closed',
      'Visits by appointment only'
    ]
  },
  {
    id: 'beaut-a-holics-reitz',
    name: 'Beaut A Holics',
    kind: 'distributor',
    town: 'Reitz',
    addressLines: ['6 Steenbok Avenue', 'Reitz, 9810'],
    fullAddress: '6 Steenbok Avenue, Reitz, 9810, South Africa',
    lat: -27.8081,
    lng: 28.4247,
    contactName: 'Natasha',
    phone: '+27 82 547 1228'
  },
  {
    id: 'blom-orkney',
    name: 'BLOM Orkney',
    kind: 'distributor',
    town: 'Orkney',
    addressLines: ['9 Addison Street', 'Golf Park, Orkney'],
    fullAddress: '9 Addison Street, Golf Park, Orkney, South Africa',
    lat: -26.9773,
    lng: 26.6688,
    contactName: 'Yolanda',
    phone: '+27 73 151 8407',
    email: 'blom.orkney.northwest@gmail.com'
  },
  {
    id: 'blom-centurion',
    name: 'BLOM Centurion',
    kind: 'distributor',
    town: 'Centurion',
    addressLines: ['3 Kiepersol Road', 'Eldoraigne, Centurion, 0157'],
    fullAddress: '3 Kiepersol Road, Eldoraigne, Centurion, 0157, South Africa',
    lat: -25.8446,
    lng: 28.1514,
    contactName: 'Natasha Du Toit',
    phone: '+27 71 462 5287',
    email: 'natashatooshterblanche@gmail.com'
  },
  {
    id: 'lesinda-meyer-vanderbijlpark',
    name: 'BLOM Vanderbijlpark',
    kind: 'distributor',
    town: 'Vanderbijlpark',
    addressLines: ['34 Cornwallis Harris Street', 'Vanderbijlpark'],
    fullAddress: '34 Cornwallis Harris Street, Vanderbijlpark, South Africa',
    lat: -26.7111,
    lng: 27.8442,
    contactName: 'Lesinda Meyer',
    phone: '+27 73 151 1083'
  },
  {
    id: 'lesinda-meyer-three-rivers',
    name: 'BLOM Three Rivers',
    kind: 'distributor',
    town: 'Three Rivers, Vereeniging',
    addressLines: ['46 Umtata Street', 'Three Rivers, Vereeniging'],
    fullAddress: '46 Umtata Street, Three Rivers, Vereeniging, South Africa',
    lat: -26.6720,
    lng: 27.9290,
    contactName: 'Lesinda Meyer',
    phone: '+27 73 151 1083'
  },
  {
    id: 'the-nail-studio-greenhills',
    name: 'The Nail Studio',
    kind: 'distributor',
    town: 'Randfontein',
    addressLines: ['29 Clydesdale Crescent', 'Greenhills, Randfontein, 1767'],
    fullAddress: '29 Clydesdale Crescent, Greenhills, Randfontein, 1767, South Africa',
    lat: -26.1552,
    lng: 27.6988,
    contactName: 'Renaté',
    phone: '+27 82 491 0078'
  }
];
