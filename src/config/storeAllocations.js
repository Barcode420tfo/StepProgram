// Operational store allocations reconciled against the live onboarding sheet.
// `originalOnboarder` preserves acquisition credit; `assignedAgent` controls
// current portfolio access and does not transfer ownership.
const allocation = (assignedAgent, currentSupervisor, stores) => Object.freeze(
  stores.map((store) => Object.freeze({ ...store, assignedAgent, currentSupervisor }))
);

export const STORE_ALLOCATIONS = Object.freeze({
  Towobola: allocation('Towobola', 'Towobola', [
    { id: 'store-euro-gadget-commerce-ventures', name: 'Euro gadget commerce ventures', address: '6 Olayeni computer village', territory: 'Computer Village', originalOnboarder: 'Towobola' },
    { id: 'store-slick', name: 'Slick', address: '2 pepple street, Msquare plaza, computer village.', territory: 'Computer Village', originalOnboarder: 'Towobola' },
    { id: 'store-plug-of-life', name: 'Plug🔌 of life', address: '13, Oshitelu Street, computer village', territory: 'Computer Village', originalOnboarder: 'Towobola' },
    { id: 'store-k-c-eze-gadgets', name: 'K.C Eze Gadgets', address: '10, pepple street, Goodness plaza. Computer village', territory: 'Computer Village', originalOnboarder: 'Towobola' },
    { id: 'store-river-of-gold-communications', name: 'River of Gold Communications', address: '15, Ola-Ayeni street, computer village', territory: 'Computer Village', originalOnboarder: 'Towobola' },
    { id: 'store-akybenny-hub-concept', name: 'Akybenny Hub Concept', address: '4A, Binite Plaza, Shop E6/7, Computer Village', territory: 'Computer Village', originalOnboarder: 'Towobola' },
    { id: 'store-buyme', name: 'Buyme', address: '7, Kodesoh Street, Computer Village, Ikeja, Lagos.', territory: 'Computer Village', originalOnboarder: 'Towobola' },
    { id: 'store-darling-ronnys-phones', name: 'Darling Ronny’s Phones', address: '10 Otigba street opposite police post computer village', territory: 'Computer Village', originalOnboarder: 'Towobola' },
    { id: 'store-alpharicon-global', name: 'Alpharicon Global', address: '16 obafemi Awolowo way computer village', territory: 'Computer Village', originalOnboarder: 'Towobola' },
    { id: 'store-mayour-lee-it-hub', name: 'Mayour Lee IT HUB', address: '13 Oshitelu Street, computer village', territory: 'Computer Village', originalOnboarder: 'Towobola' },
    { id: 'store-river-of-gold', name: 'River of Gold', address: '10, pepple street, Goodness plaza. Computer village', territory: 'Computer Village', originalOnboarder: 'Towobola' },
    { id: 'store-royaline-technologies', name: 'Royaline Technologies', address: '2 Simbiat Abiola way opposite ikeja', territory: 'Computer Village', originalOnboarder: 'Towobola' },
    { id: 'store-judest', name: 'Judest', address: '17, Olayeni street, Ikeja', territory: 'Computer Village', originalOnboarder: 'Towobola' },
    { id: 'store-links-mobiles', name: 'links mobiles', address: '10, ola ayeni street computer village', territory: 'Computer Village', originalOnboarder: 'Sarah' },
    { id: 'store-tohflex-gadgets', name: 'tohflex gadgets', address: '40,obafemi awolowo way', territory: 'Computer Village', originalOnboarder: 'Sarah' },
    { id: 'store-maximilliandream', name: 'maximilliandream', address: '15, olayeni street,glory plaza,computer village', territory: 'Computer Village', originalOnboarder: 'Sarah' },
    { id: 'store-zeezco-ventures', name: 'Zeezco Ventures', address: '19 Mokolu street ogba', territory: 'OGBA', originalOnboarder: 'Towobola' },
    { id: 'store-fsa-gadgets', name: 'FSA GADGETS', address: '17, Alafia Avenue Street, Ejigbo, Lagos', territory: 'Oshodi/isolo', originalOnboarder: 'Towobola' },
    { id: 'store-jaydee-exclusive', name: 'Jaydee Exclusive', address: '5, Rotimi Square off Benson Busstop, surulere', territory: 'Surulere/Lawanson', originalOnboarder: 'Towobola' },
    { id: 'store-tobest-footies', name: 'Tobest Footies', address: '19, Adegbola street off Cole street, lawanson, Surulere', territory: 'Surulere/Lawanson', originalOnboarder: 'Towobola' },
    { id: 'store-monicity-phones-and-logistics', name: 'Monicity phones and logistics', address: '13/15 Ijaiye road opposite Nigerian Institute of Journalism Ogba.', territory: 'OGBA', originalOnboarder: 'Towobola' },
    { id: 'store-precious-hair-beauty', name: 'Precious Hair Beauty', address: '15, Orile, Igomu, Lagos.', territory: 'Orile', originalOnboarder: 'Towobola' },
    { id: 'store-ytee-touch-hair-studio', name: 'Ytee Touch Hair Studio', address: '46, Akerele street, Surulere', territory: 'Surulere/Lawanson', originalOnboarder: 'Towobola' },
    { id: 'store-global-god-grace-communication', name: 'Global God Grace Communication', address: '8, mercy wing, Goshenland plaza, kosoko road, Berger.', territory: 'Berger', originalOnboarder: 'Towobola' },
    { id: 'store-clinton-enterprises', name: 'Clinton Enterprises', address: 'Maximum Correctional Barracks, Kirikiri, Apapa, Lagos.', territory: 'Apapa', originalOnboarder: 'Towobola' },
    { id: 'store-arice-chine-nig-ventures', name: 'Arice & Chine Nig. Ventures', address: '12 saka tinubu, Victoria Island', territory: 'Saka Tinubu', originalOnboarder: 'Towobola' },
    { id: 'store-d-real-phones-and-gadget-nig-ltd', name: 'D-Real Phones and Gadget Nig Ltd', address: '7 Saka Tinubu, Victoria Island', territory: 'Saka Tinubu', originalOnboarder: 'Towobola' },
    { id: 'store-bumax-ventures-resources-limited', name: 'Bumax Ventures Resources Limited', address: '9, tech plaza, Saka Tinubu, Victoria island.', territory: 'Saka Tinubu', originalOnboarder: 'Towobola' },
    { id: 'store-stevoo-gadgets', name: 'Stevoo Gadgets', address: 'Shop D 14m, 12 Saka Tinubu Street, Victoria Island.', territory: 'Saka Tinubu', originalOnboarder: 'Towobola' },
    { id: 'store-b-oclock-gadget-hub', name: 'B O’clock Gadget Hub', address: '8, Saka Tinubu Street, Victoria Island.', territory: 'Saka Tinubu', originalOnboarder: 'Towobola' },
    { id: 'store-meg-seafoods', name: 'Meg seafoods', address: '22, Isaac Okormor Street Off Gafari Balogun Street, Ogudu, Lagos.', territory: 'Ogudu', originalOnboarder: 'Towobola' },
    { id: 'store-primax-phone-logistics', name: 'Primax Phone & Logistics', address: '68, College Road, Ifako Ijaiye Ogba, Lagos.', territory: 'OGBA', originalOnboarder: 'Towobola' },
    { id: 'store-golden-tech-view-communications', name: 'Golden tech view communications', address: 'Exodus plaza, shop 127 ASPMDA Main gate', territory: 'Tradefair international market', originalOnboarder: 'Towobola' },
    { id: 'store-chidec-communication-ltd', name: 'Chidec Communication Ltd', address: 'Exodus plaza, Shop 87/88, ASPMDA Tradefair complex', territory: 'Tradefair international market', originalOnboarder: 'Towobola' },
    { id: 'store-chy-nats-communication-ent-nig', name: 'Chy-nats communication Ent Nig', address: 'Exodus plaza, Shop 119, ASPMDA Tradefair complex', territory: 'Tradefair international market', originalOnboarder: 'Towobola' },
    { id: 'store-chrislas-intl-ltd', name: 'Chrislas Int’l Ltd', address: 'Exodus plaza, Shop 96, ASPMDA Tradefair complex', territory: 'Tradefair international market', originalOnboarder: 'Towobola' },
    { id: 'store-nonstop-chibest-communication-enterprise', name: 'Nonstop Chibest Communication Enterprise', address: '16. Old Ojo Road, Maza Maza, Lagos.', territory: 'Maza Maza', originalOnboarder: 'Towobola' },
  ]),
  Queen: allocation('Queen', 'Towobola', [
    { id: 'store-amprex-hub-enterprises', name: 'Amprex Hub Enterprises', address: '12, Pepple Street, Computer village', territory: 'Computer Village', originalOnboarder: 'Towobola' },
    { id: 'store-fb-communications', name: 'FB Communications', address: '11, Otigba Street, Computer Village', territory: 'Computer Village', originalOnboarder: 'Towobola' },
    { id: 'store-avix-mobile', name: 'Avix Mobile', address: '2 Medical road computer village opposite slot, Ikeja', territory: 'Computer Village', originalOnboarder: 'Towobola' },
    { id: 'store-vivo-exclusive-royalline', name: 'Vivo Exclusive Royalline', address: '2 Simbiat Abiola Way ikeja', territory: 'Computer Village', originalOnboarder: 'Towobola' },
    { id: 'store-primtech-phones', name: 'Primtech Phones', address: 'Suit 50 Store, 14B Divine Plaza, Pepple Street, Computer Village, Ikeja, Lagos.', territory: 'Computer Village', originalOnboarder: 'Towobola' },
    { id: 'store-almond-kan-global-investment-ltd', name: 'Almond Kan Global Investment Ltd', address: 'Suit 52 Store, 14B Divine Plaza, Pepple Street, Computer village, Ikeja, Lagos.', territory: 'Computer Village', originalOnboarder: 'Towobola' },
    { id: 'store-mchrist-store', name: 'mchrist store', address: '17, simbiat abiola way computer village', territory: 'Computer Village', originalOnboarder: 'Sarah' },
    { id: 'store-morgan-mobile-and-technology', name: 'Morgan mobile and technology', address: '6,idowu lane', territory: 'Computer Village', originalOnboarder: 'Sarah' },
    { id: 'store-kamdi-computer', name: 'kamdi computer', address: '23, ikeja club plaza awolowo way', territory: 'Computer Village', originalOnboarder: 'Sarah' },
    { id: 'store-fm-reliable', name: 'FM reliable', address: '10, otigba street computer village', territory: 'Computer Village', originalOnboarder: 'Sarah' },
    { id: 'store-aos-city-limited', name: 'Aos city limited', address: '14, ola ayeni opposite fidelity bank computer village', territory: 'Computer Village', originalOnboarder: 'Sarah' },
    { id: 'store-always-mobile-phone', name: 'Always mobile phone', address: '12, ola ayeni street computer village', territory: 'Computer Village', originalOnboarder: 'Sarah' },
    { id: 'store-eddybass-venture', name: 'Eddybass Venture', address: '19 Ola-ayeni street', territory: 'Computer Village', originalOnboarder: 'Chile Nwaiwu' },
    { id: 'store-finet-awolowo', name: 'Finet Awolowo', address: '22b Awolowo way ikeja', territory: 'Computer Village', originalOnboarder: 'Chile Nwaiwu' },
  ]),
  Peace: Object.freeze([]),
  Ifeoma: Object.freeze([]),
});

export function getAssignedStores(agentName) {
  return (STORE_ALLOCATIONS[agentName] || []).map((store) => store.name);
}

export function getAssignedStoreRecords(agentName) {
  return [...(STORE_ALLOCATIONS[agentName] || [])];
}

export function getAllAssignedStoreRecords() {
  return Object.values(STORE_ALLOCATIONS).flat();
}
