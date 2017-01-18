export default [
  { label: '', key: 'warning', width: 35, margin: 0},
  { label: 'Name', key: 'name', width: 230, margin: 0},
  { label: '', key: 'alts', width: 40, },

  { label: 'Citadel', key: 'homeCitadel', width: 110, account: true },
  { label: 'Timezone', key: 'activeTimezone', width: 90, account: true },
  { label: 'Last seen', key: 'lastSeen', width: 110, },
  { label: 'Siggy score', key: 'siggyScore', width: 85, numeric: true, },
  { label: 'Kills', key: 'killsInLastMonth', width: 60, numeric: true, metaKey: 'killValueInLastMonth', },
  { label: 'Losses', key: 'lossesInLastMonth', width: 60, numeric: true, metaKey: 'lossValueInLastMonth', },
];
