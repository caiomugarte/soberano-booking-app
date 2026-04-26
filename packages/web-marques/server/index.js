import express from 'express';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

const EVOLUTION_API_URL = process.env.EVOLUTION_API_URL || 'http://localhost:8080';
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || 'SUA_API_KEY';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || 'SUA_INSTANCIA';
const BARBER_PHONE = process.env.BARBER_PHONE || '5511999999999';

app.post('/api/send-confirmation', async (req, res) => {
  const { service, barber, date, time, userName, userPhone } = req.body;

  const text = [
    `*Novo Agendamento - Barbearia da Marques*`,
    ``,
    `*Serviço:* ${service}`,
    `*Barbeiro:* ${barber}`,
    `*Data:* ${date}`,
    `*Horário:* ${time}`,
    `*Cliente:* ${userName}`,
    `*Telefone:* ${userPhone}`,
  ].join('\n');

  try {
    const response = await fetch(
      `${EVOLUTION_API_URL}/message/sendText/${EVOLUTION_INSTANCE}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: EVOLUTION_API_KEY,
        },
        body: JSON.stringify({
          number: BARBER_PHONE,
          text,
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Erro ao enviar mensagem', details: data });
    }

    res.json({ success: true, message: 'Agendamento confirmado!' });
  } catch (err) {
    console.error('Erro Evolution API:', err);
    res.status(500).json({ error: 'Erro interno ao enviar mensagem' });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
