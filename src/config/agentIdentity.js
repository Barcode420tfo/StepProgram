const AGENTS = [
  { id: 'gp-jessica', name: 'Jessica', aliases: ['jessica'] },
  { id: 'gp-towobola', name: 'Towobola', aliases: ['towobola'] },
  { id: 'gp-chile-nwaiwu', name: 'Chile Nwaiwu', aliases: ['chile', 'chile nwaiwu', 'chilee nwaiwu', 'chile nwaiwu91k'] },
  { id: 'gp-mohammed', name: 'Mohammed', aliases: ['mohammed', 'mohamed', 'muhammed'] },
  { id: 'gp-esther', name: 'Esther', aliases: ['esther'] },
  { id: 'gp-sarah', name: 'Sarah', aliases: ['sarah'] },
  { id: 'sup-babatunde', name: 'Babatunde', aliases: ['babatunde'] },
  { id: 'sa-peace', name: 'Peace', aliases: ['peace'] },
  { id: 'sa-queen', name: 'Queen', aliases: ['queen'] },
  { id: 'sa-ifeoma', name: 'Ifeoma', aliases: ['ifeoma'] },
];

function key(value) {
  return String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

const BY_ALIAS = new Map(AGENTS.flatMap((agent) => agent.aliases.map((alias) => [key(alias), agent])));
const BY_ID = new Map(AGENTS.map((agent) => [agent.id, agent]));

export function resolveAgent(value) {
  return BY_ID.get(String(value || '')) || BY_ALIAS.get(key(value)) || null;
}

export function agentId(value) {
  return resolveAgent(value)?.id || null;
}

export function canonicalAgentName(value) {
  return resolveAgent(value)?.name || String(value || '').trim();
}

export function rowAgent(row) {
  if (row?._agentId) return resolveAgent(row._agentId);
  const fields = ['Agent ID', 'Agent Name', 'Field Agent Name', 'Sale Owner', 'Sales Agent'];
  for (const field of fields) {
    const match = resolveAgent(row?.[field]);
    if (match) return match;
  }
  return null;
}

export function attachAgentIdentity(row) {
  const match = rowAgent(row);
  return match ? { ...row, _agentId: match.id, _agentName: match.name } : row;
}

export { AGENTS };
