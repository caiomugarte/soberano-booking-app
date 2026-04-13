export default function AdminHeader({ onAddAppointment }) {
  return (
    <div className="admin-header">
      <div className="admin-header-left">
        <img src="/logo.jpg" alt="Logo" />
        <h1>Marquês</h1>
      </div>
      <div className="admin-header-right">
        <button className="admin-btn-add" onClick={onAddAppointment}>+ Agendamento</button>
        <div className="admin-user-info">
          <span>Admin</span>
          <img src="/gabriel.png" alt="Admin" />
        </div>
      </div>
    </div>
  );
}
