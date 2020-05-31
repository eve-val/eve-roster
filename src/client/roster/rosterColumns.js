export default [
  { label: '', key: 'alertMessage', width: 35, margin: 0, derivedFrom: []},
  { label: 'Name', key: 'name', width: 200, margin: 0, metaKey: 'corporationName'  },
  { label: '', key: 'alts', width: 40, derivedFrom: []},

  { label: 'Citadel', key: 'homeCitadel', width: 110, account: true },
  { label: 'Timezone', key: 'activeTimezone', width: 90, account: true },
  { label: 'Last seen', key: 'lastSeen', width: 110, },
  { label: 'Kills', key: 'killsInLastMonth', width: 60, numeric: true, metaKey: 'killValueInLastMonth', },
  { label: 'Losses', key: 'lossesInLastMonth', width: 60, numeric: true, metaKey: 'lossValueInLastMonth', },
];
