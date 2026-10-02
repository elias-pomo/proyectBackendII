// src/services/mail.service.js
import nodemailer from 'nodemailer';
import { config } from '../config/config.js';

const TZ = 'America/Argentina/Buenos_Aires';

const escapeHtml = (text) =>
    String(text).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const formatDateTime = (date) =>
    new Date(date).toLocaleString('es-AR', {
        weekday: 'long', day: 'numeric', month: 'long',
        hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ
    });

export class MailService {
    #transporter = null;

    isConfigured() {
        const { HOST, PORT, USER, PASS, FROM } = config.mail;
        return Boolean(HOST && PORT && USER && PASS && FROM);
    }

    #getTransporter() {
        if (!this.#transporter) {
            const { HOST, PORT, USER, PASS } = config.mail;
            this.#transporter = nodemailer.createTransport({
                host: HOST,
                port: Number(PORT),
                secure: Number(PORT) === 465,   // 465 usa TLS directo; 587 usa STARTTLS
                auth: { user: USER, pass: PASS }
            });
        }
        return this.#transporter;
    }

    async sendTicketConfirmation({ to, name, event, ticket }) {
        if (!this.isConfigured()) {
            console.warn('Email no enviado: faltan variables MAIL_* en el .env');
            return;
        }

        const when = formatDateTime(event.date);

        const text = [
            `Hola ${name},`,
            '',
            'Tu inscripción quedó confirmada.',
            '',
            `Clase: ${event.title}`,
            `Cuándo: ${when}`,
            `Dónde: ${event.location}`,
            `Lugares reservados: ${ticket.quantity}`,
            `Código de reserva: ${ticket.reservationCode}`,
            '',
            'Presentá este código al llegar. Si no podés asistir, cancelá tu inscripción para liberar el lugar.',
            '',
            'Ringo Box Gym'
        ].join('\n');

        const row = (label, value) =>
            `<tr><td style="padding:4px 12px 4px 0;color:#666">${label}</td><td style="padding:4px 0"><strong>${escapeHtml(value)}</strong></td></tr>`;

        const html = `
<div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;border:1px solid #ddd;border-radius:8px;overflow:hidden">
  <div style="background:#000;color:#fff;padding:16px 20px;font-size:20px;font-weight:bold">
    Ringo Box <span style="color:#d71920">Gym</span>
  </div>
  <div style="padding:20px;color:#222">
    <p>Hola ${escapeHtml(name)}, tu inscripción quedó <strong>confirmada</strong>.</p>
    <table style="border-collapse:collapse">
      ${row('Clase', event.title)}
      ${row('Cuándo', when)}
      ${row('Dónde', event.location)}
      ${row('Lugares', ticket.quantity)}
      ${row('Código de reserva', ticket.reservationCode)}
    </table>
    <p style="color:#666;font-size:14px;margin-top:16px">Presentá este código al llegar. Si no podés asistir, cancelá tu inscripción para liberar el lugar.</p>
  </div>
</div>`;

        await this.#getTransporter().sendMail({
            from: config.mail.FROM,
            to,
            subject: `Inscripción confirmada: ${event.title}`,
            text,
            html
        });
        console.log(`Email de confirmación enviado a ${to} (${ticket.reservationCode})`);
    }
}