export default function StepUserData({ name, phone, onChangeName, onChangePhone }) {
  return (
    <div className="step-container">
      <h2 className="step-title">Seus Dados</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '24px', fontSize: '14px' }}>
        Preencha suas informações para garantir seu agendamento.
      </p>

      <div className="input-group">
        <label htmlFor="name">Nome completo</label>
        <input 
          type="text" 
          id="name" 
          className="input-field" 
          placeholder="Ex: João da Silva"
          value={name}
          onChange={(e) => onChangeName(e.target.value)}
        />
      </div>

      <div className="input-group">
        <label htmlFor="phone">WhatsApp</label>
        <input 
          type="tel" 
          id="phone" 
          className="input-field" 
          placeholder="(11) 99999-9999"
          value={phone}
          onChange={(e) => onChangePhone(e.target.value)}
        />
      </div>
    </div>
  );
}
