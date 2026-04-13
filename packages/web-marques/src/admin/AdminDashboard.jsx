import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AdminHeader from './components/AdminHeader';
import DayView from './components/DayView';
import WeekView from './components/WeekView';
import MonthView from './components/MonthView';
import YearView from './components/YearView';
import { mockAppointments, monthlyData } from './mockData';
import './admin.css';

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('dia');
  const [currentDate, setCurrentDate] = useState(new Date(2026, 3, 6)); // 6 de abril 2026
  const [appointments, setAppointments] = useState(mockAppointments);

  const dateStr = currentDate.toISOString().split('T')[0];
  const dayAppointments = appointments.filter(a => a.date === dateStr);

  const handleUpdateStatus = (id, newStatus) => {
    if (newStatus === 'deleted') {
      setAppointments(prev => prev.filter(a => a.id !== id));
    } else {
      setAppointments(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
    }
  };

  const handleDateChange = (e) => {
    setCurrentDate(new Date(e.target.value + 'T00:00:00'));
  };

  const goToToday = () => setCurrentDate(new Date());

  const navigate_date = (direction) => {
    const d = new Date(currentDate);
    if (viewMode === 'dia') d.setDate(d.getDate() + direction);
    else if (viewMode === 'semana') d.setDate(d.getDate() + direction * 7);
    else if (viewMode === 'mes') d.setMonth(d.getMonth() + direction);
    else if (viewMode === 'ano') d.setFullYear(d.getFullYear() + direction);
    setCurrentDate(d);
  };

  return (
    <div className="admin-page">
      <AdminHeader onAddAppointment={() => navigate('/')} />

      <div className="admin-controls">
        <select className="admin-select" value={viewMode} onChange={(e) => setViewMode(e.target.value)}>
          <option value="dia">Dia</option>
          <option value="semana">Semana</option>
          <option value="mes">Mês</option>
          <option value="ano">Ano</option>
        </select>

        {viewMode === 'dia' && (
          <>
            <input
              type="date"
              className="admin-date-input"
              value={dateStr}
              onChange={handleDateChange}
            />
            <button className="admin-btn-today" onClick={goToToday}>Hoje</button>
          </>
        )}
      </div>

      {viewMode === 'dia' && (
        <DayView appointments={dayAppointments} onUpdateStatus={handleUpdateStatus} />
      )}

      {viewMode === 'semana' && (
        <WeekView
          appointments={appointments}
          currentDate={currentDate}
          onPrev={() => navigate_date(-1)}
          onNext={() => navigate_date(1)}
        />
      )}

      {viewMode === 'mes' && (
        <MonthView
          appointments={appointments}
          currentDate={currentDate}
          onPrev={() => navigate_date(-1)}
          onNext={() => navigate_date(1)}
        />
      )}

      {viewMode === 'ano' && (
        <YearView
          monthlyData={monthlyData}
          currentDate={currentDate}
          onPrev={() => navigate_date(-1)}
          onNext={() => navigate_date(1)}
        />
      )}
    </div>
  );
}
