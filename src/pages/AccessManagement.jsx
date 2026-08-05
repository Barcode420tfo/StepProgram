import { ROLE_LABELS, ROLE_PERMISSIONS, ROLES, SUPERVISOR_PORTFOLIOS } from '../config/accessControl';

const TIERS = [ROLES.ADMIN, ROLES.GROWTH_PARTNER, ROLES.SALES_AGENT];

export default function AccessManagement() {
  return (
    <div>
      <div className="role-hero compact"><div><div className="role-eyebrow">Administration</div><h1>Roles and access tiers</h1><p>Access is deny-by-default and resolved from server-issued Firebase custom claims.</p></div><span className="role-badge">Admin only</span></div>
      <div className="access-tier-grid">
        {TIERS.map((role) => <section className="role-panel" key={role}><div className="tier-title"><span>{ROLE_LABELS[role]}</span><small>{ROLE_PERMISSIONS[role].length} permissions</small></div><ul>{ROLE_PERMISSIONS[role].map((permission) => <li key={permission}>{permission.replace(':', ' · ').replaceAll('_', ' ')}</li>)}</ul></section>)}
      </div>
      <section className="role-panel">
        <div className="role-panel-head"><div><h2>Current reporting structure</h2><p>Loaded from the confirmed store-allocation workbook</p></div></div>
        <div className="role-table-wrap"><table><thead><tr><th>Growth Partner</th><th>Territory</th><th>Sales Agent</th><th>Store access</th></tr></thead><tbody>{SUPERVISOR_PORTFOLIOS.map((row) => <tr key={row.agent}><td><strong>{row.name}</strong></td><td>{row.territory}</td><td>{row.agent}</td><td>{row.stores} assigned stores</td></tr>)}</tbody></table></div>
      </section>
      <div className="scope-note access-note">Account creation and claim assignment must be performed by the forthcoming secure Admin API. Public users cannot select or elevate their own role.</div>
    </div>
  );
}
