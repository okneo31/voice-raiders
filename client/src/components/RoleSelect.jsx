import { ROLES } from '../game/constants';

export default function RoleSelect({ selectedRole, onSelect, takenRoles = [] }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <h3 style={{ marginBottom: 4 }}>역할 선택</h3>
      {Object.entries(ROLES).map(([key, role]) => {
        const taken = takenRoles.includes(key) && selectedRole !== key;
        return (
          <button
            key={key}
            className={selectedRole === key ? 'btn-primary' : 'btn-secondary'}
            onClick={() => !taken && onSelect(key)}
            disabled={taken}
            style={{
              display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left',
              borderColor: selectedRole === key ? role.color : undefined,
            }}
          >
            <span style={{ fontSize: '1.5rem' }}>{role.emoji}</span>
            <div>
              <div style={{ fontWeight: 600 }}>{role.name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: 400 }}>
                {role.description}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
